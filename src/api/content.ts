import {getAllRecords} from './services';
import {apiRequest} from './client';
import type {ContentData} from '../contentTypes';
export async function loadContent(admin=false):Promise<ContentData>{
 const prefix=admin?'/admin':'';
 const [articles,foods,mealTemplates,exerciseTemplates]=await Promise.all(['articles','foods','meal-templates','exercise-templates'].map(path=>getAllRecords<any>(prefix+'/'+path)));
 return {articles:articles.map(a=>({...a,image:a.imageId||'hero'})),foods,mealTemplates,exerciseTemplates};
}
export function contentPayload(kind:keyof ContentData,row:any){
 if(kind==='articles')return {title:row.title,subtitle:row.subtitle,category:row.category,tag:row.tag,time:row.time,paras:row.paras,imageId:/^[0-9a-f-]{36}$/i.test(row.image)?row.image:null,published:row.published};
 if(kind==='foods')return {name:row.name,detail:row.detail,kcal:row.kcal,group:row.group,active:row.active};
 if(kind==='mealTemplates')return {name:row.name,description:row.description,active:row.active,entries:row.entries.map((e:any)=>({foodId:e.foodId,meal:e.meal,portions:e.portions}))};
 return {name:row.name,description:row.description,active:row.active,days:row.days.map((day:any[])=>day.map(a=>({name:a.name,minutes:a.minutes,type:a.type})))};
}
export async function persistContent(before:ContentData,after:ContentData){
 const paths={articles:'articles',foods:'foods',mealTemplates:'meal-templates',exerciseTemplates:'exercise-templates'};
 for(const kind of Object.keys(paths) as (keyof ContentData)[]){
  for(const row of after[kind]){const old=before[kind].find(r=>r.id===row.id);const body=contentPayload(kind,row);
   if(!old||JSON.stringify(body)!==JSON.stringify(contentPayload(kind,old)))await apiRequest('/admin/'+paths[kind]+(old?'/'+row.id:''),{method:old?'PATCH':'POST',body});
  }
  for(const row of before[kind])if(!after[kind].some(r=>r.id===row.id))await apiRequest('/admin/'+paths[kind]+'/'+row.id,{method:'DELETE'});
 }
}
