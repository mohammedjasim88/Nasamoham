# Professional AI Web Design Brief — Oman Earth Intelligence
## Production Engineering Prompt | Arabic/English | Practice Build

**Role:** Act as a senior creative director, climate-data engineer, geospatial architect, TypeScript/React engineer, Cloudflare Workers engineer, statistical reviewer, accessibility specialist and QA lead. Deliver tested implementation, not presentation-only mockups.

**Existing context:** The owner developed Oman Climate AI and Oman Earth Trend Lab. Historical NASA POWER CSV files from two closely spaced Muscat locations are available; they contain identical gridded values. A separate Salalah RH2M 2000–2025 annual CSV was also supplied, but original NASA provenance has not yet been independently verified. Preserve the distinction. Build a wholly separate *practice project*, not a representation that a hackathon submission was created during the event.

## 1. Primary objective / الهدف
Create an original, premium, cinematic, map-first Earth-observation experience for Oman. Inspire confidence through precise mathematics, openly stated uncertainty and robust UX, not through invented figures or excessive animation. Match the scientific goals of **Be An Earth System Trend Detective!**: choose an Earth science variable, area and period; explore and visualise its time series; calculate trend direction and magnitude; assess statistical significance.

## 2. Visual and experience brief / التصميم
- Design inspiration: Windy, NASA Worldview, Zoom Earth, Earth Nullschool and Google Earth. Borrow *patterns* only, not copyrighted layouts, sprites or visual assets.
- Style: midnight navy `#050e19` and deep slate panels, controlled cyan and teal, finely delineated glass panels, warm anomaly-warning colours and precise monospace numerals.
- Information hierarchy: map first, scientific controls second, derived numerical evidence third, explanatory AI fourth.
- Header: branded identity, data provenance indicator, bilingual AR/EN, light/dark theme.
- Desktop: persistent navigation, compact analysis controls, dominant functional map, scientific results rail, trend chart and data-quality panel.
- Mobile: touch-safe controls >=44px where practical, bottom navigation, no horizontal overflow, safe-area padding and reduced-motion support.
- Cinematic introduction: CSS/WebGL atmospheric globe effect with visible Skip; non-blocking on subsequent visits. No fake "NASA satellite" video labels.
- Typography: legible size, clearly differentiated title/label/metadata, Arabic RTL and English LTR, meaningful tooltips, contrast and focus styles.

## 3. Map contract / الخريطة
- MapLibre GL JS WebGL map (pan/zoom/click/fit). Use a legal, attributed tile source such as OpenFreeMap dark/light/fiord. MapTiler satellite is optional and MUST have an owner-supplied valid API key and visible attribution.
- Load governorate and wilayat polygons only from traceable, legally reusable source geometry. Target all 11 governorates, detached Musandam/Madha and coastal islands.
- Validate real geometry: WGS84 coordinates, Polygon/MultiPolygon types, nonzero area, source provenance, feature count, duplicate names, bounding extent, closure and topology in offline GIS QA. Do not invent missing territories or confuse a city's reference coordinate with a polygon centroid.
- If source is inaccessible, incomplete, incorrectly licensed or fails validation, show a transparent error and *point markers only*. Never substitute fake polygons.
- Map should still permit selecting reference coordinates if tile loading or WebGL fails (text list fallback). Do not claim this fallback is a map.
- Heat layers: only use actual source grid coverage, with legend, timestamp, resolution and units; never interpolate a few locations across Oman without explanation. If no grid raster exists, show labelled point samples.
- Clear distinction among vector basemap, relief-style cartography, actual imagery and NASA observation layers. Do not label relief style as 3D terrain analysis.

## 4. Scientific data contract / البيانات العلمية
- NASA POWER Monthly and Annual API: `https://power.larc.nasa.gov/api/temporal/monthly/point` with `community=AG`, parameters `T2M`, `RH2M`, `PRECTOTCORR_SUM`, start/end years and lat/lon.
- All data must come from NASA or owner-provided source files with provenance and verification status. Use the values `YYYY01`–`YYYY12` and `YYYY13` as provided, do not manufacture an annual value when missing.
- Display NASA parameter names and raw response units. For `PRECTOTCORR_SUM`, investigate the source's `mm/day` labelling and the annual aggregation semantics before claiming mm of total rainfall. A reported 1089.90 for August 2024 in one Muscat CSV needs independent validation; mark but never delete or correct silently.
- NASA POWER MERRA-2 meteorology uses model-grid values on a coarse approximately 0.5° × 0.625° grid; two close city points can return identical data. Never claim point forecasts, live weather, wilayat-wide means, direct station observations or 100% scientific accuracy.
- Show exact coordinates, requested period, measurement unit, time resolution, spatial resolution, original API reference, retrieval timestamp, status (snapshot/live/verified externally) and caveats. Reject invalid requests. Provide no fake stale-to-live fallbacks.
- Build complete monthly and annual series visualisations; monthly vs annual changes must use appropriate aggregations and non-deceptive chart axes.

## 5. Mathematics and statistical integrity / الإحصاء
- Basic OLS trend with year-indexed annual values, slope per year/decade, R², 95% CI, two-sided slope t-test `p-value`, number of valid years and missing-value warnings.
- State clearly: OLS p-value is preliminary and may be invalid under serial correlation. Do not imply proof of causality. For future scientific upgrade, use Mann–Kendall or autocorrelation-aware models and document their assumptions.
- Missing values must appear as gaps, not joined; outliers flagged by robust descriptive methods; all anomalies remain in original data.
- Comparing two locations must align period, parameter, resolution and units. If two series are identical, say it is likely due to a common gridded cell, not an application bug or independent observations.
- Export a CSV with sufficient provenance metadata for independent checking.

## 6. AI assistant / المساعد
- Default to a deterministic Evidence Explainer, which only uses visible computed data. If an actual LLM integration is enabled, use Cloudflare Workers AI with an explicit binding, rate limit, measured cost, private key handling and grounded responses; this is an optional capability, not silently implied.
- Never invent any numbers, map information, weather forecast, scientific explanation of cause or date. Show source and assumptions in the answer.
- Refuse to treat historical NASA data as live weather, to generalise a single point to all of Oman or to answer an out-of-scope question with unrelated climate results.
- Maintain bilingual proper Arabic/English, RTL and proper technical keyword spelling.

## 7. Technical architecture / الهندسة
- React + TypeScript + Vite, MapLibre GL JS, modular services, error boundary and accessible custom SVG charts.
- Cloudflare Worker with a server-side NASA POWER proxy and input validation, AbortController timeout, cache key including the full query, cache headers and no leaked secret.
- Cloudflare Workers Static Assets: `assets.directory=./dist`, `run_worker_first=["/api/*"]`, `not_found_handling=single-page-application`.
- Use proper skeleton loading and error states. UI must not show historical data as fetched live without indicating its status.
- Lazy-load or memoise expensive operations; no perpetual globe renderer on mobile; avoid unnecessary requests to NASA; keep animations GPU-friendly and disable them under `prefers-reduced-motion`.
- Secure headers, content security policy matching external tile/font endpoints, accessible keyboard navigation, safe placeholders for any paid map key.
- No hard-coded fabricated data, no swallowed exceptions that conceal errors, no SEO claims unrelated to actual metrics.

## 8. Acceptance criteria / معايير القبول
1. Map appears on desktop and modern iPhone Safari, or a clearly labelled text fallback appears when WebGL/tiles fail.
2. 11 governorates are *never* claimed unless the actual loaded GeoJSON is complete and has passed structural checks. Full GIS topology check still required.
3. Clicking a map marker changes the selected point and can retrieve monthly/annual NASA data.
4. T2M, RH2M, PRECTOTCORR_SUM return values/units with source and date, or an explicit error. No invented fallback.
5. Trend chart, OLS slope, p-value and 95% CI are calculated from numbers, independently validated with SciPy or equivalent for representative datasets.
6. Comparison uses aligned data, highlights exact matches, and never presents Salalah RH-only CSV as a full NASA multivariable dataset.
7. Outlier and missing-value flags work; rainfall semantics remain explicitly qualified until verified.
8. Arabic, English, RTL, LTR, light, dark, 360px mobile, tablet and desktop layouts pass browser automation with keyboard and touch testing.
9. No uncaught browser exceptions in tested flows; map tile requests, API and CSP policies are monitored. Log remaining failures with steps to reproduce.
10. A complete ZIP includes files, setup scripts, all data provenance, dependency lock, tests and Cloudflare deployment guide. Never say "zero errors" or "100% accurate" without empirical verification.

## 9. Required deliverables / المطلوب
- Complete source, full folder hierarchy, exact installation and build commands, Wrangler configuration, `.env.example`, documented secrets, safe output filenames.
- Scientific data manifest, notes on what is verified vs assumed, QA report and manual acceptance checklist.
- A working first run on the user's local Windows computer and a Cloudflare deployment that does not overwrite the old Worker unless explicitly requested.
- Report exactly what you built, what you tested, what remains unverified, and what next manual steps are needed.

**Execution instruction to AI:** Inspect all existing assets before editing. Choose reliable scientific and geographic truth over visual embellishment. Work to the highest quality possible without inventing data, file paths, sources, permissions or test results. If access to external sources or npm is blocked, say so, produce the best verifiable implementation and provide an exact validation path for the user.
