import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const compiled=await build({stdin:{contents:"export {seed} from './src/data';export {normalizeState} from './src/domain';export {createStoreActions} from './src/actions';export * from './src/persistence';export * from './src/imageUpload';export {contentError} from './src/contentValidation';",resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {seed,normalizeState,createStoreActions,STATE_KEY,loadLocalState,persistLocalState,imageFileError,hasImageSignature,readImageFile,contentError}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
function storage(initial={}){const values=new Map(Object.entries(initial));return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),values};}
function harness(){let state=normalizeState(undefined,seed);const notices=[];const actions=createStoreActions(()=>state,s=>{state=s},s=>notices.push(s));return{get state(){return state},actions,notices};}

test('saved checkout data survives reload and does not mix account carts',()=>{
  const h=harness();h.actions.setRole('user');h.actions.addCart('p1',2);h.actions.setRole('seller');h.actions.addCart('p6');
  const port=storage();assert.equal(persistLocalState(port,h.state),'');const loaded=loadLocalState(port,seed);
  assert.equal(loaded.readBlocked,false);assert.equal(loaded.state.currentUserId,'u2');assert.deepEqual(loaded.state.cart,[{productId:'p6',quantity:1}]);assert.deepEqual(loaded.state.carts.u1,[{productId:'p1',quantity:2}]);
});

test('malformed saved JSON and broken nested records preserve the original instead of overwriting it',()=>{
  for(const raw of ['{bad json',JSON.stringify({...seed,products:[null]}),JSON.stringify({...seed,shops:{}}),JSON.stringify({...seed,content:{...seed.content,foods:{}}}),JSON.stringify({...seed,cart:{}}),JSON.stringify({...seed,content:{...seed.content,articles:[{id:'bad',title:'broken'}]}})]){
    const port=storage({[STATE_KEY]:raw}),loaded=loadLocalState(port,seed);
    assert.equal(loaded.readBlocked,true);assert.match(loaded.error,/ยังไม่ถูกเขียนทับ/);assert.equal(port.values.get(STATE_KEY),raw);
    assert.ok(loaded.state.products.length>0);
  }
});

test('browser storage denial and quota failures remain explicit and can recover on retry',()=>{
  const locked={getItem(){throw new Error('denied')},setItem(){throw new Error('denied')}};
  assert.equal(loadLocalState(locked,seed).readBlocked,true);assert.match(persistLocalState(locked,seed),/ยังไม่ได้บันทึก/);
  const full={...storage(),setItem(){throw new Error('quota')}};
  assert.match(persistLocalState(full,seed),/พื้นที่จัดเก็บ/);
  const healthy=storage();assert.equal(persistLocalState(healthy,seed),'');assert.equal(loadLocalState(healthy,seed).readBlocked,false);
});

test('legacy shopping records migrate without replacing edited product data',()=>{
  const legacy=structuredClone(seed);legacy.products[0].price=444;delete legacy.content;delete legacy.categories;delete legacy.addresses;delete legacy.carts;
  const loaded=loadLocalState(storage({'bloom-healthshop-demo-v1':JSON.stringify(legacy)}),seed);
  assert.equal(loaded.readBlocked,false);assert.equal(loaded.state.products[0].price,444);assert.ok(loaded.state.content.foods.length);
});

test('image validation rejects unsupported, empty, oversized and mislabeled files',async()=>{
  assert.match(imageFileError({type:'image/svg+xml',size:20}),/เท่านั้น/);
  assert.match(imageFileError({type:'image/png',size:0}),/ว่าง/);
  assert.match(imageFileError({type:'image/png',size:1048577}),/1 MB/);
  assert.equal(imageFileError({type:'image/webp',size:1048576}),null);
  const png=Uint8Array.from([137,80,78,71,13,10,26,10]);assert.equal(hasImageSignature(png,'image/png'),true);assert.equal(hasImageSignature(png,'image/jpeg'),false);
  assert.equal(hasImageSignature(new TextEncoder().encode('GIF89a'),'image/gif'),true);
  assert.equal(hasImageSignature(new TextEncoder().encode('RIFF0000WEBP'),'image/webp'),true);
  await assert.rejects(readImageFile(new File(['not an image'],'fake.png',{type:'image/png'})),/เนื้อหาไฟล์ไม่ตรง/);
  await assert.rejects(readImageFile({type:'image/png',size:10,arrayBuffer:async()=>{throw new Error('read failure')}}),/อ่านไฟล์นี้ไม่ได้/);
});

test('membership application can be rejected, corrected, approved and still purchase as seller',async()=>{
  const h=harness();assert.equal(await h.actions.register('ผู้สมัครทดสอบ','applicant@bloom.demo','test12345'),true);const buyerId=h.state.currentUserId;
  assert.equal(h.actions.applyShop({name:'ร้านใหม่',email:'owner@example.test',description:'รายละเอียดร้านค้าทดสอบ'}),true);const shopId=h.state.users.find(u=>u.id===buyerId).shopId;
  h.actions.setRole('admin');assert.equal(h.actions.approveShop(shopId,false,'รายละเอียดเพิ่มเติม'),true);
  assert.equal(await h.actions.login('applicant@bloom.demo','test12345'),true);assert.equal(h.actions.applyShop({name:'ร้านปรับปรุง',email:'owner@example.test',description:'รายละเอียดร้านครบถ้วนสำหรับการตรวจสอบ'}),true);
  h.actions.setRole('admin');assert.equal(h.actions.approveShop(shopId,true),true);await h.actions.login('applicant@bloom.demo','test12345');
  assert.equal(h.state.users.find(u=>u.id===buyerId).role,'seller');assert.equal(h.actions.addCart('p2'),true);
  const orders=h.actions.checkout({name:'ผู้สมัครทดสอบ',phone:'0812345678',address:'99 ที่อยู่ทดสอบ',payment:'demo',coupon:''});assert.equal(orders.length,1);assert.equal(h.state.orders.find(o=>o.id===orders[0]).shopId,'s2');
});

test('profile and password edits reject bad input and old credentials stop working',async()=>{
  const h=harness();h.actions.setRole('user');assert.equal(h.actions.saveProfile({name:'ก'}),false);assert.equal(h.actions.saveProfile({phone:'123'}),false);assert.equal(h.actions.saveProfile({name:'  ผู้ใช้ใหม่  ',phone:'0812345678'}),true);assert.equal(h.state.users.find(u=>u.id==='u1').name,'ผู้ใช้ใหม่');
  assert.equal(await h.actions.changePassword('wrong','newpass123'),false);assert.equal(await h.actions.changePassword('bloom1234','newpass123'),true);h.actions.logout();
  assert.equal(await h.actions.login('prim@bloom.demo','bloom1234'),false);assert.equal(await h.actions.login('prim@bloom.demo','newpass123'),true);
});

test('content activation cannot publish empty templates or invalid portions and activity duration',()=>{
  assert.equal(contentError(seed.content,seed.content),null);
  const content=structuredClone(seed.content);content.mealTemplates[0].entries=[];assert.match(contentError(content,seed.content),/อย่างน้อย 1 รายการ/);
  content.mealTemplates[0].active=false;assert.equal(contentError(content,seed.content),null);
  const badPortion=structuredClone(seed.content);badPortion.mealTemplates[0].entries[0].portions=.1;assert.match(contentError(badPortion,seed.content),/0.5–10/);
  const empty=structuredClone(seed.content);empty.exerciseTemplates[0].days=Array.from({length:7},()=>[]);assert.match(contentError(empty,seed.content),/ต้องมีกิจกรรม/);
  const long=structuredClone(seed.content);long.exerciseTemplates[0].days[0][0].minutes=601;assert.match(contentError(long,seed.content),/0–600/);
});

test('deactivating a food preserves existing templates but blocks new activation using it',()=>{
  const content=structuredClone(seed.content);const usedId=content.mealTemplates[0].entries[0].foodId;content.foods.find(f=>f.id===usedId).active=false;
  assert.equal(contentError(content,seed.content),null);
  const previous=structuredClone(content);previous.mealTemplates[0].active=false;assert.match(contentError(content,previous),/ทุกเมนู/);
  const h=harness();h.actions.setRole('admin');assert.equal(h.actions.saveContent(content,'ปิดอาหารชั่วคราว'),true);
  const invalid=structuredClone(content);invalid.mealTemplates[0].entries[0].portions=2;assert.equal(h.actions.saveContent(invalid,'แก้ชุดที่ไม่พร้อม'),false);
});

test('a failed persistence write does not announce a successful durable save',()=>{
  let state=normalizeState(undefined,seed);const notices=[];
  const actions=createStoreActions(()=>state,next=>{state=next;return false},text=>notices.push(text));
  actions.setRole('user');actions.saveProfile({name:'ข้อมูลค้างบันทึก'});
  assert.equal(state.users.find(u=>u.id==='u1').name,'ข้อมูลค้างบันทึก');
  assert.match(notices.at(-1),/ยังบันทึกลงเครื่องไม่ได้/);
  actions.saveProfile({name:'ก'});assert.match(notices.at(-1),/อย่างน้อย 2/);
});

test('legacy fractional meal portions remain valid when editing unrelated content',()=>{
  const original=structuredClone(seed.content);original.mealTemplates[0].entries[0].portions=.75;
  const changed=structuredClone(original);changed.articles[0].title='ชื่อบทความใหม่';
  assert.equal(contentError(changed,original),null);
});
