import {WHISPER_MODELS} from '../src/lib/whisper-models.mjs';
import {SecurityError} from './security.mjs';

const FILES=new Set(['config.json','generation_config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','added_tokens.json','quant_config.json','quantize_config.json','onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx']);
const MAX_BYTES=96*1024*1024;

/** Public, pinned model downloads only. Never accepts audio, credentials, arbitrary URLs or revisions. */
export function voiceModelUrl(request){
 const url=new URL(request.url);
 if(request.method!=='GET')throw new SecurityError('METHOD_NOT_ALLOWED',405);
 if(url.search||url.pathname.length>300)throw new SecurityError('INVALID_MODEL_PATH');
 if(request.headers.has('Range')&&request.headers.get('Range')!=='bytes=0-0')throw new SecurityError('INVALID_MODEL_RANGE',416);
 if(request.headers.get('Sec-Fetch-Site')==='cross-site'||request.headers.has('Origin')&&request.headers.get('Origin')!==url.origin)throw new SecurityError('ORIGIN_NOT_ALLOWED',403);
 const match=url.pathname.match(/^\/api\/voice-model\/(Xenova\/whisper-(tiny|base))\/resolve\/([a-f0-9]{40})\/(.+)$/);
 const model=match&&WHISPER_MODELS[match[2]];
 if(!model||match[1]!==model.id||match[3]!==model.revision||!FILES.has(match[4]))throw new SecurityError('MODEL_FILE_NOT_ALLOWED',404);
 return `https://huggingface.co/${model.id}/resolve/${model.revision}/${match[4]}`;
}

export async function serveVoiceModel(request,ctx,fetcher=fetch,cache=globalThis.caches?.default){
 const source=voiceModelUrl(request),key=new Request(request.url);
 const range=request.headers.get('Range');
 const hit=await cache?.match(key);
 if(hit&&!range)return hit;
 if(hit&&range&&hit.headers.has('Content-Length')){
  const reader=hit.body.getReader();const {value}=await reader.read();void reader.cancel().catch(()=>{});
  return new Response(value.subarray(0,1),{status:206,headers:{'Content-Length':'1','Content-Range':'bytes 0-0/'+hit.headers.get('Content-Length'),'Content-Type':hit.headers.get('Content-Type')||'application/octet-stream','Cache-Control':'public, max-age=31536000, immutable'}});
 }
 const abort=new AbortController();let timer;
 const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>abort.abort(),60000);};
 arm();
 try{
  const upstream=await fetcher(source,{signal:abort.signal,redirect:'follow',headers:{Accept:'application/octet-stream, application/json',...(range?{Range:range}:{})}});
  if(!upstream.ok||!upstream.body){clearTimeout(timer);return new Response(JSON.stringify({error:'Pinned voice model file unavailable',code:`MODEL_HTTP_${upstream.status}`}),{status:upstream.status===404?404:502,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
  const length=upstream.headers.get('Content-Length');
  if(length&&(!/^\d+$/.test(length)||Number(length)>MAX_BYTES)){abort.abort();throw new SecurityError('MODEL_FILE_TOO_LARGE',502);}
  const reader=upstream.body.getReader();let total=0;
  const stream=new ReadableStream({
   async pull(controller){try{const {done,value}=await reader.read();if(done){clearTimeout(timer);controller.close();return;}total+=value.byteLength;if(total>MAX_BYTES)throw new Error('MODEL_FILE_TOO_LARGE');arm();controller.enqueue(value);}catch(error){clearTimeout(timer);abort.abort();void reader.cancel().catch(()=>{});controller.error(error);}},
   cancel(){clearTimeout(timer);abort.abort();return reader.cancel();}
  });
  const headers=new Headers({'Content-Type':source.endsWith('.onnx')?'application/octet-stream':'application/json','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'});
  if(length)headers.set('Content-Length',length);
  if(upstream.headers.has('Content-Range'))headers.set('Content-Range',upstream.headers.get('Content-Range'));
  const response=new Response(stream,{headers,status:upstream.status});
  if(!range&&upstream.status===200&&cache&&ctx?.waitUntil)ctx.waitUntil(cache.put(key,response.clone()).catch(()=>{}));
  return response;
 }catch(error){clearTimeout(timer);abort.abort();if(error instanceof SecurityError)throw error;throw new SecurityError('MODEL_DOWNLOAD_UNAVAILABLE',502);}
}
