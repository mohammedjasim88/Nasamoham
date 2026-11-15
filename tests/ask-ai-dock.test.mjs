import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analyseAnnual, locationComparison, planQuestion, scientificSummary} from '../src/lib/question-analysis.mjs';

const muscat = {id:'muscat-east',ar:'مسقط شرق',en:'Muscat East',lat:23.5946,lon:58.7351};
const buraimi = {id:'buraimi',ar:'البريمي',en:'Al Buraimi',lat:24.2486,lon:55.7931};
const context = {pointId:muscat.id,metric:'T2M',start:2010,end:2020};
const points = [muscat,buraimi];

test('Arabic and English spoken dates override the dashboard interval', () => {
 for (const question of [
  'قارن اتجاه الحرارة في مسقط والبريمي من ألفين لين ألفين وخمسة وعشرين',
  'Compare Muscat and Al Buraimi temperature trends from two thousand to twenty twenty-five'
 ]) {
  const plan = planQuestion(question,context,points);
  assert.equal(plan.ok,true);
  assert.deepEqual([plan.start,plan.end,plan.trendIntent],[2000,2025,true]);
  assert.deepEqual(plan.locations,[muscat.id,buraimi.id]);
 }
 assert.equal(planQuestion('قارن حرارة مسقط من ألفين إلى ألفين وستة وعشرين',context,points).code,'YEAR_RANGE');
});

test('relative periods count annual observations, and both selected locations can be compared', () => {
 const plan = planQuestion('Compare both temperature trends over the last 25 years',{...context,end:2025,secondPointId:buraimi.id},points);
 assert.deepEqual([plan.start,plan.end],[2001,2025]);
 assert.deepEqual(plan.locations,[muscat.id,buraimi.id]);
});

test('trend comparison reports the paired slope and confidence interval from NASA records', async () => {
 const paths = ['muscat-east.json','buraimi.json'];
 const items = await Promise.all(paths.map(async (file,i) => {
  const data = JSON.parse(await readFile(new URL('../public/data/'+file,import.meta.url),'utf8'));
  return {point:{...points[i],lat:data.latitude,lon:data.longitude},data};
 }));
 const plan = planQuestion('Compare Muscat and Al Buraimi temperature trends from 2000 to 2025',context,points);
 for (const item of items) item.result = analyseAnnual(item.data,plan,item.point);
 const comparison = locationComparison(plan,items,'en');
 const summary = scientificSummary(plan,items,comparison,'en');
 assert.match(summary,/Muscat East was 0\.298 degrees Celsius per decade/);
 assert.match(summary,/Al Buraimi was 0\.358 degrees Celsius per decade/);
 assert.match(comparison,/0\.060 °C per decade/);
 assert.match(comparison,/Al Buraimi minus Muscat East/);
 assert.match(comparison,/per decade is -0\.033 to 0\.153/);
 assert.match(comparison,/interval includes zero/);
});
