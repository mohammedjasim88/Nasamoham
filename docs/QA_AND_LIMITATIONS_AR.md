# تقرير الجودة والقيود — Oman Earth Intelligence v2.0

## ما تحقق هنا فعلًا
- `npm test`: نجح 21/21 اختبارًا على بيانات CSV الأصلية والحسابات المصدرية وواجهة Worker وحراسة مدخلاتها.
- `transpileModule` من TypeScript: جميع ملفات TS/TSX السبعة اجتازت فحص **الصياغة**، وليس TypeScript type-check الكامل.
- لم أختبر Vite production build أو React UI في متصفح حقيقي بهذه النسخة لأن تثبيت npm dependencies من الشبكة غير متاح في البيئة الحالية.

## يجب اختباره على جهاز المستخدم قبل أي وصف "Production-ready"

| P | الاختبار | طريقة التنفيذ | معيار النجاح |
|---|---|---|---|
| P0 | Build | `npm install && npm run build` | no errors; `dist/index.html` exists |
| P0 | Worker | `npx wrangler dev --port 8787` | `/api/status` returns JSON 200 |
| P0 | Map | Chrome desktop + iPhone Safari | MapLibre tiles load, gestures, markers, attributions |
| P0 | Data | Muscat T2M 2000–2025 local sample | 26 annual values; 2000=28.14, 2025=28.89 |
| P0 | Remote | Click `Fetch live NASA data` | fetched status; API source/year/unit visible or explicit error |
| P0 | Comparison | Muscat East vs Muscat West, T2M | flagged identical series; not claimed independent |
| P0 | Science | Climate trend calculation | compare slope, p-value and R² with SciPy independently |
| P0 | Geographic | NCSI ArcGIS layer / local dataset | count=11 ADM1; topology, labels, disconnected territories and islands reviewed in QGIS |
| P1 | Satellite | Set legitimate MapTiler key | tiles show license and source; disabled otherwise |
| P1 | Data warning | August 2024 rainfall | 1089.90 remains visible; outlier and unit caution |
| P1 | Salalah | Choose Salalah + RH2M | 26 annual RH records; status unverified independently |
| P1 | Invalid selection | Salalah + local sample + T2M | unavailable; no invented temperature |
| P1 | Assistant | Ask for today's weather | refuses live weather claims |
| P1 | RTL | Toggle Arabic | navigation and labels align right-to-left, figures remain legible |
| P1 | Responsive | 360px, 390px, 768px, 1024px, 1440px | no unintended page horizontal scroll, tappable controls |
| P1 | Accessibility | Keyboard only + reduced motion | all controls reachable; focus visible; intro Skippable |
| P1 | Regression | DevTools Console/Network | 0 uncaught errors in *tested flow*, no blocked CSP tile/font requests |

## Open scientific issues
1. **Data verification:** The 2024 monthly rainfall observation and annual units need independent NASA and Omani source confirmation. An anomaly flag is not proof of wrong source data.
2. **Statistical robustness:** OLS p-values need autocorrelation diagnostics and possibly an adjusted/nonparametric method for formal claims.
3. **Spatial reliability:** NASA MERRA-2 gridded meteorological data are coarse; two nearby Omani points may yield identical values. Use different grids or a regional service before asserting wilayat averages.
4. **Boundary topology:** NCSI GeoJSON is fetched dynamically only if its ArcGIS service responds; no topology, holes, disconnected territories, islands or coordinate lookup coverage has been fully verified. The website shows point markers if boundary service fails; *not* polygons fabricated by AI.
5. **Google Earth-style 3D:** No CesiumJS in this version; this avoids unnecessary bundle size and performance risk. The intro is a cinematic CSS globe and the functional map is 2D MapLibre.
6. **Satellite imagery:** optional MapTiler imagery; without a valid key, the satellite button is disabled. Relief style is cartography, not NASA satellite imagery or DEM-derived 3D terrain.
7. **Workers AI:** default explainer is deterministic, not generative AI. Future true model integration requires an independently verified permissions/usage configuration and output grounding.
8. **External service reliability:** NASA API and OpenFreeMap/NCSI network paths are dependencies and may fail or have provider limitations.

## Windows launch
```powershell
npm install
npm test
npm run build
npx wrangler dev --port 8787
```
Open http://localhost:8787/ and run the matrix above. If the build fails, **do not deploy**; save the full terminal output and fix it first.

## Suggested Playwright automated tests (not yet run)
- Wait for `[role="application"]` / map canvas; verify no WebGL error and loaded basemap tiles.
- Click each location marker and verify selector updates and annual values refresh without stale data.
- Change language and metric, check label translation, control focus and absent React console errors.
- Check mobile touch and RTL in WebKit; verify screenshot comparisons, reduced-motion mode and content clipping.
- Mock NASA API to test 429/500, latency, missing `YYYY13`, `-999`, outliers and exact matching grids.

## No unsupported guarantees
Do not claim this version has zero errors, 100% scientific accuracy, validated 63/61/other count of wilayats, or complete QA on a real iPhone until evidence exists.
