import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const compiled=await build({stdin:{contents:"export * from './src/wellnessState';",resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {emptyHealthProfile,filterArticles,normalizeActivities,normalizeDiary,normalizeHealthProfile,normalizeIds,parseHealthProfile,persistWellnessRecord,readWellnessRecord,wellnessKey}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const entry={id:'entry',foodId:'archived-food',name:'เมนูเดิม',detail:'1 ชาม',meal:'มื้อเช้า',portions:1.5,kcal:250};
function memory(){const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}}

test('meal history retains name, serving and calories without requiring a live catalog item',()=>{
 const normalized=normalizeDiary({'2026-11-14':[entry,{...entry,id:'invalid',kcal:'250'},{...entry,id:'infinite',portions:Infinity}],bad:'oops'});
 assert.deepEqual(normalized,{'2026-11-14':[entry]});
 assert.equal(normalized['2026-11-14'][0].kcal*normalized['2026-11-14'][0].portions,375);
});

test('damaged records retain salvageable rows and back up the original before editing',()=>{
 const storage=memory(),key=wellnessKey('diary','u1');
 const original=JSON.stringify({'2026-11-14':[entry,{id:'bad'}]});storage.setItem(key,original);
 const loaded=readWellnessRecord(storage,key,{},normalizeDiary);
 assert.equal(loaded.issue,'read');assert.deepEqual(loaded.value,{'2026-11-14':[entry]});assert.equal(storage.getItem(key),original);
 const saved=persistWellnessRecord(storage,key,loaded,{...loaded.value,'2026-11-15':[{...entry,id:'new'}]});
 assert.equal(saved.issue,null);assert.equal(storage.getItem(key+':recovery'),original);
 assert.equal(JSON.parse(storage.getItem(key))['2026-11-15'][0].id,'new');
});

test('malformed JSON and unavailable storage are reported without claiming a saved update',()=>{
 const storage=memory(),key=wellnessKey('bookmarks','u1');storage.setItem(key,'{broken');
 const loaded=readWellnessRecord(storage,key,[],normalizeIds);assert.equal(loaded.issue,'read');assert.deepEqual(loaded.value,[]);assert.equal(storage.getItem(key),'{broken');
 const failed=persistWellnessRecord({...storage,setItem:()=>{throw new Error('quota')}},key,loaded,['art1']);
 assert.equal(failed.issue,'write');assert.deepEqual(failed.value,['art1']);assert.equal(storage.getItem(key),'{broken');
 const repaired=persistWellnessRecord(storage,key,failed,['art1']);assert.equal(repaired.issue,null);assert.equal(storage.getItem(key+':recovery'),'{broken');
});

test('account and week keys isolate personal records and valid saved content survives reopening',()=>{
 const storage=memory(),one=wellnessKey('profile','u1'),two=wellnessKey('profile','u2');
 const profile={heightCm:168,weightKg:63.2,goal:'เดินเล่นหลังเลิกงาน'};
 const loaded=readWellnessRecord(storage,one,emptyHealthProfile,normalizeHealthProfile);assert.equal(loaded.missing,true);
 persistWellnessRecord(storage,one,loaded,profile);
 assert.deepEqual(readWellnessRecord(storage,one,emptyHealthProfile,normalizeHealthProfile).value,profile);
 assert.deepEqual(readWellnessRecord(storage,two,emptyHealthProfile,normalizeHealthProfile).value,emptyHealthProfile);
 assert.notEqual(wellnessKey('activities','u1','2026-11-09'),wellnessKey('activities','u1','2026-11-16'));
 assert.notEqual(wellnessKey('diary','guest'),wellnessKey('diary','u1'));
});

test('activity recovery contains invalid days and avoids duplicate completion identities',()=>{
 const valid={id:'a1',name:'เดินเล่น',minutes:20,type:'เดิน'};
 const recovered=normalizeActivities([[valid,{...valid,id:'invalid',minutes:-3}],[valid],null,'bad'],[]);
 assert.equal(recovered.length,7);assert.deepEqual(recovered[0],[valid]);assert.deepEqual(recovered[1],[]);assert.deepEqual(recovered.slice(2),[[],[],[],[],[]]);
 assert.deepEqual(normalizeIds(['a1',null,'a1',5,'a2']),['a1','a2']);
});

test('health profile inputs allow omission, reject invalid numbers and retain a self-written goal',()=>{
 assert.deepEqual(parseHealthProfile('','','').profile,emptyHealthProfile);
 assert.deepEqual(parseHealthProfile('168','63.2',' เดินเล่น ').profile,{heightCm:168,weightKg:63.2,goal:'เดินเล่น'});
 assert.ok(parseHealthProfile('Infinity','63','').error);assert.ok(parseHealthProfile('168','0','').error);assert.ok(parseHealthProfile('168','63','ก'.repeat(281)).error);
 assert.deepEqual(normalizeHealthProfile({heightCm:'168',weightKg:63,goal:'บันทึกส่วนตัว'}),{heightCm:null,weightKg:63,goal:'บันทึกส่วนตัว'});
});

test('article search combines query, categories and bookmarks while excluding unpublished content',()=>{
 const base={id:'a1',title:'ตารางอาหาร',subtitle:'ไอเดียประจำวัน',category:'อาหาร',tag:'DAILY',paras:['เตรียมข้าวกล้องสำหรับพรุ่งนี้'],published:true};
 const articles=[base,{...base,id:'a2',published:false},{...base,id:'a3',category:'ไลฟ์สไตล์',title:'จัดโต๊ะ',paras:['พื้นที่อ่านหนังสือ']}];
 assert.deepEqual(filterArticles(articles,'ข้าวกล้อง daily','ทั้งหมด',[]).map(a=>a.id),['a1']);
 assert.deepEqual(filterArticles(articles,'','ที่บันทึกไว้',['a2','a3']).map(a=>a.id),['a3']);
 assert.equal(filterArticles(articles,'ไม่พบ','อาหาร',[]).length,0);
});
