import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {normaliseNasa} from '../worker/nasa.mjs';

test('HAC and rank inference render from real preserved NASA annual values',async({page})=>{
 await page.goto('/#trends');
 const panel=page.getByTestId('trend-inference');
 await expect(panel).toContainText('0.2978');
 await expect(panel).toContainText('0.0004733');
 await expect(panel).toContainText('NOT autocorrelation-adjusted');
 await panel.getByText('Assumptions and calculation',{exact:true}).click();
 await expect(panel).toContainText('Missing years are not imputed');
 await page.getByRole('button',{name:'عربي',exact:true}).click();
 await expect(panel).toContainText('عدم اليقين مع الارتباط الزمني');
 await expect(panel.locator('dd').first()).toHaveAttribute('dir','ltr');
 const dims=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(dims.width).toBeLessThanOrEqual(dims.viewport+2);
});

test('Paired case study tests the difference, not two individual p-values',async({page})=>{
 // Deterministic replay of preserved NASA response; this is NOT a fresh network validation.
 const raw=JSON.parse(readFileSync(new URL('../docs/readiness-v39/buraimi-nasa-response.json',import.meta.url)));
 const data=normaliseNasa(raw,{lat:24.2486,lon:55.7931,start:2000,end:2025},'https://power.larc.nasa.gov/');
 await page.route('**/api/power?**',route=>route.fulfill({json:data}));
 await page.goto('/#compare');
 await page.getByRole('button',{name:'Set up case study · T2M · 2000–2025',exact:true}).click();
 const panel=page.getByTestId('paired-inference');
 await expect(panel).toContainText('0.06007');
 await expect(panel).toContainText('0.1967');
 await expect(panel).toContainText('The interval includes zero');
});

test('Short interval withholds approximate inference',async({page})=>{
 await page.goto('/#trends');
 await page.locator('#start-year').selectOption('2020');
 await expect(page.getByTestId('trend-inference')).toContainText('Inference unavailable');
});
