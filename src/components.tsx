import {ActionButton} from './ActionFeedback';
import {X,Check,Star,ShoppingBag,Heart,ChevronRight,Plus,Minus} from 'lucide-react';
import React,{useEffect,useRef} from 'react';
import {money,statusLabels} from './data';
import type {Product} from './types';
import {useStore} from './store';
export function ProductImage({index=0,className='',customImage,name='ภาพสินค้า'}:{index?:number;className?:string;customImage?:string;name?:string}){return <div className={'product-image '+className} role="img" aria-label={name} style={customImage?{backgroundImage:`url(${customImage})`,backgroundSize:'cover',backgroundPosition:'center'}:{backgroundPosition:`${(index%3)*50}% ${index<3?0:100}%`}}/>}
export function ProductCard({product:p,onOpen}:{product:Product;onOpen:(p:Product)=>void}){const {state,toggleWish,addCart}=useStore();return <article className="product-card"><div className="product-visual"><button className="image-button" onClick={()=>onOpen(p)} aria-label={`ดู ${p.name}`}><ProductImage index={p.image} customImage={p.customImage} name={p.name}/></button>{p.badge&&<span className={'product-badge '+(p.badge==='NEW'?'new':'')}>{p.badge}</span>}<ActionButton className={'wish-btn '+(state.wishlist.includes(p.id)?'saved':'')} onClick={()=>toggleWish(p.id)} aria-label={`บันทึก ${p.name}`}><Heart size={17} fill={state.wishlist.includes(p.id)?'currentColor':'none'}/></ActionButton></div><div className="product-info"><button className="store-label shop-link" onClick={()=>{location.hash='store?shop='+encodeURIComponent(p.shopId)}}>{state.shops.find(s=>s.id===p.shopId)?.name}<ChevronRight size={11}/></button><button className="product-name" onClick={()=>onOpen(p)}>{p.name}</button><p>{p.en}</p><div className="rating"><Star size={13} fill="currentColor"/><b>{p.rating.toFixed(1)}</b><span>({p.reviews})</span></div><div className="product-bottom"><div><strong>{money(p.price)}</strong>{p.original>p.price&&<del>{money(p.original)}</del>}</div><button className="add-btn" onClick={()=>addCart(p.id)} disabled={!p.stock||!p.active||state.shops.find(s=>s.id===p.shopId)?.status!=='approved'||!state.categories.find(c=>c.id===p.category)?.active} aria-label={`เพิ่ม ${p.name} ลงตะกร้า`}><Plus size={18}/></button></div></div></article>}
let modalLocks=0;
let priorBodyOverflow='';
export function Modal({title,children,onClose,wide=false}:{title:string;children:React.ReactNode;onClose:()=>void;wide?:boolean}){
 const ref=useRef<HTMLDivElement>(null),closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{
  const last=document.activeElement as HTMLElement|null;
  if(modalLocks===0)priorBodyOverflow=document.body.style.overflow;
  modalLocks++;document.body.style.overflow='hidden';ref.current?.focus();
  const key=(e:KeyboardEvent)=>{
   const dialogs=document.querySelectorAll('[role="dialog"][aria-modal="true"]');
   if(dialogs[dialogs.length-1]!==ref.current)return;
   if(e.key==='Escape'){e.stopPropagation();closeRef.current();return}
   if(e.key==='Tab'){
    const els=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')||[]).filter(el=>el.getClientRects().length>0);
    if(!els.length){e.preventDefault();return}
    const first=els[0],end=els[els.length-1];
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();end.focus()}
    else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus()}
   }
  };
  document.addEventListener('keydown',key);
  return()=>{modalLocks=Math.max(0,modalLocks-1);if(modalLocks===0)document.body.style.overflow=priorBodyOverflow;document.removeEventListener('keydown',key);if(last?.isConnected)last.focus()}
 },[]);
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className={'modal '+(wide?'modal-wide':'')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}><div className="modal-heading"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="ปิดหน้าต่าง"><X size={22}/></button></div>{children}</div></div>
}
export const Status=({value,label}:{value:string;label?:string})=><span className={'status status-'+value}>{label||statusLabels[value]||value}</span>;
export function Empty({title,description,action}:{title:string;description?:string;action?:React.ReactNode}){return <div className="empty"><div className="empty-icon"><ShoppingBag size={33}/></div><h3>{title}</h3><p>{description}</p>{action}</div>}
export function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
export const Quantity=({value,onChange,max=99}:{value:number;onChange:(n:number)=>void;max?:number})=><div className="quantity"><button onClick={()=>onChange(value-1)} disabled={value<=1} aria-label="ลดจำนวน"><Minus size={14}/></button><span>{value}</span><button onClick={()=>onChange(value+1)} disabled={value>=max} aria-label="เพิ่มจำนวน"><Plus size={14}/></button></div>;
export function SectionHeading({eyebrow,title,description,action,onAction}:{eyebrow?:string;title:string;description?:string;action?:string;onAction?:()=>void}){return <div className="section-heading"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description&&<p>{description}</p>}</div>{action&&<button className="text-link" onClick={onAction}>{action}<ChevronRight size={17}/></button>}</div>}
