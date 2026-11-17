import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './store-harness.mjs';
import {randomUUID} from 'node:crypto';

test('buyer: real store auth, profile, addresses, wishlist, cart, order, password',async t=>{
 const f=await fixture();
 try{
  await t.test('catalog hydration and login',async()=>{assert.equal(f.current().apiConnected,true);await f.role('buyer');assert.equal(f.current().role,'user')});
  const product=f.current().state.products[0];
  await t.test('profile update persists',async()=>{assert.equal(await f.run('saveProfile',{name:'QA Buyer',phone:'0812345678'}),true);assert.equal((await f.api.getMe()).name,'QA Buyer')});
  let address;
  await t.test('address create/edit/default/delete',async()=>{
   assert.equal(await f.run('saveAddress',{id:'draft',userId:f.current().user.id,label:'QA',name:'QA Buyer',phone:'0812345678',address:'123 Test Bangkok 10110',isDefault:false}),true);
   address=f.current().state.addresses.find(a=>a.label==='QA');assert.ok(address);
   assert.equal(await f.run('saveAddress',{...address,address:'456 Test Bangkok 10110'}),true);
   assert.equal(await f.run('setDefaultAddress',address.id),true);
   assert.equal((await f.api.getAddresses()).find(a=>a.id===address.id).isDefault,true);
   assert.equal(await f.run('deleteAddress',address.id),true);
   assert.equal((await f.api.getAddresses()).some(a=>a.id===address.id),false);
  });
  await t.test('wishlist add/reload/remove persists',async()=>{assert.equal(await f.run('toggleWish',product.id),true);assert.ok((await f.api.getWishlist()).some(p=>p.id===product.id));await f.current().refreshData();assert.ok(f.current().state.wishlist.includes(product.id));await f.run('toggleWish',product.id);assert.equal((await f.api.getWishlist()).some(p=>p.id===product.id),false)});
  await t.test('cart and checkout hydrate full order details',async()=>{
   assert.deepEqual(await Promise.all([f.run('addCart',product.id),f.run('addCart',product.id)]),[true,true]);
   const a=f.current().state.addresses[0];
   const ids=await f.run('checkout',{addressId:a.id,name:a.name,phone:a.phone,address:a.address,payment:'demo',coupon:''});
   assert.equal(ids.length,1,f.current().toast);assert.equal(f.current().state.cart.length,0);
   const order=f.current().state.orders.find(o=>o.id===ids[0]);assert.equal(order.items[0].quantity,2);assert.equal(order.buyerId,f.current().user.id);
   assert.equal((await f.api.getMyOrders()).orders.find(o=>o.id===ids[0]).items.length,1);
  });
  await t.test('change password rejects old password and accepts new',async()=>{
   assert.equal(await f.run('changePassword','BloomDemoPass1234!','Local-Test-New-Password-42'),true);
   assert.equal(await f.run('login','buyer@bloom.example.test','BloomDemoPass1234!'),false);
   assert.equal(await f.run('login','buyer@bloom.example.test','Local-Test-New-Password-42'),true);
  });
  assert.equal(f.requests.some(r=>r.status===429),false);
 }finally{await f.close()}
});

test('account switching never merges another account cart or grants a demo role after API failure',async t=>{
 const f=await fixture();
 try{
  await f.role('buyer');const product=f.current().state.products[0];
  await f.run('addCart',product.id);
  await t.test('direct account switch keeps buyer cart out of seller cart',async()=>{
   assert.equal(await f.run('login','seller@bloom.example.test','BloomDemoPass1234!'),true);
   assert.equal((await f.api.getCart()).length,0);
  });
  await t.test('failed role login does not fall back to local administrator',async()=>{
   const fetch=globalThis.fetch;
   globalThis.fetch=async(url,opts)=>url.endsWith('/auth/login')?Response.json({error:{code:'INTERNAL_ERROR',message:'QA unavailable'}},{status:500}):fetch(url,opts);
   try{assert.equal(await f.run('setRole','admin'),false);assert.equal(f.current().role,'seller')}finally{globalThis.fetch=fetch}
  });
  await t.test('anonymous cart still merges on login',async()=>{
   await f.run('logout');assert.equal(await f.run('addCart',product.id),true);
   assert.equal(await f.run('login','seller@bloom.example.test','BloomDemoPass1234!'),true);
   assert.equal((await f.api.getCart()).find(p=>p.productId===product.id).quantity,1);
  });
 }finally{await f.close()}
});

test('wellness: frontend services persist diary, exercise, templates, profile and bookmarks',async t=>{
 const f=await fixture();
 try{
  await f.role('buyer');const date='2026-11-16';
  await t.test('meal add/edit/read/delete and invalid ID rejection',async()=>{
   const food=(await f.api.getFoods())[0];assert.ok(food);
   const row=await f.api.logMealEntry({date,foodId:food.id,meal:'breakfast',portions:1});
   await f.api.updateMealEntry(row.id,{portions:2});
   assert.equal((await f.api.getMealDiary({date})).entries.find(x=>x.id===row.id).portions,2);
   await f.api.deleteMealEntry(row.id);assert.equal((await f.api.getMealDiary({date})).entries.some(x=>x.id===row.id),false);
   await assert.rejects(f.api.logMealEntry({date,foodId:'local-invalid',meal:'breakfast',portions:1}));
  });
  await t.test('meal template writes entries',async()=>{const template=(await f.api.getMealTemplates())[0];await f.api.applyMealTemplate(template.id,date,'replace');assert.ok((await f.api.getMealDiary({date})).entries.length>0)});
  await t.test('exercise add/edit/complete/read/delete',async()=>{
   const entry=await f.api.addExerciseEntry({date,name:'QA walk',minutes:20,type:'cardio'});
   await f.api.updateExerciseEntry(entry.id,{minutes:30,completed:true});
   const schedule=await f.api.getExerciseSchedule(date);
   const row=schedule.days.flatMap(d=>d.activities).find(x=>x.id===entry.id);
   assert.equal(row.minutes,30);assert.equal(row.completed,true);
   await f.api.deleteExerciseEntry(entry.id);
   assert.equal((await f.api.getExerciseSchedule(date)).days.flatMap(d=>d.activities).some(x=>x.id===entry.id),false);
  });
  await t.test('exercise template persists seven days',async()=>{const template=(await f.api.getExerciseTemplates())[0];await f.api.applyExerciseTemplate(template.id,date,'replace');const schedule=await f.api.getExerciseSchedule(date);assert.equal(schedule.days.length,7);assert.ok(schedule.days.flatMap(d=>d.activities).length>0)});
  await t.test('health profile add/read/delete',async()=>{await f.api.saveHealthProfile({heightCm:176,weightKg:80,goal:'QA fitness'});assert.equal((await f.api.getHealthProfile()).weightKg,80);await f.api.deleteHealthProfile();const profile=await f.api.getHealthProfile();assert.ok(!profile||profile.weightKg==null)});
  await t.test('article bookmark add/read/remove',async()=>{const article=(await f.api.getPublishedArticles()).articles[0];await f.api.addArticleBookmark(article.id);assert.ok((await f.api.getArticleBookmarks()).some(a=>a.id===article.id));await f.api.removeArticleBookmark(article.id);assert.equal((await f.api.getArticleBookmarks()).some(a=>a.id===article.id),false)});
  assert.equal(f.requests.some(r=>r.status===429),false);
 }finally{await f.close()}
});

test('admin CMS: store saveContent persists all four collections under a rapid reload batch',async t=>{
 const f=await fixture();
 try{
  await f.role('admin');
  const definitions={
   articles:{title:'QA article',subtitle:'Test subtitle',category:'QA',tag:'QA',time:'5 min',image:'hero',paras:['QA body'],published:true},
   foods:{name:'QA Food',detail:'one serving',kcal:100,group:'QA',active:true},
   mealTemplates:{name:'QA Meals',description:'QA meal plan',active:true,entries:[{foodId:f.current().state.content.foods[0].id,meal:'breakfast',portions:1}]},
   exerciseTemplates:{name:'QA Exercise',description:'QA plan',active:true,days:Array.from({length:7},()=>[{id:'draft',name:'Walk',minutes:20,type:'cardio'}])},
  };
  for(const [kind,definition] of Object.entries(definitions)) await t.test(kind+' create/update/delete survives reload',async()=>{
   let next=structuredClone(f.current().state.content);next[kind].push({id:'draft',...definition});
   assert.equal(await f.run('saveContent',next),true,f.current().toast);
   let row=f.current().state.content[kind].find(x=>(x.title||x.name)===(definition.title||definition.name));assert.ok(row);
   next=structuredClone(f.current().state.content);next[kind]=next[kind].map(x=>x.id===row.id?{...x,...(kind==='articles'?{published:false}:{active:false})}:x);
   assert.equal(await f.run('saveContent',next),true,f.current().toast);
   await f.current().refreshData();row=f.current().state.content[kind].find(x=>x.id===row.id);assert.ok(row);assert.equal(kind==='articles'?row.published:row.active,false);
   next=structuredClone(f.current().state.content);next[kind]=next[kind].filter(x=>x.id!==row.id);
   assert.equal(await f.run('saveContent',next),true,f.current().toast);
   assert.equal(f.current().state.content[kind].some(x=>x.id===row.id),false);
  });
  t.diagnostic('CMS rapid batch 429 responses: '+f.requests.filter(r=>r.status===429).length);
  assert.equal(f.requests.some(r=>r.method!=='GET'&&r.status>=400),false);
 }finally{await f.close()}
});

test('membership: register, apply, approve, suspend, block and permissions',async t=>{
 const f=await fixture();let id,shopId;const email='qa-'+randomUUID()+'@example.test';const password='QA-Registration-Password-42';
 try{
  await t.test('register and apply for shop',async()=>{assert.equal(await f.run('register','QA Applicant',email,password),true,f.current().toast);id=f.current().user.id;assert.equal(await f.run('applyShop',{name:'QA Shop',email,description:'QA shop application'}),true,f.current().toast);shopId=(await f.api.getMyShop()).id;assert.ok(shopId)});
  await t.test('buyer cannot create admin category',async()=>{await assert.rejects(f.api.createAdminCategory({name:'Forbidden category'}),{status:403})});
  await f.role('admin');
  await t.test('approve shop promotes seller',async()=>{assert.equal(await f.run('approveShop',shopId,true),true);const shop=(await f.api.getAdminShops()).find(s=>s.id===shopId);assert.equal(shop.status,'approved')});
  await t.test('suspend and reopen shop',async()=>{assert.equal(await f.run('suspendShop',shopId,true,'QA suspension'),true);assert.equal((await f.api.getAdminShops()).find(s=>s.id===shopId).status,'suspended');assert.equal(await f.run('suspendShop',shopId,false,'QA reopen'),true)});
  await t.test('block member prevents login',async()=>{assert.equal(await f.run('setUserBlocked',id,true),true);await f.run('logout');assert.equal(await f.run('login',email,password),false)});
  assert.equal(f.requests.some(r=>r.status===429),false);
 }finally{await f.close()}
});

test('commerce: transfer proof, approval, shipment, delivery and review',async t=>{
 const f=await fixture();let orderId,productId;
 try{
  await f.role('buyer');
  await t.test('checkout uploads proof and creates pending order',async()=>{
   productId=f.current().state.products.find(p=>p.shopId==='b1000000-0003-4000-8000-000000000001').id;
   assert.equal(await f.run('addCart',productId),true);const a=f.current().state.addresses[0];
   const receipt='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
   const ids=await f.run('checkout',{addressId:a.id,name:a.name,phone:a.phone,address:a.address,payment:'transfer',receipt,coupon:''});
   assert.equal(ids.length,1,f.current().toast);orderId=ids[0];assert.equal((await f.api.getOrder(orderId)).paymentStatus,'awaiting_review');
  });
  await f.role('admin');
  await t.test('admin reads proof and approves',async()=>{const proofs=await f.api.getOrderPaymentProofs(orderId);assert.ok(proofs.length>0);assert.equal(await f.run('updateOrder',orderId,'paid'),true,f.current().toast);assert.equal((await f.api.getOrder(orderId)).status,'paid')});
  await f.role('seller');
  await t.test('seller prepares, validates tracking and ships',async()=>{assert.equal(await f.run('updateOrder',orderId,'preparing'),true,f.current().toast);assert.equal(await f.run('updateOrder',orderId,'shipped',{}),false);assert.equal(await f.run('updateOrder',orderId,'shipped',{carrier:'QA Carrier',tracking:'QA123456'}),true,f.current().toast)});
  await t.test('seller sales report loads',async()=>{assert.ok(await f.api.getSellerSalesReport())});
  await f.role('buyer');
  await t.test('buyer receives, reviews and cannot review twice',async()=>{assert.equal(await f.run('updateOrder',orderId,'delivered'),true,f.current().toast);assert.equal(await f.run('addReview',productId,5,'QA verified delivery'),true,f.current().toast);assert.ok(f.current().state.reviews.some(r=>r.productId===productId));assert.equal(await f.run('addReview',productId,5,'Duplicate'),false)});
  assert.equal(f.requests.some(r=>r.status===429),false);
 }finally{await f.close()}
});

test('order cancellation, refund, notifications and sales report',async t=>{
 const f=await fixture();let orderId,product,stock;
 try{
  await f.role('buyer');product=f.current().state.products[0];stock=product.stock;
  await t.test('buyer cannot cancel an already paid order',async()=>{
   await f.run('addCart',product.id);const a=f.current().state.addresses[0];
   const ids=await f.run('checkout',{addressId:a.id,name:a.name,phone:a.phone,address:a.address,payment:'demo',coupon:''});orderId=ids[0];assert.ok(orderId);
   assert.equal(await f.run('updateOrder',orderId,'cancelled'),false);
   assert.equal((await f.api.getProduct(product.id)).stock,stock-1);
  });
  await t.test('notification mark-read persists',async()=>{await f.run('markNotificationsRead');assert.ok((await f.api.getNotifications()).every(n=>n.readAt))});
  await f.role('admin');
  await t.test('admin cancellation restores stock exactly once',async()=>{
   assert.equal(await f.run('updateOrder',orderId,'cancelled'),true,f.current().toast);
   assert.equal((await f.api.getProduct(product.id)).stock,stock);
   assert.equal((await f.api.getOrder(orderId)).paymentStatus,'refund_pending');
   assert.equal(await f.run('updateOrder',orderId,'cancelled'),true);
   assert.equal((await f.api.getProduct(product.id)).stock,stock);
  });
  await t.test('admin records refund and reads report',async()=>{assert.equal(await f.run('completeRefund',orderId),true,f.current().toast);assert.equal((await f.api.getOrder(orderId)).paymentStatus,'refunded');assert.ok(await f.api.getAdminSalesReport())});
 }finally{await f.close()}
});

test('seller and admin: products, categories, promotions, settings and membership',async t=>{
 const f=await fixture();
 try{
  await f.role('seller');let product;
  await t.test('seller creates, edits and hides product',async()=>{
   const template=f.current().state.products.find(p=>p.shopId===f.current().user.shopId);
   assert.ok(template);
   assert.equal(await f.run('saveProduct',{...template,id:'qa-new',name:'QA Created Product',stock:7}),true,f.current().toast);
   product=f.current().state.products.find(p=>p.name==='QA Created Product');assert.ok(product);
   assert.equal(await f.run('saveProduct',{...product,price:123,active:false}),true);
   await f.current().refreshData();assert.equal(f.current().state.products.find(p=>p.id===product.id).active,false);
   assert.equal(await f.run('saveProduct',{...product,price:123,active:true}),true);
   assert.equal(await f.run('deleteProduct',product.id),true);
  });
  await t.test('seller updates shop',async()=>{const shop=f.current().state.shops.find(s=>s.id===f.current().user.shopId);assert.equal(await f.run('saveShop',{...shop,description:'Updated QA store'}),true);assert.equal((await f.api.getMyShop()).description,'Updated QA store')});
  await f.role('admin');
  await t.test('admin creates product in selected shop',async()=>{const p=f.current().state.products[0];assert.equal(await f.run('saveProduct',{...p,id:'new-admin',name:'QA Admin Product',stock:2}),true,f.current().toast);const saved=f.current().state.products.find(p=>p.name==='QA Admin Product');assert.ok(saved);assert.equal(await f.run('deleteProduct',saved.id),true)});
  await t.test('category create/hide/reload/show/delete',async()=>{
   assert.equal(await f.run('saveCategory',{id:'new-category',name:'QA Category',icon:'heart',description:'QA category',active:true}),true);
   const c=f.current().state.categories.find(c=>c.name==='QA Category');assert.ok(c);
   assert.equal(await f.run('saveCategory',{...c,active:false}),true);
   await f.current().refreshData();assert.equal(f.current().state.categories.find(x=>x.id===c.id).active,false);
   assert.equal(await f.run('saveCategory',{...c,active:true}),true);
   assert.equal(await f.run('deleteCategory',c.id),true);
  });
  await t.test('admin promotion create/edit/delete',async()=>{
   assert.equal(await f.run('savePromotion',{id:'new-promo',code:'QATEST',title:'QA promotion',percent:10,active:true,shopId:null}),true,f.current().toast);
   const p=f.current().state.promotions.find(p=>p.code==='QATEST');assert.ok(p);
   assert.equal(await f.run('savePromotion',{...p,percent:15}),true);
   assert.equal((await f.api.getAdminPromotions()).find(x=>x.id===p.id).percent,15);
   assert.equal(await f.run('deletePromotion',p.id),true);
  });
  await t.test('site settings persist',async()=>{assert.equal(await f.run('saveSiteSettings','QA Bloom','QA Notice'),true);assert.equal((await f.api.getSiteSettings()).siteTitle,'QA Bloom')});
  assert.equal(f.requests.some(r=>r.status===429),false);
 }finally{await f.close()}
});
