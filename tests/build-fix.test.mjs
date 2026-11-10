import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name)=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');

test('MapLibre v6 imports do not use removed default export and event type is explicit',()=>{
 const map=read('src/components/OmanMap.tsx');
 assert.match(map,/import \* as maplibregl from ['"]maplibre-gl['"]/);
 assert.doesNotMatch(map,/import maplibregl from ['"]maplibre-gl['"]/);
 assert.match(map,/e:maplibregl\.MapLayerMouseEvent/);
 assert.match(map,/maplibregl\.setWorkerUrl\(workerUrl\)/);
});

test('Vite ImportMetaEnv type is provided',()=>{
 const env=read('src/vite-env.d.ts');
 assert.match(env,/reference types=["']vite\/client["']/);
 assert.match(env,/VITE_MAPTILER_KEY/);
});

test('TrendChart checks the active record exists before plotting',()=>{
 const chart=read('src/components/TrendChart.tsx');
 assert.match(chart,/a!=null&&a\.value!=null/);
 assert.doesNotMatch(chart,/a\?\.value!==null&&<g>/);
});
