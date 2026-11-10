import {test,expect} from '@playwright/test';

test('climate value question uses annual NASA evidence instead of variable glossary',async({page})=>{
  await page.goto('/#ask');
  const prompt=page.getByRole('textbox',{name:'Your question'});
  await prompt.fill('What is the temperature in Muscat?');
  await expect(page.locator('.assistant-plan')).toContainText('T2M');
  await expect(page.locator('.assistant-plan')).toContainText('2000');
  await expect(page.locator('.assistant-plan')).toContainText('2025');
  await page.locator('.assistant-question button[type=submit]').click();
  await expect(page.locator('.assistant-paragraph').first()).toBeVisible({timeout:20000});
  await expect(page.locator('.assistant-source a').first()).toHaveAttribute('href',/power\.larc\.nasa\.gov/);
});
test('NASA source question still receives correct project guidance',async({page})=>{
  await page.goto('/#ask');
  await page.getByRole('textbox',{name:'Your question'}).fill('Where do NASA temperature data come from?');
  await page.locator('.assistant-question button[type=submit]').click();
  await expect(page.locator('.assistant-site-answer')).toContainText('NASA POWER');
});
test('AI subscription state is visible without falsely claiming an AI model is live',async({page})=>{
  await page.goto('/#ask');
  await expect(page.locator('.assistant-ai-status')).toContainText('not connected');
  await expect(page.locator('.assistant-generative')).toHaveCount(0);
});
test('mobile scientific assistant fits viewport without horizontal scrolling',async({page,isMobile})=>{
  test.skip(!isMobile,'Phone viewport only');
  await page.goto('/#ask');
  await expect(page.getByRole('textbox',{name:'Your question'})).toBeVisible();
  const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.viewport+2);
});
