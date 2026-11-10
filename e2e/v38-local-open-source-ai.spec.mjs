import {test,expect} from '@playwright/test';

test('open-source browser model loads only after explicit opt-in',async({page})=>{
 const modelRequests=[];
 page.on('request',request=>{if(/huggingface\.co\/mlc-ai|web-llm-models/.test(request.url()))modelRequests.push(request.url());});
 await page.goto('/#ask');
 const panel=page.locator('.assistant-local-open');
 await expect(panel).toBeVisible();
 await expect(panel.getByText(/WebLLM/).first()).toBeVisible();
 await expect(panel.locator('select#local-ai-model')).toBeVisible();
 await expect(panel.locator('option')).toHaveCount(2);
 await page.waitForTimeout(800);
 expect(modelRequests).toEqual([]);
 await expect(panel.locator('.assistant-local-result')).toHaveCount(0);
});

test('unsupported WebGPU gives honest fallback and verified NASA assistant stays usable',async({page})=>{
 await page.addInitScript(()=>{try{Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true});}catch{}});
 await page.goto('/#ask');
 const panel=page.locator('.assistant-local-open');
 await expect(panel).toContainText(/WebGPU/);
 await expect(panel.getByRole('button',{name:/Download|حمّل/})).toBeDisabled();
 await expect(page.getByRole('textbox',{name:'Your question'})).toBeVisible();
 await expect(page.locator('.assistant-ai-status')).toContainText(/No Cloudflare Workers AI|لا نستخدم Cloudflare Workers AI/);
});

test('domain-only prompting: unrelated questions and numeric evidence are gated',async({page})=>{
 await page.goto('/#ask');
 const prompt=page.getByRole('textbox',{name:'Your question'});
 await prompt.fill('Write an unrelated fiction story');
 await expect(page.locator('.assistant-local-open')).toBeVisible();
 await expect(page.locator('.assistant-local-open .assistant-local-result')).toHaveCount(0);
 await prompt.fill('What is the temperature in Muscat?');
 await expect(page.locator('.assistant-plan')).toContainText('T2M');
});

test('phone UI does not overflow with optional model controls',async({page,isMobile})=>{
 test.skip(!isMobile,'Phone only');
 await page.goto('/#ask');
 await expect(page.locator('.assistant-local-open')).toBeVisible();
 const dims=await page.evaluate(()=>({w:document.documentElement.scrollWidth,inner:window.innerWidth}));
 expect(dims.w).toBeLessThanOrEqual(dims.inner+2);
});
