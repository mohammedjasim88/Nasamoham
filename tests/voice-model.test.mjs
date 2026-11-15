import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceModelUrl,serveVoiceModel} from '../worker/voice-model.mjs';
import worker from '../worker/index.mjs';
const path='/api/voice-model/Xenova/whisper-tiny/resolve/5332fcc35e32a33b86612b9a57a89be7906102b1/';
const req=(file='config.json',options)=>new Request('https://example.test'+path+file,options);

test('model downloads are pinned, read-only, same-origin and restricted to required public files',()=>{
 assert.equal(voiceModelUrl(req()),'https://huggingface.co/Xenova/whisper-tiny/resolve/5332fcc35e32a33b86612b9a57a89be7906102b1/config.json');
 for(const request of [req('config.json?url=https://evil.test'),req('secrets.json'),req('config.json',{method:'POST',body:'audio'}),req('config.json',{headers:{Origin:'https://evil.test'}}),new Request('https://example.test'+path.replace(/5332\w+/,'main')+'config.json')])assert.throws(()=>voiceModelUrl(request));
});
test('model data streams unchanged without buffering audio or forwarding caller credentials',async()=>{
 let options;
 const response=await serveVoiceModel(req(),null,async(url,init)=>{options=init;assert.equal(new URL(url).hostname,'huggingface.co');return new Response('{"test":true}',{headers:{'Content-Length':'13'}});},null);
 assert.equal(await response.text(),'{"test":true}');assert.match(response.headers.get('Cache-Control'),/immutable/);
 assert.deepEqual(options.headers,{Accept:'application/octet-stream, application/json'});
});
test('failed model requests stay retryable and cache hits avoid another upstream request',async()=>{
 const failed=await serveVoiceModel(req(),null,async()=>new Response('upstream detail',{status:503}),null);
 assert.equal(failed.status,502);assert.doesNotMatch(await failed.text(),/upstream detail/);assert.equal(failed.headers.get('Cache-Control'),'no-store');
 const cached=await serveVoiceModel(req(),null,async()=>{throw new Error('must not fetch');},{match:async()=>new Response('cached')});
 assert.equal(await cached.text(),'cached');
});
test('oversized downloads and forbidden routes fail closed; existing API rejection remains',async()=>{
 await assert.rejects(serveVoiceModel(req(),null,async()=>new Response('x',{headers:{'Content-Length':String(100*1024*1024)}}),null),/MODEL_FILE_TOO_LARGE/);
 const response=await worker.fetch(req('private.json'),{},{});assert.equal(response.status,404);
 const unknown=await worker.fetch(new Request('https://example.test/api/unknown'),{},{});assert.equal(unknown.status,404);
});
test('metadata uses a one-byte range and never poisons the full-model cache',async()=>{
 let cached=false;
 const response=await serveVoiceModel(req('onnx/encoder_model_quantized.onnx',{headers:{Range:'bytes=0-0'}}),{waitUntil:()=>{cached=true;}},async(url,options)=>{
  assert.equal(options.headers.Range,'bytes=0-0');return new Response(new Uint8Array([8]),{status:206,headers:{'Content-Length':'1','Content-Range':'bytes 0-0/1234'}});
 },{match:async()=>null,put:async()=>{cached=true;}});
 assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),'bytes 0-0/1234');assert.equal((await response.arrayBuffer()).byteLength,1);assert.equal(cached,false);
 assert.throws(()=>voiceModelUrl(req('config.json',{headers:{Range:'bytes=10-99999999'}})),/INVALID_MODEL_RANGE/);
});
