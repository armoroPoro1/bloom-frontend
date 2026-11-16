import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const compiled=await build({stdin:{contents:"export * from './src/buyerNavigation';",resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {buyerPageFromHash,buyerHashWith,buyerHashQuery,notificationDestination,filterBuyerOrders}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));

test('Back to an unfragmented root URL restores home and clears product selection',()=>{
 const allowed=['home','shop','orders'];
 assert.equal(buyerPageFromHash('#shop?product=p1',allowed),'shop');
 assert.equal(buyerHashQuery('#shop?product=p1','product'),'p1');
 for(const hash of ['', '#', '#unknown'])assert.equal(buyerPageFromHash(hash,allowed),'home');
 assert.equal(buyerHashQuery('','product'),'');
 assert.equal(buyerHashQuery('#','product'),'');
});

test('product deep links preserve store context and remove only product dialog parameters',()=>{
 const linked=buyerHashWith('#store?shop=s1&campaign=pink',{product:'สินค้า & 1',review:'1'});
 assert.equal(buyerHashQuery(linked,'product'),'สินค้า & 1');
 assert.equal(buyerHashQuery(linked,'shop'),'s1');
 assert.equal(buyerHashWith(linked,{product:null,review:null}),'store?shop=s1&campaign=pink');
 assert.equal(buyerHashWith('',{product:'p1'}),'home?product=p1');
});

test('order notifications route to buyer order detail or the correct management order view',()=>{
 assert.equal(notificationDestination(undefined,'BL-001'),'orders?order=BL-001');
 assert.equal(notificationDestination('seller','BL-001'),'seller?order=BL-001&view=orders');
 assert.equal(notificationDestination('admin','BL-001'),'admin?order=BL-001&view=orders');
 assert.equal(notificationDestination('apply'),'apply');
 assert.equal(buyerHashQuery(notificationDestination('orders','BL + ?'),'order'),'BL + ?');
});

const shops=[{id:'s1',name:'Bloom Care'},{id:'s2',name:'Pink Pantry'}];
const orders=[
 {id:'BL-A',shopId:'s1',status:'delivered',date:'2026-11-14T10:00:00',tracking:'TRACK-1',items:[{name:'เซรั่มชมพู'}]},
 {id:'BL-B',shopId:'s2',status:'pending',date:'2026-11-13T23:59:59',items:[{name:'วิตามินรวม'}]},
 {id:'BL-C',shopId:'s1',status:'delivered',date:'2026-11-14T23:59:59',items:[{name:'ครีมบำรุง'}]},
 {id:'BL-D',shopId:'s1',status:'paid',date:'2026-11-15T00:00:00',items:[{name:'เซรั่มชมพู'}]}
];
const base={status:'all',search:'',from:'',to:'',sort:'newest'};
test('order history date range includes the full final day and sorts without mutating source',()=>{
 assert.deepEqual(filterBuyerOrders(orders,shops,{...base,from:'2026-11-14',to:'2026-11-14'}).map(o=>o.id),['BL-C','BL-A']);
 assert.deepEqual(filterBuyerOrders(orders,shops,{...base,from:'2026-11-14',to:'2026-11-14',sort:'oldest'}).map(o=>o.id),['BL-A','BL-C']);
 assert.equal(orders[0].id,'BL-A');
 assert.deepEqual(filterBuyerOrders(orders,shops,{...base,from:'2026-11-15',to:'2026-11-13'}),[]);
});
test('order search matches number, shop, product and tracking while respecting status',()=>{
 assert.deepEqual(filterBuyerOrders(orders,shops,{...base,search:' pink pantry '}).map(o=>o.id),['BL-B']);
 assert.deepEqual(filterBuyerOrders(orders,shops,{...base,search:'track-1'}).map(o=>o.id),['BL-A']);
 assert.deepEqual(filterBuyerOrders(orders,shops,{...base,search:'เซรั่ม',status:'delivered'}).map(o=>o.id),['BL-A']);
 assert.deepEqual(filterBuyerOrders(orders,shops,{...base,search:'BL-C'}).map(o=>o.id),['BL-C']);
});
