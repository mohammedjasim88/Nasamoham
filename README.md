# Final source release — 15 November 2026

See [SUBMISSION_README.md](SUBMISSION_README.md) for current installation, deployment, credits and submission disclosures, and [the final verification report](docs/FINAL_RELEASE_2026-11-15.md) for measured outcomes. The source submission ZIP excludes generated `dist/`; recreate it with `npm run build`. Reports and ZIP descriptions below are historical.

# Oman Earth Intelligence v3.9.1 — Ask AI

Use **Ask AI** on the home page, Explorer, Trends, Compare, Data Quality, NASA Verification Lab or About. The full Scientific Assistant page also remains available. Type in Arabic or English, or choose the recording language and use **Record question**. Review the transcript before submitting. Replies are synthesized in a local worker with eSpeak-NG; browser/device voices and external speech services are not used.

Try: **Compare Muscat and Al Buraimi temperature trends from two thousand to twenty twenty-five**. The answer uses NASA POWER records, estimates both per-decade slopes and reports the paired difference with a 95% Newey–West confidence interval. The Al Buraimi snapshot is derived from the original archived response in `docs/readiness-v39/`. The NASA Lab can independently fetch the source again.

Whisper Tiny is selected on unknown or constrained devices; Base is selected when the browser reports at least 8 GiB device memory. After explicit consent, model weights download from Hugging Face and run locally in a browser worker via ONNX WebAssembly. Voice input requires microphone permission and HTTPS or localhost. Arabic/English accuracy and real-device speed have not been independently benchmarked. Browser tests mock microphone capture, transcription and audio playback; they are not real microphone or speech-quality tests.

The local reply voice uses the existing `espeak-ng` 1.0.2 package (GPL-3.0-or-later), with its licence in `public/licenses/`; the voice is intentionally described as robotic. The ECharts trend/comparison views use modular Apache ECharts 6.1.0 (Apache-2.0), loaded on demand, while the existing SVG chart remains a loading/error fallback and the exact two-year point chart remains unchanged. Motion 14.13.0 (MIT) supplies reduced-motion-aware transitions and interactions. The ECharts runtime is a separate 564.50 kB / 191.73 kB gzipped production chunk; Motion's async feature chunk is 50.49 kB / 19.76 kB gzipped.

## Run the release

- Windows: run `npm.cmd ci`, `npm.cmd run qa`, then `npm.cmd run preview:node`. Open `http://127.0.0.1:8787`.
- Linux: install with `ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci`, then run the same npm scripts. The browser runtime uses WASM.
- The ZIP includes `dist/`. For Cloudflare deployments to the configured preview Worker, use `DEPLOY_WINDOWS.cmd` with your existing Cloudflare account.
- For automated browser checks, install the Playwright browsers and run `npm run test:e2e`.

---

# Oman Earth Intelligence v3.5 — Pro Experience

**Latest version:** premium interface, global quick navigation, visible scientific context, lighter non-map pages, mobile refinements, and source-preserving quality checks.

[Detailed bilingual release notes](docs/PRO_EXPERIENCE_RELEASE_v3_5_AR_EN.md)

## Quick start on Windows

```powershell
npm.cmd install
npm.cmd run audit:science
npm.cmd test
npm.cmd run build
npm.cmd run audit:bundle
node scripts/local_node_preview.mjs
```

For browser tests: `npx.cmd playwright install chromium webkit` then `npm.cmd run test:e2e`. For publication (only after successful checks): `npx.cmd wrangler deploy`.

**Scientific integrity:** eleven source, analysis and NASA files retain their original SHA-256 hashes. This does not mean every source value has been independently validated for every location.

---

# Oman Earth Intelligence v3.4 — Hackathon Readiness

**Climate analysis for Oman using NASA POWER, with transparent source verification.**

This iteration expands v3.3 with eight QA workstreams while keeping the NASA source records and original OLS trend computation unchanged. The cinematic intro, climate explorer, annual trend chart, location comparison, NASA Verification Lab, and evidence archive remain available.

## Install / Build / Deploy (Windows PowerShell)

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd run audit:bundle
npx.cmd wrangler deploy
```

## Browser acceptance suite

```powershell
npx.cmd playwright install chromium webkit
npm.cmd run test:e2e
```

The Playwright tests use a local Wrangler Worker on `127.0.0.1:8787`. A green Node unit test run **does not** imply the iPhone UI or NASA availability are verified.

## Remote read-only diagnostics

```powershell
node scripts/verify_live.mjs https://oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev
node scripts/audit_live_sources.mjs https://oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev
```

See [`docs/HACKATHON_READINESS_v3_4_AR_EN.md`](docs/HACKATHON_READINESS_v3_4_AR_EN.md) for scope, tests, precautions and manual QA.

## Scientific integrity

- NASA POWER point-grid estimates are not equivalent to ground-station weather or governorate spatial averages.
- OLS significance is not corrected for serial correlation; the new Theil–Sen, lag-1 and leave-one-out checks are descriptive diagnostics.
- Precipitation units and the 2024 anomaly require contextual examination.
- Verification Lab compares fresh NASA annual `YYYY13` fields against website exports without changing values. ZIP evidence retains original JSON for audit.

## Copyright / map sources

NASA POWER historical meteorological data; NASA Blue Marble Earth imagery; Oman NCSI administrative geographic service; OpenFreeMap / OpenStreetMap. External licence and attribution requirements continue to apply.

## v3.5.1 TypeScript build fix

The NASA Verification Lab evidence archive function now has explicit JSDoc typing for the optional uploaded CSV. This fixes the `TS2322` build error in `VerificationLab.tsx` when passing a file or `null`. See [Arabic build-fix notes](docs/TYPESCRIPT_BUILD_FIX_v3_5_1_AR.md). No NASA data or scientific calculation was changed.
