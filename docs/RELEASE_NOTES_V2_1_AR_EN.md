# Oman Earth Intelligence v2.1 — Technical fixes / تقرير الإصلاح

## Important: release candidate, NOT certified production

This update was prepared against the **v2.0.1 uploaded source** and three screenshots of the deployed Worker. The runtime did not have network access to npm, OpenFreeMap, CartoCDN, the live Worker, NASA POWER, or NCSI; consequently, a real production bundle and live browser testing **could not be executed here**. Source-level tests passing is not proof the live site is error-free.

## Fixes made / الإصلاحات

1. **Blank map / MapLibre GL JS v6:** explicit `setWorkerUrl()` with `maplibre-gl-worker.mjs?worker&url` for Vite, following official MapLibre v6 instructions. Browser errors and loading timeouts are handled explicitly.
2. **Basemap resilience:** initial OpenFreeMap; automatic licensed CARTO raster backup; last-resort interactive **coordinate grid only** (NOT fabricated Omani boundaries or satellite imagery); retry action and attribution included.
3. **No indefinite spinner:** map loading has a bounded timeout (7 seconds per provider); resize handling; fallback for missing WebGL2.
4. **CSP:** includes CARTO tile domains and keeps worker-src for same-origin worker.
5. **Scientific unit integrity:** removed `Source unit*`; rainfall is explicitly `unit under review` pending independent confirmation of source and aggregation. Original source unit remains in dataset metadata and CSV export.
6. **Statistical transparency:** OLS 95% confidence interval displayed, and existing qualification about autocorrelation and causality preserved. Out-of-range yearly values are excluded from regression, but still reported by the Quality panel. Outliers are *not* silently removed.
7. **UI/UX:** improved text sizes, keyboard affordances and mobile-layout overrides; bilingual error/retry language.
8. **Metadata:** removed hardcoded `2000–2025` heading and generic `MERRA-2` label when showing the Salalah file with unverified independent provenance. "NASA API response" now refers to a data fetch, not live weather.
9. **QA:** Node read-only deployed endpoint verification, optional Playwright desktop/mobile browser smoke script, and documented checks.

## Remaining scientific/geographic limitations

- The **NASA POWER August 2024 rainfall anomaly** in the uploaded Muscat datasets has not been independently cross-validated with another measurement product. Do not present the monthly amount as a validated observation.
- `PRECTOTCORR_SUM` source CSV metadata and period aggregation need separate unit verification. Relative and annual figures are preserved as received, not corrected or interpolated.
- Annual OLS significance assumes the model conditions; year-to-year residual autocorrelation and multiple comparisons are not addressed by the simple p-value.
- The Salalah annual RH2M file has not been independently re-fetched or cross-checked against NASA; only RH2M is present.
- Official **11 governorate polygons** and all wilayat topology are not independently verified. Boundary display requires remote NCSI service and returns only verified-count geometries. When unavailable, no polygons are invented.
- The **satellite layer** still requires a legitimate MapTiler API key in `.env` and valid account/terms. "Fiord" is a cartographic relief-style map, not a numerical digital elevation model.
- Live API fetch depends on NASA service availability and Cloudflare connectivity.
- Workers AI is optional and not automatically enabled. The default explainer uses computed evidence, not an LLM.

## Deployment on Windows / النشر

1. Back up the current v2 Worker and download the ZIP below.
2. Extract this project, and from its root run:

```powershell
npm install
npm test
npm run build
npx wrangler deploy
```

3. The Wrangler name is `oman-earth-intelligence-practice`, so this **intentionally updates** the currently deployed v2 Worker, **not** the older `oman-earth-trend-lab-practice` site.
4. Once deployed, run:

```powershell
node scripts/verify_live.mjs https://YOUR-SUBDOMAIN.workers.dev
```

5. Optional desktop+mobile Chromium automation (requires Python + Playwright installation):

```powershell
pip install playwright
python -m playwright install chromium
python scripts/browser_smoke.py https://YOUR-SUBDOMAIN.workers.dev
```

6. Manually test in **iPhone Safari** and inspect Developer Tools Console/Network on Edge/Chrome. The browser automation is not proof of Safari compatibility.

## Manual acceptance gates / شروط القبول

- [ ] `npm test` and `npm run build` pass on Windows.
- [ ] The map draws actual tiles and place markers; if remote tiles fail, the coordinate reference appears with a retry action.
- [ ] MapLibre worker script loads from the generated static assets (Network tab, no 404).
- [ ] Toggle Dark/Light/Relief; test MapTiler Satellite only if configured.
- [ ] Switch English/Arabic and confirm proper RTL and no horizontal scroll on 390px mobile.
- [ ] Check `T2M`, `RH2M`, `PRECTOTCORR_SUM`, 2000–2025, and CSV export labels.
- [ ] Confirm Muscat east/west grids match without pretending to be independent measurements.
- [ ] Confirm Salalah T2M correctly reports missing data from uploaded snapshot rather than fabricating it.
- [ ] Verify all four pages: Trends, Compare, Data Quality, Evidence Assistant.
- [ ] Validate `/api/status` and `/api/power` with developer tools; record HTTP failures.
- [ ] Confirm the official NCSI governorate/wilayat geometry service and its separate-territory topology before any claim of administrative completeness.
- [ ] Independently validate rainfall units and the August 2024 outlier before making competitive science claims.

Sources: https://maplibre.org/maplibre-gl-js/docs/ ; https://developers.cloudflare.com/workers/framework-guides/web-apps/react/ ; https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
