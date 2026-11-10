import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildLocalAIMessages,needsVerifiedNumbers,OPEN_MODELS} from '../src/lib/local-ai-knowledge.mjs';

test('open-source models are explicit allowlisted WebLLM models',()=>{
 assert.deepEqual(OPEN_MODELS.map(x=>x.id),['Qwen2.5-0.5B-Instruct-q4f16_1-MLC','SmolLM2-360M-Instruct-q4f16_1-MLC']);
 assert.ok(OPEN_MODELS.every(x=>x.modelPage.startsWith('https://huggingface.co/mlc-ai/')));
});
test('a verified site question receives bilingual project facts, never a remote AI key',()=>{
 const ar=buildLocalAIMessages({question:'كيف تعمل خريطة سلطنة عمان مع NASA؟',lang:'ar'});
 assert.equal(ar.ok,true);
 assert.match(ar.messages[0].content,/Arabic/);
 assert.match(ar.messages[0].content,/MapLibre/);
 assert.match(ar.messages[0].content,/NASA POWER/);
 assert.match(ar.messages[0].content,/No Cloudflare Workers AI/);
 const en=buildLocalAIMessages({question:'How does the NASA climate site work?',lang:'en'});
 assert.equal(en.ok,true);
 assert.match(en.messages[0].content,/English/);
});
test('unrelated prompts are not sent to the local model',()=>{
 for(const question of ['Write a political essay','How to hack my bank','']) assert.equal(buildLocalAIMessages({question}).code,'OUT_OF_SCOPE');
});
test('numeric requests require prior source-calculated evidence',()=>{
 for(const question of ['What is the temperature in Muscat?','Compare humidity in Oman 2000 and 2010','كم كانت درجة الحرارة في مسقط؟']) {
   assert.equal(needsVerifiedNumbers(question),true);
   assert.equal(buildLocalAIMessages({question,lang:'ar'}).code,'NEEDS_DATA');
 }
});
test('numeric grounding comes exclusively from checked series, with missing values visible',()=>{
 const sample={question:'Compare Muscat temperature 2000 and 2010',lang:'en',answer:{plan:{metric:'T2M',start:2000,end:2010,mode:'pair'},items:[{point:{en:'Muscat East',lat:23.59,lon:58.73},data:{source:'NASA POWER',isSnapshot:false},result:{series:[{year:2000,value:26.18},{year:2010,value:null}]},paragraph:'Verified calculation states unavailable values.',sourceUrl:'https://power.larc.nasa.gov/'}]}};
 const result=buildLocalAIMessages(sample);
 assert.equal(result.ok,true);
 assert.equal(result.mode,'grounded-climate-explanation');
 assert.match(result.messages[0].content,/2000: 26.18; 2010: MISSING/);
 assert.match(result.messages[0].content,/Do not invent/);
});
