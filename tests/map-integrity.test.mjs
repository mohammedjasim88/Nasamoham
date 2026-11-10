import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=new URL('../worker/index.mjs',import.meta.url);
const mapFile=new URL('../src/components/OmanMap.tsx',import.meta.url);
const worker=readFileSync(source,'utf8');const map=readFileSync(mapFile,'utf8');
test('governorate layer comes from NCSI AdminBoundEn MapServer polygon layer 1',()=>{
 assert.match(worker,/AdminBoundEn\/MapServer\/1/);
 assert.match(worker,/regionLevel = '2'/);
});
test('NCSI WilayatB layer 3 is separate from governorate source',()=>{
 assert.match(worker,/WilayatB\/FeatureServer\/3/);
 assert.doesNotMatch(worker,/candidate=level/);
});
test('initial map shows full Oman without flying to default selected Muscat on ready',()=>{
 assert.match(map,/map\.fitBounds\(\[\[51\.8,16\.45\],\[60\.1,26\.7\]\]/);
 assert.match(map,/\},\[selected\]\);/);
});
test('wilayats requested after checkbox is turned on',()=>{
 assert.match(map,/else if\(showWilayats\)layerLoaderRef\.current\?\.\('wilayats'\)/);
});
