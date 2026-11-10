import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('3D Earth uses mobile GPU geometry adaptation without changing NASA texture',()=>{
 const earth=read('../src/components/EarthGlobe.tsx');
 assert.match(earth,/compactGpu\?64:96/);
 assert.match(earth,/compactGpu\?1\.2:1\.65/);
 assert.match(earth,/nasa-blue-marble.webp/);
});
test('deployment has browser regression and asset budgets',()=>{
 const pkg=JSON.parse(read('../package.json'));
 assert.match(pkg.scripts['test:e2e'],/playwright test/);
 assert.match(pkg.scripts['audit:bundle'],/check_bundle_budget/);
 assert.match(read('../playwright.config.mjs'),/mobile-webkit/);
});
