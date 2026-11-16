import type {Order,Page,Shop} from './types';

/** The unfragmented root URL is the home route, including after browser Back. */
export function buyerPageFromHash(hash:string,allowed:readonly Page[]):Page {
 const page=hash.replace(/^#/,'').split('?')[0] as Page;
 return allowed.includes(page)?page:'home';
}

/** Patch only the requested query keys, keeping shop/dashboard context intact. */
export function buyerHashWith(hash:string,changes:Record<string,string|null|undefined>):string {
 const source=hash.replace(/^#/,'');
 const separator=source.indexOf('?');
 const page=(separator<0?source:source.slice(0,separator))||'home';
 const params=new URLSearchParams(separator<0?'':source.slice(separator+1));
 for(const [key,value] of Object.entries(changes)) {
  if(value===null||value===undefined||value==='')params.delete(key);
  else params.set(key,value);
 }
 const query=params.toString();
 return page+(query?'?'+query:'');
}

export function buyerHashQuery(hash:string,key:string):string {
 const separator=hash.indexOf('?');
 return separator<0?'':new URLSearchParams(hash.slice(separator+1)).get(key)||'';
}

export function notificationDestination(page:string|undefined,orderId?:string):string {
 const destination=page||'orders';
 if(!orderId)return destination;
 return buyerHashWith(destination,{order:orderId,...(['seller','admin'].includes(destination)?{view:'orders'}:{})});
}

export type BuyerOrderFilter={status:string;search:string;from:string;to:string;sort:'newest'|'oldest'};
export function filterBuyerOrders(orders:Order[],shops:Shop[],filter:BuyerOrderFilter):Order[] {
 const search=filter.search.trim().toLocaleLowerCase();
 const from=filter.from?new Date(filter.from+'T00:00:00').getTime():-Infinity;
 const end=filter.to?new Date(filter.to+'T00:00:00'):null;
 if(end)end.setDate(end.getDate()+1);
 const to=end?end.getTime():Infinity;
 if(Number.isNaN(from)||Number.isNaN(to)||from>=to)return [];
 return orders.filter(order=>{
  const date=new Date(order.date).getTime();
  const haystack=[order.id,shops.find(s=>s.id===order.shopId)?.name,order.tracking,...order.items.map(i=>i.name)].join(' ').toLocaleLowerCase();
  return (filter.status==='all'||order.status===filter.status)&&date>=from&&date<to&&(!search||haystack.includes(search));
 }).sort((a,b)=>(new Date(b.date).getTime()-new Date(a.date).getTime())*(filter.sort==='oldest'?-1:1));
}
