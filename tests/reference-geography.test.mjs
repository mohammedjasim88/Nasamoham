import test from 'node:test';
import assert from 'node:assert/strict';
import {projectReference,referencePaths} from '../src/lib/reference-geography.mjs';
const ring=[[54,17],[55,17],[55,18],[54,17]];
const collection=geometry=>({type:'FeatureCollection',features:Array.from({length:11},()=>({type:'Feature',geometry}))});
test('reference projection keeps north up, east right and all Oman points within the view',()=>{
 const sw=projectReference(51.8,16.45),ne=projectReference(60.1,26.7);
 assert.ok(sw[0]<ne[0]&&sw[1]>ne[1]);
 for(const p of [sw,ne,projectReference(58.7351,23.5946),projectReference(56.2477,26.1799)])assert.ok(p[0]>=0&&p[0]<=680&&p[1]>=0&&p[1]<=860);
});
test('SVG polygon paths retain holes and disconnected territories',()=>{
 const hole=[[54.2,17.2],[54.3,17.2],[54.3,17.3],[54.2,17.2]];
 const path=referencePaths(collection({type:'MultiPolygon',coordinates:[[ring,hole],[ring]]}));
 assert.equal(path.length,11);assert.equal((path[0].d.match(/M/g)||[]).length,3);assert.equal((path[0].d.match(/Z/g)||[]).length,3);
});
test('incomplete, malformed or non-finite geography is rejected without fabricated borders',()=>{
 for(const data of [{type:'FeatureCollection',features:[]},collection({type:'Point',coordinates:[54,17]}),collection({type:'Polygon',coordinates:[[[NaN,17],...ring]]})])assert.throws(()=>referencePaths(data));
 for(const pos of [[Infinity,20],[58,90],[0,0]])assert.throws(()=>projectReference(...pos));
});
