import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,Bookmark,Check,CheckCircle2,ChevronRight,Clock,Flame,Leaf,Plus,Search,Sparkles,Sun,Trash2,Utensils,Wind,Dumbbell,BookOpen,CalendarDays,Heart,ChevronLeft,Copy,Edit3} from 'lucide-react';
import {Modal,Field,ProductImage} from './components';
import {useStore} from './store';
import type {Activity,Food} from './contentTypes';
import {emptyHealthProfile,filterArticles,normalizeActivities,normalizeDiary,normalizeHealthProfile,normalizeIds,parseHealthProfile,persistWellnessRecord,readWellnessRecord,wellnessKey} from './wellnessState';
import type {HealthProfile,MealEntry,StoredWellness} from './wellnessState';
import * as api from './api/services';
import type {MealEntryDto} from './api/types';
import './wellness.css';

const days=['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','อาทิตย์'];
const dayNames=['MON','TUE','WED','THU','FRI','SAT','SUN'];
const meals=['มื้อเช้า','มื้อกลางวัน','มื้อเย็น','ของว่าง'];
type WellnessProps={active:'nutrition'|'exercise'|'articles';onNavigate:(page:string)=>void};
function useSaved<T>(key:string,initial:T,normalize:(value:unknown,initial:T)=>T){
 const {notify}=useStore();
 const [record,setRecord]=useState(()=>({key,...readWellnessRecord(localStorage,key,initial,normalize)}));
 const current=useRef(record);
 if(current.current.key!==key)current.current={key,...readWellnessRecord(localStorage,key,initial,normalize)};
 const active=record.key===key?record:current.current;
 useEffect(()=>{
  const value=current.current;
  const next=value.missing?{key,...persistWellnessRecord(localStorage,key,value,value.value)}:value;
  current.current=next;setRecord(next);
 },[key]);
 const setValue=(next:T|((previous:T)=>T))=>{
  const old=current.current;
  const value=typeof next==='function'?(next as (previous:T)=>T)(old.value):next;
  const saved:StoredWellness<T>=persistWellnessRecord(localStorage,key,old,value);
  current.current={key,...saved};setRecord(current.current);
  if(saved.issue==='write')notify('บันทึกลงเบราว์เซอร์ไม่สำเร็จ กรุณาลดพื้นที่จัดเก็บแล้วลองอีกครั้ง');
  return saved.issue===null;
 };
 return [active.value,setValue,active.issue] as const;
}
function localDate(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function weekStart(){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return localDate(d)}
function offsetDate(date:string,daysToAdd:number){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+daysToAdd);return localDate(d)}
const dateText=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});
const copyActivities=(source:Activity[][])=>Array.from({length:7},(_,i)=>(source[i]||[]).map(a=>({...a,id:crypto.randomUUID()})));
const snapshotFood=(f:Food,meal:string,portions:number):MealEntry=>({id:crypto.randomUUID(),foodId:f.id,name:f.name,detail:f.detail,kcal:f.kcal,meal,portions});
export function ArticleImage({type}:{type:string}){return type==='hero'?<div className="wellness-editorial-image" role="img" aria-label="ของใช้เพื่อการดูแลตัวเองโทนชมพู"/>:<ProductImage index={type==='food'?4:type==='yoga'?2:5} className="wellness-editorial-product" name="ภาพประกอบบทความ"/>}

export default function Wellness(props:WellnessProps){const {user}=useStore();return <ScopedWellness key={user?.id||'guest'} {...props} scopeId={user?.id||'guest'}/>}
function ScopedWellness({active,onNavigate,scopeId}:WellnessProps&{scopeId:string}){
 const {state,notify,user}=useStore();
 const foods=state.content.foods.filter(f=>f.active),articles=state.content.articles.filter(a=>a.published);
 const mealTemplates=state.content.mealTemplates.filter(t=>t.active),exerciseTemplates=state.content.exerciseTemplates.filter(t=>t.active);
 const initialDay=(new Date().getDay()+6)%7;
 const [week,setWeek]=useState(weekStart),[day,setDay]=useState(initialDay);
 const [meal,setMeal]=useState('มื้อเช้า'),[portions,setPortions]=useState(1),[query,setQuery]=useState(''),[foodGroup,setFoodGroup]=useState('ทั้งหมด');
 const [diary,setDiary,diaryStorageFailed]=useSaved<Record<string,MealEntry[]>>(wellnessKey('diary',scopeId),{},normalizeDiary);
 const dayKey=offsetDate(week,day);
 const defaultActivities=useMemo(()=>copyActivities(user?[]:exerciseTemplates[0]?.days||[]),[week,scopeId]);
 const [activities,setActivities,activityStorageFailed]=useSaved<Activity[][]>(wellnessKey('activities',scopeId,week),defaultActivities,normalizeActivities);
 const [done,setDone,doneStorageFailed]=useSaved<string[]>(wellnessKey('done',scopeId,week),[],normalizeIds);
 const [addOpen,setAddOpen]=useState(false),[editingActivity,setEditingActivity]=useState<string|null>(null),[newName,setNewName]=useState(''),[newMinutes,setNewMinutes]=useState(15),[newType,setNewType]=useState('เคลื่อนไหว');
 const [articleFilter,setArticleFilter]=useState('ทั้งหมด'),[bookmarks,setBookmarks,bookmarkStorageFailed]=useSaved<string[]>(wellnessKey('bookmarks',scopeId),[],normalizeIds),[selectedArticleId,setSelectedArticleId]=useState<string|null>(null);
 const [profile,setProfile,profileStorageFailed]=useSaved<HealthProfile>(wellnessKey('profile',scopeId),emptyHealthProfile,normalizeHealthProfile);
 const [profileOpen,setProfileOpen]=useState(false),[profileHeight,setProfileHeight]=useState(''),[profileWeight,setProfileWeight]=useState(''),[profileGoal,setProfileGoal]=useState(''),[profileError,setProfileError]=useState('');
 const [articleQuery,setArticleQuery]=useState('');
 const openProfile=()=>{setProfileHeight(profile.heightCm===null?'':String(profile.heightCm));setProfileWeight(profile.weightKg===null?'':String(profile.weightKg));setProfileGoal(profile.goal);setProfileError('');setProfileOpen(true)};
 const [templateOpen,setTemplateOpen]=useState<'meal'|'exercise'|null>(null),[templateId,setTemplateId]=useState(''),[templateMode,setTemplateMode]=useState<'append'|'replace'>('append');
 const selectedArticle=active==='articles'?articles.find(a=>a.id===selectedArticleId):undefined;
 const storageIssues=[diaryStorageFailed,activityStorageFailed,doneStorageFailed,bookmarkStorageFailed,profileStorageFailed];
 const storageFailed=storageIssues.includes('write'),readFailed=storageIssues.includes('read');
 const openArticle=(id:string)=>{setSelectedArticleId(id);onNavigate('articles?article='+encodeURIComponent(id))};
 const closeArticle=()=>{setSelectedArticleId(null);history.replaceState(null,'','#articles')};
 const entries=diary[dayKey]||[],total=entries.reduce((sum,e)=>sum+e.kcal*e.portions,0),todayActivities=activities[day]||[];
 const weekCount=activities.flat().filter(a=>done.includes(a.id)).length,weekMinutes=activities.flat().filter(a=>done.includes(a.id)).reduce((s,a)=>s+a.minutes,0);
 const matchingFoods=foods.filter(f=>(foodGroup==='ทั้งหมด'||f.group===foodGroup)&&f.name.toLowerCase().includes(query.trim().toLowerCase()));
 const matchingArticles=filterArticles(articles,articleQuery,articleFilter,bookmarks);
 const selectedMeal=mealTemplates.find(t=>t.id===templateId),selectedExercise=exerciseTemplates.find(t=>t.id===templateId);
 const unavailableMeal=selectedMeal?.entries.some(e=>!foods.some(f=>f.id===e.foodId));
 useEffect(()=>{setQuery('');setAddOpen(false);setTemplateOpen(null)},[active]);
 useEffect(()=>{const read=()=>{const page=location.hash.slice(1).split('?')[0];const id=page==='articles'?new URLSearchParams(location.hash.split('?')[1]||'').get('article'):null;setSelectedArticleId(active==='articles'?id:null)};read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read)},[active]);
 useEffect(()=>{
  if (!user) return;
  api.getHealthProfile().then(p => {
   if (p) setProfile({ heightCm: p.heightCm ?? null, weightKg: p.weightKg ?? null, goal: p.goal || '' });
  }).catch(() => {});
  api.getArticleBookmarks().then(list => {
   if (list) setBookmarks(list.map(a => a.id));
  }).catch(() => {});
 }, [user?.id]);
 const [syncing,setSyncing]=useState(false);
 const busy=useRef(false);
 const epoch=useRef(0);
 const toMeal=(row:MealEntryDto):MealEntry=>({id:row.id,foodId:row.foodId||'',name:row.foodName,detail:row.detail,kcal:row.kcalPerPortion,meal:row.meal,portions:row.portions});
 const loadPersonal=async()=>{
  const version=++epoch.current;
  const [rows,schedule]=await Promise.all([api.getAllRecords<MealEntryDto>('/me/meal-diary',{from:week,to:offsetDate(week,6)}),api.getExerciseSchedule(week)]);
  if(version!==epoch.current)return;
  setDiary(d=>{const next={...d};for(let i=0;i<7;i++){const date=offsetDate(week,i);next[date]=rows.filter(r=>r.date===date).map(toMeal);}return next;});
  setActivities(schedule.days.map(d=>d.activities.map(a=>({id:a.id,name:a.name,minutes:a.minutes,type:a.type}))));
  setDone(schedule.days.flatMap(d=>d.activities.filter(a=>a.completed).map(a=>a.id)));
 };
 useEffect(()=>{
  if(!user)return;
  setSyncing(true);
  loadPersonal().catch(err=>notify(err.message)).finally(()=>setSyncing(false));
  return()=>{epoch.current++;};
 },[user?.id,week]);
 const writePersonal=async(action:()=>Promise<unknown>)=>{
  if(busy.current||syncing)return false;
  busy.current=true;setSyncing(true);
  try{await action();await loadPersonal();return true;}
  catch(err:any){notify(err.message||'Unable to save');return false;}
  finally{busy.current=false;setSyncing(false);}
 };
 const changeMeal=async(id:string,portions?:number)=>{
  if(user){await writePersonal(()=>portions===undefined?api.deleteMealEntry(id):api.updateMealEntry(id,{portions}));return;}
  setDiary(d=>({...d,[dayKey]:(d[dayKey]||[]).flatMap(e=>e.id!==id?[e]:portions===undefined?[]:[{...e,portions}])}));
 };
 const removeActivity=async(id:string)=>{
  if(user){await writePersonal(()=>api.deleteExerciseEntry(id));return;}
  setActivities(v=>v.map(list=>list.filter(a=>a.id!==id)));setDone(v=>v.filter(x=>x!==id));
 };
 const saveActivity=async()=>{
  if(!newName.trim()||!Number.isInteger(newMinutes)||newMinutes<0||newMinutes>600)return;
  const payload={date:dayKey,name:newName.trim(),minutes:newMinutes,type:newType};
  if(user){if(!await writePersonal(()=>editingActivity?api.updateExerciseEntry(editingActivity,payload):api.addExerciseEntry(payload)))return;}
  else {const activity={id:editingActivity||crypto.randomUUID(),...payload};setActivities(v=>v.map((list,i)=>i===day?editingActivity?list.map(a=>a.id===editingActivity?activity:a):[...list,activity]:list));}
  setAddOpen(false);notify('Saved');
 };
 const addFood=async(foodId:string)=>{
  const food=foods.find(f=>f.id===foodId);
  if(!food||!Number.isFinite(portions)||portions<.5||portions>10)return;
  if(user){if(await writePersonal(()=>api.logMealEntry({date:dayKey,foodId,meal,portions})))notify('Saved');return;}
  if(setDiary(d=>({...d,[dayKey]:[...(d[dayKey]||[]),snapshotFood(food,meal,portions)]})))notify('Saved');
 };
 const openTemplate=(type:'meal'|'exercise')=>{setTemplateOpen(type);setTemplateId(type==='meal'?mealTemplates[0]?.id||'':exerciseTemplates[0]?.id||'');setTemplateMode('append')};
 const applyTemplate=async ()=>{
  if(templateOpen==='meal'&&selectedMeal&&!unavailableMeal){
   if (user) {
    if(await writePersonal(()=>api.applyMealTemplate(selectedMeal.id, dayKey, templateMode)))setTemplateOpen(null);return;
   }
   const items=selectedMeal.entries.map(e=>snapshotFood(foods.find(f=>f.id===e.foodId)!,e.meal,e.portions));
   if(!setDiary(d=>({...d,[dayKey]:templateMode==='replace'?items:[...(d[dayKey]||[]),...items]})))return;
   notify('เพิ่มชุดมื้ออาหารลงในวันที่เลือกแล้ว');
  }
  else if(templateOpen==='exercise'&&selectedExercise){
   if (user) {
    if(await writePersonal(()=>api.applyExerciseTemplate(selectedExercise.id, week, templateMode)))setTemplateOpen(null);return;
   }
   const copied=copyActivities(selectedExercise.days);
   if(!setActivities(v=>templateMode==='replace'?copied:v.map((list,i)=>[...list,...copied[i]])))return;
   if(templateMode==='replace'&&!setDone([]))return;
   notify('นำตารางตัวอย่างมาใช้ในสัปดาห์นี้แล้ว');
  }
  else return;
  setTemplateOpen(null);
 };
 const toggleDone=async(id:string)=>{if(user){await writePersonal(()=>api.updateExerciseEntry(id,{completed:!done.includes(id)}));return;}setDone(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);};
 const toggleBookmark=async (id:string)=>{
  const isSaved = bookmarks.includes(id);
  if (user) {
   try {
    if (isSaved) await api.removeArticleBookmark(id);
    else await api.addArticleBookmark(id);
   } catch (err) {
    notify((err as Error).message);return;
   }
  }
  if(setBookmarks(v=>isSaved?v.filter(x=>x!==id):[...v,id]))notify(isSaved?'นำบทความออกจากรายการที่บันทึกแล้ว':'บันทึกบทความไว้อ่านภายหลังแล้ว');
 };
 const openActivity=(a?:Activity)=>{setEditingActivity(a?.id||null);setNewName(a?.name||'');setNewMinutes(a?.minutes??15);setNewType(a?.type||'เคลื่อนไหว');setAddOpen(true)};
 const heading=active==='nutrition'?{en:'NOURISH YOUR EVERYDAY',title:'มื้อดี ๆ เริ่มจากการใส่ใจ',sub:'ค้นพบเมนู จัดตารางอาหาร และบันทึกสิ่งที่คุณเลือกในแต่ละวัน'}:active==='exercise'?{en:'MOVE AT YOUR OWN PACE',title:'ขยับในจังหวะของคุณ',sub:'สร้างพื้นที่ให้การเคลื่อนไหว ด้วยตารางที่ปรับให้เข้ากับชีวิตได้'}:{en:'THE BLOOM JOURNAL',title:'เรื่องเล็ก ๆ ที่ทำให้ทุกวันดีขึ้น',sub:'ไอเดียการดูแลตัวเอง อาหาร และการใช้ชีวิตในแบบที่คุณชอบ'};
 return <section className="wellness-wrap" aria-busy={syncing}><fieldset disabled={syncing} style={{border:0,padding:0,margin:0,minWidth:0}}>
  {(storageFailed||readFailed)&&<div className="wellness-storage-error" role="alert"><strong>{storageFailed?'การเปลี่ยนแปลงล่าสุดยังไม่ได้บันทึก':'ข้อมูลเดิมบางส่วนอ่านไม่ได้'}</strong><span>{storageFailed?'เบราว์เซอร์ไม่สามารถเก็บข้อมูลเพิ่มได้ ข้อมูลบนหน้านี้อาจหายเมื่อปิดหรือรีโหลด กรุณาเพิ่มพื้นที่ว่างแล้วลองบันทึกอีกครั้ง':'แสดงเฉพาะข้อมูลที่อ่านได้ ข้อมูลต้นฉบับยังคงอยู่และจะถูกสำรองก่อนบันทึกการแก้ไขครั้งถัดไป'}</span></div>}
  <div className="wellness-breadcrumb"><button onClick={()=>onNavigate('home')}>หน้าแรก</button><ChevronRight size={13}/><span>{active==='nutrition'?'อาหาร & แคลอรี':active==='exercise'?'ตารางออกกำลังกาย':'บทความสุขภาพ'}</span></div>
  <header className="wellness-page-heading"><span className="eyebrow">{heading.en}</span><h1>{heading.title}</h1><p>{heading.sub}</p></header>
  <nav className="wellness-top-nav" aria-label="หมวดดูแลสุขภาพ"><button className={active==='nutrition'?'active':''} onClick={()=>onNavigate('nutrition')}><Utensils size={17}/>อาหาร & แคลอรี</button><button className={active==='exercise'?'active':''} onClick={()=>onNavigate('exercise')}><Dumbbell size={17}/>ตารางออกกำลังกาย</button><button className={active==='articles'?'active':''} onClick={()=>onNavigate('articles')}><BookOpen size={17}/>บทความสุขภาพ</button></nav>
  {active!=='articles'&&<div className="wellness-personal-note"><Heart size={15}/><span>{user?'บันทึกส่วนตัวของ '+user.name:'พื้นที่ทดลองสำหรับผู้เยี่ยมชม'} · ข้อมูลแยกตามบัญชีในเบราว์เซอร์นี้</span></div>}
  {active!=='articles'&&<section className="wellness-profile" aria-label="ข้อมูลสุขภาพส่วนตัว"><div className="wellness-profile-heading"><div><span className="eyebrow">YOUR PERSONAL NOTES</span><h2>ข้อมูลสุขภาพส่วนตัว</h2></div><button className="btn btn-secondary" onClick={openProfile}><Edit3 size={16}/>{profile.heightCm!==null||profile.weightKg!==null||profile.goal?'แก้ไขข้อมูลสุขภาพ':'เพิ่มข้อมูลสุขภาพ'}</button></div><div className="wellness-profile-values"><div><span>ส่วนสูง</span><strong>{profile.heightCm===null?'ยังไม่ได้ระบุ':profile.heightCm+' ซม.'}</strong></div><div><span>น้ำหนัก</span><strong>{profile.weightKg===null?'ยังไม่ได้ระบุ':profile.weightKg+' กก.'}</strong></div><div><span>เป้าหมายที่คุณเขียนเอง</span><strong>{profile.goal||'ยังไม่ได้ระบุ'}</strong></div></div><p>ข้อมูลที่คุณเลือกบันทึกเอง ใช้ดูประกอบการจัดตารางส่วนตัว</p></section>}
  {active==='nutrition'&&<>
   <section className="wellness-nutrition-intro"><div><span className="wellness-mini-label"><Leaf size={14}/> YOUR DAILY FOOD DIARY</span><h2>ให้ทุกมื้อมีเรื่องราวดี ๆ</h2><p>เริ่มบันทึกจากเมนูที่คุณเลือก และค่อย ๆ วางแผนในแบบของตัวเอง</p><button className="btn btn-primary" onClick={()=>openTemplate('meal')}>เลือกชุดมื้อตัวอย่าง<Plus size={16}/></button><small>ค่าพลังงานในหน้านี้เป็นข้อมูลตัวอย่างสำหรับทดลองระบบ</small></div><ProductImage index={4} className="wellness-bowl" name="ตัวอย่างอาหารธัญพืชและผัก"/></section>
   <WeekPicker week={week} onChange={setWeek}/>
   <div className="wellness-day-picker" aria-label="เลือกวันบันทึกอาหาร">{days.map((d,i)=><button key={d} onClick={()=>setDay(i)} className={i===day?'selected':''}><span>{dayNames[i]}</span><strong>{d}</strong><i>{offsetDate(week,i)===localDate(new Date())?'วันนี้':new Date(offsetDate(week,i)+'T12:00:00').getDate()}</i></button>)}</div>
   <div className="wellness-food-grid"><section className="wellness-panel"><div className="wellness-panel-head"><div><span className="eyebrow">FOOD LIBRARY</span><h2>เลือกเมนูของคุณ</h2></div><Utensils size={23}/></div><label className="wellness-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาอาหาร เช่น ข้าวกล้อง โยเกิร์ต" aria-label="ค้นหาอาหาร"/></label><div className="wellness-chips">{['ทั้งหมด',...new Set(foods.map(f=>f.group))].map(g=><button key={g} className={g===foodGroup?'active':''} onClick={()=>setFoodGroup(g)}>{g}</button>)}</div><div className="wellness-food-options"><Field label="เพิ่มในมื้อ"><select value={meal} onChange={e=>setMeal(e.target.value)}>{meals.map(m=><option key={m}>{m}</option>)}</select></Field><Field label="จำนวนหน่วย"><input type="number" min="0.5" max="10" step="0.5" value={portions} onChange={e=>setPortions(Math.min(10,Math.max(.5,Number(e.target.value)||1)))}/></Field></div><div className="wellness-food-list">{matchingFoods.map((f,i)=><div className="wellness-food-row" key={f.id}><span className={'wellness-food-icon shade-'+(i%3)}>{f.group==='ผลไม้'?<Sun size={19}/>:f.group==='ของว่าง'?<Leaf size={19}/>:<Utensils size={19}/>}</span><div><strong>{f.name}</strong><small>{f.detail}</small></div><div className="wellness-food-energy"><b>{f.kcal}</b><small>kcal / หน่วย</small></div><button className="wellness-add-food" aria-label={'เพิ่ม '+f.name} onClick={()=>addFood(f.id)}><Plus size={18}/></button></div>)}{!matchingFoods.length&&<div className="wellness-no-data"><p>{foods.length?'ไม่พบเมนูที่ค้นหา':'ยังไม่มีเมนูที่เปิดใช้งาน'}</p>{foods.length>0&&<button className="btn btn-secondary" onClick={()=>{setQuery('');setFoodGroup('ทั้งหมด')}}>ดูเมนูทั้งหมด</button>}</div>}</div></section>
    <aside className="wellness-diary"><div className="wellness-diary-summary"><div><span className="eyebrow">วัน{days[day]} · {dateText(dayKey)}</span><h2>บันทึกมื้ออาหาร</h2></div><span className="wellness-calorie-icon"><Flame size={26}/></span><div className="wellness-total"><strong>{total.toLocaleString('th-TH',{maximumFractionDigits:1})}</strong><span>kcal ที่บันทึก</span></div><p>{entries.length} รายการ · รวมจากข้อมูลตัวอย่าง</p></div><div className="wellness-diary-body">{meals.map(m=>{const items=entries.filter(e=>e.meal===m);return <section key={m} className="wellness-meal-group"><h3>{m}<span>{items.reduce((s,e)=>s+e.kcal*e.portions,0).toLocaleString('th-TH',{maximumFractionDigits:1})} kcal</span></h3>{items.length?items.map(e=><div className="wellness-diary-row" key={e.id}><div><strong>{e.name}</strong><small>{e.detail} · {e.kcal*e.portions} kcal</small></div><div className="wellness-entry-actions"><input aria-label={'จำนวนหน่วย '+e.name} type="number" min={.5} max={10} step={.5} value={e.portions} onChange={event=>{const qty=Number(event.target.value);if(qty>=.5&&qty<=10)void changeMeal(e.id,qty)}}/><button aria-label={'ลบ '+e.name} onClick={()=>void changeMeal(e.id)}><Trash2 size={15}/></button></div></div>):<p className="wellness-meal-empty">ยังไม่มีรายการ เลือกเมนูเพื่อเริ่มบันทึก</p>}</section>})}</div><div className="wellness-diary-note"><Sparkles size={16}/><span>บันทึกค่าพลังงาน ณ วันที่เพิ่มรายการ การแก้ไขเมนูในภายหลังจะไม่เปลี่ยนบันทึกเดิม</span></div></aside>
   </div>
  </>}
  {active==='exercise'&&<>
   <section className="wellness-move-intro"><div className="wellness-move-copy"><span className="wellness-mini-label"><Wind size={15}/> A LITTLE MOVEMENT, A LITTLE JOY</span><h2>เวลาสำหรับตัวเอง<br/>ไม่ต้องเหมือนใคร</h2><p>เลือกวัน เพิ่มกิจกรรม และบันทึกวันที่ได้ลงมือทำ<br/>เลือกใช้ตารางตัวอย่างแล้วปรับให้เป็นของคุณ</p><div className="wellness-inline-actions"><button className="btn btn-primary" onClick={()=>openActivity()}><Plus size={17}/>เพิ่มกิจกรรม</button><button className="btn btn-secondary" onClick={()=>openTemplate('exercise')}><Copy size={16}/>เลือกตาราง</button></div></div><ProductImage index={2} className="wellness-yoga-image" name="เสื่อและบล็อกโยคะสีลาเวนเดอร์"/><div className="wellness-move-stat"><CheckCircle2 size={22}/><span>สัปดาห์ที่เลือกทำแล้ว</span><strong>{weekCount}<small> กิจกรรม</small></strong><p>{weekMinutes} นาทีที่บันทึก</p></div></section>
   <div className="wellness-week-title"><div><span className="eyebrow">YOUR WEEK, YOUR RHYTHM</span><h2>ตารางประจำสัปดาห์</h2></div><span><CalendarDays size={16}/>สัปดาห์ของคุณ</span></div><WeekPicker week={week} onChange={setWeek}/><div className="wellness-day-picker" aria-label="เลือกวันออกกำลังกาย">{days.map((d,i)=><button key={d} onClick={()=>setDay(i)} className={i===day?'selected':''}><span>{dayNames[i]}</span><strong>{d}</strong><i>{(activities[i]||[]).filter(a=>done.includes(a.id)).length}/{(activities[i]||[]).length}</i></button>)}</div>
   <section className="wellness-activities"><div className="wellness-panel-head"><div><h2>วัน{days[day]}</h2><p>{dateText(dayKey)} · {todayActivities.reduce((s,a)=>s+a.minutes,0)} นาที · {todayActivities.length} กิจกรรม</p></div><button className="btn btn-secondary" onClick={()=>openActivity()}><Plus size={16}/>เพิ่มกิจกรรม</button></div>{todayActivities.map((a,i)=><article className={'wellness-activity '+(done.includes(a.id)?'completed':'')} key={a.id}><span className="wellness-activity-number">{String(i+1).padStart(2,'0')}</span><div className="wellness-activity-icon">{a.type==='พัก'?<Sun size={24}/>:a.type==='เดิน'?<Wind size={24}/>:<Dumbbell size={24}/>}</div><div className="wellness-activity-details"><span>{a.type}</span><h3>{a.name}</h3><p><Clock size={14}/>{a.minutes?a.minutes+' นาที':'ให้เวลาพักตามที่คุณต้องการ'}</p></div><button className={'wellness-complete '+(done.includes(a.id)?'done':'')} onClick={()=>toggleDone(a.id)}>{done.includes(a.id)?<Check size={17}/>:<span className="wellness-check-circle"/>}{done.includes(a.id)?'ทำแล้ว':'บันทึกว่าทำแล้ว'}</button><div className="wellness-activity-tools"><button aria-label={'แก้ไขกิจกรรม '+a.name} onClick={()=>openActivity(a)}><Edit3 size={16}/></button><button aria-label={'ลบกิจกรรม '+a.name} onClick={()=>void removeActivity(a.id)}><Trash2 size={16}/></button></div></article>)}{!todayActivities.length&&<div className="wellness-no-data"><p>วันนี้ยังไม่มีกิจกรรม เพิ่มรายการของคุณหรือใช้เป็นวันพักได้เลย</p><button className="btn btn-secondary" onClick={()=>openActivity()}>เพิ่มกิจกรรมแรก<Plus size={16}/></button></div>}</section>
   <div className="wellness-gentle-note"><Heart size={24}/><div><h3>พื้นที่เล็ก ๆ ให้คุณได้ดูแลตัวเอง</h3><p>ปรับกิจกรรม ระยะเวลา และวันพักให้เข้ากับชีวิตของคุณ ตารางนี้เป็นตัวอย่างสำหรับทดลองจัดตาราง</p></div><button onClick={()=>onNavigate('articles')} aria-label="อ่านบทความการดูแลตัวเอง"><ArrowRight size={22}/></button></div>
  </>}
  {active==='articles'&&<>
   {articles[0]&&<article className="wellness-featured"><div className="wellness-featured-photo"><ArticleImage type={articles[0].image}/><span>EDITOR'S NOTE</span></div><div className="wellness-featured-copy"><span className="eyebrow">{articles[0].tag}</span><h2>{articles[0].title}</h2><p>{articles[0].subtitle}</p><div className="wellness-article-meta"><span>Bloom Journal</span><i/><span><Clock size={13}/>อ่าน {articles[0].time}</span></div><button className="btn btn-primary" onClick={()=>openArticle(articles[0].id)}>อ่านบทความ<ArrowRight size={17}/></button></div></article>}
   <label className="wellness-search wellness-journal-search"><Search size={18}/><input value={articleQuery} onChange={e=>setArticleQuery(e.target.value)} placeholder="ค้นหาบทความหรือคำที่สนใจ" aria-label="ค้นหาบทความ"/>{articleQuery&&<button type="button" onClick={()=>setArticleQuery('')}>ล้าง</button>}</label><div className="wellness-journal-heading"><h2>อ่านในสิ่งที่คุณสนใจ <small>{matchingArticles.length} บทความ</small></h2><div className="wellness-chips">{['ทั้งหมด',...new Set(articles.map(a=>a.category)),'ที่บันทึกไว้'].map(c=><button key={c} className={c===articleFilter?'active':''} onClick={()=>setArticleFilter(c)}>{c==='ที่บันทึกไว้'&&<Bookmark size={14}/>} {c}</button>)}</div></div><div className="wellness-article-grid">{matchingArticles.map(a=><article className="wellness-article-card" key={a.id}><div className="wellness-article-image-wrap"><button className="wellness-article-image-button" onClick={()=>openArticle(a.id)} aria-label={'อ่าน '+a.title}><ArticleImage type={a.image}/></button><button className={'wellness-bookmark '+(bookmarks.includes(a.id)?'saved':'')} aria-label={'บันทึกบทความ '+a.title} onClick={()=>toggleBookmark(a.id)}><Bookmark size={17} fill={bookmarks.includes(a.id)?'currentColor':'none'}/></button></div><div className="wellness-article-text"><span className="eyebrow">{a.tag}</span><button onClick={()=>openArticle(a.id)}><h3>{a.title}</h3></button><p>{a.subtitle}</p><div className="wellness-article-footer"><span><Clock size={13}/>{a.time}</span><button onClick={()=>openArticle(a.id)}>อ่านต่อ<ArrowRight size={16}/></button></div></div></article>)}</div>{!matchingArticles.length&&<div className="wellness-no-data"><Bookmark size={28}/><h3>{articleQuery?'ไม่พบบทความที่ค้นหา':articleFilter==='ที่บันทึกไว้'?'เก็บเรื่องที่คุณชอบไว้อ่านอีกครั้ง':'ยังไม่มีบทความในหมวดนี้'}</h3><p>{articleQuery?'ลองใช้คำค้นอื่น หรือดูบทความทั้งหมด':articleFilter==='ที่บันทึกไว้'?'กดสัญลักษณ์บันทึกบนบทความเพื่อเพิ่มในหน้านี้':'บทความที่เผยแพร่แล้วจะแสดงในหน้านี้'}</p>{articles.length>0&&<button className="btn btn-secondary" onClick={()=>{setArticleFilter('ทั้งหมด');setArticleQuery('')}}>ดูบทความทั้งหมด</button>}</div>}
   <div className="wellness-journal-banner"><div><span className="eyebrow">MAKE IT YOUR EVERYDAY</span><h2>นำไอเดียดี ๆ ไปใช้ในทุกวัน</h2><p>ลองจัดตารางมื้ออาหารและกิจกรรมในแบบของคุณ</p></div><button className="btn btn-primary" onClick={()=>onNavigate('nutrition')}>เริ่มบันทึกอาหาร<ArrowRight size={17}/></button></div>
  </>}
  {addOpen&&<Modal title={(editingActivity?'แก้ไขกิจกรรม':'เพิ่มกิจกรรม')+' · วัน'+days[day]} onClose={()=>setAddOpen(false)}><form className="wellness-add-form" onSubmit={e=>{e.preventDefault();void saveActivity()}}><Field label="ชื่อกิจกรรม"><input required maxLength={100} placeholder="เช่น เดินเล่นกับเพื่อน" value={newName} onChange={e=>setNewName(e.target.value)}/></Field><Field label="ประเภท"><select value={newType} onChange={e=>setNewType(e.target.value)}>{['เคลื่อนไหว','เดิน','โยคะ','ยืดเหยียด','พัก'].map(t=><option key={t}>{t}</option>)}</select></Field><Field label="ระยะเวลา (นาที)"><input required type="number" min={0} max={600} value={newMinutes} onChange={e=>setNewMinutes(Number(e.target.value))}/></Field><button className="btn btn-primary" type="submit">บันทึกกิจกรรม<Check size={17}/></button></form></Modal>}
  {profileOpen&&<Modal title="ข้อมูลสุขภาพส่วนตัว" onClose={()=>setProfileOpen(false)}><form className="wellness-add-form" onSubmit={async e=>{e.preventDefault();const result=parseHealthProfile(profileHeight,profileWeight,profileGoal);if(!result.profile){setProfileError(result.error||'กรุณาตรวจสอบข้อมูล');return}if(user){try{await api.saveHealthProfile({heightCm:result.profile.heightCm,weightKg:result.profile.weightKg,goal:result.profile.goal});}catch(err){setProfileError((err as Error).message);return;}}if(setProfile(result.profile)){setProfileOpen(false);notify('บันทึกข้อมูลสุขภาพแล้ว')}else setProfileError('ยังไม่ได้บันทึกลงเบราว์เซอร์ กรุณาเพิ่มพื้นที่ว่างแล้วกดบันทึกอีกครั้ง')}}><p className="wellness-profile-help">กรอกเฉพาะข้อมูลที่ต้องการเก็บไว้ในบัญชีนี้ เว้นว่างช่องที่ไม่ต้องการระบุได้</p><div className="wellness-profile-form-grid"><Field label="ส่วนสูง (ซม.)"><input type="number" min="50" max="250" step="0.1" value={profileHeight} onChange={e=>setProfileHeight(e.target.value)} placeholder="ไม่ระบุก็ได้"/></Field><Field label="น้ำหนัก (กก.)"><input type="number" min="1" max="500" step="0.1" value={profileWeight} onChange={e=>setProfileWeight(e.target.value)} placeholder="ไม่ระบุก็ได้"/></Field></div><Field label="เป้าหมายที่คุณเขียนเอง"><textarea rows={3} maxLength={280} value={profileGoal} onChange={e=>setProfileGoal(e.target.value)} placeholder="เช่น หาเวลาจัดมื้ออาหารและเดินเล่นหลังเลิกงาน"/></Field>{profileError&&<div className="inline-error" role="alert">{profileError}</div>}<button className="btn btn-primary" type="submit">บันทึกข้อมูลสุขภาพ<Check size={17}/></button></form></Modal>}
  {active==='articles'&&selectedArticleId&&!selectedArticle&&<Modal title="ไม่พบบทความนี้" onClose={closeArticle}><div className="wellness-no-data"><BookOpen size={32}/><h3>บทความนี้ยังไม่พร้อมให้อ่าน</h3><p>บทความอาจถูกถอนเผยแพร่หรือลิงก์ไม่ถูกต้อง</p><button className="btn btn-primary" onClick={closeArticle}>กลับไปดูบทความทั้งหมด</button></div></Modal>}
  {selectedArticle&&<Modal title="Bloom Journal" onClose={closeArticle} wide><article className="wellness-article-reader"><div className="wellness-reader-image"><ArticleImage type={selectedArticle.image}/></div><span className="eyebrow">{selectedArticle.tag}</span><h2>{selectedArticle.title}</h2><div className="wellness-reader-meta"><span>โดย Bloom Journal · อ่าน {selectedArticle.time}</span><button onClick={()=>toggleBookmark(selectedArticle.id)}><Bookmark size={16} fill={bookmarks.includes(selectedArticle.id)?'currentColor':'none'}/>{bookmarks.includes(selectedArticle.id)?'บันทึกแล้ว':'บันทึกบทความ'}</button></div>{selectedArticle.paras.map((p,i)=><p key={i}>{p}</p>)}<div className="wellness-reader-end"><span>หนึ่งไอเดียเล็ก ๆ สำหรับวันที่เป็นของคุณ</span><Heart size={18}/></div></article></Modal>}
  {templateOpen&&<Modal title={templateOpen==='meal'?'เลือกชุดมื้ออาหาร':'เลือกตารางออกกำลังกาย'} onClose={()=>setTemplateOpen(null)}><div className="wellness-template-picker"><p>{templateOpen==='meal'?'เพิ่มลงในวัน'+days[day]+' '+dateText(dayKey):'ใช้กับสัปดาห์ '+dateText(week)+' – '+dateText(offsetDate(week,6))}</p><Field label="ชุดตัวอย่าง"><select value={templateId} onChange={e=>setTemplateId(e.target.value)}><option value="" disabled>เลือกชุดตัวอย่าง</option>{(templateOpen==='meal'?mealTemplates:exerciseTemplates).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>{(templateOpen==='meal'?selectedMeal:selectedExercise)&&<p className="wellness-template-description">{templateOpen==='meal'?selectedMeal?.description:selectedExercise?.description}</p>}{templateOpen==='meal'&&selectedMeal&&<div className="wellness-template-preview">{selectedMeal.entries.map((e,i)=><div key={i}><span>{e.meal}</span><strong>{state.content.foods.find(f=>f.id===e.foodId)?.name||'เมนูที่ไม่พร้อมใช้งาน'}</strong><small>{e.portions} หน่วย</small></div>)}</div>}{templateOpen==='exercise'&&selectedExercise&&<div className="wellness-template-preview">{selectedExercise.days.map((list,i)=><div key={i}><span>{days[i]}</span><strong>{list.map(a=>a.name).join(' · ')||'วันว่าง'}</strong><small>{list.reduce((s,a)=>s+a.minutes,0)} นาที</small></div>)}</div>}{!templateId&&<p className="wellness-no-data">ยังไม่มีชุดตัวอย่างที่เปิดใช้งาน คุณยังเพิ่มรายการเองได้</p>}{unavailableMeal&&templateOpen==='meal'&&<p className="inline-error">ชุดนี้มีเมนูที่ปิดใช้งาน กรุณาเลือกชุดอื่น</p>}{templateId&&<><fieldset className="wellness-template-mode"><legend>เลือกวิธีเพิ่มข้อมูล</legend><label><input name="wellness-template-mode" type="radio" checked={templateMode==='append'} onChange={()=>setTemplateMode('append')}/>เพิ่มต่อจากรายการเดิม</label><label><input name="wellness-template-mode" type="radio" checked={templateMode==='replace'} onChange={()=>setTemplateMode('replace')}/>แทนที่{templateOpen==='meal'?'รายการในวันที่เลือก':'ทั้งสัปดาห์ที่เลือก'}</label></fieldset>{templateMode==='replace'&&<div className="inline-error">รายการเดิม{templateOpen==='exercise'?'และสถานะทำแล้ว':''}ใน{templateOpen==='meal'?'วันที่เลือก':'สัปดาห์นี้'}จะถูกแทนที่เมื่อกดยืนยัน</div>}</>}<button className="btn btn-primary full-width" disabled={!templateId||(templateOpen==='meal'&&unavailableMeal)} onClick={applyTemplate}>ยืนยัน{templateMode==='replace'?'แทนที่รายการ':'เพิ่มรายการ'}<Check size={16}/></button></div></Modal>}
 </fieldset></section>
}
function WeekPicker({week,onChange}:{week:string;onChange:(s:string)=>void}){return <div className="wellness-week-picker"><button className="icon-btn" aria-label="สัปดาห์ก่อน" onClick={()=>onChange(offsetDate(week,-7))}><ChevronLeft size={18}/></button><span>{dateText(week)} – {dateText(offsetDate(week,6))}</span><button className="icon-btn" aria-label="สัปดาห์ถัดไป" onClick={()=>onChange(offsetDate(week,7))}><ChevronRight size={18}/></button>{week!==weekStart()&&<button className="wellness-current-week" onClick={()=>onChange(weekStart())}>สัปดาห์นี้</button>}</div>}
