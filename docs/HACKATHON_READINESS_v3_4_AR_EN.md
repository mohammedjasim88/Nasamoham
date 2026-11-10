# Oman Earth Intelligence v3.4 — Hackathon Readiness

## Scope / نطاق العمل

This version starts from **v3.3 Verification Evidence**. It adds operational and scientific quality controls while **preserving all original NASA CSV/JSON records, the OLS implementation, trend results, site coordinates and the source provenance**. This is a training platform and not a certification of ground-station accuracy or governorate averages.

| # | Item | Implemented in v3.4 | Verification / Caveat |
|---|---|---|---|
| 1 | Scientific accuracy | Separate sensitivity panel with Theil–Sen median slope, lag-1 OLS-residual diagnostic, leave-one-out influence and rainfall provenance warning | Descriptive diagnostics only. OLS p-value remains unadjusted for serial correlation. NASA annual values and original calculations unchanged. |
| 2 | NASA Verification Lab | A clickable negative self-test uses synthetic values to demonstrate detection of one deliberately changed and one absent year | Real NASA comparison / evidence download remain as in v3.3; synthetic test never certifies real NASA values. |
| 3 | Interactive map | Worker checks GeoJSON polygons, WGS84 coordinate ranges, geographic bounding box, structural feature count and rejection of incorrect geometries | No claim of official/legal boundary topology certification; live NCSI must be reachable. MapLibre markers and existing fallback preserved. |
| 4 | Mobile responsiveness | Horizontal bottom navigation without clipped buttons, 44px controls, safe-area spacing, small-screen panel adjustments and focus/skip controls | Actual iPhone/Android touch behaviour requires manual review. |
| 5 | Performance | Reduced 3D geometry and DPR on small screens; retained lazy MapLibre/3D modules; added JavaScript bundle budget checker | This is not a measured LCP, INP, CLS or Lighthouse result. |
| 6 | Backend & API | Cloudflare approximate per-route upstream rate limits, safe 429 with Retry-After, existing coordinate and year checks retained | Rate limits are location-local and approximate, not strict global quotas; 429 needs live Cloudflare deployment test. |
| 7 | Data visualisation | Context explaining NASA gridded point values, limitations of statistical significance, and new sensitivity audit beside trends/quality | Does not rederive or overwrite scientific values. |
| 8 | End-to-end QA | Desktop Chromium, mobile Chromium and WebKit smoke suites; API failure fallback, locale direction, verification self-test, source availability audit, bundle budget | Requires installing browser engines, successful Vite build and running tests on user's Windows environment. |

## Why the original data were kept unchanged / حماية البيانات

- Files under `public/data/*.json` and `sources/*.csv` remain identical to v3.3.
- Core modules `src/lib/statistics.mjs`, `src/lib/evidence.ts`, `src/lib/verification.mjs`, `worker/nasa.mjs`, and `worker/verification.mjs` remain unchanged.
- The v3.4 scientific checks are **additional diagnostics**, not a replacement for the site's historical values.
- A `MATCH` within 0.01 is *agreement with the accessed NASA dataset*, not a station comparison or general validation of the full governorate.
- For stored precipitation snapshots, the unit remains labelled as not independently verified; no `mm/day` is assumed.

## Windows: Build, QA, preview and deploy

Open PowerShell inside the extracted folder containing `package.json`:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd run audit:bundle
npx.cmd playwright install chromium webkit
npm.cmd run test:e2e
```

For a real, non-destructive upstream check **after deploying** to Cloudflare:

```powershell
npx.cmd wrangler deploy
node scripts/verify_live.mjs https://oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev
node scripts/audit_live_sources.mjs https://oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev
```

Do not deploy if `npm run build` or `npm test` fail. If `test:e2e` fails because a browser engine is not installed, run `npx.cmd playwright install chromium webkit`. Open `playwright-report/index.html` after failures. To inspect the site manually without uploading, use `npx.cmd wrangler dev` and open `http://127.0.0.1:8787` after building.

## Manual device acceptance / الفحص على الهاتف

1. On an actual iPhone Safari and Android Chrome: open `/#home`; verify the intro loads immediately and the 3D earth is interactable without blocking the CTA.
2. Tap **Start Exploring**; the map must be available or show an explicit fallback, not a permanent empty map.
3. Turn governorate and wilayat boundaries on/off; NCSI service may be unavailable. Labels for Khasab, Sohar, Al Buraimi and Salalah should visually align with their positions.
4. In `/#trends`, inspect the trend chart, year slider, rainfall caution, OLS explanation and sensitivity panel.
5. In `/#compare`, choose two cities; ensure the site warns if nearby grid series are identical.
6. In `/#verify`, run self-test and confirm **PASS**, then run a **real** verification and check original CSV, website CSV, comparison CSV and ZIP evidence. Deliberately altered **test copy** must report Review Required.
7. Toggle Arabic and English and light/dark themes; test at narrow width and with keyboard focus.
8. In network throttling, test NASA API timeout/429/502 and map fallback; never render made-up values.

## Production performance targets / أهداف غير مقاسة

Target: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 on the 75th percentile of real visits. Test on PageSpeed Insights and real mobile devices. Source: Google web.dev Core Web Vitals. Actual metrics are **not** yet measured for v3.4.

## Backend operations

`wrangler.jsonc` defines two named Cloudflare Workers Rate Limiting bindings:

- `NASA_RATE`: 120 per 60 seconds **per API path per Cloudflare location**.
- `AI_RATE`: 20 per 60 seconds **per location**, only used if Workers AI is configured.

`namespace_id` values `910241` and `910242` should be confirmed not to collide with other rate-limit bindings in the same Cloudflare account. These caps protect shared upstream use, not individual identities. A 429 includes a 60-second Retry-After and no numerical fallback. The local Node preview does not emulate the Cloudflare rate-limit backend.

## Known boundaries

- No production upload or live mobile-device acceptance has occurred from this environment.
- No full Vite build or actual Playwright browser run occurred where npm dependencies were unavailable; source-level Node tests were executed.
- Official geography service is external. Structural polygon checks are **not** a GIS topology or legal cadastral verification.
- NASA source availability can change or fail; live source tests may be incomplete under upstream failures or rate limits.
- No change should be interpreted as permission to reuse pre-hackathon assets without following the event's rules.
