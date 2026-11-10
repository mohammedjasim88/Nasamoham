/**
 * The browser's small message client for the separate, opt-in WebGPU AI worker.
 * No WebLLM JS, weights, or paid API is fetched until the visitor clicks Load.
 */
import {OPEN_MODELS} from './local-ai-knowledge.mjs';

type ChatMessage={role:'system'|'user'|'assistant';content:string};
type Reply={id:number;kind:'ready'|'reply'|'progress'|'error';value?:string;progress?:number};
type Pending={resolve:(value:string)=>void;reject:(err:Error)=>void;onProgress?:(fraction:number,text:string)=>void};
const pending=new Map<number,Pending>();
let worker:Worker|null=null;
let serial=0;
let activeModel='';
let loading:Promise<string>|null=null;
let generating=false;

export function supportsLocalWebGPU(): boolean {
  if(typeof navigator==='undefined'||typeof Worker==='undefined'||!globalThis.isSecureContext)return false;
  return !!(navigator as Navigator & {gpu?:unknown}).gpu;
}
export async function checkLocalGPU():Promise<boolean> {
  if(!supportsLocalWebGPU())return false;
  try{
    const gpu=(navigator as Navigator & {gpu?:{requestAdapter:()=>Promise<unknown>}}).gpu;
    return !!await gpu?.requestAdapter();
  }catch{return false;}
}

function resetWorker(){
  worker?.terminate();worker=null;activeModel='';
  for(const item of pending.values())item.reject(new Error('SESSION_TERMINATED'));
  pending.clear();
}
function onWorkerReply(event:MessageEvent<Reply>){
  const msg=event.data;
  const req=pending.get(msg?.id);
  if(!req)return;
  if(msg.kind==='progress'){
    req.onProgress?.(Number(msg.progress)||0,String(msg.value||''));
    return;
  }
  pending.delete(msg.id);
  if(msg.kind==='error')req.reject(new Error(String(msg.value||'MODEL_ERROR')));
  else req.resolve(String(msg.value||''));
}
function send(action:'load'|'ask',data:Record<string,unknown>,onProgress?:(fraction:number,text:string)=>void):Promise<string>{
  if(!worker)return Promise.reject(new Error('MODEL_NOT_LOADED'));
  return new Promise((resolve,reject)=>{
    const id=++serial;
    pending.set(id,{resolve,reject,onProgress});
    try{worker?.postMessage({id,action,...data});}
    catch(error){pending.delete(id);reject(error instanceof Error?error:new Error('WORKER_UNAVAILABLE'));}
  });
}

export async function loadLocalAI(modelId:string,onProgress:(fraction:number,text:string)=>void):Promise<void>{
  if(!OPEN_MODELS.some(model=>model.id===modelId))throw new Error('MODEL_NOT_ALLOWED');
  if(!await checkLocalGPU())throw new Error('WEBGPU_UNAVAILABLE');
  if(worker&&activeModel===modelId)return;
  if(loading||generating)throw new Error('MODEL_BUSY');
  resetWorker();
  worker=new Worker(new URL('./local-ai.worker.ts',import.meta.url),{type:'module',name:'oman-earth-open-source-ai'});
  worker.onmessage=onWorkerReply;
  worker.onerror=()=>resetWorker();
  loading=send('load',{modelId},onProgress);
  try{await loading;activeModel=modelId;}
  catch(error){resetWorker();throw error;}
  finally{loading=null;}
}
export function localAIModel():string{return activeModel;}
export async function askLocalAI(messages:ChatMessage[]):Promise<string>{
  if(!activeModel||!worker)throw new Error('MODEL_NOT_LOADED');
  if(generating)throw new Error('MODEL_BUSY');
  generating=true;
  try{
    const text=await send('ask',{messages});
    if(!text.trim())throw new Error('EMPTY_AI_RESPONSE');
    return text.slice(0,3500);
  }finally{generating=false;}
}
export function stopLocalGeneration():void{
  try{worker?.postMessage({id:++serial,action:'stop'});}catch{/* released */}
}
export function unloadLocalAI():void{
  resetWorker();
  loading=null;
  generating=false;
}
