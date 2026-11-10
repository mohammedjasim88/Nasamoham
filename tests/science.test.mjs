import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {linearTrend,metricSeries,checkQuality,sameSeries} from '../src/lib/statistics.mjs';
import {validateQuery,nasaUrl,normaliseNasa} from '../worker/nasa.mjs';
import {validateBoundaryCollection} from '../worker/index.mjs';
const p=name=>JSON.parse(fs.readFileSync(new URL(`../public/data/${name}.json`,import.meta.url),'utf8'));
const a=p('muscat-east'),b=p('muscat-west'),s=p('salalah-rh');
test('real user NASA CSV converted to 26 complete years',()=>{assert.equal(a.years.length,26);assert.equal(a.years.at(0).year,2000);assert.equal(a.years.at(-1).year,2025);});
test('all 3 variables in Muscat snapshot',()=>assert.deepEqual(new Set(a.parameters),new Set(['T2M','RH2M','PRECTOTCORR_SUM'])));
test('2000 T2M matches uploaded file',()=>assert.equal(a.years[0].T2M.annual,28.14));
test('2025 T2M matches uploaded file',()=>assert.equal(a.years.at(-1).T2M.annual,28.89));
test('2024 rainfall warning not erased',()=>assert.equal(a.years.find(x=>x.year===2024).PRECTOTCORR_SUM.monthly[7],1089.9));
test('nearby points report identical gridded series',()=>assert.equal(sameSeries(metricSeries(a,'T2M'),metricSeries(b,'T2M')),true));
test('trend regression includes 26 years',()=>{const x=linearTrend(metricSeries(a,'T2M'));assert.equal(x.n,26);assert.ok(x.valid);assert.ok(x.perDecade>0);assert.ok(x.pValue<.05);});
test('humidity range valid and model flags absent annual values',()=>{const quality=checkQuality(a,'RH2M');assert.equal(quality.missing.length,0);assert.equal(quality.invalid.length,0);});
test('Salalah RH2M-only source is explicitly unverified',()=>{assert.equal(s.years.length,26);assert.deepEqual(s.parameters,['RH2M']);assert.match(s.source,/not independently verified/i);});
test('no fake Salalah temperature',()=>assert.ok(s.years.every(y=>!y.T2M)));
test('NASA query rejects invalid lat or decade interval',()=>{
 assert.throws(()=>validateQuery(new URL('https://example.com/?lat=100&lon=60&start=2000&end=2025')));
 assert.throws(()=>validateQuery(new URL('https://example.com/?lat=23.59&lon=58.74&start=1990&end=2070')));
});
test('NASA query uses original monthly API endpoint',()=>{const url=nasaUrl({lat:23.59,lon:58.74,start:2000,end:2025});assert.ok(url.includes('/api/temporal/monthly/point?'));assert.ok(url.includes('RH2M'));});
test('NASA missing annual value remains null instead of invented',()=>{
 assert.throws(()=>normaliseNasa({properties:{parameter:{T2M:{'202401':20,'202402':22,'202413':-999}}}},{lat:23,lon:57,start:2024,end:2024},'mock'));
});
test('governorate layers must contain exactly 11 genuine polygons',()=>{
 const f={type:'Feature',geometry:{type:'Polygon',coordinates:[[[55,22],[56,22],[56,23],[55,22]]]},properties:{name:'test'}};
 assert.equal(validateBoundaryCollection({type:'FeatureCollection',features:Array(7).fill(f)},'governorates').ok,false);
 assert.equal(validateBoundaryCollection({type:'FeatureCollection',features:Array(11).fill(f)},'governorates').ok,true);
});
