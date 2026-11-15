const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests'),
  testMatch: '**/*.spec.cjs',
  timeout: 120_000,
  globalTimeout: 8 * 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(projectRoot, 'audit-results', 'html'), open: 'never' }],
    ['json', { outputFile: path.join(projectRoot, 'audit-results', 'results.json') }],
  ],
  outputDir: path.join(projectRoot, 'audit-results', 'artifacts'),
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    acceptDownloads: true,
    actionTimeout: 20_000,
    navigationTimeout: 40_000,
  },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'Tablet Chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'Mobile Chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  // If a server is already running, reuse it. Otherwise start it automatically.
  // Start the Worker first because Vite proxies /api requests to port 8787.
  webServer: [
    {
      command: 'npx.cmd wrangler dev --port 8787',
      url: 'http://127.0.0.1:8787/api/status',
      cwd: projectRoot,
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173/',
      cwd: projectRoot,
      reuseExistingServer: true,
      timeout: 90_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
