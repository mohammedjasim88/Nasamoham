# Competition readiness — 4 November 2026

## Scope and release
Incremental release built from the validated preview-18 source, preserving all previous assistant/map/security functionality. Production was read before changes and still served version 16 (2813c029-cea6-4402-9a7b-6e0bffd90938). No production deployment, paid service, DNS, WAF, secret, route or binding change was made.
Preview 19: https://a6842c40-oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev/#compare
Version ID: a6842c40-085c-4838-b548-c2415abf095e. Review before approving production. Rollback reference remains the actual current production version; re-read it before promotion.

## Implemented changes
- New src/components/ClimateInsights.tsx: bilingual, source-driven Muscat East versus Al Buraimi case study, 2000–2025 T2M; measured slopes, preliminary significance, confidence intervals, real chart, separate robustness checks, provenance and limitations.
- New optional seven-step NASA Challenge Demo in that component; uses actual selection, chart and Verification Lab. Steps are skippable; source verification is disabled until both matching-coordinate datasets load. No prerecorded values, fake success, screenshots replacing the app or continuous interpolated heatmap.
- src/App.tsx: lazy-load the case study in Compare Locations, set its exact scope and link both points into the existing Lab.
- src/components/ScientificAudit.tsx: unique React IDs prevent duplicate heading IDs when two audit panels appear together.
- Reused existing OLS, Theil–Sen, leave-one-out influence and lag-1 residual diagnostics. Did not modify or relabel these as corrected significance tests. No new dependencies.

## Case-study findings observed in preview
Both points had 26 annual observations. Muscat East OLS: +0.298°C/decade, p=0.00103, preliminary 95% interval [0.133,0.462]. Al Buraimi: +0.358°C/decade, p=0.000189, interval [0.190,0.526]. Theil–Sen: +0.306 and +0.310°C/decade; residual lag-1 correlations approximately 0.03 and 0.05. These diagnostics do not prove independent residuals or justify claiming corrected p-values. Individual significant slopes do not establish a significant difference between the two slopes.
The browser's fresh NASA Lab check matched 26/26 for EACH location within ±0.01°C. Exact NASA responses and manifest are in docs/competition-review/case-evidence.zip. These are grid estimates, not governorate averages, station measurements or causal evidence. Possible educational/planning use is not a measured social or economic impact.

## Official challenge and judging references
The official 2026 challenge asks for selection of Earth-observation/model variables, temporal visualisation, identification of what/where/how much is changing and scientific significance:
https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/
The present application addresses those questions for selected Oman grid points. Spatially continuous conclusions, corrected significance and independent ground validation remain unavailable.
The five requested criteria are supported by published 2025 judging guidance; 2026 numerical weighting was not established:
https://spaceapps-v2-staging.s3.amazonaws.com/media/documents/Final_Space_Apps_2025_Judging_Guidelines_for_web.pdf
https://www.spaceappschallenge.org/2025/local-events/isa-town/
Initial direct page opens returned 502; search-indexed official page content supplied the documented comparison. No competitor demo performance measurements were made.

## Documentary benchmark — verified features only
| Reference | Confirmed official description/status | Lesson for this project | Not established |
|---|---|---|---|
| NVS-knot | 2024 Galactic Impact winner; planting-risk application based on soil moisture/evapotranspiration | Connect a scientific variable to a clear user decision; implemented a question-led educational case | Comparable field impact, performance or predictive skill |
| The CliMappers | 2024 Global Nominee; documented heat-risk, bird and drought/community mapping studies | Explain local relevance and multiple evidence views | Full methodology/source audit or quantitative comparison |
| CloudMap | 2025 Global Finalist; team describes NASA air-quality data, predictive models and accessible UI | Make complex results understandable; keep prediction claims separate from historical analysis | Model accuracy, latency or proven health outcomes |
| Stellar Minds | 2025 Global Finalist; associated with customised adverse-weather queries challenge | User-oriented questions and transparent scope, already supported by our annual assistant | Detailed implementation and validation results |
Official sources:
https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-international-space-apps-challenge-announces-2024-global-winners/
https://www.spaceappschallenge.org/nasa-space-apps-2024/find-a-team/nvs-knot/
https://www.spaceappschallenge.org/nasa-space-apps-2024/find-a-team/the-climappers/
https://www.spaceappschallenge.org/2025/find-a-team/cloudmap/
https://www.spaceappschallenge.org/2025/find-a-team/stellar-minds5/
No competitor source, artwork or branding was copied. This is a documentary comparison, not a head-to-head technical evaluation. All nine requested comparison dimensions are therefore bounded: methodology, innovation, impact and storytelling are compared only at documented concept level; competitor visualisation/UX reflect team descriptions; implementation, accessibility and scientific-transparency quality could not be independently tested.

## Unofficial equal-weight engineering simulation
This is a subjective self-review, not an independent NASA jury or award prediction. Each category has 20 possible points; no official 2026 weighting is claimed. Baseline is preview 18, rather than an older training ZIP.
| Criterion | Baseline | Updated | Reason |
|---|---:|---:|---|
| Impact | 12 | 13 | Clear educational case and audience; no measured adoption/impact |
| Creativity | 13 | 14 | Interactive evidence walkthrough; underlying trend methods are established |
| Validity | 15 | 15 | Integrity preserved and two-point source match; corrected inference/precipitation issues unresolved |
| Relevance | 16 | 17 | Explicit question, magnitude, uncertainty and source trail |
| Presentation | 14 | 15 | Bilingual story and live demonstration; no external usability study |
| Total | 70/100 | 74/100 | A transparent estimate, not a calibrated performance metric |
Local demonstration readiness improved. Global judging readiness remains conditional on scientific, eligibility, licensing and usability work. No award or selection is guaranteed.

## Test evidence and limits
139/139 existing unit tests passed. Original QA included SHA-256 audit, tests, TypeScript/build and bundle budget. A TypeScript optional-value error was caught and fixed before preview upload. The final small UI guard change was checked again by TypeScript/build/bundle and targeted browser interactions; no tests were invented for unchanged statistical methods.
All 11 protected scientific files remained unchanged. Final HTTP smoke: 13/13. Browser tested setup, actual two-point result rendering, significance step and routing into a two-location NASA Lab. Normal independent Lab checks: 26/26 for each point. Evidence ZIP CRC32 and SHA-256 checked separately. Negative CSV unit check deliberately added 1°C ONLY to a test copy's year 2000: 25 matched, one Different, passed=false; original datasets untouched. Browser negative case also passed: year 2000 appeared as 29.14 versus NASA 28.14, difference 1, status Different; 25/26 matched and the archive displayed Review required.
Desktop case-study render and navigation were tested. New mobile viewport, physical-device, 3D Earth, full accessibility audit and LCP/INP/CLS/Lighthouse targets were not measured this round. Prior report evidence is historical, not a substitute for a new measurement. Targets of 90 Lighthouse, LCP 2.5s, INP 200ms and CLS 0.1 are unverified.

## Scientific work still required
Ordinary/corrected Mann–Kendall and autocorrelation-aware inference were not added without a properly validated methodological implementation. Existing Theil–Sen and lag-1 indicators remain descriptive. Confidence intervals are ordinary OLS. No claim of exhaustive scientific review.
Official POWER GIS monthly metadata describes PRECTOTCORR_SUM as precipitation corrected sum and exposes mm units:
https://gis.earthdata.nasa.gov/portal/home/item.html?id=8f19b884dbfd4441beeb2ae9e26abae5
https://gis.earthdata.nasa.gov/portal/rest/services/POWER/POWER_MONTHLY_METEOROLOGY_LST/ImageServer/multiDimensionalInfo
This does not reconcile the supplied CSV header reporting mm/day or independently explain the unusual August 2024 records. No conversion, deletion or fabricated correction was made. Reconcile temporal API metadata and daily-versus-monthly aggregation in a separate scientific investigation.
https://power.larc.nasa.gov/docs/services/api/temporal/monthly/

## Eligibility, provenance and licensing
The official 2026 page lists November 14–15 and project submission during the event:
https://www.spaceappschallenge.org/2026/
All work in this release predates that event and is preparation/training. Do not describe it as newly written during the hackathon. Maintain a separate log of actual event work. Exact pre-existing-work eligibility has not been verified; confirm with organisers before submission. We did not register, submit or accept terms on the user's behalf.
Official legal terms require appropriate open-source/public availability and citations for third-party materials:
https://www.spaceappschallenge.org/legal/
Installed direct dependency licence metadata is recorded in dependency-licenses.json; it is not an exhaustive legal review of transitive dependencies, NCSI reuse rights, map tiles, fonts or each NASA texture. No blanket licence was imposed on the owner's code or third-party assets. Final OSI licence choice and attribution inventory remain submission blockers. AI-assisted development: ChatGPT helped inspect sources, implement UI, run checks and draft documentation; owner review remains necessary. No NASA endorsement is implied.

## Three-minute judging narration (English)
0:00–0:25 — Oman Earth Intelligence asks whether temperature trends differ between a coastal and inland reference point. It uses historical NASA POWER grid data, not live station observations.
0:25–0:55 — Set up Muscat East and Al Buraimi for T2M, 2000–2025. Show the annual observations and data coverage.
0:55–1:30 — Compare the displayed per-decade slopes and ordinary OLS confidence intervals. Explain that different slopes alone do not prove a significant difference between locations.
1:30–2:00 — Show Theil–Sen, leave-one-year-out sensitivity and residual correlation. State explicitly that these are diagnostics, not corrected significance tests.
2:00–2:35 — Open the real NASA Verification Lab, request both points, inspect year-by-year comparison and download exact-response evidence.
2:35–3:00 — Explain grid resolution, source revisions, no causality, no governorate-wide average and no measured societal impact. The demonstrated benefit is a traceable educational investigation.

## Running and reversible deployment
npm ci; npm run qa; npm run preview:node. No GitHub required. Existing production URL and bindings are preserved. Production promotion requires explicit approval after reviewing this preview. Re-read current deployments before promotion; retain the latest working production ID and roll back to it if a critical regression is confirmed. Do not delete resources or alter DNS/secrets/plan. This release improves selected high-priority areas and does not claim completion of all 13 phases of the brief.
