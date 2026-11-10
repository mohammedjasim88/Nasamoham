import test from 'node:test';
import assert from 'node:assert/strict';
import {siteAnswer,planQuestion} from '../src/lib/question-analysis.mjs';
import {datasetCovers,loadPointEvidence} from '../src/lib/assistant-evidence.mjs';
import worker from '../worker/index.mjs';

const point={id:'muscat-east',ar:'مسقط',en:'Muscat',lat:23.5946,lon:58.7351,sample:'/data/muscat-east.json'};
const points=[point];
const context={pointId:point.id,metric:'T2M',start:2000,end:2025};
const plan={ok:true,metric:'T2M',start:2000,end:2001,mode:'period',locations:[point.id]};
const data={latitude:point.lat,longitude:point.lon,start:2000,end:2001,parameters:['T2M'],years:[{year:2000,T2M:{annual:26}},{year:2001,T2M:{annual:27}}],source:'NASA POWER'};

test('numeric climate questions bypass informational shortcuts',()=>{
 for(const q of ['What is the temperature in Muscat?','What is humidity in Muscat?','How was temperature in Muscat?','كم كانت درجة الحرارة في مسقط؟','ما هي الرطوبة في مسقط؟','Compare Muscat temperature from 2000 to 2005']){
  assert.equal(siteAnswer(q,'en'),null,q);
  const planned=planQuestion(q,context,points);
  assert.equal(planned.ok,true,q);
 }
});
test('source, accuracy, model and metric definitions remain free explainers',()=>{
 assert.equal(siteAnswer('Where do NASA temperature data come from?','en')?.id,'source');
 assert.equal(siteAnswer('How accurate are the temperature measurements?','en')?.id,'accuracy');
 assert.equal(siteAnswer('What is T2M?','en')?.id,'variables');
 assert.equal(siteAnswer('Is the AI assistant a model?','en')?.id,'assistant');
});
test('Oman national queries are not silently mapped to a single grid cell',()=>{
 const p=planQuestion('How was temperature in Oman in 2010?',context,points);
 assert.equal(p.ok,false);assert.equal(p.code,'POINT_ONLY');
});
test('sample validation checks geography, metric, interval, coverage and duplicates',()=>{
 assert.equal(datasetCovers(data,point,plan),true);
 assert.equal(datasetCovers({...data,latitude:0},point,plan),false);
 assert.equal(datasetCovers({...data,parameters:['RH2M']},point,plan),false);
 assert.equal(datasetCovers({...data,end:2000},point,plan),false);
 assert.equal(datasetCovers({...data,years:data.years.slice(0,1)},point,plan),false);
 assert.equal(datasetCovers({...data,years:[...data.years,data.years[0]]},point,plan),false);
});
test('corrupt optional sample falls back to NASA API, without relabelling data',async()=>{
 const urls=[];
 const fetcher=async url=>{urls.push(url);if(url===point.sample)return new Response('<not json>',{status:200});return Response.json(data);};
 const output=await loadPointEvidence(point,plan,new AbortController().signal,fetcher);
 assert.deepEqual(urls.map(x=>x.split('?')[0]),[point.sample,'/api/power']);
 assert.equal(output.data.source,'NASA POWER');
 assert.match(output.sourceUrl,/power.larc.nasa.gov/);
});
test('wrong-coordinate sample cannot be used for annual analysis',async()=>{
 const urls=[];const fetcher=async url=>{urls.push(url);return Response.json(url===point.sample?{...data,longitude:57}:data);};
 const output=await loadPointEvidence(point,plan,new AbortController().signal,fetcher);
 assert.equal(output.data.longitude,point.lon);assert.equal(urls.length,2);
});
test('abort never retries to NASA and cannot fabricate missing NASA values',async()=>{
 const c=new AbortController();c.abort();let called=0;
 await assert.rejects(loadPointEvidence(point,plan,c.signal,async()=>{called++;return Response.json(data);}),/CANCELLED/);
 assert.equal(called,0);
 await assert.rejects(loadPointEvidence({...point,sample:undefined},plan,new AbortController().signal,async()=>Response.json({...data,latitude:0})),/MISMATCHED/);
});
test('AI configuration is explicit without a generative binding',async()=>{
 const request=new Request('https://example.test/api/status');
 const result=await worker.fetch(request,{ASSETS:{fetch:()=>new Response('')}} ,{waitUntil:()=>{}});
 assert.equal(result.status,200);const status=await result.json();assert.equal(status.aiConfigured,false);assert.equal(status.liveVerified,false);
});
