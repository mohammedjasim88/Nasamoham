import {env,pipeline} from '@huggingface/transformers';
import runtimeUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import {WHISPER_MODELS,type WhisperModel} from './whisper-models.mjs';
import {checkVoiceAudio} from './voice-audio.mjs';

env.allowLocalModels=false;
env.useBrowserCache=true;
// Only public, allowlisted model files use this route. Audio never leaves the browser.
env.remoteHost=new URL('/api/voice-model/',self.location.href).href;
env.remotePathTemplate='{model}/resolve/{revision}/';
const wasm=env.backends.onnx.wasm;
if(wasm){wasm.numThreads=1;wasm.proxy=false;wasm.wasmPaths={wasm:new URL(runtimeUrl,import.meta.url).href};}

type Stage='configuration'|'model'|'runtime'|'transcribing';
type Input={id:number;audio:Float32Array;lang:'ar'|'en';model:WhisperModel};
let currentId=0,stage:Stage='model',asset='',busy=false;
let downloadFailure:{stage:Stage;file:string}|undefined;
const getDownloadFailure=()=>downloadFailure;
const nativeFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=async(input,init)=>{
 const url=new URL(input instanceof Request?input.url:String(input),self.location.href);
 if(url.origin===self.location.origin){
  asset=url.pathname.split('/').at(-1)||'';
  stage=url.pathname.endsWith('.wasm')?'runtime':url.pathname.endsWith('.json')?'configuration':'model';
  self.postMessage({id:currentId,status:'stage',stage,file:asset});
 }
 try{
  const response=await nativeFetch(input,init);
  // HTTP errors resolve fetch. Required model/runtime failures need attribution
  // too; leave optional JSON misses to Transformers' normal fallback handling.
  if(!response.ok&&/\.(onnx|wasm)$/.test(url.pathname))downloadFailure??={stage:url.pathname.endsWith('.wasm')?'runtime':'model',file:url.pathname.split('/').at(-1)||''};
  return response;
 }
 catch(error){
  // Pipeline downloads run concurrently. Attribute failure to the rejected fetch,
  // rather than whichever unrelated configuration request happened to start last.
  downloadFailure??={stage:url.pathname.endsWith('.wasm')?'runtime':url.pathname.endsWith('.json')?'configuration':'model',file:url.pathname.split('/').at(-1)||''};
  throw error;
 }
};
env.fetch=(input,init)=>globalThis.fetch(input,init);
const createTranscriber=(name:WhisperModel)=>{
 // v4's file-discovery pass requests revision "main" before forwarding pipeline options.
 // Pin the URL template too, so metadata and model sessions use the identical immutable revision.
 env.remotePathTemplate='{model}/resolve/'+WHISPER_MODELS[name].revision+'/';
 return pipeline('automatic-speech-recognition',WHISPER_MODELS[name].id,{
 revision:WHISPER_MODELS[name].revision,device:'wasm',dtype:'q8',
 progress_callback:progress=>{
  if(progress.status==='progress')self.postMessage({id:currentId,status:'loading',stage:'model',file:progress.file,progress:Math.round(progress.progress),loaded:progress.loaded,total:progress.total});
 }
 });
};
let model:ReturnType<typeof createTranscriber>|undefined,loadedModel:WhisperModel|undefined;
self.postMessage({status:'ready'});
self.onmessage=async({data}:MessageEvent<Input>)=>{
 if(busy){self.postMessage({id:data.id,status:'error',stage:'worker',code:'WORKER_BUSY'});return;}
 currentId=data.id;busy=true;stage='model';asset='';downloadFailure=undefined;
 try{
  if(!Object.hasOwn(WHISPER_MODELS,data.model)||!['ar','en'].includes(data.lang)||checkVoiceAudio(data.audio))throw new Error('INVALID_AUDIO_REQUEST');
  self.postMessage({id:currentId,status:'stage',stage:'model'});
  if(!model||loadedModel!==data.model){model=createTranscriber(data.model);loadedModel=data.model;}
  const transcribe=await model;
  stage='transcribing';asset='';downloadFailure=undefined;self.postMessage({id:currentId,status:'transcribing',stage});
  const output=await transcribe(data.audio,{language:data.lang==='ar'?'arabic':'english',task:'transcribe'});
  self.postMessage({id:currentId,status:'done',text:Array.isArray(output)?output.map(part=>part.text).join(' '):output.text});
 }catch(error){
  model=undefined;loadedModel=undefined;
  const message=error instanceof Error?error.message:String(error);
  const code=/memory|allocation|out of bounds/i.test(message)?'MODEL_MEMORY':/fetch|network|locate file|HTTP|forbidden|not found/i.test(message)?'MODEL_DOWNLOAD_FAILED':stage==='transcribing'?'INFERENCE_FAILED':'MODEL_INITIALIZATION_FAILED';
  const failure=getDownloadFailure();
  self.postMessage({id:currentId,status:'error',stage:failure?.stage??stage,file:failure?.file??asset,code});
 }finally{busy=false;}
};
