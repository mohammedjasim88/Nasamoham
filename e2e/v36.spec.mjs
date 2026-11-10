import {test,expect} from '@playwright/test';

test('home loads with accessible NASA Earth controls',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/#home');
 await expect(page.locator('#cinematic-heading')).toContainText(/new perspective/i);
 await expect(page.locator('.cinematic-primary')).toBeVisible();
 const canvas=page.locator('.earth-globe-canvas');
 await expect(canvas).toBeAttached({timeout:20000});
 await canvas.focus();
 await page.keyboard.press('ArrowRight');
 await page.keyboard.press('Home');
 await expect(page.locator('.earth-globe-mount')).toBeVisible();
 expect(errors).toEqual([]);
});
test('assistant answers a NASA provenance question and maintains evidence caveats',async({page})=>{
 await page.goto('/#ask');
 const input=page.getByRole('textbox',{name:'Your question'});
 await input.fill('Where do the NASA data come from and how are they verified?');
 await page.locator('.assistant-question button[type=submit]').click();
 await expect(page.locator('.assistant-site-answer')).toContainText('NASA POWER');
 await expect(page.locator('.assistant-site-answer')).toContainText(/ground-truth|station|measurements/i);
 await expect(page.locator('.assistant-site-answer a')).toHaveAttribute('href',/power\.larc\.nasa\.gov/);
});
test('mobile viewport remains usable without forced horizontal overflow',async({page,isMobile})=>{
 test.skip(!isMobile,'Mobile only');
 await page.goto('/#home');
 await expect(page.locator('#cinematic-heading')).toBeVisible();
 const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
 expect(dims.scroll).toBeLessThanOrEqual(dims.viewport+2);
});
test('reduced-motion mode keeps visual without mandatory animation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#home');
 await expect(page.locator('.cinematic-earth-poster, .earth-globe-mount').first()).toBeVisible();
 await expect(page.locator('#cinematic-heading')).toBeVisible();
});
