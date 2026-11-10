import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {neweyWestTrend,mannKendall,pairedTrendDifference} from '../src/lib/trend-inference.mjs';
import {linearTrend} from '../src/lib/statistics.mjs';
import {theilSenSlope} from '../src/lib/robustness.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/statistical-reference.json',import.meta.url)));
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} differs from ${b}`);
for(const c of fixture.cases)test(`Independent SciPy/statsmodels oracle: ${c.name}`,()=>{
 const r=neweyWestTrend(c.records);assert.equal(r.valid,true);assert.equal(r.lag,c.hac.lag);
 for(const k of ['slope','standardError','pValue'])near(r[k],c.hac[k]);
 r.ci95.forEach((v,i)=>near(v,c.hac.ci95[i]));
 near(mannKendall(c.records).pValue,c.mkP,1.5e-7);
 near(theilSenSlope(c.records),c.sen);near(linearTrend(c.records).pValue,c.olsP);
});
const a=fixture.cases[0].records,b=fixture.cases[2].records;
test('Calendar gaps, duplicate years, missing values and invalid bandwidth fail closed',()=>{
 for(const s of [a.slice(0,9),a.filter((_,i)=>i!==8),[...a,a[0]],a.map((r,i)=>i===8?{...r,value:null}:r)])assert.equal(neweyWestTrend(s).valid,false);
 assert.equal(neweyWestTrend(a,{lag:-1}).valid,false);
 assert.equal(neweyWestTrend(a,{lag:26}).valid,false);
 assert.equal(mannKendall(a.map(r=>({...r,value:1}))).valid,false);
 assert.equal(neweyWestTrend(a.map(r=>({...r,value:r.year}))).valid,false);
});
test('Paired difference preserves direction, covariance and exact year alignment',()=>{
 const r=pairedTrendDifference(a,b),opposite=pairedTrendDifference(b,a);
 assert.equal(r.valid,true);near(r.slope,linearTrend(b).slope-linearTrend(a).slope);
 near(r.slope,-opposite.slope);near(r.pValue,opposite.pValue);
 assert.equal(pairedTrendDifference(a,b.slice(1)).valid,false);
 assert.equal(pairedTrendDifference(a,b.map((r,i)=>i===2?{...r,value:null}:r)).valid,false);
});
test('Methods do not mutate original source records',()=>{
 const s=Object.freeze(a.map(x=>Object.freeze({...x})));neweyWestTrend(s);mannKendall(s);pairedTrendDifference(s,b);
});
