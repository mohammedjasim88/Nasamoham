import test from 'node:test';
import assert from 'node:assert/strict';
import {extractAiText,runEvidenceAi} from '../worker/security.mjs';

// This test never sends an AI request or consumes Workers AI credits.
test('Gemma 4 model is selected in the Workers AI binding', async()=>{
  const input={messages:[{role:'user',content:'Test'}]};
  const observed=[];
  const binding={run:async(model,request,options)=>{
    observed.push({model,request,options});
    return {choices:[{message:{content:'Verified response'}}]};
  }};
  const result=await runEvidenceAi(binding,input);
  assert.equal(observed.length,1);
  assert.equal(observed[0].model,'@cf/google/gemma-4-26b-a4b-it');
  assert.equal(observed[0].request,input);
  assert.equal(observed[0].options.rejectIfBusy,true);
  assert.equal(extractAiText(result),'Verified response');
});

test('new chat completion and legacy response output are both understood',()=>{
  assert.equal(extractAiText({choices:[{message:{content:'  مرحباً  '}}]}),'مرحباً');
  assert.equal(extractAiText({response:'  Local response  '}),'Local response');
  assert.equal(extractAiText({choices:[{message:{content:null}}],response:'Fallback'}),'Fallback');
  assert.equal(extractAiText({choices:[]}), '');
  assert.equal(extractAiText(null), '');
});
