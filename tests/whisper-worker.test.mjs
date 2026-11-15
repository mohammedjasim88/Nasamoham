import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {WHISPER_MODELS} from '../src/lib/whisper-models.mjs';
import {checkVoiceAudio} from '../src/lib/voice-audio.mjs';

// Exercise the actual worker's error handling without downloading models or
// pretending a mocked pipeline verifies speech-recognition accuracy.
const workerUrl='https://voice.test/assets/whisper.worker.js';
const modelRoot=`https://voice.test/api/voice-model/${WHISPER_MODELS.tiny.id}/resolve/${WHISPER_MODELS.tiny.revision}/`;
const source=await readFile(new URL('../src/lib/whisper.worker.ts',import.meta.url),'utf8');
const runnable=ts.transpileModule(
 source.replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.url',JSON.stringify(workerUrl)),
 {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}
).outputText.replace(/^export \{\};?\r?\n?/gm,'');

function workerHarness(fetcher,runPipeline){
 const messages=[];
 const self={location:{href:workerUrl,origin:new URL(workerUrl).origin},postMessage:message=>messages.push({...message})};
 const env={backends:{onnx:{wasm:{}}}};
 const context=vm.createContext({self,env,runtimeUrl:'/assets/ort.wasm',WHISPER_MODELS,checkVoiceAudio,
  URL,Request,Response,Float32Array,Error,fetch:fetcher,
  pipeline:(...args)=>runPipeline(context.fetch,...args)});
 vm.runInContext(runnable,context,{filename:'whisper.worker.ts'});
 return {messages,send:async(id=1)=>{
  await self.onmessage({data:{id,audio:new Float32Array(4000).fill(0.1),lang:'en',model:'tiny'}});
  return messages.findLast(message=>message.id===id&&['error','done'].includes(message.status));
 }};
}

function concurrentDownloads(file,{httpStatus}={}){
 let finishAsset;
 const assetUrl=file.endsWith('.wasm')?`https://voice.test/assets/${file}`:modelRoot+file;
 return {
  fetcher:async input=>{
   if(String(input)===assetUrl)return new Promise((resolve,reject)=>{
    finishAsset=()=>httpStatus?resolve(new Response('unavailable',{status:httpStatus})):reject(new TypeError('Failed to fetch'));
   });
   // A later successful metadata request must not determine the error label.
   assert.equal(String(input),modelRoot+'generation_config.json');
   finishAsset();
   return new Response('{}');
  },
  pipeline:async fetcher=>{
   const [asset]=await Promise.all([fetcher(assetUrl),fetcher(modelRoot+'generation_config.json')]);
   if(!asset.ok)throw new Error(`HTTP ${asset.status}: model download unavailable`);
   return async()=>({text:'unused pipeline stub'});
  }
 };
}

test('worker attributes a rejected concurrent model fetch to the encoder',async()=>{
 const setup=concurrentDownloads('onnx/encoder_model_quantized.onnx');
 const worker=workerHarness(setup.fetcher,setup.pipeline);
 assert.deepEqual(await worker.send(),{id:1,status:'error',stage:'model',file:'encoder_model_quantized.onnx',code:'MODEL_DOWNLOAD_FAILED'});
});

test('worker attributes an HTTP model failure to the encoder despite later metadata',async()=>{
 const setup=concurrentDownloads('onnx/encoder_model_quantized.onnx',{httpStatus:502});
 const worker=workerHarness(setup.fetcher,setup.pipeline);
 assert.deepEqual(await worker.send(),{id:1,status:'error',stage:'model',file:'encoder_model_quantized.onnx',code:'MODEL_DOWNLOAD_FAILED'});
});

test('worker attributes a rejected runtime fetch to WASM despite later metadata',async()=>{
 const setup=concurrentDownloads('ort.wasm');
 const worker=workerHarness(setup.fetcher,setup.pipeline);
 assert.deepEqual(await worker.send(),{id:1,status:'error',stage:'runtime',file:'ort.wasm',code:'MODEL_DOWNLOAD_FAILED'});
});

test('worker clears download attribution when retry reaches inference',async()=>{
 const setup=concurrentDownloads('onnx/encoder_model_quantized.onnx');
 let attempts=0;
 const worker=workerHarness(setup.fetcher,async fetcher=>{
  if(++attempts===1)return setup.pipeline(fetcher);
  return async()=>{throw new Error('decoder execution failed');};
 });
 assert.equal((await worker.send(1)).file,'encoder_model_quantized.onnx');
 assert.deepEqual(await worker.send(2),{id:2,status:'error',stage:'transcribing',file:'',code:'INFERENCE_FAILED'});
 assert.equal(attempts,2);
});

test('optional metadata HTTP 404 does not hide the required encoder HTTP 502',async()=>{
 const setup=concurrentDownloads('onnx/encoder_model_quantized.onnx',{httpStatus:502});
 const optionalUrl=modelRoot+'quantize_config.json';
 const worker=workerHarness(
  input=>String(input)===optionalUrl?Promise.resolve(new Response('absent',{status:404})):setup.fetcher(input),
  async fetcher=>{
   // Transformers permits an absent optional metadata file and continues.
   assert.equal((await fetcher(optionalUrl)).status,404);
   return setup.pipeline(fetcher);
  }
 );
 assert.deepEqual(await worker.send(),{id:1,status:'error',stage:'model',file:'encoder_model_quantized.onnx',code:'MODEL_DOWNLOAD_FAILED'});
});

test('optional metadata HTTP 404 does not relabel a later inference failure',async()=>{
 const worker=workerHarness(
  async()=>new Response('absent',{status:404}),
  async fetcher=>{
   assert.equal((await fetcher(modelRoot+'quantize_config.json')).status,404);
   return async()=>{throw new Error('decoder execution failed');};
  }
 );
 assert.deepEqual(await worker.send(),{id:1,status:'error',stage:'transcribing',file:'',code:'INFERENCE_FAILED'});
});
