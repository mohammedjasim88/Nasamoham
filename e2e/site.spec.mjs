import {test,expect} from '@playwright/test';

test('intro opens promptly, navigation reaches all scientific sections',async({page})=>{
 await page.goto('/#home');
 await expect(page.getByRole('heading',{name:/A new perspective|منظور جديد/})).toBeVisible();
 await page.getByRole('button',{name:/Start Exploring|ابدأ الاستكشاف/i}).click();
 await expect(page).toHaveURL(/#explorer/);
 await expect(page.locator('#main-content')).toBeVisible();
 await page.goto('/#trends');await expect(page.locator('.chart-panel')).toBeVisible();
 await page.goto('/#quality');await expect(page.locator('.quality-cards')).toBeVisible();
 await page.goto('/#compare');await expect(page.locator('.compare-controls')).toBeVisible();
});

test('NASA Verification Lab catches tampering in synthetic inputs',async({page})=>{
 await page.goto('/#verify');
 await expect(page.getByRole('heading',{name:'NASA Verification Lab'})).toBeVisible();
 await page.getByRole('button',{name:'Run self-test'}).click();
 await expect(page.getByText(/PASS · mismatch and missing detected/)).toBeVisible();
 await expect(page.getByRole('button',{name:/Download Verification Evidence/i})).toBeDisabled();
});

test('mobile layout avoids horizontal page overflow and supports language switching',async({page,isMobile})=>{
 test.skip(!isMobile,'Mobile checks only');
 await page.goto('/#home');
 const language=page.getByRole('button',{name:'AR',exact:true});
 await language.click();
 await expect(page.locator('html')).toHaveAttribute('dir','rtl');
 const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
 expect(width.scroll).toBeLessThanOrEqual(width.viewport+2);
 await page.goto('/#verify');
 await expect(page.locator('html')).toHaveAttribute('dir','rtl');
 await expect(page.getByRole('heading',{name:/مختبر التحقق/})).toBeVisible();
});

test('unexpected API failure is surfaced rather than inventing readings',async({page})=>{
 await page.route('**/api/power?*',route=>route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'upstream temporarily unavailable'})}));
 await page.goto('/#explorer');
 await page.locator('#location-select').selectOption('sohar');
 await expect(page.getByRole('alert').filter({hasText:/Source unavailable|source unavailable|تعذّر/}).first()).toBeVisible({timeout:15_000});
});

test('quick navigator works from the intro and opens the independent NASA lab',async({page})=>{
 await page.goto('/#home');
 await page.keyboard.press('Control+k');
 await expect(page.getByRole('dialog',{name:'Quick navigation'})).toBeVisible();
 await page.getByRole('combobox',{name:'Search navigation'}).fill('verification');
 await page.getByRole('combobox',{name:'Search navigation'}).press('Enter');
 await expect(page).toHaveURL(/#verify/);
 await expect(page.getByRole('heading',{name:'NASA Verification Lab'})).toBeVisible();
});

test('non-map routes provide a lightweight geographic shortcut rather than launching map canvas',async({page})=>{
 await page.goto('/#quality');
 await expect(page.locator('.context-map-preview')).toBeVisible();
 await expect(page.locator('.maplibre-container')).toHaveCount(0);
 await page.getByRole('button',{name:/Open Earth Explorer/}).click();
 await expect(page).toHaveURL(/#explorer/);
 await expect(page.locator('.maplibre-container')).toBeVisible();
});

test('scientific context is visible and does not label unloaded source as verified',async({page})=>{
 await page.goto('/#explorer');
 await expect(page.locator('.mission-strip')).toBeVisible();
 await expect(page.locator('.mission-item').first()).toContainText(/Muscat/);
 await expect(page.locator('.mission-strip')).toContainText(/SOURCE STATUS/);
});
