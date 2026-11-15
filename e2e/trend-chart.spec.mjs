import {test, expect} from '@playwright/test';

test('ECharts trend view supports zoom, keyboard year inspection and accessible source values', async ({page}) => {
 await page.goto('/#trends');
 const chart=page.locator('#assistant-trend-chart');
 await expect(chart.locator('.interactive-chart-stage.is-ready')).toBeVisible();
 await expect(chart.getByRole('img',{name:'Annual trend graph: Muscat — NASA sample East'})).toBeVisible();
 const stage=chart.locator('.interactive-chart-stage');
 await stage.scrollIntoViewIfNeeded();
 const bounds=await stage.boundingBox();
 await page.mouse.move(bounds.x+bounds.width*.52,bounds.y+bounds.height*.43);
 await expect(chart.locator('.year-inspect')).toContainText('Muscat');
 await expect(chart.locator('.year-inspect')).toContainText('°C');
 await expect(chart.locator('.year-inspect')).not.toContainText('2025');
 await expect(chart.getByRole('button',{name:'Zoom in'})).toBeEnabled();
 await expect(chart.locator('.chart-range')).toHaveText('2000–2025');
 await chart.getByRole('button',{name:'Zoom in'}).click();
 await expect(chart.locator('.chart-range')).not.toHaveText('2000–2025');
 const year=chart.getByRole('slider',{name:'Inspect year:'});
 await expect(year).toHaveAttribute('min','2000');
 await expect(year).toHaveAttribute('max','2025');
 await year.focus();
 await page.keyboard.press('Home');
 await expect(chart.locator('.year-inspect')).toContainText('2000');
 await chart.getByText('View annual values table').click();
 await expect(chart.locator('.chart-data-table tbody tr')).toHaveCount(26);
 await expect(chart.getByRole('button',{name:'Zoom out'})).toBeEnabled();
 await chart.getByRole('button',{name:'Reset zoom'}).click();
 await expect(chart.locator('.chart-range')).toHaveText('2000–2025');
 await expect(chart.getByRole('button',{name:'Reset zoom'})).toBeDisabled();
});

test('trend chart layout fits phone, tablet and desktop viewports', async ({page}) => {
 await page.goto('/#trends');
 const chart=page.locator('#assistant-trend-chart');
 await expect(chart).toBeVisible();
 for (const width of [320,768,1440]) {
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const layout=await page.evaluate(()=>{
   const viewport=document.documentElement.clientWidth;
   const overflow=[...document.querySelectorAll('body *')].map(element=>{
    const rect=element.getBoundingClientRect();
    return {tag:element.tagName,className:typeof element.className==='string'?element.className:'',left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width)};
   }).filter(element=>element.right>viewport+2).slice(0,8);
   return {viewport,document:document.documentElement.scrollWidth,chart:document.querySelector('#assistant-trend-chart')?.getBoundingClientRect().width||0,overflow};
  });
  expect(layout.document,JSON.stringify(layout.overflow)).toBeLessThanOrEqual(layout.viewport+2);
  expect(layout.chart).toBeGreaterThan(0);
 }
});

test('location comparison keeps the two source series and exposes missing values', async ({page}) => {
 await page.goto('/#compare');
 const chart=page.locator('#assistant-comparison-chart');
 await expect(chart.locator('.interactive-chart-stage.is-ready')).toBeVisible();
 await chart.getByText('View annual values table').click();
 const headings=chart.locator('.chart-data-table thead th');
 await expect(headings).toHaveCount(3);
 await expect(headings.nth(1)).toContainText('Muscat');
 await expect(headings.nth(2)).toContainText('Salalah');
 await expect(chart.locator('.chart-data-table tbody tr').first().locator('td').nth(1)).toHaveText('—');
});
