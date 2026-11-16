import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const compiled=await build({stdin:{contents:"export {seed} from './src/data'; export * from './src/domain'; export {createStoreActions} from './src/actions';",resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {seed,normalizeState,createStoreActions,calculateCart}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const proof='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
function harness(raw){let state=normalizeState(raw,seed);const notices=[];const actions=createStoreActions(()=>state,s=>{state=s},s=>notices.push(s));return {get state(){return state},set(s){state=s},actions,notices}}
function buyer(h){h.actions.setRole('user')}
function checkout(h,opts={}){return h.actions.checkout({name:'ผู้ซื้อทดสอบ',address:'99 ที่อยู่ตัวอย่าง เชียงใหม่ 50200',phone:'0812345678',payment:'demo',coupon:'',...opts})}
function purchased(h,productId='p1'){buyer(h);h.actions.addCart(productId);return checkout(h)[0]}

test('multi-shop checkout agrees with quoted discount, shipping, snapshots and stock',()=>{
 const h=harness();buyer(h);h.actions.addCart('p1');h.actions.addCart('p2');
 const q=h.actions.quoteCart('bloom10');assert.deepEqual([q.subtotal,q.shipping,q.discount,q.total],[1080,80,108,1052]);
 const ids=checkout(h,{coupon:'bloom10'});assert.equal(ids.length,2);const placed=h.state.orders.filter(o=>ids.includes(o.id));assert.deepEqual(placed.map(o=>o.total),[391,661]);assert.equal(placed[0].phone,'0812345678');assert.equal(h.state.products.find(p=>p.id==='p1').stock,23);assert.equal(h.state.cart.length,0);assert.equal(h.state.promotions[0].usedCount,1);assert.equal(h.state.stockMovements.length,2);assert.ok(placed.every(o=>o.history.length===1));
});

test('seller coupon only discounts its store, enforces minimum, cap, dates and usage once per checkout',()=>{
 const h=harness();h.actions.setRole('seller');assert.equal(h.actions.savePromotion({id:'limited',code:'STORE30',title:'ทดสอบคูปองร้าน',percent:20,active:true,shopId:'s1',minSpend:500,maxDiscount:30,usageLimit:1,startsAt:'2020-01-01',endsAt:'2099-12-31'}),true);
 buyer(h);h.actions.addCart('p1');h.actions.addCart('p2');assert.match(h.actions.quoteCart('STORE30').couponError,/ต่อร้าน/);assert.equal(checkout(h,{coupon:'STORE30'}).length,0);
 h.actions.addCart('p1');const q=h.actions.quoteCart('STORE30');assert.equal(q.discount,30);assert.equal(q.groups.find(g=>g.shopId==='s2').discount,0);assert.equal(checkout(h,{coupon:'STORE30'}).length,2);
 h.actions.addCart('p1',2);assert.match(h.actions.quoteCart('STORE30').couponError,/ครบจำนวน/);
 const future={...h.state,promotions:[{id:'x',code:'FUTURE',title:'future',percent:10,active:true,startsAt:'2026-11-15',endsAt:'2026-11-20'}]};assert.match(calculateCart(future,'FUTURE',new Date('2026-11-14T12:00:00')).couponError,/ยังไม่ถึง/);assert.equal(calculateCart(future,'FUTURE',new Date('2026-11-20T12:00:00')).couponError,undefined);assert.match(calculateCart(future,'FUTURE',new Date('2026-11-21T12:00:00')).couponError,/หมดอายุ/);
});

test('payment correction completes with timestamped events and correct seller/buyer permissions',()=>{
 const h=harness();buyer(h);h.actions.addCart('p1');assert.equal(checkout(h,{payment:'transfer'}).length,0);const orderId=checkout(h,{payment:'transfer',receipt:proof})[0];assert.ok(orderId);
 h.actions.setRole('admin');assert.equal(h.actions.rejectPayment(orderId,''),false);assert.equal(h.actions.rejectPayment(orderId,'ภาพไม่ชัด กรุณาส่งใหม่'),true);assert.equal(h.actions.updateOrder(orderId,'paid'),false);
 h.actions.setRole('seller');assert.equal(h.actions.resubmitPayment(orderId,proof),false);buyer(h);assert.equal(h.actions.resubmitPayment(orderId,proof),true);
 h.actions.setRole('admin');assert.equal(h.actions.updateOrder(orderId,'paid'),true);h.actions.setRole('seller');assert.equal(h.actions.updateOrder(orderId,'shipped',{carrier:'ทดสอบ',tracking:'T123'}),false);assert.equal(h.actions.updateOrder(orderId,'preparing'),true);assert.equal(h.actions.updateOrder(orderId,'shipped',{tracking:'T123'}),false);assert.equal(h.actions.updateOrder(orderId,'shipped',{carrier:'ทดสอบ',tracking:'T123'}),true);buyer(h);assert.equal(h.actions.updateOrder(orderId,'delivered'),true);
 const order=h.state.orders.find(o=>o.id===orderId);assert.equal(order.history.length,7);assert.ok(order.history.every(e=>!Number.isNaN(Date.parse(e.at))));assert.equal(order.paymentStatus,'paid');assert.equal(order.tracking,'T123');
});

test('cancellation is idempotent and paid cancellation requires a separate simulated refund',()=>{
 const h=harness();buyer(h);const initial=h.state.products.find(p=>p.id==='p1').stock;h.actions.addCart('p1',2);const orderId=checkout(h,{payment:'transfer',receipt:proof})[0];assert.equal(h.actions.updateOrder(orderId,'cancelled'),true);assert.equal(h.actions.updateOrder(orderId,'cancelled'),false);assert.equal(h.state.products.find(p=>p.id==='p1').stock,initial);assert.equal(h.state.stockMovements.filter(m=>m.orderId===orderId&&m.change>0).length,1);
 const paidId=purchased(h);h.actions.setRole('admin');assert.equal(h.actions.updateOrder(paidId,'cancelled'),true);assert.equal(h.state.orders.find(o=>o.id===paidId).paymentStatus,'refund_pending');assert.equal(h.actions.completeRefund(paidId),true);assert.equal(h.actions.completeRefund(paidId),false);assert.equal(h.state.orders.find(o=>o.id===paidId).paymentStatus,'refunded');assert.equal(h.state.products.find(p=>p.id==='p1').stock,initial);
});

test('account carts and wishlists remain isolated; actual guest login merges only the guest cart',async()=>{
 const h=harness();h.actions.addCart('p1');h.actions.toggleWish('p4');h.actions.setRole('seller');assert.equal(h.state.cart.length,0);assert.equal(h.state.wishlist.length,0);h.actions.addCart('p6');h.actions.setRole('guest');assert.deepEqual(h.state.cart,[{productId:'p1',quantity:1}]);assert.equal(await h.actions.login('prim@bloom.demo','bloom1234'),true);assert.deepEqual(h.state.cart,[{productId:'p1',quantity:1}]);assert.ok(h.state.wishlist.includes('p4'));h.actions.logout();assert.equal(h.state.cart.length,0);assert.equal(h.state.wishlist.length,0);h.actions.setRole('seller');assert.deepEqual(h.state.cart,[{productId:'p6',quantity:1}]);buyer(h);assert.deepEqual(h.state.cart,[{productId:'p1',quantity:1}]);
});

test('blocked demo account cannot re-enter or perform protected actions',async()=>{
 const h=harness();h.actions.setRole('admin');assert.equal(h.actions.setUserBlocked('u3',true),false);assert.equal(h.actions.setUserBlocked('u1',true),true);assert.equal(h.actions.setRole('user'),false);assert.equal(await h.actions.login('prim@bloom.demo','bloom1234'),false);assert.equal(h.state.currentUserId,'u3');
 h.set({...h.state,currentUserId:'u1'});assert.equal(h.actions.saveProfile({name:'Blocked edit'}),false);assert.deepEqual(checkout(h),[]);
});

test('active categories and stores govern sale availability; referenced categories are preserved',()=>{
 const h=harness();buyer(h);h.actions.addCart('p1');h.actions.setRole('admin');assert.equal(h.actions.deleteCategory('supplements'),false);const cat=h.state.categories.find(c=>c.id==='supplements');assert.equal(h.actions.saveCategory({...cat,active:false}),true);buyer(h);assert.deepEqual(checkout(h),[]);assert.equal(h.actions.addCart('p1'),false);h.actions.setRole('admin');h.actions.saveCategory({...cat,active:true});assert.equal(h.actions.suspendShop('s1',true,'ตรวจสอบข้อมูล'),true);buyer(h);assert.deepEqual(checkout(h),[]);h.actions.setRole('admin');h.actions.suspendShop('s1',false);buyer(h);assert.equal(checkout(h).length,1);
});

test('each delivered item can be reviewed once and moderation updates visible rating/count',()=>{
 const h=harness();buyer(h);h.actions.addCart('p1');h.actions.addCart('p6');const orderId=checkout(h)[0];assert.equal(h.actions.addReview('p1',5,'ยังไม่ได้รับ'),false);h.actions.setRole('seller');h.actions.updateOrder(orderId,'preparing');h.actions.updateOrder(orderId,'shipped',{carrier:'ขนส่งตัวอย่าง',tracking:'DEMO1'});buyer(h);h.actions.updateOrder(orderId,'delivered');const before=h.state.products.find(p=>p.id==='p1').reviews;assert.equal(h.actions.addReview('p1',1,'รีวิวรายการแรก'),true);assert.equal(h.actions.addReview('p6',5,'รีวิวรายการที่สอง'),true);assert.equal(h.actions.addReview('p1',5,'ซ้ำ'),false);const r=h.state.reviews.find(r=>r.userId==='u1'&&r.productId==='p1');assert.equal(h.state.products.find(p=>p.id==='p1').reviews,before+1);h.actions.setRole('seller');assert.equal(h.actions.replyReview(r.id,'ขอบคุณค่ะ'),true);h.actions.setRole('admin');assert.equal(h.actions.moderateReview(r.id,true,''),false);assert.equal(h.actions.moderateReview(r.id,true,'ตรวจสอบข้อความ'),true);assert.equal(h.state.products.find(p=>p.id==='p1').reviews,before);h.actions.moderateReview(r.id,false);assert.equal(h.state.products.find(p=>p.id==='p1').reviews,before+1);
});

test('seller cannot move ownership, alter another store product, or create a global coupon',()=>{
 const h=harness();h.actions.setRole('seller');const mine=h.state.products.find(p=>p.shopId==='s1'),other=h.state.products.find(p=>p.shopId==='s2');assert.equal(h.actions.saveProduct({...other,price:1}),false);assert.equal(h.actions.saveProduct({...mine,shopId:'s2'}),false);assert.equal(h.actions.savePromotion({id:'x',code:'GLOBAL',title:'bad',percent:100,active:true}),false);assert.equal(h.actions.replyReview('r1','wrong store'),false);assert.equal(h.actions.updateOrder('BL-261112-1038','cancelled'),false);
});

test('product photo and prices are snapshotted while edits retain creation date',()=>{
 const h=harness();h.actions.setRole('seller');const product={...h.state.products.find(p=>p.id==='p1'),id:'photo-test',name:'สินค้ามีภาพทดสอบ',customImage:proof,stock:3,price:123};assert.equal(h.actions.saveProduct(product),true);const createdAt=h.state.products.find(p=>p.id===product.id).createdAt;buyer(h);h.actions.addCart(product.id);const orderId=checkout(h)[0];h.actions.setRole('seller');const latest=h.state.products.find(p=>p.id===product.id);assert.equal(h.actions.saveProduct({...latest,price:222,customImage:undefined}),true);const snapshot=h.state.orders.find(o=>o.id===orderId).items[0];assert.equal(snapshot.price,123);assert.equal(snapshot.customImage,proof);assert.equal(h.state.products.find(p=>p.id===product.id).createdAt,createdAt);
});

test('duplicate concurrent registration is rejected and address actions are owner scoped',async()=>{
 const h=harness();const count=h.state.users.length;const result=await Promise.all([h.actions.register('คนทดสอบ','new@bloom.demo','test12345'),h.actions.register('คนทดสอบ','new@bloom.demo','test12345')]);assert.equal(result.filter(Boolean).length,1);assert.equal(h.state.users.length,count+1);const userId=h.state.currentUserId;assert.equal(h.actions.saveAddress({id:'addr1',userId,label:'บ้าน',name:'คนทดสอบ',phone:'0812345678',address:'บ้านทดสอบ',isDefault:false}),true);assert.equal(h.state.addresses.find(a=>a.id==='addr1').isDefault,true);h.actions.setRole('seller');assert.equal(h.actions.deleteAddress('addr1'),false);assert.equal(h.actions.setDefaultAddress('addr1'),false);
});

test('v1 migration retains existing shopping data and rebuilds safe defaults',()=>{
 const legacy={products:structuredClone(seed.products),shops:structuredClone(seed.shops),users:structuredClone(seed.users),orders:structuredClone(seed.orders),reviews:structuredClone(seed.reviews),promotions:structuredClone(seed.promotions),cart:[{productId:'p1',quantity:2}],wishlist:['p4'],currentUserId:'u1',demoRole:'user',siteTitle:'ชื่อเดิม',siteNotice:'เดิม'};
 legacy.products[0].price=499;const result=normalizeState(legacy,seed);assert.equal(result.schemaVersion,2);assert.equal(result.products[0].price,499);assert.equal(result.siteTitle,'ชื่อเดิม');assert.deepEqual(result.carts.u1,legacy.cart);assert.equal(result.carts.u2,undefined);assert.ok(result.categories.length>0&&result.content.articles.length>0);assert.ok(result.addresses.some(a=>a.userId==='u1'&&a.isDefault));assert.equal(result.orders[0].history.length,1);assert.ok(result.products[0].baseReviews>0);
});

test('a cart can be reduced after stock falls, and suspended-shop coupons can be deactivated',()=>{
 const h=harness();buyer(h);h.actions.addCart('p1',5);h.actions.setRole('seller');const p=h.state.products.find(p=>p.id==='p1');h.actions.saveProduct({...p,stock:2});assert.equal(h.actions.savePromotion({id:'suspend-code',code:'PAUSED',title:'คูปองร้าน',shopId:'s1',percent:10,active:true}),true);buyer(h);assert.equal(h.actions.updateCart('p1',4),true);assert.equal(h.state.cart.find(i=>i.productId==='p1').quantity,2);h.actions.setRole('admin');h.actions.suspendShop('s1',true,'ทดสอบพักร้าน');const promo=h.state.promotions.find(p=>p.id==='suspend-code');assert.equal(h.actions.savePromotion({...promo,active:false}),true);assert.equal(h.actions.savePromotion({...promo,active:true}),false);
});
