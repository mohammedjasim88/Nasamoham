/**
 * Browser-only, opt-in WebGPU model session. No AI traffic goes to Cloudflare.
 * The first user click downloads the model from its public Hugging Face repository.
 */
import {OPEN_MODELS} from './local-ai-knowledge.mjs';

type ChatMessage = {role:'system'|'user'|'assistant';content:string};
type Engine = import('@mlc-ai/web-llm').WebWorkerMLCEngine;
let engine: Engine | null = null;
let webWorker: Worker | null = null;
let loadedModel = '';
let loading: Promise<Engine> | null = null;
let inUse = false;

export function supportsLocalWebGPU(): boolean {
  if (typeof navigator === 'undefined' || typeof Worker === 'undefined' || !globalThis.isSecureContext) return false;
  return !!(navigator as Navigator & {gpu?:unknown}).gpu;
}

export async function checkLocalGPU(): Promise<boolean> {
  if (!supportsLocalWebGPU()) return false;
  try {
    const gpu = (navigator as Navigator & {gpu?:{requestAdapter:()=>Promise<unknown>}}).gpu;
    return !!await gpu?.requestAdapter();
  } catch { return false; }
}

function safelyTerminate(): void {
  try {engine?.interruptGenerate();} catch { /* worker may already be gone */ }
  webWorker?.terminate();
  webWorker=null;
  engine=null;
  loadedModel='';
}

export async function loadLocalAI(modelId:string,onProgress:(fraction:number,text:string)=>void):Promise<void> {
  if (!OPEN_MODELS.some(model=>model.id===modelId)) throw new Error('MODEL_NOT_ALLOWED');
  if (!await checkLocalGPU()) throw new Error('WEBGPU_UNAVAILABLE');
  if (engine && loadedModel===modelId) return;
  if (loading) throw new Error('MODEL_LOADING');
  safelyTerminate();
  const worker = new Worker(new URL('./local-ai.worker.ts',import.meta.url),{type:'module',name:'oman-earth-open-source-ai'});
  webWorker=worker;
  loading=(async()=>{
    const {CreateWebWorkerMLCEngine}=await import('@mlc-ai/web-llm');
    const result=await CreateWebWorkerMLCEngine(worker,modelId,{
      initProgressCallback:report=>onProgress(Math.max(0,Math.min(1,report.progress??0)),report.text??''),
    });
    if(webWorker!==worker){worker.terminate();throw new Error('SESSION_WAS_RESET');}
    engine=result;
    loadedModel=modelId;
    return result;
  })();
  try {await loading;} catch (error) {safelyTerminate();throw error;} finally {loading=null;}
}

export function localAIModel():string {return loadedModel;}

export async function askLocalAI(messages:ChatMessage[]):Promise<string> {
  if(!engine || !loadedModel) throw new Error('MODEL_NOT_LOADED');
  if(inUse) throw new Error('MODEL_BUSY');
  inUse=true;
  try {
    const reply=await engine.chat.completions.create({
      messages,
      temperature:0.2,
      top_p:0.9,
      max_tokens:300,
      stream:false,
    });
    const answer=reply.choices?.[0]?.message?.content;
    if(typeof answer!=='string'||!answer.trim())throw new Error('EMPTY_MODEL_ANSWER');
    return answer.trim().slice(0,3500);
  } finally {inUse=false;}
}

export function stopLocalGeneration():void {
  try {engine?.interruptGenerate();} catch { /* best effort only */ }
}

export function unloadLocalAI():void {
  safelyTerminate();
  loading=null;
  inUse=false;
}
