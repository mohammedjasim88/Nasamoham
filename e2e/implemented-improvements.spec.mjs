import {test,expect} from '@playwright/test';

// Synthetic browser fixtures test control flow and arithmetic, never live NASA accuracy.
function fixture(lat,lon,start=2000,end=2025){
 return {source:'Synthetic UI test fixture — not NASA observations',isSnapshot:false,
  latitude:lat,longitude:lon,start,end,parameters:['T2M','RH2M','PRECTOTCORR_SUM'],
  reportedUnits:{T2M:'C',RH2M:'%',PRECTOTCORR_SUM:'mm'},
  years:Array.from({length:end-start+1},(_,i)=>({year:start+i,
   T2M:{annual:20+i*.1},RH2M:{annual:50+i*.2},PRECTOTCORR_SUM:{annual:100+i}}))};
}
async function sources(page){
 await page.route('**/data/salalah-rh.json',route=>route.fulfill({status:404,body:'No fixture snapshot'}));
 await page.route('**/api/power?*',route=>{
  const params=new URL(route.request().url()).searchParams;
  return route.fulfill({json:fixture(Number(params.get('lat')),Number(params.get('lon')),Number(params.get('start')),Number(params.get('end')))});
 });
}
async function submit(page,question){
 await page.getByRole('textbox',{name:'Your question'}).fill(question);
 await page.getByRole('button',{name:'Write evidence-based analysis',exact:true}).click();
 await expect(page.locator('.assistant-summary')).toBeVisible();
}

test('four exact prompts retain location/year/metric context and open the same source-backed chart',async({page})=>{
 await sources(page);await page.goto('/#ask');
 await submit(page,'Compare Muscat temperature in 2000 and 2010.');
 await expect(page.locator('.assistant-summary')).toContainText('28.14');
 await expect(page.locator('.assistant-summary')).toContainText('28.20');
 await page.getByRole('button',{name:'View analysis',exact:true}).click();
 await expect(page.locator('#pair-analysis')).toBeFocused();
 await expect(page.locator('.pair-value-table tbody tr')).toHaveCount(2);
 await page.getByRole('button',{name:'Back to assistant',exact:true}).click();
 await submit(page,'هل ارتفعت الحرارة في صحار من 2000 إلى 2025؟');
 await expect(page.locator('.assistant-plan')).toContainText('Sohar');
 await expect(page.locator('.assistant-plan')).toContainText('2025');
 await expect(page.locator('.assistant-summary')).toContainText('2.50');
 await submit(page,'Compare Salalah and Nizwa rainfall.');
 await expect(page.locator('.assistant-plan')).toContainText('PRECTOTCORR_SUM');
 await submit(page,'Now show the same comparison for humidity.');
 const interpreted=page.locator('.assistant-plan');
 for(const text of ['Salalah','Nizwa','RH2M','2000','2025','Inclusive period'])await expect(interpreted).toContainText(text);
 await expect(page.locator('.assistant-paragraph')).toHaveCount(2);
 await page.getByRole('button',{name:'View chart',exact:true}).click();
 await expect(page.locator('#pair-chart')).toBeFocused();
 await expect.poll(()=>page.evaluate(()=>document.querySelector('#pair-chart').getBoundingClientRect().top>=document.querySelector('.top-header').getBoundingClientRect().bottom)).toBe(true);
 await expect(page.locator('.pair-value-table tbody tr')).toHaveCount(26);
 await expect(page.locator('#pair-analysis')).toContainText('RH2M');
 await expect(page.locator('#pair-analysis')).toContainText('Salalah');
 await expect(page.locator('#pair-analysis')).toContainText('Nizwa');
 await expect(page.locator('.interactive-chart-stage canvas')).toBeVisible();
 await page.getByLabel('Inspect year:',{exact:true}).fill('2010');
 await expect(page.locator('.year-inspect')).toContainText('2010');
 await expect(page.locator('.chart-difference')).toContainText('percentage points');
 await page.screenshot({path:`test-results/improvements-${test.info().project.name}.png`,fullPage:false});
});

test('chart navigation carries exact successful values without another NASA request',async({page})=>{
 await sources(page);await page.goto('/#ask');
 await submit(page,'Compare Salalah and Nizwa temperature from 1990 to 1992');
 let sourceRequests=0;page.on('request',request=>{if(request.url().includes('/api/power'))sourceRequests++;});
 await page.getByRole('button',{name:'View chart',exact:true}).click();
 await expect(page.locator('.pair-value-table tbody tr')).toHaveCount(3);
 await expect(page.locator('.pair-value-table')).toContainText('1990');
 await expect(page.locator('.pair-value-table')).toContainText('20.00');
 expect(sourceRequests).toBe(0);
});

test('single-year analysis has functional analysis and chart actions',async({page})=>{
 await sources(page);await page.goto('/#ask');await submit(page,'Muscat humidity in 2010');
 await expect(page.getByRole('button',{name:'View analysis',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'View chart',exact:true}).click();
 await expect(page.locator('.pair-value-table tbody tr')).toHaveCount(1);
 await expect(page.locator('.interactive-chart-stage canvas')).toBeVisible();
});

test('cancelled source requests never produce a stale answer or advance conversation',async({page})=>{
 await page.route('**/api/power?*',async route=>{
  await new Promise(resolve=>setTimeout(resolve,1500));
  try{await route.fulfill({json:fixture(24.3474,56.7094)});}catch{/* request cancelled */}
 });
 await page.goto('/#ask');
 await page.getByRole('textbox',{name:'Your question'}).fill('Sohar temperature from 2000 to 2025');
 await page.getByRole('button',{name:'Write evidence-based analysis',exact:true}).click();
 await expect(page.locator('.assistant-loading')).toBeVisible();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(page.locator('.assistant-question')).toContainText('Analysis cancelled');
 await expect(page.locator('.assistant-summary')).toHaveCount(0);
 await expect(page.locator('.assistant-conversation')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Write evidence-based analysis',exact:true})).toBeEnabled();
});

test('source errors preserve the question and offer retry; unsupported prompts send no requests',async({page})=>{
 await page.route('**/api/power?*',route=>route.fulfill({status:503,body:'Source unavailable'}));
 await page.goto('/#ask');
 const question=page.getByRole('textbox',{name:'Your question'});
 await question.fill('Sohar temperature from 2000 to 2025');
 await page.getByRole('button',{name:'Write evidence-based analysis',exact:true}).click();
 await expect(page.getByRole('button',{name:'Retry analysis',exact:true})).toBeVisible();
 await expect(question).toHaveValue('Sohar temperature from 2000 to 2025');
 await expect(page.locator('.assistant-summary')).toHaveCount(0);
 await question.fill('Compare Salalah and Nizwa wind');
 await expect(page.locator('.assistant-guidance')).toContainText('only temperature, humidity and precipitation');
 await expect(page.getByRole('button',{name:'Write evidence-based analysis',exact:true})).toBeDisabled();
});

test('conversation survives closing the dock and can be explicitly reset',async({page})=>{
 await sources(page);await page.goto('/');
 await page.getByRole('button',{name:'Ask AI',exact:true}).click();
 await submit(page,'Compare Salalah and Nizwa rainfall');
 await page.getByRole('button',{name:'Close Ask AI',exact:true}).click();
 await page.getByRole('button',{name:'Ask AI',exact:true}).click();
 await page.getByRole('textbox',{name:'Your question'}).fill('Now show the same comparison for humidity.');
 await expect(page.locator('.assistant-plan')).toContainText('Nizwa');
 await page.locator('.assistant-conversation summary').click();
 await page.getByRole('button',{name:'New conversation',exact:true}).click();
 await expect(page.locator('.assistant-conversation')).toHaveCount(0);
 await expect(page.getByRole('textbox',{name:'Your question'})).toHaveValue('');
});

test('reduced-motion layout fits a small viewport after a result',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:375,height:740});
 await sources(page);await page.goto('/#ask');await submit(page,'Compare Salalah and Nizwa rainfall');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
