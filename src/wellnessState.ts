import type {Activity,Article} from './contentTypes';

export type MealEntry={id:string;foodId:string;meal:string;portions:number;name:string;detail:string;kcal:number};
export type HealthProfile={heightCm:number|null;weightKg:number|null;goal:string};
export const emptyHealthProfile:HealthProfile={heightCm:null,weightKg:null,goal:''};
export const mealNames=['มื้อเช้า','มื้อกลางวัน','มื้อเย็น','ของว่าง'];
type StoragePort=Pick<Storage,'getItem'|'setItem'>;
export type StoredWellness<T>={value:T;issue:'read'|'write'|null;recoveryRaw?:string;missing:boolean};
type Normalizer<T>=(value:unknown,initial:T)=>T;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string';
const numberIn=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;

export function wellnessKey(area:string,scopeId:string,week?:string){return 'bloom-wellness-'+area+'-v2:'+scopeId+(week?':'+week:'')}

export function normalizeDiary(raw:unknown):Record<string,MealEntry[]>{
 if(!object(raw))return {};
 const diary:Record<string,MealEntry[]>={};
 for(const [date,entries] of Object.entries(raw)){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Array.isArray(entries))continue;
  const ids=new Set<string>();
  diary[date]=entries.filter((v):v is MealEntry=>{
   if(!object(v)||!text(v.id)||!v.id||ids.has(v.id)||!text(v.foodId)||!text(v.name)||!text(v.detail)||!text(v.meal)||!mealNames.includes(v.meal)||!numberIn(v.portions,.5,10)||!numberIn(v.kcal,0,10000))return false;
   ids.add(v.id);return true;
  }).map(v=>({id:v.id,foodId:v.foodId,name:v.name,detail:v.detail,meal:v.meal,portions:v.portions,kcal:v.kcal}));
 }
 return diary;
}

export function normalizeActivities(raw:unknown,initial:Activity[][]):Activity[][]{
 if(!Array.isArray(raw))return initial;
 const ids=new Set<string>();
 return Array.from({length:7},(_,day)=>(Array.isArray(raw[day])?raw[day]:[]).filter((v:unknown):v is Activity=>{
  if(!object(v)||!text(v.id)||!v.id||ids.has(v.id)||!text(v.name)||!v.name.trim()||!text(v.type)||!numberIn(v.minutes,0,600))return false;
  ids.add(v.id);return true;
 }).map((v:Activity)=>({id:v.id,name:v.name,minutes:v.minutes,type:v.type})));
}

export function normalizeIds(raw:unknown):string[]{return Array.isArray(raw)?[...new Set(raw.filter((id):id is string=>text(id)&&!!id))]:[]}
export function normalizeHealthProfile(raw:unknown):HealthProfile{
 if(!object(raw))return {...emptyHealthProfile};
 return {heightCm:numberIn(raw.heightCm,50,250)?raw.heightCm:null,weightKg:numberIn(raw.weightKg,1,500)?raw.weightKg:null,goal:text(raw.goal)?raw.goal.slice(0,280):''};
}
export function parseHealthProfile(height:string,weight:string,goal:string):{profile?:HealthProfile;error?:string}{
 const heightCm=height.trim()?Number(height):null,weightKg=weight.trim()?Number(weight):null;
 if(heightCm!==null&&!numberIn(heightCm,50,250))return {error:'ส่วนสูงต้องเป็นตัวเลขตั้งแต่ 50–250 ซม. หรือเว้นว่าง'};
 if(weightKg!==null&&!numberIn(weightKg,1,500))return {error:'น้ำหนักต้องเป็นตัวเลขตั้งแต่ 1–500 กก. หรือเว้นว่าง'};
 if(goal.trim().length>280)return {error:'เป้าหมายต้องไม่เกิน 280 ตัวอักษร'};
 return {profile:{heightCm,weightKg,goal:goal.trim()}};
}

export function readWellnessRecord<T>(storage:StoragePort,key:string,initial:T,normalize:Normalizer<T>):StoredWellness<T>{
 let raw:string|null=null;
 try{
  raw=storage.getItem(key);
  if(raw===null)return {value:initial,issue:null,missing:true};
  const parsed=JSON.parse(raw),value=normalize(parsed,initial);
  // Object property order does not indicate damage; compare canonical structures.
  const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  const repaired=JSON.stringify(canonical(value))!==JSON.stringify(canonical(parsed));
  return {value,issue:repaired?'read':null,recoveryRaw:repaired?raw:undefined,missing:false};
 }catch{return {value:initial,issue:'read',recoveryRaw:raw??undefined,missing:false}}
}

export function persistWellnessRecord<T>(storage:StoragePort,key:string,record:StoredWellness<T>,value:T):StoredWellness<T>{
 try{
  // Keep the original malformed record before the first successful replacement.
  if(record.recoveryRaw&&storage.getItem(key+':recovery')===null)storage.setItem(key+':recovery',record.recoveryRaw);
  storage.setItem(key,JSON.stringify(value));
  return {value,issue:null,missing:false};
 }catch{return {...record,value,issue:'write',missing:false}}
}

export function filterArticles(articles:Article[],query:string,category:string,bookmarks:string[]):Article[]{
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return articles.filter(a=>a.published&&(category==='ทั้งหมด'||(category==='ที่บันทึกไว้'?bookmarks.includes(a.id):a.category===category))&&words.every(word=>[a.title,a.subtitle,a.category,a.tag,...a.paras].join(' ').toLocaleLowerCase().includes(word)));
}
