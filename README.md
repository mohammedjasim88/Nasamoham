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
