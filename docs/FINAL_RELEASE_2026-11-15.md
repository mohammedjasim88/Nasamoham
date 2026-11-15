# Final release — 15 November 2026

The existing application was built and deployed to **oman-earth-intelligence-preview**. No application feature, design or dependency was added or upgraded during finalisation. `oman-earth-intelligence-practice` was not deployed to. Publishing this release does not submit it to NASA.

## Delivery

- Live release: https://oman-earth-intelligence-preview.muhammed-10alajmi.workers.dev/
- Repository: https://github.com/mohammedjasim88/Nasamoham (private).
- Release branch: https://github.com/mohammedjasim88/Nasamoham/tree/release/final-2026-11-15
- Source parent: `87c496dbc8f75ac14ed655066d764d488a7a4591`. Release publication preserves that history on a separate branch; existing branches are not force-pushed or deleted.
- Worker version: `b375a401-9154-4f78-bd9b-2beff1b33821`.
- Deployment: `f14fcc5e-991b-4c94-94e4-6e1bbed3a126`.
- Submission archive: `release-artifacts/Oman_Earth_Intelligence_Final_2026-11-15.zip` in the original workspace. Its accompanying `package-verification.json` records archive hash and entry verification.

## Executed checks

| Check | Actual result |
|---|---|
| Installed dependencies | `npm ls --depth=0` succeeded with the existing lockfile versions; no dependency upgrade |
| TypeScript | PASS: `npm run typecheck`; also part of `npm run qa` |
| Production build | PASS: TypeScript + Vite; generic large-chunk warnings retained |
| Unit tests | PASS: 205/205, zero failures; rerun after the release-tooling corrections |
| Scientific integrity | PASS: all 11 protected scientific/source files retain their historical SHA-256 values |
| Bundle/Cloudflare asset budget | PASS: existing budget command; largest generated file below the 25 MiB Workers static-asset limit |
| Repository heuristic secret scan | PASS after Windows path correction; not a comprehensive security audit |
| Worker dry run | PASS: 43.53 KiB bundled Worker with ASSETS, NASA_RATE and AI_RATE |
| Actual local workerd startup | PASS: server ready on port 8788; HTML/status 200, invalid coordinates 400, unknown API 404 |
| Existing desktop/mobile Chromium tests | 90 passed, 4 skipped; both Chromium projects completed before the WebKit segment |
| WebKit rerun after HTTP-preview correction | 24 passed, 3 failed; stopped at configured maximum failures, leaving 20 unexecuted |
| Public release HTTP/API | PASS: 5/5 after deployment; HTML/SPA/status 200, invalid coordinates 400, unknown API 404 |
| Local/deployed frontend identity | PASS: all 38 publicly served build files matched SHA-256; `_headers` is configuration, not a served asset |
| Live NASA POWER | PASS: 26 annual Muscat T2M observations retrieved; year 2000 matched the existing baseline |
| Live NCSI geography | PASS: 11 governorate and 63 wilayat polygons passed existing structural checks |
| Arabic/English, charts, assistant and layout | Covered by executed Chromium and passing WebKit cases; screenshots use synthetic UI-test values |
| Real microphone/dialect quality, full WebGPU generation, physical devices and map-tile rendering | NOT VERIFIED by this release |

The first browser batch exposed a local HTTP-preview CSP issue and was interrupted after the Chromium projects. The affected WebKit cases passed after correction; the subsequent three failures remain failures. No complete all-browser green run is claimed. The local-preview correction does not change deployed frontend files or Cloudflare headers.

## Minimal corrections

1. `scripts/repo_safety_check.mjs`: use `fileURLToPath` instead of URL pathname, fixing the doubled Windows drive path. Exclude local audit/release-artifact directories from the source scan.
2. `scripts/local_node_preview.mjs`: omit only `upgrade-insecure-requests` from HTTP loopback CSP responses. WebKit previously attempted HTTPS against the HTTP-only server. Deployed `public/_headers` remains unchanged.
3. Restore omitted existing `.github` configuration and blank `.env.example`; supply `.gitignore`, current release metadata, source checksums and submission documentation. No secret/private environment file is packaged.

## Remaining failures and limitations

- WebKit: real eSpeak-NG English and Arabic tests did not observe successful playback within their 10-second predicate timeout. Root cause was not established; Safari audio has not passed.
- WebKit: the existing Control+K test did not open Quick navigation. The navigation button remained visible in its failure snapshot. Root cause was not established.
- Twenty remaining WebKit cases were not executed after the three-failure stop. Physical iPhone/Safari performance remains unverified.
- Browser-runner networking could not reach some fonts/local upstream boundaries. Separate live-Worker NASA/NCSI checks passed; this does not certify all tiles, alignment or upstream availability.
- NASA grid estimates are not stations or administrative averages. Precipitation units/2024 anomaly and short-series inference caveats remain.

## NASA portal steps still required

The official challenge is [Be An Earth System Trend Detective!](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/). Published [participant legal terms](https://www.spaceappschallenge.org/legal/) require original content to be freely available without restriction or appropriately open licensed. The repository is private; no original-code licence was selected on the owner's behalf. Resolve judge access, original-code licensing and third-party obligations, including eSpeak-NG redistribution/source obligations.

Disclose substantial pre-event preparation and AI assistance accurately. Prior-work eligibility is not established here; confirm with organisers/portal. Complete the official team project form with judge-accessible source, live site, references, demo and disclosures, submit and retain confirmation. No NASA account or submission was changed.

**NASA submission readiness: NOT READY** until owner/portal steps and accepted runtime limitations are resolved.

## Reproduction and evidence

Use `SUBMISSION_README.md`, `package-lock.json`, `npm ci`, `npm run qa`, then `npm run preview:node`. The ZIP contains necessary source, assets, tests, configuration, existing workflows, notices and documentation. Generated `dist/`, dependencies, Git metadata, browser profiles, caches, raw Wrangler debug logs, temporary files and credentials are excluded. `SHA256.json` verifies package files. Historical scientific digest manifests were not regenerated.

Executed command evidence and deployment/build identity are in `docs/final-release/`. Earlier reports describe previous versions.
