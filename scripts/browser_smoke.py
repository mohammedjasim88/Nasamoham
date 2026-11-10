"""Optional Playwright Chromium desktop/mobile browser checks.
Setup: pip install playwright && python -m playwright install chromium
Run: python scripts/browser_smoke.py https://YOUR-WORKER.workers.dev
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

if len(sys.argv)<2 or not sys.argv[1].startswith('https://'):
    raise SystemExit('Usage: python scripts/browser_smoke.py https://your-worker.workers.dev')
url=sys.argv[1].rstrip('/')+'/'
out=Path('qa_screenshots');out.mkdir(exist_ok=True)
with sync_playwright() as p:
    for label, viewport, mobile in [('desktop',{'width':1440,'height':900},False),('mobile',{'width':390,'height':844},True)]:
        browser=p.chromium.launch(headless=True)
        context=browser.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        response=page.goto(url,wait_until='domcontentloaded',timeout=30000)
        if not response or not response.ok:
            raise RuntimeError(f'{label}: page HTTP failure')
        # Intro overlay is optional; dismiss when shown.
        intro=page.locator('.intro-overlay')
        if intro.count()>0 and intro.is_visible():
            intro.locator('button').first.click()
        page.locator('#location-select').wait_for(timeout=15000)
        page.locator('.map-shell').wait_for(timeout=15000)
        page.locator('.chart-panel').wait_for(timeout=15000)
        page.wait_for_timeout(16000) # accommodate both map-provider timeouts
        if page.locator('.map-loading:visible').count()>0:
            raise RuntimeError(f'{label}: map stuck loading')
        if not(page.locator('.coordinate-fallback:visible').count() or page.locator('.maplibre-container:visible').count()):
            raise RuntimeError(f'{label}: neither map nor documented fallback is present')
        page.locator('.lang-pill').click()
        if page.locator('.app-shell').get_attribute('dir')!='rtl':
            raise RuntimeError(f'{label}: Arabic RTL toggle failed')
        page.locator('.metric-option').filter(has=page.locator('small:text-is("RH2M")')).click()
        page.wait_for_timeout(350)
        overflow=page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2')
        if overflow: raise RuntimeError(f'{label}: horizontal overflow')
        page.screenshot(path=str(out/f'{label}.png'),full_page=True)
        if errors: raise RuntimeError(f'{label}: JS errors: {errors}')
        print(f'PASS {label}: layout, RTL, dataset selection, map or fallback, no JS exceptions')
        browser.close()
print('NOTE: A successful smoke run does not independently verify NASA or NCSI scientific/geographic correctness.')
