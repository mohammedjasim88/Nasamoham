# Oman Earth Intelligence — Cloudflare release report

Release date: 4 November 2026 (Asia/Muscat).
Production: https://oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev/
Final Worker version: `f8fdcfd3-c93c-46dd-98ee-e0fced689e73` (version 9).
Final deployment: `4d491349-a728-4663-920a-9a1328ec5e0d`.
Original recovery version: `a09f8a3c-bb2c-4fde-99b5-c83b6e65c279` (version 7).
Final preview: https://f8fdcfd3-oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev/

## Five improvement areas

1. **Navigation and responsiveness.** Compact desktop navigation, a tablet menu, smaller-screen brand wrapping and non-wrapping labels prevent the clipped language controls observed at desktop width. Removed the redundant native View Transition after an actual browser DOM-update timeout; the existing short cinematic CSS launch remains. Updated the obsolete source test that required the native API.
2. **Earth rendering and fallback.** Hide the Oman coordinate tag and interaction hint when the globe is a static image; avoid implying that a projected marker is aligned with a still image. Mark NCSI unavailable when WebGL cannot initialise, rather than leaving an endless checking label. Localise the NCSI attribution, redraw texture arrivals in reduced-motion mode and prevent focus animation fighting pointer drag. Focus rotation takes the short route after repeated globe rotations. GPU operation remains unverified in the available browser.
3. **Map readiness.** Check loaded tiles on render as well as idle, so optional administrative sources do not unnecessarily hold the basemap loading indicator. Do not treat administrative overlay errors as a basemap-provider failure.
4. **Map layout.** Reserve separate layout bands for map styles, geography and selected data. Increase mobile map space and avoid placing the selected-data card over map controls. Keep coordinate fallback controls separate from the plot.
5. **Verification usability.** Add an accessible cancel action, busy state and a 45-second client timeout, preserving the independent NASA request and evidence logic. Cancellation control was observed; rapid completion prevented a conclusive deterministic cancellation race test.

## Checks and evidence

| Check | Actual result |
|---|---|
| `npm run audit:science` | PASS: all 11 protected scientific files unchanged by SHA-256 |
| `npm test` | PASS: 90 tests; zero failures |
| TypeScript | PASS: `tsc --noEmit` as part of build |
| Vite production build | PASS; final build completed in 7.62 s |
| Bundle budget | PASS: main 292 KiB; largest JS chunk 1,070 KiB; limits 450 / 1,350 KiB |
| Vite advisory | Large lazy-loaded map/Three.js chunks still exceed the generic 500 kB warning threshold |
| Preview browser | Homepage, explorer/fallback, lab, English/Arabic, NASA CSV and evidence ZIP checked |
| Independent temperature verification | Preview: Muscat east T2M, 26/26 annual rows matched within ±0.01 |
| Independent rainfall verification | Original production baseline: Muscat east PRECTOTCORR_SUM, 26/26 rows matched; unit caveat retained |
| Post-deployment humidity verification | Muscat east and west RH2M: 52/52 annual rows matched; identical-grid warning visible |
| Production downloads | NASA CSV and two-location evidence ZIP downloaded successfully |
| Exported evidence integrity | PASS: CRC32 and SHA-256, 7 evidence files / 2 locations |
| API health | Browser displayed `ready:true`, `aiConfigured:false`; invalid coordinates and unknown endpoint returned explicit JSON errors |
| Desktop transition regression | Final preview and final production reached explorer; final production application-error log was empty |
| Final production NASA check | Version 9: Muscat east T2M, 26/26 annual values matched within ±0.01 |
| Automated browser suite | BLOCKED before test bodies: Chromium socket creation was prohibited; downloaded Playwright browser archive was invalid. This is not a passed E2E suite |
| Mobile/iOS and real WebGL | Not verified; responsive CSS reviewed but no mobile-browser pass claimed |
| Performance metrics | Bundle budget measured; no Lighthouse/Core Web Vitals score claimed |

The raw final QA output and source-linked NASA downloads are in `docs/release-evidence/`. The downloaded production evidence was generated on the first validated deployment in this session; the final deployment differs only in removing the redundant native navigation transition. Numerical files, backend science and downloaded source values are identical.

## Scientific scope and remaining limitations

- The protected files are the 11 paths in the original `SCIENTIFIC_INTEGRITY_v3_4.json`. The original digest manifest was not regenerated or weakened. Scientific code, original CSVs and stored numerical datasets are unchanged.
- Matching NASA confirms agreement with the selected POWER grid series, not independent ground accuracy. No claim of 100% scientific accuracy or governorate-wide averaging is made.
- Preserve the existing precipitation-unit and 2024 anomaly cautions. NASA returned a unit label of `mm/day` for the rainfall check; annual aggregation interpretation still needs separate scientific review. No rainfall values or calculations were silently corrected.
- This Cloud Browser used the existing static-Earth and coordinate-map fallbacks. WebGL rendering and online basemap performance could not be established in this environment. There is no evidence here that those features work on every physical device.
- Satellite mode remains disabled without the optional MapTiler key. No paid AI service was enabled. AI remains the evidence-only mode already configured.
- Direct Python HTTP checks returned 403 in this execution environment even though the Cloud Browser loaded the same API routes and completed NASA retrieval/downloads. These requests are not counted as successful HTTP-status tests.
- A Wrangler identity check was stopped by automatic review because its incidental GitHub request conflicted with the user's Cloudflare-only restriction. Deployment used Cloudflare API tools plus a short-lived Cloudflare asset-upload session; no GitHub repository or workflow was used.

## Production preservation and recovery

Before publishing, the existing version/settings were inspected and retained. The new and original version resource configurations and bindings were compared for exact equality. ASSETS, NASA_RATE, AI_RATE, compatibility date, static-asset API routing, SPA handling and security headers are preserved. Observability remained enabled. No DNS, unrelated resources or secret changes were made, and no additional paid service was provisioned.

The existing version 7 remains recoverable in Cloudflare, and its version URL was opened successfully. To roll back through Cloudflare's deployment API, POST to the existing Worker's `/deployments` endpoint with:

```json
{
  "strategy": "percentage",
  "versions": [{"version_id": "a09f8a3c-bb2c-4fde-99b5-c83b6e65c279", "percentage": 100}]
}
```

No rollback was performed because no critical production regression was confirmed.

## Local use

The archive includes complete source, a reproducible package lock and the final `dist/` output. Run `npm ci`, then `npm run qa`. Use `npm run preview:node` for the existing local Node preview. The existing Wrangler deployment configuration targets the original Worker. Use an authorised Cloudflare login for future deployment; no credentials are included.
