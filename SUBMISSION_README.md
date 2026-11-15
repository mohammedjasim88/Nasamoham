# Oman Earth Intelligence

NASA Space Apps Challenge 2026 — **Be An Earth System Trend Detective!**

A bilingual Arabic/English climate exploration application for Oman. It presents selected NASA POWER grid-point records, annual trends and uncertainty with traceable source evidence. It supports climate education; it does not provide forecasts, causal attribution or station validation.

## Existing features

- Animated Earth introduction and interactive Oman map, with coordinate/static fallbacks.
- Climate Explorer, annual trend charts, location comparison and data-quality diagnostics.
- OLS and Theil–Sen trends, sensitivity diagnostics, approximate Newey–West intervals, and paired trend comparisons; interpretation caveats remain visible.
- NASA Verification Lab with fresh-source comparison, CSV and evidence downloads.
- Scientific Assistant and Ask AI dock for supported climate questions; optional browser-local WebLLM after consent.
- Editable Arabic/English voice transcription using browser-local Whisper; local eSpeak-NG reply audio.
- Responsive layouts, Arabic RTL support and reduced-motion support.

## Technology and data

React, TypeScript, Vite, Three.js, MapLibre GL JS, Apache ECharts, Motion, Cloudflare Workers with static assets, WebLLM, Transformers.js/ONNX WASM, and eSpeak-NG. Node's test runner and Playwright provide existing automated checks. Exact versions are in `package-lock.json`; dependencies were not upgraded for this release.

NASA POWER supplies historical meteorological grid estimates (temperature, relative humidity and precipitation). Original supplied CSVs are retained in `sources/`; snapshots are in `public/data/`, with archived independent responses and methodology in `docs/readiness-v39/`. NASA Blue Marble supplies Earth imagery. Geography uses Oman NCSI; basemaps use OpenFreeMap/OpenStreetMap and the existing fallback providers. These are distinct sources with separate reuse terms.

## Install, verify and run

Use Node.js 22 or later. This release was checked locally with Node 26.13.0 and npm 11.20.0; existing CI specifies Node 22.

```powershell
npm.cmd ci
npm.cmd run audit:repo
npm.cmd run qa
npm.cmd run preview:node
```

Open `http://127.0.0.1:8787`. `npm run build` runs TypeScript validation and creates `dist/` from `index.html` → `src/main.tsx`. The Worker entry is `worker/index.mjs`. On Linux, the existing installation guidance uses `ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci`; browser inference uses WASM/WebGPU, not CUDA.

For the existing browser suite:

```powershell
npx.cmd playwright install chromium webkit
npm.cmd run test:e2e
```

Browser tests include synthetic NASA fixtures and mocked microphone/transcription flows. Their success does not establish real speech-recognition quality, physical-device performance or all live map rendering.

## Deploy the existing Worker

Cloudflare **Workers**, not Pages. The checked-in `wrangler.jsonc` and `DEPLOY_WINDOWS.cmd` target the existing `oman-earth-intelligence-preview` Worker, which serves the final public release:

```powershell
npm.cmd run qa
npx.cmd wrangler login
npx.cmd wrangler deploy
node scripts/verify_live.mjs https://oman-earth-intelligence-preview.muhammed-10alajmi.workers.dev
node scripts/audit_live_sources.mjs https://oman-earth-intelligence-preview.muhammed-10alajmi.workers.dev
```

The existing `npm.cmd run deploy` performs the build and deployment together. Preserve the existing account, ASSETS binding, rate limits and compatibility date. Cloudflare Workers AI is not enabled in this configuration. Optional MapTiler uses your own key through the supplied blank `.env.example`; no secret is included.

- Final public release: https://oman-earth-intelligence-preview.muhammed-10alajmi.workers.dev/
- Older production/practice site (unchanged): https://oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev/
- Existing repository: https://github.com/mohammedjasim88/Nasamoham
- Final source branch: `release/final-2026-11-15`. The repository is private; this link alone does not grant judges access.
- Current verification and deployment outcome: `docs/FINAL_RELEASE_2026-11-15.md`. Older release reports describe historical runs.

## Limitations, credits and licences

POWER grid points are not weather stations or governorate averages. Preserve the documented precipitation-unit/2024 anomaly caution. Approximate inference on short series is assumption-sensitive. Source matching demonstrates agreement with NASA, not independent physical accuracy. Live NASA, NCSI, tile, font and model services can be unavailable or change. Real-device WebGPU generation, dialect accuracy and physical mobile performance are not certified by this release.

React/React DOM, Three.js and Motion declare MIT; MapLibre GL JS BSD-3-Clause; Lucide React ISC; Apache ECharts, WebLLM and Transformers.js Apache-2.0; eSpeak-NG GPL-3.0-or-later (installed package metadata). Preserve `public/licenses/` and `docs/readiness-v39/third-party-notices.txt`. These are third-party licences, not a licence grant for the project's original code. The owner must settle original-code licensing and outstanding third-party redistribution obligations before official submission. NCSI, tile, imagery, fonts and model weights retain their own terms; do not infer permission from download availability. Existing model identifiers include `Xenova/whisper-tiny` and `Xenova/whisper-base`.

## Previous work, AI use and official submission

The project includes substantial work prepared before the 14–15 November event; source history and older reports document that preparation. This finalisation only verifies, packages, publishes and corrects release tooling. Do not represent the entire application as newly developed during the event. Confirm eligibility and disclose prior work in the official team submission.

ChatGPT/Codex assisted with earlier implementation/review and this release's inspection, automated verification, documentation and publication. Numerical answers derive from the project's NASA data/analysis paths; optional generative text is separate. Human review, actual contributions and all external resources must be disclosed accurately.

Deploying the site and uploading code do **not** submit to NASA. Complete the team/project form in the official portal, include a judge-accessible source package, website and demo, list references/licences and prior-work/AI disclosures, then submit and retain the portal's confirmation. Check the team's actual local deadline and eligibility there; no portal submission is performed by this release.
