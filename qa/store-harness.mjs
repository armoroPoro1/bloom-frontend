// No browser is used: minimal hook lifecycle to exercise actual StoreProvider actions.
// UI layout, DOM events and React scheduling are explicitly outside this harness.
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createTestApp} from '../../Bloom-Backend-Claude-Handoff/dist/tests/helpers.js';
import {seedDevelopment} from '../../Bloom-Backend-Claude-Handoff/dist/scripts/seed.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const hooks=`
let cells=[],cursor=0;
export function useState(initial){const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return[cells[i],v=>{cells[i]=typeof v==='function'?v(cells[i]):v}];}
export function useRef(initial){return useState(()=>({current:initial}))[0]}
export function useCallback(fn){return fn}
export function useEffect(){}
export const jsx=(type,props)=>({type,props}); export const jsxs=jsx;
export function createContext(){return {Provider:'provider'}}
export function useContext(){throw Error('Not supported')}
export function render(Component){cursor=0;return Component({children:null}).props.value}
export function reset(){cells=[];cursor=0}
export default {createElement:(type,props,...children)=>({type,props:{...props,children}})};
`;
const built=await build({stdin:{contents:"export {StoreProvider} from './src/store';export * as api from './src/api/services';export {clearSession} from './src/api/client';export {render,reset} from 'react';",resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,jsx:'transform',plugins:[{name:'hook-harness',setup(b){b.onResolve({filter:/^react(?:\/jsx-runtime)?$/},()=>({path:'react',namespace:'hooks'}));b.onLoad({filter:/.*/,namespace:'hooks'},()=>({contents:hooks,loader:'js'}));}}]});
const mod=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function storage(){const values=new Map();return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}}
export async function fixture(){
 process.chdir(fileURLToPath(new URL('../../Bloom-Backend-Claude-Handoff/',import.meta.url)));
 const f=await createTestApp({allowDevPayments:true});
 await seedDevelopment(f.db,'BloomDemoPass1234!');
 const original={fetch:globalThis.fetch,localStorage:globalThis.localStorage,sessionStorage:globalThis.sessionStorage};
 globalThis.localStorage=storage();globalThis.sessionStorage=storage();mod.clearSession();mod.reset();
 const requests=[];
 globalThis.fetch=async(url,options={})=>{
  let headers=Object.fromEntries(new Headers(options.headers)),payload=options.body;
  if(payload instanceof FormData){const request=new Request('http://test'+url,{method:options.method,headers,body:payload});headers=Object.fromEntries(request.headers);payload=Buffer.from(await request.arrayBuffer());}
  const r=await f.app.inject({method:options.method||'GET',url,headers,payload});
  requests.push({method:options.method||'GET',url,status:r.statusCode});
  return new Response(r.statusCode===204?null:r.body,{status:r.statusCode,headers:r.headers});
 };
 const current=()=>mod.render(mod.StoreProvider);
 await current().refreshData();
 return {...f,api:mod.api,current,requests,async run(name,...args){const result=await current()[name](...args);current();return result},async role(role){await current().logout();await current().login(role+'@bloom.example.test','BloomDemoPass1234!');return current()},async close(){mod.clearSession();Object.assign(globalThis,original);await f.close()}};
}
