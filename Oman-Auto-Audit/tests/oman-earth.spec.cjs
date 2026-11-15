const { test, expect } = require('@playwright/test');

const BACKEND = 'http://127.0.0.1:8787';
const isDesktop = () => test.info().project.name === 'Desktop Chrome';
const isMobile = () => test.info().project.name === 'Mobile Chrome';

function registerDiagnostics(page) {
  const diagnostics = [];
  page.on('pageerror', (error) => diagnostics.push({ type: 'javascript', message: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.push({ type: 'console', message: message.text() });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      diagnostics.push({ type: 'http', status: response.status(), url: response.url() });
    }
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    if (failure && !/ERR_ABORTED|NS_BINDING_ABORTED/i.test(failure.errorText)) {
      diagnostics.push({ type: 'network', url: request.url(), error: failure.errorText });
    }
  });
  return diagnostics;
}

async function screenshotEvidence(page, name) {
  const body = await page.screenshot({ fullPage: false, animations: 'disabled' });
  await test.info().attach(name, { body, contentType: 'image/png' });
}

test.beforeEach(async ({ page }) => {
  const diagnostics = registerDiagnostics(page);
  page.__auditDiagnostics = diagnostics;
});

test.afterEach(async ({ page }) => {
  const errors = page.__auditDiagnostics || [];
  await test.info().attach('Browser errors and HTTP failures', {
    body: Buffer.from(JSON.stringify(errors, null, 2), 'utf8'),
    contentType: 'application/json',
  });
  const jsErrors = errors.filter((e) => e.type === 'javascript');
  expect(jsErrors, `Unhandled JavaScript errors: ${JSON.stringify(jsErrors)}`).toEqual([]);
});

test('01 — Home page loads and displays NASA context', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Oman Earth Intelligence/);
  await expect(page.getByRole('button', { name: 'Ask AI', exact: true })).toBeVisible();
  await expect(page.getByText('Powered by NASA POWER').first()).toBeVisible();
  await screenshotEvidence(page, 'Home page');
});

test('02 — Backend /api/status returns its actual configuration', async ({ request }) => {
  test.skip(!isDesktop(), 'One backend check is sufficient across viewports.');
  const response = await request.get(`${BACKEND}/api/status`);
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.ready).toBe(true);
  await test.info().attach('Backend status (includes AI configuration)', {
    body: Buffer.from(JSON.stringify(data, null, 2), 'utf8'),
    contentType: 'application/json',
  });
  if (data.aiConfigured === false) {
    test.info().annotations.push({
      type: 'finding',
      description: 'Cloud AI binding disabled. Scientific evidence analysis may still work, but cloud AI is not enabled.',
    });
  }
  if (data.liveVerified === false) {
    test.info().annotations.push({
      type: 'finding',
      description: 'Live NASA verification flag is false on the status endpoint. Run the NASA Lab test independently.',
    });
  }
});

test('03 — Governorate boundaries API responds', async ({ request }) => {
  test.skip(!isDesktop(), 'One backend check is sufficient across viewports.');
  const response = await request.get(`${BACKEND}/api/boundaries?level=governorates`, { timeout: 30_000 });
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data).toBeTruthy();
  const featureCount = Array.isArray(data.features) ? data.features.length : 'Structure not a direct FeatureCollection';
  await test.info().attach('Boundaries response summary', {
    body: Buffer.from(JSON.stringify({ featureCount, rootKeys: Object.keys(data).slice(0, 12) }, null, 2)),
    contentType: 'application/json',
  });
});

test('04 — Main navigation opens Explorer, Data, Analysis and NASA Lab', async ({ page }) => {
  test.skip(!isDesktop(), 'Desktop navigation test; responsive layout checked separately.');
  const navLabels = ['Explorer', 'Data', 'Analysis', 'Verify NASA Data'];
  const results = [];
  for (const label of navLabels) {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('button', { name: label, exact: true }).click();
    await expect.poll(() => new URL(page.url()).hash, { message: `${label} did not navigate to a section` }).not.toBe('');
    await expect(page.locator('main')).toBeVisible();
    results.push({ button: label, url: page.url(), title: await page.title() });
  }
  await test.info().attach('Navigation results', {
    body: Buffer.from(JSON.stringify(results, null, 2)), contentType: 'application/json',
  });
  expect(results.length).toBe(4);
  await screenshotEvidence(page, 'Navigation final page');
});

test('05 — Ask AI accepts a scientific question and shows evidence analysis', async ({ page }) => {
  test.skip(!isDesktop(), 'Run evidence analysis once. The mobile dialog is tested separately.');
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask AI', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Ask AI' });
  await expect(panel).toBeVisible();
  await panel.getByRole('textbox', { name: 'Your question' }).fill('Compare Muscat temperature in 2000 and 2010');
  await expect(panel.getByRole('button', { name: 'Write evidence-based analysis' })).toBeEnabled();
  await panel.getByRole('button', { name: 'Write evidence-based analysis' }).click();
  await expect(panel.getByText('Scientific summary')).toBeVisible({ timeout: 35_000 });
  await expect(panel.getByText(/The annual value was .*2000 and .*2010/i)).toBeVisible();
  await expect(panel.getByText(/0\.06 °C/)).toBeVisible();
  await screenshotEvidence(page, 'Ask AI evidence result');
});

test('06 — Ask AI exposes voice controls (audio itself requires manual check)', async ({ page }) => {
  test.skip(!isDesktop(), 'Test control presence once. Actual audio/microphone not validated by this test.');
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask AI', exact: true }).click();
  const panel = page.getByRole('complementary', { name: 'Ask AI' });
  await expect(panel.getByRole('button', { name: 'Record question' })).toBeVisible();
  await expect(panel.getByRole('checkbox', { name: 'Read replies aloud' })).toBeVisible();
  await expect(panel.getByRole('combobox', { name: 'Recording language' })).toBeVisible();
  await screenshotEvidence(page, 'Ask AI voice controls');
  test.info().annotations.push({ type: 'manual-check', description: 'Microphone transcription quality and audible Arabic/English replies require real-device testing.' });
});

test('07 — NASA Verification Lab compares 2000–2010 T2M with NASA', async ({ page }) => {
  test.skip(!isDesktop(), 'Avoid repeated external NASA API requests from multiple viewports.');
  await page.goto('/#verify');
  await expect(page.getByRole('heading', { name: 'NASA Verification Lab' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Location A' }).selectOption({ label: 'Muscat — NASA sample East' });
  await page.getByRole('combobox', { name: 'Climate variable' }).selectOption({ label: 'T2M · Air temperature' });
  await page.getByRole('combobox', { name: 'From' }).selectOption({ label: '2000' });
  await page.getByRole('combobox', { name: 'To' }).selectOption({ label: '2010' });
  const verifyButton = page.getByRole('button', { name: /^(Verify against NASA|Check again)$/ });
  await verifyButton.click();
  await expect(page.getByText('All annual values match NASA within ±0.01 of the metric unit.').first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('button', { name: 'Download Verification Evidence' })).toBeEnabled();
  await screenshotEvidence(page, 'NASA independent comparison result');
});

test('08 — Security response headers baseline', async ({ request }) => {
  test.skip(!isDesktop(), 'One backend header check is sufficient. This is NOT a penetration test.');
  const response = await request.get(`${BACKEND}/api/status`);
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['content-security-policy']).toBeTruthy();
  await test.info().attach('Security headers', {
    body: Buffer.from(JSON.stringify(headers, null, 2)),
    contentType: 'application/json',
  });
  test.info().annotations.push({ type: 'scope', description: 'Checks selected HTTP headers only; security assessment and vulnerability scan not included.' });
});

test('09 — Language switch is available', async ({ page }) => {
  await page.goto('/');
  const arabic = page.getByRole('button', { name: 'AR', exact: true });
  await expect(arabic).toBeVisible();
  await arabic.click();
  await expect(arabic).toHaveAttribute('aria-pressed', 'true');
  await screenshotEvidence(page, 'Arabic interface');
});

test('10 — Dark/light switch responds', async ({ page }) => {
  test.skip(!isDesktop(), 'Theme tested once on desktop.');
  await page.goto('/');
  const light = page.getByRole('button', { name: 'Switch to light mode' });
  await expect(light).toBeVisible();
  await light.click();
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  await screenshotEvidence(page, 'Light mode');
});

test('11 — Responsive screen has no horizontal page overflow', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(800);
  const size = await page.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  await test.info().attach('Viewport widths', {
    body: Buffer.from(JSON.stringify(size, null, 2)), contentType: 'application/json',
  });
  await screenshotEvidence(page, 'Responsive viewport');
  expect(size.documentWidth, `Horizontal overflow ${size.documentWidth - size.width}px`).toBeLessThanOrEqual(size.width + 4);
});

test('12 — Mobile Ask AI can open without losing the question input', async ({ page }) => {
  test.skip(!isMobile(), 'Mobile-only test.');
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask AI', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Your question' })).toBeVisible();
  await screenshotEvidence(page, 'Mobile Ask AI panel');
});

test('13 — CSV export can start a download', async ({ page }) => {
  test.skip(!isDesktop(), 'Download test needs only one browser.');
  await page.goto('/#verify');
  const exportButton = page.getByRole('button', { name: 'Export CSV', exact: true });
  await expect(exportButton).toBeEnabled();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20_000 }),
    exportButton.click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  await test.info().attach('Download name', {
    body: Buffer.from(download.suggestedFilename(), 'utf8'), contentType: 'text/plain',
  });
});
