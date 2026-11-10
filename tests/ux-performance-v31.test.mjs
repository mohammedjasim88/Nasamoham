import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('NASA data not loaded when intro is the current page',()=>{
 const app=read('src/App.tsx');
 assert.match(app,/if\(!activeDataPage\)return;const controller=new AbortController\(\)/);
 assert.match(app,/\[place,live,loadKey,activeDataPage\]/);
});
test('globe uses the UV-validated geographic helper and Oman-facing camera',()=>{
 const source=read('src/components/EarthGlobe.tsx');
 assert.match(source,/globeCoordinates\(lon,lat,r\)/);
 assert.match(source,/globe\.rotation\.order='XYZ'/);
 assert.match(source,/degToRad\(-147\.5\)/);
});
test('WebGL renderer throttled and context loss fallback provided',()=>{
 const source=read('src/components/EarthGlobe.tsx');
 assert.match(source,/minFrameMs/); assert.match(source,/webglcontextlost/);
});
test('mobile CTA prioritised',()=>{
 const css=read('src/components/PremiumHome.css');
 assert.match(css,/\.cinematic-ctas \{order: 1/);
});
