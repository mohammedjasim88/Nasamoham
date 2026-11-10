import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trendDiagnostics,theilSenSlope,lagOneResidualCorrelation} from '../src/lib/robustness.mjs';
import {runVerificationSelfTest} from '../src/lib/verification-selftest.mjs';
import {assessGeoJson} from '../worker/geo-check.mjs';
import {applyRateControl} from '../worker/rate-control.mjs';
import worker from '../worker/index.mjs';
import {metricSeries} from '../src/lib/statistics.mjs';
const source=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const snapshot=JSON.parse(source('../public/data/muscat-east.json'));
const fakePoly=(coordinates=[[[55,22],[56,22],[56,23],[55,22]]])=>({type:'Feature',geometry:{type:'Polygon',coordinates},properties:{}});

test('Scientific sensitivity calculations retain NASA original values',()=>{
 const before=JSON.stringify(snapshot);
 const records=metricSeries(snapshot,'T2M',2000,2025);
 const d=trendDiagnostics(records);
 assert.equal(d.valid,true);assert.equal(d.observations,26);
 assert.ok(Number.isFinite(d.theilSenPerDecade));assert.ok(Number.isFinite(d.olsPerDecade));
 assert.equal(JSON.stringify(snapshot),before);
});
test('Theil-Sen uses median pairwise slope and returns null for insufficient points',()=>{
 assert.equal(theilSenSlope([{year:2020,value:1},{year:2021,value:3},{year:2022,value:5}]),2);
 assert.equal(theilSenSlope([{year:2020,value:1}]),null);
 assert.equal(lagOneResidualCorrelation([{year:2020,value:1}],{valid:false}),null);
});
test('Sensitivities detect a synthetic exaggerated point without deleting it',()=>{
 const series=Array.from({length:20},(_,i)=>({year:2000+i,value:i+ (i===10?120:0)}));
 const d=trendDiagnostics(series);
 assert.equal(d.valid,true);assert.ok(d.maxChangePerDecade>1);assert.equal(series[10].value,130);
});
test('Verification engine negative self-test catches altered and missing years',()=>{
 const r=runVerificationSelfTest();assert.equal(r.passed,true);
 assert.equal(r.mismatch.summary.different,1);assert.equal(r.incomplete.summary.missingSite,1);
 assert.equal(r.publicClimateDataChanged,false);
});
test('Geospatial validation rejects out-of-region and open empty geometries',()=>{
 const good={type:'FeatureCollection',features:Array.from({length:11},()=>fakePoly())};
 const g=assessGeoJson(good,'governorates');assert.equal(g.ok,true);assert.equal(g.count,11);
 assert.deepEqual(g.bbox,[55,22,56,23]);
 assert.equal(assessGeoJson({type:'FeatureCollection',features:Array(11).fill(fakePoly([[[100,24],[55,22],[56,23],[100,24]]]))},'governorates').ok,false);
 assert.equal(assessGeoJson({type:'FeatureCollection',features:Array(10).fill(fakePoly())},'governorates').ok,false);
});
test('Rate limiter enforces 429, retry-after, and does not block status',async()=>{
 const denied=await applyRateControl({NASA_RATE:{limit:async()=>({success:false})}},'/api/verification');
 assert.equal(denied.status,429);assert.equal(denied.headers.get('Retry-After'),'60');
 assert.equal(await applyRateControl({NASA_RATE:{limit:async()=>({success:false})}},'/api/status'),null);
 const allowed=await applyRateControl({NASA_RATE:{limit:async()=>({success:true})}},'/api/power');assert.equal(allowed,null);
});
test('Worker rejects over-budget independent NASA verification before upstream request',async()=>{
 const req=new Request('https://example.test/api/verification?lat=23.5946&lon=58.7351&metric=T2M&start=2000&end=2025');
 const response=await worker.fetch(req,{NASA_RATE:{limit:async()=>({success:false})}},{});
 assert.equal(response.status,429);
});
test('Front-end exposes accessible sensitivity review and no source CSV mutation',()=>{
 const app=source('../src/App.tsx'),lab=source('../src/components/VerificationLab.tsx');
 assert.match(app,/ScientificAudit/);assert.match(app,/skip-to-content/);
 assert.match(lab,/runVerificationSelfTest/);
 assert.match(source('../src/styles.css'),/scroll-snap-type:x proximity/);
 assert.match(source('../wrangler.jsonc'),/"ratelimits"/);
});
