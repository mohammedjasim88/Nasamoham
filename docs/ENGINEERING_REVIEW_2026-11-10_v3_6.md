# Oman Earth Intelligence — engineering patch v3.6 (10 November 2026)

## Baseline and objectives

Private development branch based on GitHub's imported v3.5 source. The original Cloudflare production Worker and existing NASA data are **not modified** by these changes. Treat this as a candidate, not a certified release.

## Concrete code changes

1. `EarthGlobe.tsx` and `globe-motion.mjs`: framerate-independent spin damping, smoother focus animation using shortest angular path, wheel zoom with explicit bounds, drag velocities from pointer events, stale spin cancellation on keyboard/focus, globe label occlusion check, reduced-motion still-frame support and no forced phone scroll lock.
2. `PremiumHome.tsx` and `PremiumHome.css`: static WebGL rendering for reduced-motion preference rather than always suppressing the globe, clearer focus outline and mobile gesture helper, smaller mobile attribution.
3. `ScientificAssistant.tsx`, `ScientificAssistant.css` and `question-analysis.mjs`: a bilingual source-bound FAQ for NASA API/source, map location vs area, variables, quality checks, historical-only scopes and use of the site. It does not invent readings and does not require a paid LLM. All numeric questions containing years continue to the existing validated science pipeline.
4. Add targeted regression tests in `tests/globe-motion.test.mjs` and `tests/site-assistant.test.mjs`.

## Open-source option review (source pages checked on 10 November 2026)

| Library / source | Stars (approx.) | Licence | Recommendation | Reason |
|---|---:|---|---|---|
| [Three.js](https://github.com/mrdoob/three.js) | 118k | MIT | **Keep** | Already installed; good control of sphere, atmosphere and event loop, no replacement footprint |
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | 12.1k | BSD-3-Clause | **Keep** | Actively maintained and supports existing vector/raster tile fallback + coordinate placement |
| [CesiumJS](https://github.com/CesiumGS/cesium) | 15.9k | Apache-2.0 | **Do not swap now** | Advanced geospatial 3D, but a full engine migration would increase complexity and can risk mobile performance |
| [OpenFreeMap](https://openfreemap.org/) | Provider, not a JS engine | Public service / terms | **Keep with fallback** | No tile access key and no public-instance view limits; no SLA; attribution and terms still apply |
| [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/) | Cloud provider | Free allocation subject to quotas | **Optional, off by default** | 10,000 neurons/day free allocation as of 9 Oct 2026; requires AI binding and controls, and is NOT ChatGPT API |

Stars are rough point-in-time popularity signals; licences, maintenance, payload, features and mobile behaviour matter more. Switching to Cesium solely because it is popular is not evidence of better performance for this UI.

## Scientific and security caveats

- NASA POWER point retrievals use the public `https://power.larc.nasa.gov/api/temporal/monthly/point` endpoint. The worker does **not** include a NASA key. Do not confuse this public POWER endpoint with separate NASA APIs requiring `api.nasa.gov` developer keys.
- Historical gridded values must not be described as station-verified or governorate-wide means. `PRECTOTCORR_SUM` aggregation units need independent review.
- The map's boundary layer is fetched from the project's existing NCSI URLs; shape counts validate basic structure, not legal boundary topology.
- The proposed assistant improvements are **not a general-purpose LLM** and promise neither all-topic responses nor free access to a ChatGPT API. Workers AI is not enabled automatically because a billing decision cannot be assumed.
- Do not deploy to the existing public Worker until end-to-end mobile and NASA source tests are reviewed. A separate preview is the intended destination.

## Test gates

- Targeted new logic tests: `node --test tests/globe-motion.test.mjs tests/site-assistant.test.mjs`.
- Full test and build in GitHub Actions: `npm ci && npm run audit:repo && npm run qa`.
- Browser verification: `.github/workflows/browser-smoke.yml` (manual), including touch/drag and reduced-motion.
- Manual review: iPhone Safari, Android Chrome, desktop Firefox/Chrome, coordinates, NCSI fallback, large NASA result and timeout.
