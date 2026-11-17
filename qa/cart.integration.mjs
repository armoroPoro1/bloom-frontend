import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createTestApp, registerUser} from '../../Bloom-Backend-Claude-Handoff/dist/tests/helpers.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const compiled = await build({stdin:{contents:"export {createCartWriter} from './src/api/cart'; export {updateCartItem,getCart} from './src/api/services'; export {setSession} from './src/api/client';",resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {createCartWriter,updateCartItem,getCart,setSession} = await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));

test('frontend cart writer integrates with real backend routes and isolated database', async t => {
  process.chdir(fileURLToPath(new URL('../../Bloom-Backend-Claude-Handoff/', import.meta.url)));
  const fixture = await createTestApp();
  const originalFetch = globalThis.fetch;
  const {app,db} = fixture;
  let failure = null;
  let writes = 0;
  globalThis.fetch = async (url, options = {}) => {
    if (options.method === 'PUT') {
      writes++;
      if (failure) { const response = failure; failure = null; return response; }
    }
    const result = await app.inject({method:options.method || 'GET',url,headers:Object.fromEntries(new Headers(options.headers)),payload:options.body});
    return new Response(result.body,{status:result.statusCode,headers:{'Content-Type':'application/json'}});
  };
  try {
    const buyer = await registerUser(app);
    const seller = await registerUser(app);
    const category = randomUUID(), shop = randomUUID(), product = randomUUID(), second = randomUUID();
    await db.query("UPDATE users SET role='seller' WHERE id=$1",[seller.user.id]);
    await db.query('INSERT INTO categories(id,name) VALUES($1,$2)',[category,'Cart regression']);
    await db.query("INSERT INTO shops(id,owner_id,name,email,description,status) VALUES($1,$2,'Cart test','test@example.test','Test','approved')",[shop,seller.user.id]);
    for (const id of [product,second]) await db.query('INSERT INTO products(id,shop_id,category_id,name,price_cents,stock,image_index) VALUES($1,$2,$3,$4,39000,10,0)',[id,shop,category,'Cart product']);
    setSession(buyer.token,buyer.refreshToken);
    let account = buyer.user.id;
    let cart = [];
    const errors = [];
    const writer = createCartWriter({account:()=>account,cart:()=>cart,write:updateCartItem,apply:item=>{
      cart = cart.filter(row=>row.productId!==item.productId);
      if(item.quantity>0) cart.push(item);
    },error:message=>errors.push(message)});
    const quantity = id=>cart.find(row=>row.productId===id)?.quantity ?? 0;
    const persisted = async id=>(await getCart()).find(row=>row.productId===id)?.quantity ?? 0;

    await t.test('add uses a single line object; old array mapping reproduces the reported error',async()=>{
      const line = await updateCartItem(product,1);
      assert.equal(Array.isArray(line),false);
      assert.throws(()=>line.map(row=>row),TypeError);
      await updateCartItem(product,0);
      assert.equal(await writer.update(product,n=>n+1),true);
      assert.equal(quantity(product),1);
      assert.equal(await persisted(product),1);
    });
    await t.test('three immediate clicks increment to four without losing writes',async()=>{
      assert.deepEqual(await Promise.all([1,2,3].map(()=>writer.update(product,n=>n+1))),[true,true,true]);
      assert.equal(quantity(product),4);
      assert.equal(await persisted(product),4);
    });
    await t.test('adding a second product retains the first; reload agrees with server',async()=>{
      assert.equal(await writer.update(second,()=>2),true);
      cart = (await getCart()).map(({productId,quantity})=>({productId,quantity}));
      assert.equal(quantity(product),4);
      assert.equal(quantity(second),2);
    });
    await t.test('change quantity and delete persist',async()=>{
      assert.equal(await writer.update(product,()=>2),true);
      assert.equal(await persisted(product),2);
      assert.equal(await writer.update(product,()=>0),true);
      assert.equal(quantity(product),0);
      assert.equal(await persisted(product),0);
      assert.equal(quantity(second),2);
    });
    await t.test('overstock and invalid quantity leave cart unchanged',async()=>{
      assert.equal(await writer.update(second,()=>11),false);
      assert.equal(await writer.update(second,()=>-1),false);
      assert.equal(quantity(second),2);
      assert.equal(await persisted(second),2);
    });
    await t.test('server failure reports failure and subsequent click recovers',async()=>{
      failure = Response.json({error:{code:'INTERNAL_ERROR',message:'Injected failure'}},{status:500});
      assert.equal(await writer.update(second,n=>n+1),false);
      assert.equal(quantity(second),2);
      assert.equal(await persisted(second),2);
      assert.equal(await writer.update(second,n=>n+1),true);
      assert.equal(await persisted(second),3);
    });
    await t.test('concurrent-update response retries once then persists',async()=>{
      const before = writes;
      failure = Response.json({error:{code:'CONCURRENT_UPDATE',message:'Retry'}},{status:409});
      assert.equal(await writer.update(second,n=>n+1),true);
      assert.equal(writes-before,2);
      assert.equal(await persisted(second),4);
    });
    await t.test('malformed success response does not corrupt cart',async()=>{
      failure = Response.json({data:{unexpected:true}});
      assert.equal(await writer.update(second,n=>n+1),false);
      assert.equal(quantity(second),4);
      assert.equal(await persisted(second),4);
    });
    await t.test('queued writes stop after account changes',async()=>{
      const before = writes;
      const pending = writer.update(second,n=>n+1);
      account = seller.user.id;
      assert.equal(await pending,false);
      assert.equal(writes,before);
      assert.equal(await persisted(second),4);
    });
    assert.ok(errors.length>=4);
  } finally {
    globalThis.fetch = originalFetch;
    setSession(null,null);
    await fixture.close();
  }
});
