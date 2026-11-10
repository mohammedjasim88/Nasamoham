/** Boundary controls only; scientific transformations remain in the original modules. */
export class SecurityError extends Error {
  constructor(code,status=400){super(code);this.code=code;this.status=status;}
}
const METHODS=new Map([
  ['/api/status','GET'],['/api/power','GET'],['/api/boundaries','GET'],
  ['/api/verification','GET'],['/api/nasa-csv','GET'],['/api/ask','POST']
]);
const KEYS={
  '/api/status':[], '/api/ask':[], '/api/boundaries':['level'],
  '/api/power':['lat','lon','start','end'],
  '/api/verification':['lat','lon','start','end','metric'],
  '/api/nasa-csv':['lat','lon','start','end','metric']
};
const METRICS=['T2M','RH2M','PRECTOTCORR_SUM'];
const NUM=/^-?\d{1,3}(?:\.\d{1,8})?$/;
export function validatePoint(p){
  for(const [key,min,max] of [['lat',16,27],['lon',52,61]]){
    const value=p[key];
    if(!['number','string'].includes(typeof value)||!NUM.test(String(value))||Number(value)<min||Number(value)>max)
      throw new SecurityError('INVALID_COORDINATES');
  }
  const start=p.start===undefined?2000:p.start,end=p.end===undefined?2025:p.end;
  if(!/^\d{4}$/.test(String(start))||!/^\d{4}$/.test(String(end))||Number(start)<1981||Number(end)>2025||Number(start)>Number(end)||Number(end)-Number(start)>45)
    throw new SecurityError('INVALID_YEAR_RANGE');
}
export function validateApiRequest(request){
  const url=new URL(request.url),route=url.pathname;
  if(!METHODS.has(route))throw new SecurityError('UNKNOWN_ENDPOINT',404);
  if(request.method!==METHODS.get(route))throw new SecurityError('METHOD_NOT_ALLOWED',405);
  if(url.href.length>2048||url.search.length>1024)throw new SecurityError('QUERY_TOO_LONG',414);
  const origin=request.headers.get('Origin');
  if((origin!==null&&origin!==url.origin)||request.headers.get('Sec-Fetch-Site')==='cross-site')
    throw new SecurityError('ORIGIN_NOT_ALLOWED',403);
  const seen=new Set();
  for(const [key] of url.searchParams){
    if(!KEYS[route].includes(key)||seen.has(key))throw new SecurityError('UNSUPPORTED_QUERY');
    seen.add(key);
  }
  const q=Object.fromEntries(url.searchParams);
  if(['/api/power','/api/verification','/api/nasa-csv'].includes(route))validatePoint(q);
  if((route==='/api/verification'||route==='/api/nasa-csv')&&!METRICS.includes(q.metric))throw new SecurityError('INVALID_METRIC');
  if(route==='/api/boundaries'&&q.level!==undefined&&!['governorates','wilayats'].includes(q.level))throw new SecurityError('INVALID_BOUNDARY_LEVEL');
  if(request.headers.has('Content-Length')){
    const length=request.headers.get('Content-Length');
    if(!/^\d+$/.test(length)||Number(length)>2048)throw new SecurityError('PAYLOAD_TOO_LARGE',413);
  }
  return url;
}
/** Byte budget and deadline apply while reading, including chunked/slow bodies. */
export async function readBounded(body,maxBytes,deadline){
  if(!body)return new Uint8Array();
  const reader=body.getReader(),chunks=[];let total=0;
  try{
    for(;;){
      const {done,value}=await (deadline?Promise.race([reader.read(),deadline]):reader.read());
      if(done)break;
      total+=value.byteLength;
      if(total>maxBytes)throw new SecurityError('PAYLOAD_TOO_LARGE',413);
      chunks.push(value);
    }
    const bytes=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    return bytes;
  }catch(e){await reader.cancel().catch(()=>{});throw e;}
  finally{reader.releaseLock();}
}
export async function readAskPayload(request){
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))throw new SecurityError('JSON_REQUIRED',415);
  if(request.headers.has('Content-Encoding')&&request.headers.get('Content-Encoding')!=='identity')throw new SecurityError('UNSUPPORTED_ENCODING',415);
  let timer;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new SecurityError('BODY_TIMEOUT',408)),5000);});
  let content;
  try{const bytes=await readBounded(request.body,2048,deadline);content=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch(e){if(e instanceof SecurityError)throw e;throw new SecurityError('INVALID_JSON');}
  finally{clearTimeout(timer);}
  const allowed=['question','metric','locale','lat','lon','start','end'];
  if(!content||typeof content!=='object'||Array.isArray(content)||Object.keys(content).some(k=>!allowed.includes(k)))throw new SecurityError('INVALID_PAYLOAD');
  if(typeof content.question!=='string'||!content.question.trim()||content.question.length>330||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(content.question))throw new SecurityError('INVALID_QUESTION');
  if(!METRICS.includes(content.metric)||content.locale!==undefined&&!['ar','en'].includes(content.locale))throw new SecurityError('INVALID_PAYLOAD');
  validatePoint(content);
  return content;
}
const DESTINATIONS=new Map([
  ['power.larc.nasa.gov',new Set(['/api/temporal/monthly/point'])],
  ['ncsigeostatportal.ncsi.gov.om',new Set([
    '/server/rest/services/NCSIData/AdminBoundEn/MapServer/1/query',
    '/server/rest/services/NCSIData/WilayatB/FeatureServer/3/query'
  ])]
]);
export async function safeUpstream(url,options={},fetcher=globalThis.fetch){
  const target=new URL(url);
  if(target.protocol!=='https:'||target.port||target.username||target.password||!DESTINATIONS.get(target.hostname)?.has(target.pathname))throw new SecurityError('UPSTREAM_DESTINATION_BLOCKED',502);
  const maxBytes=options.maxBytes??1_000_000;
  const controller=new AbortController();let timer;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new SecurityError('UPSTREAM_TIMEOUT',504));},options.timeoutMs??18000);});
  const abort=()=>controller.abort();
  options.signal?.addEventListener('abort',abort,{once:true});
  try{
    if(options.signal?.aborted)throw new SecurityError('UPSTREAM_ABORTED',502);
    const response=await Promise.race([fetcher(target.href,{method:'GET',headers:options.headers||{Accept:'application/json'},signal:controller.signal,redirect:'manual',cache:'no-store'}),deadline]);
    if(!response.ok){await response.body?.cancel().catch(()=>{});throw new SecurityError('UPSTREAM_UNAVAILABLE',502);}
    const length=response.headers.get('Content-Length');
    if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes)){await response.body?.cancel().catch(()=>{});throw new SecurityError('UPSTREAM_TOO_LARGE',502);}
    const bytes=await readBounded(response.body,maxBytes,deadline);
    // Preserve original bytes for independent verification and source CSV downloads.
    return new Response(bytes,{status:response.status,headers:response.headers});
  }catch(e){controller.abort();if(e?.code==='PAYLOAD_TOO_LARGE')throw new SecurityError('UPSTREAM_TOO_LARGE',502);if(e instanceof SecurityError)throw e;throw new SecurityError('UPSTREAM_UNAVAILABLE',502);}
  finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
}
export const verificationFetch=(url,options={})=>safeUpstream(url,{...options,maxBytes:new URL(url).searchParams.get('format')==='CSV'?3_000_000:1_000_000});
export async function runEvidenceAi(binding,input,timeoutMs=15000){
  let timer;
  try{return await Promise.race([
    binding.run('@cf/meta/llama-3.1-8b-instruct-fp8',input,{rejectIfBusy:true}),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new SecurityError('AI_TIMEOUT',504)),timeoutMs);})
  ]);}finally{clearTimeout(timer);}
}
export function securityError(error){
  const status=error instanceof SecurityError?error.status:500;
  const code=error instanceof SecurityError?error.code:'INTERNAL_ERROR';
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
  if(status===405)headers.Allow='GET';
  return new Response(JSON.stringify({error:status>=500?'Service temporarily unavailable':code,code}),{status,headers});
}
export function secureApiResponse(response,request,requestId){
  const headers=new Headers(response.headers);
  for(const [key,value] of Object.entries({
    'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
    'Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()',
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    'Cross-Origin-Resource-Policy':'same-origin','X-Request-ID':requestId
  }))headers.set(key,value);
  if(new URL(request.url).protocol==='https:')headers.set('Strict-Transport-Security','max-age=31536000');
  headers.delete('Access-Control-Allow-Origin');headers.delete('Access-Control-Allow-Credentials');
  if(request.headers.get('Origin')===new URL(request.url).origin){headers.set('Access-Control-Allow-Origin',new URL(request.url).origin);headers.append('Vary','Origin');}
  if(response.status>=400)headers.set('Cache-Control','no-store');
  if(response.status===405)headers.set('Allow',METHODS.get(new URL(request.url).pathname)||'GET');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export function logSecurityResult(request,response,requestId){
  if(response.status<400)return;
  // Sample routine rejections; always record server failures. Never include query/body/IP/upstream error text.
  if(response.status<500&&crypto.getRandomValues(new Uint8Array(1))[0]>7)return;
  const path=new URL(request.url).pathname;
  console.warn(JSON.stringify({event:'api_security',route:METHODS.has(path)?path:'/api/unknown',status:response.status,requestId}));
}
