import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../worker/index.mjs';
import {readAskPayload,safeUpstream,runEvidenceAi,logSecurityResult} from '../worker/security.mjs';
import {applyRateControl} from '../worker/rate-control.mjs';
const base='https://app.example';
const point='lat=23.5946&lon=58.7351&start=2000&end=2025';
const ctx={waitUntil(){}};
const ask={question:'Explain the trend',metric:'T2M',locale:'en',lat:23.5946,lon:58.7351,start:2000,end:2025};
const request=(path,options)=>new Request(base+path,options);
const fixture={properties:{parameter:{T2M:{200013:28.14,200113:28.26},RH2M:{200013:52.19,200113:51.22},PRECTOTCORR_SUM:{200013:122.42,200113:51.34}}},parameters:{T2M:{units:'°C'}}};

test('API boundary rejects malformed, ambiguous and unsupported queries before upstream I/O',async(t)=>{
 const previous=globalThis.fetch;let outbound=0;globalThis.fetch=async()=>{outbound++;throw Error('must not fetch');};
 try{
  for(const [path,status] of [
   ['/api/status?debug=true',400],['/api/status',405],
   ['/api/power?'+point+'&lat=24',400],['/api/power?'+point+'&url=https://127.0.0.1',400],
   ['/api/power?lat=2.3e1&lon=58',400],['/api/power?lat=%2023&lon=58',400],
   ['/api/power?lat=23&lon=58&start=2000.0',400],['/api/power?lat=23&lon=58&end=2026',400],
   ['/api/power?lat=23&lon=58&start=2025&end=2000',400],['/api/power?lat=NaN&lon=58',400],
   ['/api/power?lat=23&lon=61.1',400],['/api/power?lat=23&lon=58&x='+'a'.repeat(1100),414],
   ['/api/boundaries?level=unknown',400],['/api/boundaries?level=wilayats&level=governorates',400],
   ['/api/verification?'+point+'&metric=UNKNOWN',400],['/api/not-a-route',404]
  ])await t.test(path.slice(0,95),async()=>{const r=await worker.fetch(request(path,path==='/api/status'?{method:'POST'}:undefined),{},ctx);assert.equal(r.status,status);assert.equal(r.headers.get('Cache-Control'),'no-store');});
  assert.equal(outbound,0);
 }finally{globalThis.fetch=previous;}
});
test('same-origin policy rejects foreign, null and suffix-confusable origins; status is still public',async()=>{
 for(const origin of ['https://evil.example','null','https://app.example.evil.test']){
  const r=await worker.fetch(request('/api/status',{headers:{Origin:origin}}),{},ctx);assert.equal(r.status,403);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
 }
 const same=await worker.fetch(request('/api/status',{headers:{Origin:base}}),{},ctx);assert.equal(same.status,200);assert.equal(same.headers.get('Access-Control-Allow-Origin'),base);assert.equal(same.headers.get('Access-Control-Allow-Credentials'),null);
 assert.equal((await worker.fetch(request('/api/status'),{},ctx)).status,200);
 assert.equal((await worker.fetch(request('/api/status',{headers:{'Sec-Fetch-Site':'cross-site'}}),{},ctx)).status,403);
});
test('all API responses, including errors and throttling, receive browser security headers',async()=>{
 for(const [path,env] of [['/api/status',{}],['/api/not-real',{}],['/api/verification?'+point+'&metric=T2M',{NASA_RATE:{limit:async()=>({success:false})}}]]){
  const r=await worker.fetch(request(path),env,ctx);
  assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');assert.match(r.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);assert.equal(r.headers.get('Strict-Transport-Security'),'max-age=31536000');assert.equal(r.headers.get('Cross-Origin-Resource-Policy'),'same-origin');assert.match(r.headers.get('X-Request-ID'),/^[a-f0-9-]{36}$/);
 }
 const r=await worker.fetch(request('/api/ask'),{},ctx);assert.equal(r.status,405);assert.equal(r.headers.get('Allow'),'POST');
});
test('JSON body is stopped at the byte budget, without a Content-Length header',async()=>{
 let chunks=0,cancelled=false;
 const body=new ReadableStream({pull(c){chunks++;c.enqueue(new Uint8Array(512));},cancel(){cancelled=true;}});
 const req=request('/api/ask',{method:'POST',duplex:'half',headers:{'Content-Type':'application/json'},body});
 await assert.rejects(readAskPayload(req),e=>e.code==='PAYLOAD_TOO_LARGE');assert.equal(cancelled,true);assert.ok(chunks<=6);
});
test('AI payload schema validates types, unknown keys, encoding and question length',async()=>{
 const good=()=>request('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ask)});
 assert.deepEqual(await readAskPayload(good()),ask);
 for(const bad of [null,[],{...ask,question:{}},{...ask,question:'x'.repeat(331)},{...ask,locale:'invalid'},{...ask,admin:true},{...ask,lat:'0x17'},{...ask,start:2000.5}]){
  await assert.rejects(readAskPayload(request('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(bad)})));
 }
 await assert.rejects(readAskPayload(request('/api/ask',{method:'POST',body:JSON.stringify(ask)})),e=>e.status===415);
 const r=await worker.fetch(request('/api/ask',{method:'POST',headers:{'Content-Length':'9000'},body:'{}'}),{},ctx);assert.equal(r.status,413);
});
test('outbound allowlist blocks private hosts, alternate ports, credentials, paths and schemes',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return new Response('{}');};
 for(const url of ['http://power.larc.nasa.gov/api/temporal/monthly/point','https://127.0.0.1/','https://power.larc.nasa.gov.evil.test/api/temporal/monthly/point','https://power.larc.nasa.gov:8443/api/temporal/monthly/point','https://user:pass@power.larc.nasa.gov/api/temporal/monthly/point','https://power.larc.nasa.gov/other'])await assert.rejects(safeUpstream(url,{},fetcher));
 assert.equal(calls,0);
});
test('upstream redirects are never followed; oversized and slow response bodies are bounded',async()=>{
 const url='https://power.larc.nasa.gov/api/temporal/monthly/point';
 let redirectMode;
 await assert.rejects(safeUpstream(url,{},async(_u,o)=>{redirectMode=o.redirect;return new Response(null,{status:302,headers:{Location:'https://127.0.0.1/'}});}));assert.equal(redirectMode,'manual');
 await assert.rejects(safeUpstream(url,{maxBytes:10},async()=>new Response('x'.repeat(20))),e=>e.code==='UPSTREAM_TOO_LARGE');
 await assert.rejects(safeUpstream(url,{maxBytes:10},async()=>new Response('',{headers:{'Content-Length':'99'}})),e=>e.code==='UPSTREAM_TOO_LARGE');
 let cancelled=false;const body=new ReadableStream({pull(){return new Promise(()=>{});},cancel(){cancelled=true;}});
 await assert.rejects(safeUpstream(url,{timeoutMs:30},async()=>new Response(body)),e=>e.code==='UPSTREAM_TIMEOUT');assert.equal(cancelled,true);
});
test('independent evidence and original CSV bytes remain unchanged through transport hardening',async()=>{
 const previous=globalThis.fetch;const raw=JSON.stringify(fixture,null,2)+'\n';
 try{
  globalThis.fetch=async()=>new Response(raw);
  const r=await worker.fetch(request('/api/verification?lat=23&lon=58&start=2000&end=2001&metric=T2M'),{},ctx);assert.equal(r.status,200);const d=await r.json();assert.equal(d.sourceRawJson,raw);assert.deepEqual(d.years,[{year:2000,value:28.14},{year:2001,value:28.26}]);assert.equal(r.headers.get('Cache-Control'),'no-store');
  const csv='-BEGIN HEADER-\r\nNASA POWER\r\n-END HEADER-\r\nYEAR,T2M\r\n2000,28.14\r\n';globalThis.fetch=async()=>new Response(csv);
  const c=await worker.fetch(request('/api/nasa-csv?lat=23&lon=58&start=2000&end=2001&metric=T2M'),{},ctx);assert.equal(await c.text(),csv);assert.match(c.headers.get('Content-Disposition'),/attachment/);
 }finally{globalThis.fetch=previous;}
});
test('public upstream failures contain no raw diagnostic details or stack traces',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>{throw Error('TEST_PRIVATE_DIAGNOSTIC');};
 try{const r=await worker.fetch(request('/api/power?'+point),{},ctx);assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/TEST_PRIVATE_DIAGNOSTIC|stack|detail/);}finally{globalThis.fetch=previous;}
});
test('cache uses a canonical validated point key; independent checks never use cached values',async()=>{
 const oldCache=globalThis.caches,oldFetch=globalThis.fetch;const entries=new Map();const tasks=[];let outbound=0;
 globalThis.caches={default:{match:async k=>entries.get(k.url)?.clone(),put:async(k,r)=>{entries.set(k.url,r.clone());}}};globalThis.fetch=async()=>{outbound++;return Response.json(fixture);};
 try{
  const context={waitUntil(p){tasks.push(p);}};
  const r=await worker.fetch(request('/api/power?lat=23.0000&lon=58.0&start=2000&end=2001'),{},context);assert.equal(r.status,200);await r.arrayBuffer();await Promise.all(tasks);
  await (await worker.fetch(request('/api/power?end=2001&start=2000&lon=58&lat=23'),{},context)).arrayBuffer();assert.equal(outbound,1);assert.equal(entries.size,1);
  await (await worker.fetch(request('/api/power?lat=24&lon=58&start=2000&end=2001'),{},context)).arrayBuffer();await Promise.all(tasks);assert.equal(outbound,2);assert.equal(entries.size,2);
  await (await worker.fetch(request('/api/verification?lat=23&lon=58&start=2000&end=2001&metric=T2M'),{},context)).arrayBuffer();assert.equal(outbound,3);assert.equal(entries.size,2);
  for(const entry of entries.values())await entry.arrayBuffer();
 }finally{globalThis.caches=oldCache;globalThis.fetch=oldFetch;}
});
test('costly NASA routes share one budget and limiter outages fail closed',async()=>{
 const keys=[];const env={NASA_RATE:{limit:async({key})=>{keys.push(key);return {success:true};}}};
 for(const route of ['/api/power','/api/verification','/api/nasa-csv'])await applyRateControl(env,route);
 assert.equal(new Set(keys).size,1);
 const denied=await applyRateControl({NASA_RATE:{limit:async()=>{throw Error('TEST_INTERNAL');}}},'/api/power');assert.equal(denied.status,503);assert.doesNotMatch(await denied.text(),/TEST_INTERNAL/);
});
test('AI request has no tools or credentials, evidence is data, and output size is capped',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json(fixture);let captured;
 try{
  const AI={run:async(model,input,options)=>{captured={model,input,options};return {response:'Source-linked explanation'};}};
  const r=await worker.fetch(request('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ask)}),{AI,PRIVATE_TEST_SECRET:'DO_NOT_SERIALISE'},ctx);
  assert.equal(r.status,200);assert.equal(captured.input.max_completion_tokens,320);assert.equal(captured.input.messages.length,2);assert.equal(captured.options.rejectIfBusy,true);assert.equal(captured.input.tools,undefined);assert.doesNotMatch(JSON.stringify(captured),/DO_NOT_SERIALISE/);assert.ok(JSON.parse(captured.input.messages[1].content).evidence);assert.doesNotMatch(captured.input.messages[0].content,/28\.14/);
  const large=await worker.fetch(request('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ask)}),{AI:{run:async()=>({response:'x'.repeat(4097)})}},ctx);assert.equal(large.status,502);
 }finally{globalThis.fetch=previous;}
 await assert.rejects(runEvidenceAi({run:()=>new Promise(()=>{})},{},20),e=>e.code==='AI_TIMEOUT');
});
test('security logs exclude query, body, IP and error details',()=>{
 const old=console.warn;const lines=[];console.warn=s=>lines.push(s);
 try{logSecurityResult(request('/api/power?token=TEST_PRIVATE'),new Response(null,{status:502}),'fixed-test-id');assert.equal(lines.length,1);assert.doesNotMatch(lines[0],/token|TEST_PRIVATE|IP|body|detail/);}finally{console.warn=old;}
});
test('static CSP retains MapLibre providers and inline style support, without unsafe script execution',()=>{
 const headers=readFileSync(new URL('../public/_headers',import.meta.url),'utf8');
 assert.match(headers,/Strict-Transport-Security: max-age=31536000/);const script=(headers.match(/script-src ([^;]+);/)?.[1]||'').split(/\s+/);assert.ok(script.includes("'self'"));assert.ok(script.includes("'wasm-unsafe-eval'"));assert.ok(!script.includes("'unsafe-eval'"));assert.ok(!script.includes("'unsafe-inline'"));
 for(const provider of ['openfreemap.org','maptiler.com','cartocdn.com'])assert.ok(headers.includes(provider));assert.match(headers,/worker-src 'self' blob:/);assert.match(headers,/style-src 'self' 'unsafe-inline'/);
});

test('invalid AI bodies do not consume quotas; enabled AI consumes the shared NASA budget before fetching',async()=>{
 let calls=0,aiCalls=0;const env={AI:{run:async()=>({response:'unused'})},AI_RATE:{limit:async()=>{aiCalls++;return {success:true};}},NASA_RATE:{limit:async()=>{calls++;return {success:false};}}};
 const malformed=await worker.fetch(request('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),env,ctx);assert.equal(malformed.status,400);assert.equal(calls+aiCalls,0);
 const valid=await worker.fetch(request('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ask)}),env,ctx);assert.equal(valid.status,429);assert.equal(aiCalls,1);assert.equal(calls,1);
});
