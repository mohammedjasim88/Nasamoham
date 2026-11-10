import {test} from 'node:test';
import assert from 'node:assert/strict';
import {siteAnswer} from '../src/lib/question-analysis.mjs';

test('assistant answers site knowledge questions in Arabic and English without model billing',()=>{
 assert.match(siteAnswer('من أين تأتي بيانات NASA وكيف أتحقق منها؟','ar').answer,/NASA POWER|تحقق/);
 assert.match(siteAnswer('Is the NASA data accurate?','en').answer,/independent|consistency/);
 assert.match(siteAnswer('What is the AI assistant?','en').answer,/without a paid API/);
});
test('assistant distinguishes snapshots, maps and forecasting',()=>{
 assert.match(siteAnswer('Are there live weather forecasts today?','en').answer,/not a live weather/);
 assert.match(siteAnswer('كيف تتحقق الخريطة من حدود الولايات؟','ar').answer,/NCSI/);
 assert.match(siteAnswer('What does T2M measure?','en').answer,/2 m/);
});
test('numeric questions remain inside the verifiable scientific analysis pipeline',()=>{
 assert.equal(siteAnswer('Compare Muscat temperature from 2000 to 2010','en'),null);
 assert.equal(siteAnswer('تحليل الرطوبة ٢٠٠٠ و٢٠١٠','ar'),null);
 assert.equal(siteAnswer('','en'),null);
});
