# Oman Earth Intelligence v3.9 — evidence and release review

Review date: 11 November 2026, Oman. This is a conditional engineering release, not a claim of competition readiness or a 90/100 result.

## Source and deployed baseline

- Default branch: `main`, commit `36c81db6c11f55ac8ad3346620adf77a1ce6a2d4`.
- Latest inspected development source: `engineering/browser-open-source-ai-v38`, commit `e461633ce1bb58b05007197dccfe33e18f5673cf`. Draft PR 4 targets v3.7. Relative to main, it is 38 commits ahead and one behind. The unique main change is a manual deployment workflow pinned to the older import branch; it is not an application fix to merge blindly.
- Other branches discovered: import-2026-11-10, ux-globe-assistant-v36, assistant-reliability-v37. Historical reports were read as historical evidence, not rerun measurements.
- New branch: `engineering/scientific-readiness-v39`. No production merge or deployment performed.
- Cloudflare preview active version: `2e1b4ae1-c0b6-40a6-ae0d-8ea4becfadce`, deployed 10 November at 20:43:40 UTC. Its HTML bytes match the uploaded v3.8 package exactly; the original v3.8 local build also produced the same entry asset names. This is evidence of the v3.8 frontend, not cryptographic proof that every server module corresponds to that Git commit. The deployed version has no source-commit annotation.
- The attached ZIP omitted tests, sources, public assets, TypeScript/Vite configuration and index.html at the source root. It could deploy prebuilt assets but could not rebuild or run `npm run qa` as delivered. The new packager includes these inputs and an SHA-256 manifest.

## Five highest-priority barriers and action

| Barrier | Evidence | Action / remaining limitation |
|---|---|---|
| Serial dependence affects trend uncertainty | Original statistics.mjs implements ordinary OLS; robustness.mjs explicitly supplies diagnostics only | Added separate Newey–West HAC inference, validated against statsmodels. It remains an approximation for short series. |
| Separate significant slopes do not test their difference | ClimateInsights originally warned of this but offered no direct test | Added regression of concurrent B−A annual differences with HAC covariance. |
| Precipitation unit and extreme value conflict | Fresh monthly API says mm/day for PRECTOTCORR_SUM while annual equals the sum of monthly records | Preserved values, documented daily comparison, withheld new precipitation inference. Physical anomaly remains unresolved. |
| AI and device evidence incomplete | v3.8 explicitly lacked physical-device model inference | Fixed loading/generation UI lifecycle and added cancellation. Retained deterministic fallback. No claim of successful model inference or Arabic model accuracy. |
| Release cannot be reproduced from ZIP | Missing build/test inputs in provided archive | Complete source/build/test package, explicit preview deploy script, integrity manifest and CI workflow. |

## Scientific implementation and independent validation

`src/lib/trend-inference.mjs` supplements the existing scientific engine; none of the 11 protected original science/data files is changed. Minimum sample size is ten annual observations. HAC refuses duplicate, missing or non-consecutive years and degenerate residual variance. No interpolation, data deletion or imputation is performed.

HAC uses Bartlett weights, bandwidth floor(4(n/100)^(2/9)), a covariance correction n/(n−2), and approximate Student t(n−2) inference. It allows heteroskedasticity and weak serial dependence under a meaningful linear model. The bandwidth is reported and sensitivity at lags 0–4 is included. It does not solve structural breaks, uncertain source measurements, non-stationary errors, multiple testing or causal attribution.

Mann–Kendall uses the tie-corrected variance and an asymptotic normal test without continuity correction, matching SciPy's asymptotic Kendall test for unique years. It assumes independence and is explicitly NOT presented as autocorrelation-adjusted. An all-tied series is marked undefined. Existing Theil–Sen and leave-one-out diagnostics remain unchanged.

`scripts/reference_statistics.py` independently generated fixtures with SciPy 1.17.0, statsmodels 0.15.0 and NumPy 2.3.5. Four reference series cover oscillation, ties, decreasing trends and an outlier. Node tests compare HAC slope, standard error, p and CI to statsmodels, rank p to SciPy (absolute tolerance 1.5e-7), Theil–Sen to SciPy and original OLS p to statsmodels. Additional tests reject gaps/duplicates/invalid bandwidths, check paired direction and preserve immutable inputs. Seven new statistical tests pass; original 158 tests also pass.

Method references:
- https://www.statsmodels.org/stable/generated/statsmodels.stats.sandwich_covariance.cov_hac.html
- https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html

## Fresh NASA case study

Raw monthly responses for Muscat East (23.5946, 58.7351) and Al Buraimi (24.2486, 55.7931), 2000–2025, are preserved. Their request URLs, original metadata, returned geometry, preserved retrieval timestamps and SHA-256 hashes are recorded in `case-study.json`. Retrieval timestamps are preserved in source-provenance.json and are not NASA observation times. The returned geometry rounds requested coordinates; it must not be described as a proven grid-cell centre.

| Result | Muscat East | Al Buraimi | Buraimi minus Muscat |
|---|---:|---:|---:|
| Temperature slope, °C/decade | 0.29785 | 0.35791 | 0.06007 |
| Approximate HAC 95% CI, °C/decade | [0.14578, 0.44991] | [0.19814, 0.51769] | [−0.03328, 0.15342] |
| Approximate HAC p | 0.0004733 | 0.0001082 | 0.1966572 |
| Annual observations | 26 | 26 | 26 paired |

Both individual fitted trends are positive under the specified approximation. The paired interval includes zero: these data do not establish a difference between the slopes at 0.05. This does not establish equality. Results concern two sampled grid points, not coastal/inland regions as a whole, governorates, national averages or climate causation.

The 78 annual Muscat snapshot values (26 each for T2M, RH2M and PRECTOTCORR_SUM) match the fresh NASA response at tolerance 0.01. This verifies transformation/source agreement, not independent station accuracy. `node scripts/case_study_v39.mjs` reproduces the findings offline; add `--refresh` to request new monthly data. Keep old responses separately when studying source revisions.

### Precipitation investigation

The fresh API reports PRECTOTCORR_SUM units as `mm/day`, annual 2024 value 1285.33, and August 2024 value 1089.9. The twelve monthly numbers sum to 1285.33; the 31 daily PRECTOTCORR values for August sum to 1089.9. This establishes internal aggregation agreement in this retrieval. Official GIS metadata describes the accumulated product in mm. It does not explain the extreme rainfall physically or resolve why the temporal API labels the sum mm/day. No automatic conversion or correction was made; supplementary rainfall inference is withheld. Existing legacy rainfall panels remain explicitly labelled as source units under review.

References: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/ and https://gis.earthdata.nasa.gov/portal/rest/services/POWER/POWER_MONTHLY_METEOROLOGY_LST/ImageServer/multiDimensionalInfo . Daily and monthly responses are from the same source family, not independent validation.

## UI, AI, mapping and security

- Added bilingual inference cards, expandable assumptions, keyboard-accessible native details, responsive one-column layout and LTR numeric values within Arabic text. Retained the existing design and globe rather than introducing another heavyweight dependency.
- Inspected the rendered English and Arabic trend panel in the cloud Chromium browser. The source-based Muscat results were visible. The external basemap was unavailable in this environment; its coordinate-only fallback correctly identified itself and preserved point locations. This is not proof that administrative polygons or the 3D interaction rendered successfully.
- Fixed a confirmed AI state-management defect: changing the question invalidated the same token used by model download, preventing its completion from clearing the loading state. Separate tokens now track download and generation. Users can cancel a download and release the worker. Stale generated replies remain discarded.
- Free WebLLM remains optional; no paid model service was enabled. Numerical calculations remain deterministic. The small local language model can still hallucinate; its output remains labelled unverified.
- Existing Worker input validation, upstream time/size bounds, security headers, allowlists and rate-control tests were retained. `npm audit` returned zero known vulnerabilities in the current lockfile. This is not a complete OWASP audit or a penetration test. Existing CI actions are tag-pinned, not all SHA-pinned; rate limits are approximate per POP, not user authentication. Existing observability enables logs, but traces were not enabled in this release.
- Dependencies and licences: 22 repositories compared; retain existing stack. See OPEN_SOURCE_COMPARISON.md and third-party-notices.txt. NCSI geographic reuse terms and complete third-party media attribution remain release-review items.

## Test and measurement evidence

Local baseline: 158/158 tests, build and bundle budget passed. Updated: 165/165 unit tests, protected science integrity 11/11, TypeScript, Vite build and bundle budget passed. `qa.txt` preserves output. Initial entry remains approximately 291 KiB uncompressed; the isolated opt-in WebLLM worker remains approximately 5990 KiB. These are bundle sizes, not load-time measurements.

CI workflow `scientific-readiness-v39.yml` runs Chromium desktop, emulated Pixel Chromium and emulated iPhone WebKit against the built application. New browser tests check the HAC panel, Arabic numeric direction, narrow layout, insufficient-data handling and the paired-case result. Paired browser testing replays a preserved NASA response and is labelled accordingly. The separate raw-source retrieval is the live-data evidence. Consult CI_RESULTS.md for final workflow status.

No physical iPhone/Android was available. No measured real-user LCP, INP or CLS, Lighthouse audit, GPU FPS, memory profile, Firefox acceptance, actual model download/inference, full accessibility audit or external user study was completed. I cannot verify these targets. Do not turn a passing size budget or emulation test into a claim of those results.

## Before/after evaluation

The previous 74/100 was an explicitly subjective simulation in COMPETITION_REVIEW.md, not a measured baseline. No independent judge or calibrated numerical rubric is available, so a new precise score would be misleading. The requested 90/100 in every category is **not established**.

| Criterion | Baseline evidence | Final evidence | Outstanding weakness / 90 target |
|---|---|---|---|
| Scientific correctness | OLS plus descriptive diagnostics | Independent HAC/MK oracle checks; paired test; 78 source matches | Rain units/anomaly, short-series assumptions, no ground validation; not established |
| UI/UX | Existing bilingual dashboard | New bilingual uncertainty panel rendered | No user study or complete interaction audit; not established |
| AI usefulness | WebLLM architecture, deterministic fallback | Loading cancellation/state fix | Real inference and Arabic quality unverified; not established |
| Mapping accuracy | Coordinates and structural checks | Existing checks preserved; fallback observed | Live polygons, Madha/islands topology and reuse rights not fully validated; not established |
| Security | Existing boundary tests and headers | Tests pass; zero known lockfile advisories | No comprehensive penetration test; not established |
| Performance | Bundle budgets | Budgets pass, no new runtime dependency | LCP/INP/CLS, GPU and memory not measured; not established |
| Mobile usability | Prior emulation report | Current CI emulation tests | No physical devices; not established |
| Accessibility | Native labels, focus/RTL support | New semantic details, numeric direction | Full contrast/screen-reader audit absent; not established |
| Source transparency | Existing CSV evidence lab | Fresh raw responses, source hashes and bounded findings | Unit discrepancy and geography licence review remain; not established |
| Reproducibility | Repository reproducible; attached ZIP incomplete | Complete package, oracle script, fixtures, raw data and manifest | Python oracle needs documented packages; external services can revise; no 90 score claimed |

Competition simulation categories remain unscored in this review: impact lacks measured adoption; creativity lacks independent comparison; scientific validity retains the issues above; challenge relevance is documented against official questions; presentation has a reproducible three-minute case but no judge/user validation. None is asserted to have reached 18/20.

## Release and rollback

The release ZIP is for Cloudflare Workers (SPA assets plus API), not a static Pages upload. Use Node 22, `npm ci`, `npm run qa`, `npm run preview:node`. Windows `DEPLOY_WINDOWS.cmd` runs QA then deploys explicitly to `oman-earth-intelligence-preview`; it does not target the practice Worker. No secret is bundled. A deployment-ready ZIP is not evidence of deployment.

Before any future release, re-read Cloudflare's current deployments. The observed preview rollback version is `2e1b4ae1-c0b6-40a6-ae0d-8ea4becfadce`; it may no longer be the current version later. If promoting this build causes regression, restore the previously recorded version using Workers version rollback. Do not delete resources, change production bindings or enable billed AI. The practice site remains untouched.
