import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{try{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');}catch{ts=null;}}
import worker from '../worker/index.mjs';
const get=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
test('all TS/TSX modules parse with TypeScript (syntax-only)',(context)=>{
 if(!ts){context.skip('TypeScript is checked by npm run build after npm install');return;}
 for(const file of ['src/App.tsx','src/main.tsx','src/components/OmanMap.tsx','src/components/TrendChart.tsx','src/lib/evidence.ts','src/lib/locations.ts','vite.config.ts']){
  const result=ts.transpileModule(get(file),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  const err=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(err.length,0,`${file}: ${err.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; ')}`);
 }
});
test('the app uses React, MapLibre, separate data controls and reduced-motion CSS',()=>{
 assert.match(get('src/components/OmanMap.tsx'),/maplibregl\.Map/);
 assert.match(get('src/App.tsx'),/Statistical Significance/);
 assert.match(get('src/styles.css'),/prefers-reduced-motion/);
 assert.match(get('src/App.tsx'),/download|Export CSV|تصدير CSV/i);
});
test('Cloudflare asset routing isolates API and preserves SPA',()=>{
 const text=get('wrangler.jsonc');assert.match(text,/"\/api\/\*"/);assert.match(text,/single-page-application/);assert.match(text,/oman-earth-intelligence-practice/);
});
test('Worker returns usable status JSON',async()=>{const res=await worker.fetch(new Request('https://example.com/api/status'),{ASSETS:{fetch:()=>new Response('')}},{waitUntil:()=>{}});assert.equal(res.status,200);const body=await res.json();assert.equal(body.ready,true);assert.equal(body.liveVerified,false);});
test('Worker rejects unknown API path',async()=>{const res=await worker.fetch(new Request('https://example.com/api/unavailable'),{ASSETS:{fetch:()=>new Response('')}},{waitUntil:()=>{}});assert.equal(res.status,404);});
test('Worker rejects invalid NASA query without network calls',async()=>{const res=await worker.fetch(new Request('https://example.com/api/power?lat=77&lon=100&start=2000&end=2025'),{ASSETS:{fetch:()=>new Response('')}},{waitUntil:()=>{}});assert.equal(res.status,400);});

test('AI endpoint returns explicit not configured status',async()=>{const res=await worker.fetch(new Request('https://example.com/api/ask',{method:'POST',body:'{}'}),{ASSETS:{fetch:()=>new Response('')}},{waitUntil:()=>{}});assert.equal(res.status,501);const body=await res.json();assert.equal(body.modelEnabled,false);});
