# NASA Verification Lab — v3.2

## الهدف | Purpose

مختبر قابل للاستخدام داخل Oman Earth Intelligence للتحقق من القيم السنوية التي يعرضها الموقع من خلال **طلب منفصل حديث إلى NASA POWER**. لا تُعد بيانات الموقع ناجحة تلقائيًا؛ تبدأ حالة المختبر **Not checked** ولا تتحول إلى Matched إلا بعد المقارنة الفعلية لكل سنة.

A real in-app independent numeric verification workflow. The results are not labelled verified until a new server-side NASA POWER request has succeeded and all values have been reconciled.

## الوظائف المنفذة | Implemented

1. Route `/#verify` and navigation from the cinematic homepage, dashboard, charts, and location-comparison page.
2. Same location/variable/year selection as existing dashboard, including first and second locations.
3. Source side uses unchanged website series (`metricSeries` + existing quality exclusions), or a user-uploaded **website CSV** parsed locally and spatially checked.
4. Verification side fetches NASA's original monthly endpoint **directly from the Cloudflare Worker**, not from snapshots or `/api/power` cache. Single parameter, same coordinates, `community=AG`, same year range.
5. Comparison uses NASA's published annual value for each year (`YYYY13`). No annual averaging or re-estimation is done by the lab.
6. Decimal tolerance: absolute difference <= 0.01 unit. Missing on both sides counts as *missing*, not a match. Annual numeric differences and missing values are shown separately.
7. Per-year results, independent timestamp, source URL, report download, and clear warning that NASA source agreement is not a ground-station or whole-governorate validation.
8. `GET /api/nasa-csv` obtains the actual `format=CSV` body from NASA and serves it as a browser download without reformatting. A separate link opens NASA's source CSV URL directly.
9. Upload of *website-formatted* CSV, up to 1 MB, handled only in browser memory. Required headers: `Year`, selected metric, `requested_latitude`, `requested_longitude`. The uploader does not accept NASA's multi-line raw monthly CSV as a site export.
10. No changes to NASA source datasets, site statistical formulae, coordinate catalogue, or existing NASA normalisation. SHA-256 manifest: `docs/SCIENTIFIC_INTEGRITY_v3_2.json`.

## Frontend routes

- `/#home` — cinematic intro
- `/#explorer` — map and results, with **Verify this result** link
- `/#trends` — time series and verify link
- `/#compare` — both site series and **Verify both with NASA**
- `/#verify` — standalone bilingual verification laboratory

## Backend endpoints

`GET /api/verification?lat=23.5946&lon=58.7351&metric=T2M&start=2000&end=2025`

Returns `sourceUrl`, `metric`, `latitude`, `longitude`, `start`, `end`, `unit`, `retrievedAt`, `annualField="YYYY13"`, `cached=false` and `years:[{year,value}]`. NASA upstream errors are returned as non-success, not disguised as verified data. The response is `Cache-Control: no-store`.

`GET /api/nasa-csv?lat=23.5946&lon=58.7351&metric=T2M&start=2000&end=2025`

Returns original NASA CSV (`format=CSV`) as `Content-Disposition: attachment`, without changing numeric content, after content checks. The response is `Cache-Control: private, no-store`.

Allowed metrics: `T2M`, `RH2M`, `PRECTOTCORR_SUM` only. Existing backend bounds apply: Oman area, years 1981–2025, maximum 46 years. UI limits selection to 2000–2025, matching existing application.

## اختبار محلي | Local check on Windows

Unzip the project. In PowerShell inside the directory containing `package.json`, run one command at a time:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
npx.cmd wrangler dev
```

Open `http://127.0.0.1:8787/#verify`, choose Muscat East / `T2M` / `2000–2025`, and click **Verify against NASA**. Try both a matching series and an uploaded CSV with a modified value. The API requires outbound NASA access. Then test another point using **Live API on dashboard**.

When the app looks correct, publish with:

```powershell
npx.cmd wrangler deploy
```

Production URL as configured: `https://oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev/#verify`

## Interpretation / scientific limitations

- Numeric agreement means the website's annual values correspond to a fresh NASA POWER response at the *specified reference coordinate*, not independently measured station values or governorate-wide means.
- For `PRECTOTCORR_SUM`, preserve NASA's own reported units and existing rainfall integrity warning. The lab does not modify, remove, or reinterpret anomalous rainfall observations.
- A separate NASA download may contain **monthly and annual columns**; it is not the same CSV layout as a website export, and the two files should not be compared line by line. The lab compares the official annual `YYYY13` values.
- NASA can refuse or rate-limit requests. That returns an explicit error and no successful verification badge. Consider Cloudflare rate limiting/WAF rules if publicly promoting the endpoint.
- Per-user location comparison verifies A and B **individually**. Even if both match NASA, equality of their spatial series does not imply independent measurements.
- An imported CSV is used *locally*; it does not replace scientific data stored by the application.

## Check status

- Local automated Node tests: **64/64 passed** (includes 14 new verification lab tests).
- Static React/TSX syntax transpilation checks: passed.
- Full production build `npm.cmd run build` and real mobile browser inspection **must be executed on the Windows development machine**; dependencies could not be installed in the build environment used for this package.

Official documentation: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
