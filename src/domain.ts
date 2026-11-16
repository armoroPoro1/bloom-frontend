import type {CartItem,CartQuote,Order,Page,Product,Promotion,State,User} from './types';

export const roundMoney=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export const dateKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const actorOf=(s:State):User|undefined=>s.users.find(u=>u.id===s.currentUserId&&!u.blocked);
export const productAvailable=(s:State,p:Product)=>p.active&&s.shops.some(shop=>shop.id===p.shopId&&shop.status==='approved')&&s.categories.some(c=>c.id===p.category&&c.active);
export const promotionCurrent=(p:Promotion,now=new Date())=>p.active&&(!p.startsAt||p.startsAt<=dateKey(now))&&(!p.endsAt||p.endsAt>=dateKey(now))&&(!p.usageLimit||(p.usedCount||0)<p.usageLimit);

export function calculateCart(s:State,code='',now=new Date()):CartQuote {
 const shopIds=[...new Set(s.cart.map(i=>s.products.find(p=>p.id===i.productId)?.shopId).filter((x):x is string=>!!x))];
 const groups=shopIds.map(shopId=>{
  const shop=s.shops.find(x=>x.id===shopId);
  const items=s.cart.flatMap(i=>{const p=s.products.find(p=>p.id===i.productId&&p.shopId===shopId);return p?[{productId:p.id,name:p.name,price:p.price,quantity:i.quantity,image:p.image,customImage:p.customImage}]:[]});
  const subtotal=roundMoney(items.reduce((n,i)=>n+i.price*i.quantity,0));
  const shipping=subtotal>=(shop?.freeShippingAt??999)?0:(shop?.shippingFee??40);
  return {shopId,items,subtotal,shipping,discount:0,total:roundMoney(subtotal+shipping)};
 });
 let coupon:Promotion|undefined,couponError:string|undefined;
 const normalizedCode=code.trim().toUpperCase();
 if(normalizedCode){
  coupon=s.promotions.find(p=>p.code.toUpperCase()===normalizedCode);
  if(!coupon||!coupon.active)couponError='ไม่พบโค้ดส่วนลดที่เปิดใช้งาน';
  else if(coupon.startsAt&&coupon.startsAt>dateKey(now))couponError='โค้ดนี้ยังไม่ถึงช่วงใช้งาน';
  else if(coupon.endsAt&&coupon.endsAt<dateKey(now))couponError='โค้ดส่วนลดนี้หมดอายุแล้ว';
  else if(coupon.usageLimit&&(coupon.usedCount||0)>=coupon.usageLimit)couponError='โค้ดส่วนลดนี้ถูกใช้ครบจำนวนแล้ว';
  else {
   const matching=groups.filter(g=>!coupon!.shopId||coupon!.shopId===g.shopId);
   if(!matching.length)couponError='โค้ดนี้ใช้ได้เฉพาะสินค้าของร้านที่ร่วมรายการ';
   else if(!matching.some(g=>g.subtotal>=(coupon!.minSpend||0)))couponError=`ยอดสินค้าต่อร้านต้องถึง ฿${(coupon.minSpend||0).toLocaleString('th-TH')} เพื่อใช้โค้ดนี้`;
   else for(const g of matching){if(g.subtotal<(coupon.minSpend||0))continue;g.discount=Math.min(g.subtotal,roundMoney(g.subtotal*coupon.percent/100),coupon.maxDiscount&&coupon.maxDiscount>0?coupon.maxDiscount:Infinity);g.total=roundMoney(g.subtotal+g.shipping-g.discount)}
  }
 }
 if(couponError)coupon=undefined;
 const sum=(field:'subtotal'|'shipping'|'discount'|'total')=>roundMoney(groups.reduce((n,g)=>n+g[field],0));
 return {groups,subtotal:sum('subtotal'),shipping:sum('shipping'),discount:sum('discount'),total:sum('total'),coupon,couponError};
}

export function switchAccount(s:State,userId:string|null,mergeGuest=false):State {
 const from=s.currentUserId||'guest',to=userId||'guest';
 const carts={...s.carts,[from]:s.cart},wishlists={...s.wishlists,[from]:s.wishlist};
 let cart=[...(carts[to]||[])],wishlist=[...(wishlists[to]||[])];
 if(mergeGuest&&from==='guest'&&to!=='guest'){
  const merged=new Map<string,number>();
  for(const i of [...cart,...s.cart])merged.set(i.productId,(merged.get(i.productId)||0)+i.quantity);
  cart=Array.from(merged).flatMap(([productId,quantity])=>{const p=s.products.find(p=>p.id===productId);return p&&productAvailable(s,p)&&p.stock>0?[{productId,quantity:Math.min(quantity,p.stock)}]:[]});
  wishlist=[...new Set([...wishlist,...s.wishlist])];carts.guest=[];wishlists.guest=[];
 }
 const selected=s.users.find(u=>u.id===userId&&!u.blocked);
 return {...s,currentUserId:selected?.id||null,demoRole:selected?.role||'guest',carts:{...carts,[to]:cart},wishlists:{...wishlists,[to]:wishlist},cart,wishlist};
}

export function withBuckets(s:State):State{const owner=s.currentUserId||'guest';return {...s,carts:{...s.carts,[owner]:s.cart},wishlists:{...s.wishlists,[owner]:s.wishlist}}}

export function recalculateReviews(s:State,productId:string):State{
 const visible=s.reviews.filter(r=>r.productId===productId&&!r.hidden);
 return {...s,products:s.products.map(p=>{if(p.id!==productId)return p;const count=(p.baseReviews||0)+visible.length;const total=(p.baseRating||0)*(p.baseReviews||0)+visible.reduce((n,r)=>n+r.rating,0);return {...p,reviews:count,rating:count?Math.round(total/count*10)/10:0}})};
}

/** Upgrade the browser-local v1 dataset without assigning another account's private records. */
export function normalizeState(raw:Partial<State>|undefined,base:State):State{
 let s={...structuredClone(base),...raw,schemaVersion:2} as State;
 const arrays=['products','shops','categories','orders','users','addresses','reviews','promotions','stockMovements','auditLog','notifications','visits'] as const;
 for(const field of arrays)if(!Array.isArray(s[field]))(s as unknown as Record<string,unknown>)[field]=structuredClone(base[field]);
 s.content={...structuredClone(base.content),...(raw?.content||{})};
 for(const field of ['articles','foods','mealTemplates','exerciseTemplates'] as const)if(!Array.isArray(s.content[field]))(s.content as unknown as Record<string,unknown>)[field]=structuredClone(base.content[field]);
 s.cart=Array.isArray(raw?.cart)?raw.cart:[];s.wishlist=Array.isArray(raw?.wishlist)?raw.wishlist:[];
 s.carts=raw?.carts&&typeof raw.carts==='object'?raw.carts:{};
 s.wishlists=raw?.wishlists&&typeof raw.wishlists==='object'?raw.wishlists:structuredClone(base.wishlists);
 s.categories=s.categories.map(c=>({...c,active:c.active!==false}));
 s.shops=s.shops.map(shop=>({...shop,shippingFee:shop.shippingFee??40,freeShippingAt:shop.freeShippingAt??999}));
 s.products=s.products.map((p,index)=>{
  const visible=s.reviews.filter(r=>r.productId===p.id&&!r.hidden);
  const baseReviews=p.baseReviews??Math.max(0,p.reviews-visible.length);
  const baseRating=p.baseRating??(baseReviews?Math.max(0,(p.rating*p.reviews-visible.reduce((n,r)=>n+r.rating,0))/baseReviews):0);
  return {...p,createdAt:p.createdAt||new Date(Date.UTC(2026,10,14)-index*86400000).toISOString(),baseReviews,baseRating};
 });
 s.orders=s.orders.map(o=>({...o,phone:o.phone||s.users.find(u=>u.id===o.buyerId)?.phone||'',paymentStatus:o.paymentStatus||(o.status==='pending'?(o.receipt?'awaiting_review':'unpaid'):o.status==='cancelled'?'unpaid':'paid'),stockReleased:o.stockReleased??o.status==='cancelled',history:o.history?.length?o.history:[{id:'initial-'+o.id,at:o.date,status:o.status,label:'ข้อมูลคำสั่งซื้อเดิม ณ สถานะนี้',actor:'ข้อมูลตัวอย่างเดิม'}]}));
 s.promotions=s.promotions.map(p=>({...p,usedCount:p.usedCount||0}));
 if(!raw?.addresses)s.addresses=s.users.filter(u=>u.address).map(u=>({id:'address-'+u.id,userId:u.id,label:'ที่อยู่หลัก',name:u.name,phone:u.phone,address:u.address,isDefault:true}));
 s=withBuckets(s);
 if(s.currentUserId&&!actorOf(s))s=switchAccount(s,null);
 return s;
}

export const allowedTransitions:Record<Order['status'],Order['status'][]>= {pending:['paid','cancelled'],paid:['preparing','cancelled'],preparing:['shipped'],shipped:['delivered'],delivered:[],cancelled:[]};
export const pageLabels:Record<Page,string>={home:'หน้าแรก',shop:'สินค้า',store:'ร้านค้า',wishlist:'รายการโปรด',orders:'คำสั่งซื้อ',account:'บัญชี',seller:'Seller Center',admin:'Admin',nutrition:'อาหารและแคลอรี',exercise:'ตารางออกกำลังกาย',articles:'บทความ',apply:'สมัครเปิดร้าน'};
export function mergeCartItems(items:CartItem[]):CartItem[]{const map=new Map<string,number>();for(const i of items)map.set(i.productId,(map.get(i.productId)||0)+i.quantity);return Array.from(map,([productId,quantity])=>({productId,quantity}))}
