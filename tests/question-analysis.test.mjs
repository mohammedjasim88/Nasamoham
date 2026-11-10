import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planQuestion,analyseAnnual,analysisParagraph,locationComparison} from '../src/lib/question-analysis.mjs';
const data=JSON.parse(readFileSync(new URL('../public/data/muscat-east.json',import.meta.url)));
const point={id:'muscat-east',en:'Muscat East',ar:'مسقط شرق',lat:23.5946,lon:58.7351};
const points=[point,{...point,id:'muscat-west',en:'Muscat West',ar:'مسقط غرب',lon:58.594},{id:'salalah',en:'Salalah',ar:'صلالة',lat:17.0194,lon:54.0897},{id:'sohar',en:'Sohar',ar:'صحار',lat:24.3474,lon:56.7094}];
const ctx={pointId:point.id,metric:'RH2M',start:2000,end:2025};
const plan=q=>planQuestion(q,ctx,points);
test('Arabic inclusive range overrides dashboard metric and years, including Arabic digits',()=>{
 const p=plan('قارن درجة الحرارة في مسقط من سنة ٢٠٠٠ إلى ٢٠٠٥');assert.equal(p.ok,true);assert.equal(p.metric,'T2M');assert.equal(p.mode,'period');assert.equal(p.start,2000);assert.equal(p.end,2005);assert.deepEqual(p.locations,['muscat-east']);
 const r=analyseAnnual(data,p,point);assert.equal(r.requestedCount,6);assert.equal(r.count,6);assert.deepEqual(r.series.map(r=>r.year),[2000,2001,2002,2003,2004,2005]);assert.equal(r.first,28.14);assert.equal(r.last,28.19);assert.ok(Math.abs(r.mean-(28.14+28.26+28.42+28.04+28.36+28.19)/6)<1e-12);assert.ok(Math.abs(r.delta-.05)<1e-12);
});
test('two separated years exclude every intermediate year and do not manufacture a trend',()=>{
 const p=plan('قارن درجة الحرارة في مسقط عامي 2000 و2010');assert.equal(p.mode,'pair');const r=analyseAnnual(data,p,point);assert.deepEqual(r.series.map(r=>r.year),[2000,2010]);assert.equal(r.trend,null);assert.equal(r.last,28.2);const paragraph=analysisParagraph(data,p,point,r);assert.match(paragraph,/28\.14/);assert.match(paragraph,/28\.20/);assert.match(paragraph,/0\.06/);assert.match(paragraph,/لا تثبت اتجاها/);assert.doesNotMatch(paragraph,/p-value/);
});
test('English to and dash periods, Persian digits and single-year requests are supported',()=>{
 assert.equal(plan('Compare Muscat temperature from 2000 to 2005').mode,'period');assert.equal(plan('Muscat temperature 2000–2005').mode,'period');assert.equal(plan('Muscat temperature between 2000 and 2005').mode,'period');assert.equal(plan('حرارة مسقط ۲۰۰۰ و۲۰۱۰').mode,'pair');assert.equal(plan('حرارة مسقط 2000').mode,'single');
});
test('invalid or ambiguous scopes return clarification instead of silent assumptions',()=>{
 for(const q of ['حرارة مسقط 2005 إلى 2000','حرارة مسقط 1980 إلى 2000','حرارة مسقط 2000 إلى 2026','حرارة مسقط 2000 2010','حرارة مسقط 2000 و2005 و2010','الحرارة والرطوبة في مسقط 2000','حرارة مسقط اليوم','حرارة دبي 2000','حرارة مسقط شهريا 2000','Muscat temperature March 2000','Muscat temperature December 2000'])assert.equal(plan(q).ok,false,q);
});
test('unspecified fields are explicitly marked as using dashboard context',()=>{
 const p=plan('حلل الاتجاه');assert.equal(p.ok,true);assert.equal(p.metric,'RH2M');assert.equal(p.usedContextYears,true);assert.equal(p.usedContextMetric,true);assert.equal(p.usedContextLocation,true);assert.equal(plan('حلل الحرارة في نزوى 2000').ok,false);
});
test('location names and multiple supported reference points override dashboard location',()=>{
 assert.deepEqual(plan('قارن حرارة مسقط وصحار من 2000 إلى 2005').locations,['muscat-east','sohar']);assert.deepEqual(plan('حلل الرطوبة في صلالة من 2000 إلى 2005').locations,['salalah']);assert.deepEqual(plan('حرارة مسقط غرب 2000 و2010').locations,['muscat-west']);
});
test('missing annual values remain missing and no endpoint difference is fabricated',()=>{
 const p=plan('حرارة مسقط من 2000 إلى 2005');const changed=structuredClone(data);changed.years=changed.years.filter(r=>r.year!==2000);const r=analyseAnnual(changed,p,point);assert.equal(r.first,null);assert.equal(r.delta,null);assert.equal(r.count,5);assert.deepEqual(r.missing,[2000]);assert.match(analysisParagraph(changed,p,point,r),/لم تُقدّر أو تُملأ/);
});
test('invalid source coordinates, duplicate years and impossible measurements are handled explicitly',()=>{
 const p=plan('حرارة مسقط 2000 و2010');assert.throws(()=>analyseAnnual({...data,longitude:59},p,point));assert.throws(()=>analyseAnnual({...data,latitude:undefined},p,point));assert.throws(()=>analyseAnnual({...data,years:[...data.years,data.years[0]]},p,point));const changed=structuredClone(data);changed.years[0].T2M.annual=999;const r=analyseAnnual(changed,p,point);assert.equal(r.first,null);assert.deepEqual(r.invalid,[2000]);
});
test('zero is a valid measurement while -999 is missing',()=>{
 const p=plan('حرارة مسقط 2000 و2010'),changed=structuredClone(data);changed.years[0].T2M.annual=0;assert.equal(analyseAnnual(changed,p,point).first,0);changed.years[0].T2M.annual=-999;assert.equal(analyseAnnual(changed,p,point).first,null);
});
test('relative humidity differences use percentage points and precipitation retains its unit warning',()=>{
 let p=plan('رطوبة مسقط 2000 و2010'),r=analyseAnnual(data,p,point);assert.match(analysisParagraph(data,p,point,r),/نقطة مئوية/);p=plan('أمطار مسقط 2000 و2010');r=analyseAnnual(data,p,point);assert.match(analysisParagraph(data,p,point,r),/لا تُفسّر هذه القيم تلقائيا/);
});
test('between-location comparison uses shared valid years only and flags identical grids',()=>{
 const p=plan('حرارة مسقط من 2000 إلى 2005');const a=analyseAnnual(data,p,point);const b={...a,series:a.series.map(r=>({...r,value:r.year===2001?null:r.value}))};const result=locationComparison(p,[{point,result:a},{point:points[1],result:b}]);assert.match(result,/\(5\)/);assert.match(result,/0\.00/);assert.match(result,/متطابقة/);
});
test('questions cannot execute instructions and answers do not claim independent source verification',()=>{
 assert.equal(plan('<script>alert(1)</script>').ok,false);const p=plan('حرارة مسقط من 2000 إلى 2005');const r=analyseAnnual(data,p,point),text=analysisParagraph(data,p,point,r);assert.match(text,/لم يُجر هذا الجواب تحققاً مستقلاً جديداً/);assert.match(text,/غير مصحح للارتباط الذاتي/);assert.match(text,/قرب النقطة/);
});
