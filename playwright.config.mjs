import {defineConfig,devices} from '@playwright/test';
/** Optional reproducible browser checks. Requires npm install + playwright browser install. */
export default defineConfig({
 testDir:'./e2e',timeout:60_000,expect:{timeout:12_000},fullyParallel:false,
 reporter:[['list'],['html',{outputFolder:'playwright-report',open:'never'}]],
 use:{baseURL:'http://127.0.0.1:8787',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
  {name:'mobile-chromium',use:{...devices['Pixel 7']}},
  {name:'mobile-webkit',use:{...devices['iPhone 13']}}
 ],
 webServer:{command:'node scripts/local_node_preview.mjs',url:'http://127.0.0.1:8787/api/status',reuseExistingServer:!process.env.CI,timeout:120_000}
});
