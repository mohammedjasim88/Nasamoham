import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planQuestion,siteAnswer,analyseAnnual,scientificSummary,locationComparison} from '../src/lib/question-analysis.mjs';
import {conversationContext,appendTurn} from '../src/lib/assistant-conversation.mjs';
import {normaliseNasa} from '../worker/nasa.mjs';

const points=[{id:'muscat-east',en:'Muscat',ar:'مسقط',lat:23.5946,lon:58.7351},
 {id:'sohar',en:'Sohar',ar:'صحار',lat:24.3474,lon:56.7094},
 {id:'salalah',en:'Salalah',ar:'صلالة',lat:17.0194,lon:54.0897},
 {id:'nizwa',en:'Nizwa',ar:'نزوى',lat:22.9333,lon:57.5333}];
const controls={pointId:'muscat-east',metric:'T2M',start:2000,end:2025};
const ask=(q,turns=[])=>planQuestion(q,conversationContext(controls,turns),points);

test('exact Muscat scenario calculates only the two requested years from supplied evidence',()=>{
 const p=ask('Compare Muscat temperature in 2000 and 2010');
 assert.equal(p.ok,true);assert.equal(p.mode,'pair');assert.deepEqual(p.locations,['muscat-east']);
 const data=JSON.parse(readFileSync(new URL('../public/data/muscat-east.json',import.meta.url)));
 const result=analyseAnnual(data,p,points[0]);
 assert.deepEqual(result.series.map(row=>row.year),[2000,2010]);
 assert.equal(result.first,data.years.find(row=>row.year===2000).T2M.annual);
 assert.equal(result.last,data.years.find(row=>row.year===2010).T2M.annual);
 assert.equal(result.delta,result.last-result.first);assert.equal(result.trend,null);
});

test('exact Arabic Sohar question extracts inclusive years, metric and change intent',()=>{
 const p=ask('هل ارتفعت الحرارة في صحار من 2000 إلى 2025؟');
 assert.equal(p.ok,true);assert.equal(p.mode,'period');assert.equal(p.trendIntent,true);
 assert.equal(p.metric,'T2M');assert.deepEqual(p.locations,['sohar']);assert.equal(p.start,2000);assert.equal(p.end,2025);
 const digits=ask('هل ارتفعت الحرارة في صُحار من ٢٠٠٠ إلى ٢٠٢٥؟');
 assert.deepEqual(digits,p);
});

test('exact rainfall and humidity follow-up preserve both cities, years and period mode',()=>{
 const q='Compare Salalah and Nizwa rainfall';
 assert.equal(siteAnswer(q,'en'),null);
 const rain=ask(q);assert.equal(rain.ok,true);assert.equal(rain.metric,'PRECTOTCORR_SUM');
 assert.deepEqual(rain.locations,['salalah','nizwa']);
 const follow='Now show the same comparison for humidity.';
 assert.equal(siteAnswer(follow,'en'),null);
 const humidity=ask(follow,[{question:q,plan:rain}]);
 assert.equal(humidity.ok,true);assert.equal(humidity.metric,'RH2M');
 for(const key of ['locations','start','end','mode'])assert.deepEqual(humidity[key],rain[key]);
});

test('follow-up retains discrete two-year mode and single-year mode; explicit years override context',()=>{
 for(const question of ['Compare Muscat temperature in 2000 and 2010','Muscat temperature in 2010']){
  const p=ask(question),turns=[{question,plan:p}];
  const next=ask('Now show the same comparison for humidity.',turns);
  assert.equal(next.mode,p.mode);assert.equal(next.start,p.start);assert.equal(next.end,p.end);
  assert.equal(ask('Now compare humidity from 2005 to 2015',turns).mode,'period');
 }
});

test('Arabic follow-up and natural English warmer wording use the evidence pipeline',()=>{
 const p=ask('Compare Salalah and Nizwa rainfall');
 const next=ask('والآن نفس المقارنة للرطوبة',[{plan:p}]);
 assert.equal(siteAnswer('والآن نفس المقارنة للرطوبة','ar'),null);
 assert.equal(next.metric,'RH2M');assert.deepEqual(next.locations,p.locations);
 assert.equal(ask('Was Sohar hotter from 2000 to 2025?').metric,'T2M');
});

test('unsupported metrics, causality and live weather are explicit instead of using a default metric',()=>{
 for(const [q,code] of [['Compare Salalah and Nizwa wind','UNSUPPORTED_METRIC'],['Why did Muscat temperature increase?','CAUSALITY_UNSUPPORTED'],['Humidity tomorrow in Sohar','HISTORICAL_ONLY']]){
  assert.equal(ask(q).code,code);
 }
});

test('conversation is bounded and reset returns to dashboard controls',()=>{
 let turns=[];for(let i=0;i<10;i++)turns=appendTurn(turns,{question:String(i),plan:ask('Salalah humidity 2010')});
 assert.equal(turns.length,6);assert.equal(turns[0].question,'4');
 assert.equal(conversationContext(controls,turns).pointId,'salalah');
 assert.deepEqual(conversationContext(controls,[]),controls);
});

// Synthetic source fixtures exercise arithmetic and metadata; they are not NASA observations.
test('humidity values use percent while location differences use percentage points and align by year',()=>{
 const plan={metric:'RH2M',start:2000,end:2001,mode:'period'};
 const items=points.slice(0,2).map((point,i)=>({point,result:{series:i?[{year:2001,value:65},{year:2000,value:55}]:[{year:2000,value:50},{year:2001,value:60}]}}));
 assert.match(locationComparison(plan,items,'en'),/-5.00 percentage points/);
 const summary=scientificSummary({metric:'RH2M',mode:'single',start:2000,end:2000},[{point:points[0],result:{count:1,first:50}}],'','en');
 assert.match(summary,/50.00 percent/);assert.doesNotMatch(summary,/percentage points/);
});

test('incompatible source units block a numerical between-location difference',()=>{
 const p={metric:'PRECTOTCORR_SUM',mode:'single',start:2000,end:2000};
 const items=points.slice(0,2).map((point,i)=>({point,data:{reportedUnits:{PRECTOTCORR_SUM:i?'mm/day':'mm'}},result:{series:[{year:2000,value:1}]}}));
 assert.match(locationComparison(p,items,'en'),/Source units differ/);
});

test('change questions still explain endpoint changes when inferential variance is degenerate',()=>{
 const plan=ask('هل ارتفعت الحرارة في صحار من 2000 إلى 2025؟');
 const point=points[1];
 const data={latitude:point.lat,longitude:point.lon,years:Array.from({length:26},(_,i)=>({year:2000+i,T2M:{annual:20+i*.1}}))};
 const result=analyseAnnual(data,plan,point);
 const summary=scientificSummary(plan,[{point,result}],'','en');
 assert.match(summary,/2.50 degrees Celsius \(increase\)/);
 assert.match(summary,/Residual variance is too small/);
 assert.doesNotMatch(summary,/too few/);
});

test('location extraction preserves requested order and rejects an unrecognised comparison partner',()=>{
 assert.deepEqual(ask('Compare Nizwa and Salalah rainfall').locations,['nizwa','salalah']);
 assert.equal(ask('Compare Tokyo and Nizwa rainfall').code,'UNKNOWN_LOCATION');
 assert.equal(ask('Now show the same comparison for humidity.').ok,true);
});

test('NASA annual field and missing sentinel are authoritative; months are never added or averaged as ANN',()=>{
 const raw={header:{fill_value:-999},parameters:{PRECTOTCORR_SUM:{units:'mm'}},properties:{parameter:{
  T2M:{'200001':10,'200002':30,'200013':17.25,'200113':-999},
  RH2M:{'200013':50,'200113':60},PRECTOTCORR_SUM:{'200001':2,'200002':3,'200013':60,'200113':-999}}}};
 const data=normaliseNasa(raw,{lat:23.5946,lon:58.7351,start:2000,end:2001},'test-fixture');
 assert.equal(data.years[0].T2M.annual,17.25);assert.equal(data.years[0].PRECTOTCORR_SUM.annual,60);
 assert.equal(data.years[1].PRECTOTCORR_SUM.annual,null);assert.equal(data.reportedUnits.PRECTOTCORR_SUM,'mm');
});
