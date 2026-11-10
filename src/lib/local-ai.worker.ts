/**
 * Dedicated browser Web Worker for the opt-in open-source WebLLM model.
 * The large WebLLM runtime is bundled ONLY into this worker and is never
 * downloaded as part of the initial Oman Earth Intelligence page.
 */
import {CreateMLCEngine} from '@mlc-ai/web-llm';
import {OPEN_MODELS} from './local-ai-knowledge.mjs';

type Engine = Awaited<ReturnType<typeof CreateMLCEngine>>;
type ChatMessage = {role:'system'|'user'|'assistant';content:string};
type WorkerRequest = {id:number;action:'load'|'ask'|'stop';modelId?:string;messages?:ChatMessage[]};
let engine:Engine|null = null;
let modelName='';

function reply(id:number,kind:'ready'|'reply'|'progress'|'error',value?:string,progress?:number){
  self.postMessage({id,kind,value,progress});
}

self.onmessage = async (event:MessageEvent<WorkerRequest>)=>{
  const input=event.data;
  if(!input || !Number.isInteger(input.id))return;
  if(input.action==='stop'){
    try {engine?.interruptGenerate();} catch {/* interrupted generation */}
    return;
  }
  try{
    if(input.action==='load'){
      if(!OPEN_MODELS.some(x=>x.id===input.modelId))throw new Error('MODEL_NOT_ALLOWED');
      if(engine && modelName===input.modelId){reply(input.id,'ready');return;}
      if(engine){await engine.unload();engine=null;modelName='';}
      engine=await CreateMLCEngine(input.modelId!,{
        initProgressCallback:status=>reply(input.id,'progress',status.text,Math.max(0,Math.min(1,status.progress??0))),
      });
      modelName=input.modelId!;
      reply(input.id,'ready');
    }else if(input.action==='ask'){
      if(!engine||!modelName)throw new Error('MODEL_NOT_LOADED');
      if(!Array.isArray(input.messages)||input.messages.length<2)throw new Error('INVALID_CONTEXT');
      const response=await engine.chat.completions.create({
        messages:input.messages,
        temperature:0.2,
        top_p:0.9,
        max_tokens:300,
        stream:false,
      });
      const output=response.choices?.[0]?.message?.content;
      if(typeof output!=='string'||!output.trim())throw new Error('EMPTY_AI_RESPONSE');
      reply(input.id,'reply',output.trim().slice(0,3500));
    }
  }catch(error){
    reply(input.id,'error',error instanceof Error?error.message:'LOCAL_AI_FAILED');
  }
};
