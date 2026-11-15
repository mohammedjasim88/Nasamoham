import {test, expect} from '@playwright/test';

function installLocalSpeechMock() {
 const silentWav=()=>{
  const buffer=new ArrayBuffer(46),view=new DataView(buffer);
  const text=(offset,value)=>[...value].forEach((char,index)=>view.setUint8(offset+index,char.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,38,true);text(8,'WAVE');text(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);
  view.setUint16(34,16,true);text(36,'data');view.setUint32(40,2,true);
  return buffer;
 };
 window.localSpeechRequests=[];
 window.localAudioPlayCount=0;
 window.HTMLMediaElement.prototype.play=function(){
  window.localAudioPlayCount++;
  setTimeout(()=>this.dispatchEvent(new Event('ended')),0);
  return Promise.resolve();
 };
 window.Worker=class {
  constructor(){this.terminated=false;}
  postMessage(data){
   window.localSpeechRequests.push({lang:data.lang,text:data.text});
   setTimeout(()=>this.onmessage?.({data:{audio:silentWav()}}),0);
  }
  terminate(){this.terminated=true;}
 };
}

test('Ask AI stays available across sections and opens the source chart', async ({page}) => {
 await page.addInitScript(installLocalSpeechMock);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 const trigger=page.getByRole('button',{name:'Ask AI',exact:true});
 await expect(trigger).toBeVisible();
 await trigger.click();
 const dock=page.getByRole('complementary',{name:'Ask AI'});
 const question=dock.getByRole('textbox',{name:'Your question'});
 await question.fill('Compare Muscat and Al Buraimi temperature trends from two thousand to twenty twenty-five');
 await page.evaluate(() => { location.hash='about'; });
 await expect(dock).toBeVisible();
 await expect(question).toHaveValue(/Muscat/);
 await dock.getByRole('button',{name:'Write evidence-based analysis'}).click();
 const summary=dock.locator('.assistant-summary');
 await expect(summary).toContainText('2000 to 2025');
 await expect(summary).toContainText('includes zero');
 await expect(dock.getByRole('button',{name:'Listen to reply'})).toBeVisible();
 await dock.getByRole('button',{name:'Listen to reply'}).click();
 await expect.poll(()=>page.evaluate(()=>window.localSpeechRequests[0]?.lang)).toBe('en');
 await expect.poll(()=>page.evaluate(()=>window.localAudioPlayCount)).toBeGreaterThan(0);
 const replay=dock.getByRole('button',{name:'Replay reply'});
 await expect(replay).toBeVisible();
 await replay.click();
 await expect.poll(()=>page.evaluate(()=>window.localAudioPlayCount)).toBeGreaterThan(1);
 await dock.getByRole('button',{name:'View analysis'}).click();
 await expect(page).toHaveURL(/#pair$/);
 await expect(page.locator('#pair-analysis')).toBeFocused();
 await expect(page.locator('.pair-context')).toContainText('2000–2025');
 await expect(page.locator('.pair-context')).toContainText('T2M');
 await expect(page.locator('.pair-context')).toContainText('Buraimi');
 await expect(page.locator('.pair-value-table tbody tr')).toHaveCount(26);
 await trigger.click();
 const reopened=page.getByRole('complementary',{name:'Ask AI'});
 await reopened.getByRole('textbox',{name:'Your question'}).fill('Compare Muscat and Al Buraimi temperature trends from two thousand to twenty twenty-five');
 await reopened.getByRole('button',{name:'Write evidence-based analysis'}).click();
 await expect(reopened.locator('.assistant-summary')).toContainText('2000 to 2025');
 await reopened.getByRole('button',{name:'View chart'}).click();
 await expect(page).toHaveURL(/#pair$/);
 await expect(page.locator('#pair-chart')).toBeFocused();
 await expect(page.locator('.pair-context')).toContainText('Buraimi');
 await expect(page.locator('.pair-context')).toContainText('2000–2025');
 await expect(page.locator('.pair-context')).toContainText('T2M');
 await expect(page.locator('.pair-value-table tbody tr')).toHaveCount(26);
 await expect(trigger).toBeVisible();
});

test('Arabic transcript with spoken years receives an Arabic scientific summary and voice request', async ({page}) => {
 await page.addInitScript(installLocalSpeechMock);
 await page.goto('/#about');
 await page.getByRole('button',{name:'Ask AI',exact:true}).click();
 const dock=page.getByRole('complementary',{name:'Ask AI'});
 await dock.getByRole('textbox').fill('قارن اتجاه الحرارة في مسقط والبريمي من 2000 إلى 2025');
 await dock.getByRole('button',{name:'Write evidence-based analysis'}).click();
 await expect(dock.locator('.assistant-summary')).toContainText('من 2000 إلى 2025');
 await dock.getByRole('button',{name:'استمع للرد'}).click();
 await expect.poll(()=>page.evaluate(()=>window.localSpeechRequests[0])).toMatchObject({lang:'ar',text:expect.stringContaining('فترة الثقة')});
});

test('separated years open a cited pair-only chart without drawing a trend line', async ({page}) => {
 await page.route('**/api/power?*',route=>route.fulfill({json:{source:'Synthetic Sohar UI fixture, not NASA observations',isSnapshot:false,
  latitude:24.3474,longitude:56.7094,start:2000,end:2010,parameters:['T2M'],years:Array.from({length:11},(_,i)=>({year:2000+i,T2M:{annual:20+i*.1}}))}}));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#ask');
 await page.getByRole('textbox',{name:'Your question'}).fill('Compare Muscat and Sohar temperature in 2000 and 2010');
 await page.getByRole('button',{name:'Write evidence-based analysis'}).click();
 await expect(page.locator('.assistant-summary')).toContainText('2000');
 await expect(page.locator('.assistant-summary')).toContainText('2010');
 await page.getByRole('button',{name:'View analysis'}).click();
 await expect(page).toHaveURL(/#pair$/);
 await expect(page.locator('#pair-analysis')).toBeFocused();
 await expect(page.locator('#pair-analysis')).toContainText('Two-year comparison');
 await expect(page.locator('#pair-analysis')).toContainText('not a time trend');
 await expect(page.locator('.pair-value-table tbody tr')).toHaveCount(2);
 await page.locator('.mission-strip').getByRole('button',{name:'Back to assistant'}).click();
 await page.getByRole('textbox',{name:'Your question'}).fill('Compare Muscat and Sohar temperature in 2000 and 2010');
 await page.getByRole('button',{name:'Write evidence-based analysis'}).click();
 await page.getByRole('button',{name:'View chart'}).click();
 await expect(page).toHaveURL(/#pair$/);
 await expect(page.locator('#pair-chart')).toBeFocused();
 await expect(page.locator('#pair-chart')).toContainText('Two-year point chart');
 await expect(page.locator('#pair-chart')).toContainText('Muscat');
 await expect(page.locator('#pair-chart')).toContainText('Sohar');
 await expect(page.locator('.pair-value-table tbody tr')).toHaveCount(2);
 await expect(page.locator('.pair-chart svg .pair-point')).toHaveCount(4);
 await expect(page.locator('.pair-chart svg .series-line, .pair-chart svg .trend-line')).toHaveCount(0);
 await expect(page.locator('.pair-citations a')).toHaveCount(2);
 await expect(page.locator('.pair-integrity')).toContainText('not a time trend');
 for (const width of [320,375,768,1024,1440]) {
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect.poll(async()=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),{timeout:10000}).toBe(true);
  const dimensions=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.getByRole('img',{name:'Point chart of the two selected annual values, with no trend line'})).toBeVisible();
 }
});
