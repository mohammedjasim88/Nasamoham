import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('Vite emits explicit MapLibre v6 worker asset',()=>{
 const source=read('src/components/OmanMap.tsx');
 assert.match(source,/maplibre-gl-worker\.mjs\?worker&url/);
 assert.match(source,/setWorkerUrl\(workerUrl\)/);
});
test('no misleading unverified rainfall unit',()=>{
 const meta=read('src/lib/locations.ts'),app=read('src/App.tsx');
 assert.doesNotMatch(meta,/Source unit\*/);
 assert.match(app,/NASA unit unverified/);
 assert.match(app,/rain-integrity/);
});
test('no infinite blank map: backup and coordinate fallback exist',()=>{
 const map=read('src/components/OmanMap.tsx');
 assert.match(map,/rasterBackup/);
 assert.match(map,/CoordinateReference/);
 assert.match(map,/setTimeout/);
 assert.match(map,/Retry map/);
});
test('CSP permits backup raster domain and MapLibre ESM worker',()=>{
 const headers=read('public/_headers');
 assert.match(headers,/https:\/\/\*\.cartocdn\.com/);
 assert.match(headers,/worker-src 'self'/);
});
test('confidence interval and hash route are present',()=>{
 const app=read('src/App.tsx');
 assert.match(app,/ci95\[0\]/);
 assert.match(app,/hashchange/);
});
test('evidence excludes invalid annual data from trend',()=>{
 const lib=read('src/lib/evidence.ts');
 assert.match(lib,/quality\.invalid/);
 assert.match(lib,/linearTrend\(safeSeries\)/);
});
