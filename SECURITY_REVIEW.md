# Oman Earth Intelligence — security review and deployed hardening

**Date:** 4 November 2026, Asia/Muscat.  
**Status:** deployed after explicit conditional approval; Workers Free confirmed in the user-provided billing screenshot. No paid service activated.  
**Production:** https://oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev/  
**Production version:** `0bb77cc4-311a-4a14-a4a0-a59932559ee9` (100% traffic).
**Rollback version retained:** `f8fdcfd3-c93c-46dd-98ee-e0fced689e73`.  
**Production deployment:** `997d08ce-de4b-4c45-86c5-6bb68fc234b6`, created 2026-11-03T21:22:27.753363Z.  
**Final review preview:** https://0bb77cc4-oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev/  
**Preview version:** `0bb77cc4-311a-4a14-a4a0-a59932559ee9` (version 11).

## Executive assessment

The review identified six confirmed hardening gaps, principally availability controls and input/error handling. No Critical or High-severity exploit was confirmed. Local reproductions, tests and low-volume preview requests establish the findings below; they are not evidence of an exploited production compromise. The application is a public climate-data explorer with no user accounts, database, session cookies or privileged user actions in the inspected code. Authentication, IDOR and cookie-authenticated CSRF requirements therefore do not apply to the current feature set.

The improvements are limited to API transport/security boundaries, the existing rate-control module and security headers. All existing frontend source files, dependency manifests/lockfile, scientific transformations, original CSVs and numerical snapshots remain unchanged. No secret rotation, DNS change, production WAF mutation, new paid service or GitHub dependency was introduced.

## Findings and before/after evidence

Severity is contextual engineering judgement, not a CVSS assessment. **Fixed means implemented in the deployed version 11.** Local tests establish individual controls; the post-deployment smoke checks confirm the production boundary responses.

| ID / severity | Confirmed evidence and exposure | Before | After | Status |
|---|---|---|---|---|
| SEC-01 / Medium | AI request parsing buffered the body before checking its length. Verification limits were also checked after buffering upstream bodies; ordinary NASA and NCSI reads had no streaming byte budget. The AI path is currently disabled; active upstream paths still had this weakness. Local reproduction read all 20 synthetic chunks / 5,120 bytes before rejecting the request. | Allocation preceded rejection. | Incoming enabled-AI bodies are capped at 2,048 bytes while streaming. Upstream JSON/CSV/geography have bounded reads, including chunked bodies and Content-Length checks. | **Confirmed and fixed — production** |
| SEC-02 / Medium | Existing upstream timers were cleared when response headers arrived, before `text()`/`json()` finished. Inspected code and a synthetic stalled-body test demonstrate the coverage gap. No slow-response attack was performed against production. | Body reads could outlast the configured connection timeout. | A deadline covers connection and complete body reading; abort/cancellation handles oversized or slow responses. AI waiting is bounded separately. | **Confirmed and fixed — production** |
| SEC-03 / Low | Unknown/duplicate keys reached upstream code, invalid boundary levels silently selected governorates, and POST `/api/status` returned 200. Local evidence is in `before-reproduction.json`. | Permissive coercion and ambiguous request shapes. | Per-route allowlists, duplicate rejection, bounded URL/query lengths, explicit methods/Allow headers, strict coordinates/year/metric/level rules and enabled-AI JSON schema/type checks. | **Confirmed and fixed — production** |
| SEC-04 / Low | A synthetic upstream exception marker was reflected in the public `detail` field. This proves a disclosure pattern, not exposure of any genuine credential. | Upstream error text was exposed. | Generic upstream failures and stable codes; request IDs support correlation without public stack traces or upstream error strings. | **Confirmed and fixed — production** |
| SEC-05 / Low | Actual production HTTP capture showed CSP/frame controls on HTML assets, but `/api/status` had only nosniff and cache control; HSTS was not present in the observed responses. JSON endpoints are lower-risk than HTML. | Header coverage depended on Static Assets handling. | API responses, errors and throttling are decorated centrally; static HSTS, permissions and form policy are strengthened. Final preview headers were checked over HTTP. | **Confirmed and fixed — production** |
| SEC-06 / Medium | Existing NASA limiter keys were individual routes. Requests could consume separate route budgets for the same upstream; there was no shared NASA budget. There is no verified volumetric DDoS exploit. | Separate route buckets for POWER, verification and CSV. | The existing NASA binding now uses a shared key for those routes, including NASA retrieval by optional AI. NCSI remains separately budgeted; AI retains its own limit as well. | **Mitigated — production.** Approximate POP-local shared budgets are not strict global/per-person quotas; deliberate shared-budget starvation remains possible. |

## Security controls reviewed

| Area | Result / classification |
|---|---|
| SSRF | No arbitrary user-controlled upstream URL was found: existing URL builders already target NASA/NCSI. **Mitigated further** with explicit HTTPS host/path/port/credential checks and `redirect: manual`; redirects are rejected, not followed. Local tests cover private hosts, suffix-confusable hosts, alternate ports, credentials, schemes and wrong paths. No exploitable SSRF was confirmed. |
| Injection / XSS | No SQL, shell execution or user-controlled database query is present. React renders text; map labels use `textContent` and popups use `setText`. No `dangerouslySetInnerHTML`, eval or Function constructor was found in the inspected frontend. **No exploit confirmed**; this is source review plus regression evidence, not a complete dynamic XSS pentest. |
| Authentication / authorisation / IDOR | **Not applicable** to current public data routes: no login, user records, private resource identifiers or administrative route exists in the inspected app. Public access to NASA data is intentional. Adding authentication would change product behaviour and was not done. |
| CORS / CSRF | Foreign/null/confusable origins and cross-site Fetch Metadata requests are rejected. Same-origin browser requests and direct origin-less clients remain supported. No wildcard or credential-enabled CORS is added. **Cookie-based CSRF: not applicable**; no cookie-authenticated state changes exist. Origin checking is not authentication: non-browser clients can omit/spoof Origin. |
| Cache | Validated normalised coordinates/years form canonical keys; tests prove equivalent requests share a cache entry and different coordinates do not collide. Independent verification and source CSV remain no-store. No personalised data is cached. Errors remain no-store. **Mitigated and tested with a cache stub.** |
| Public NASA JSON / evidence | `sourceRawJson` is intentionally available for independent public scientific audit, not a secret. Transport hardening preserves its bytes and original CSV contents. **Confirmed intended exposure.** |
| Secrets | Selected source-pattern scan found no matches for private keys, GitHub/AWS keys or JWT literals. The inspected bindings contain ASSETS and the two rate bindings, with no secret binding exposed in this configuration. **No exposure confirmed**; pattern scanning cannot establish absence of every possible credential. Nothing was rotated. |
| Browser map key | `VITE_MAPTILER_KEY` is a public browser credential by design; no genuine private server credential was found in a VITE variable. Provider account/domain restrictions were **not verified**. Apply provider-supported restrictions if a real map key is added. |
| Dependencies | `npm audit --json` reported **0 known vulnerabilities** in the locked graph. Registry origins in the lockfile were npmjs.org. Install-script flags were inventoried for esbuild, workerd and optional fsevents; no new installation scripts were run in this review. Manifests and lockfile were not changed. This is not proof of supply-chain safety or a manual audit of every dependency's source. |
| Optional AI | **Inactive in production and preview.** Enabled-path tests use a mock binding only: no tools/credentials are sent, evidence/question are separate from system instructions, request size/question length/output length are bounded, max_tokens remains 320, and rejectIfBusy is set. Prompt injection resistance and factual accuracy of a real model are **not verified**. No model was activated or billed for these tests. |
| AI time/cost | Waiting is capped at 15 seconds and shared NASA/AI quotas apply. A Promise timeout bounds caller waiting; it does **not prove cancellation of remote inference or zero charges after a timeout**. |
| TLS / HTTPS | HTTPS requests succeeded. workers.dev termination is Cloudflare-managed; no custom-zone TLS configuration or cipher suite audit was performed. No DNS/TLS settings were modified. |
| DDoS / bots / WAF | No stress test, challenge or CAPTCHA was introduced. Existing Worker rate bindings are retained. Cloudflare-managed volumetric protection was not independently tested. Customer-zone WAF/Managed Rules were **not verified or changed** for the workers.dev hostname. |
| Monitoring | Existing Workers observability/log persistence remains enabled. New application events contain only event, allowlisted route, status and request ID. No query, body, question, IP or upstream exception text is logged by the new logger. Routine 4xx responses are sampled at approximately 1/32; 5xx are recorded. Platform invocation logs are separate and still have `redact_query_string: false`; changing that setting is a recommendation awaiting review. |

## Limits and implementation details

- Query string: at most 1,024 characters; complete URL at most 2,048 characters; only documented keys and no duplicate keys.
- Coordinates: finite ordinary decimal values, up to eight decimal places, within latitude 16–27 / longitude 52–61. Requested coordinates are never rounded to change scientific values.
- Years: 1981–2025, ascending and within the existing maximum interval. Existing frontend 2000–2025 requests remain supported.
- Enabled-AI JSON: at most 2,048 bytes; 5-second body deadline; text question at most 330 characters; explicit types/keys, metric and locale allowlists; no compressed request bodies.
- Upstream POWER: 2,000,000 bytes; independent JSON: 1,000,000 bytes; original CSV: 3,000,000 bytes; NCSI geometry: 12,000,000 bytes. Body limits reject oversized inputs rather than truncate scientific files.
- POWER/NCSI deadline: 16 seconds; independent retrieval: 18 seconds. There are no automatic retries that amplify upstream traffic; the existing UI offers user-controlled retry.
- Existing `NASA_RATE`: 120 requests / 60 seconds per key / Cloudflare location; existing `AI_RATE`: 20 / 60 seconds. These approximate limits and namespaces were not provisioned or increased. The new code changes key grouping only.
- Static CSP keeps approved map providers, fonts and `worker-src 'self' blob:`. Script execution remains self-only, without unsafe-eval/unsafe-inline for scripts. Inline styles remain necessary for React/MapLibre positioning and were not removed blindly.
- HSTS is host-scoped with `max-age=31536000`; no preload or includeSubDomains policy was added.

## Exact implementation files

**Modified:**

1. `worker/index.mjs` — API boundary integration, bounded upstream transport, safe public errors, schema-checked AI input and separation of instructions/data, shared AI/NASA budget checks.
2. `worker/rate-control.mjs` — shared NASA/NCSI/AI key grouping, retaining existing bindings and failure behaviour.
3. `public/_headers` — static HSTS, permissions and form-action policy, preserving map/font/worker resources.

**Added:**

4. `worker/security.mjs` — validation, streaming byte/deadline limits, allowlisted outbound transport, API response headers, safe logging and bounded AI waiting.
5. `tests/security-boundary.test.mjs` — 31 new checks, including nested malformed-query cases; no existing test was removed or weakened.
6. `scripts/security_http_smoke.py` — 13 low-volume preview checks using Python 3 and curl.

`SECURITY_REVIEW.md` and `docs/security-review/` are review documentation/evidence additions. A complete unified patch is included as `docs/security-review/security-hardening.diff`. `package.json`, `package-lock.json`, `wrangler.jsonc`, all frontend sources and all 11 protected scientific files are unchanged from the baseline.

## Actual test results

| Validation | Observed result |
|---|---|
| Scientific audit | **PASS 11/11 unchanged**, original SHA-256 manifest retained |
| Node regression/security suite | **PASS 121/121**, zero failures; 90 existing checks plus 31 security checks |
| TypeScript | **PASS**, tsc --noEmit within production build |
| Vite build | **PASS**, final QA build completed in 11.17 seconds |
| Bundle budget | **PASS**, main ~292 KiB; largest lazy map chunk ~1,070 KiB; existing 500 kB advisory remains |
| Worker bundle/runtime | esbuild bundle succeeded; Cloudflare accepted version 11; API reported 2 ms startup |
| Dependency audit | **0 known vulnerabilities** in npm audit at review time; unchanged lockfile |
| Final preview HTTP smoke | **PASS 13/13**: homepage/status, method/origin/query/payload rejection, unknown route, POWER, independent NASA verification, NCSI and disabled AI |
| Live upstream functionality on preview | POWER returned 26 annual rows; independent check returned 26; NCSI returned 11 governorate polygons |
| Final browser reconciliation | **26/26 T2M values matched NASA within ±0.01** for Muscat east, 2000–2025 |
| Verification engine | Synthetic mismatch/missing self-test passed in the preview UI |
| Downloads | Original NASA CSV and evidence ZIP downloaded from final preview; ZIP CRC32/SHA-256 audit passed (4 evidence files, 1 location) |
| Desktop UI | Homepage, explorer, annual chart and east/west comparison appeared; identical-grid warning retained. Final captured application-error log was empty. Browser automation experienced intermittent transport timeouts, but resulting states were inspected. |
| Maps / Earth | API geometry retrieval passed. This Cloud Browser used the existing coordinate/static-Earth fallbacks; **actual WebGL basemap/Earth rendering was not verified**. |
| Mobile / tablet / Safari | **Not verified. I cannot verify this in the available environment.** No successful mobile viewport test or physical-device test is claimed. Browser zoom did not change the measured CSS viewport. |
| Automated browser suite | Not rerun: this workspace's Chromium launch was already blocked by UNIX-socket restrictions and Playwright browser download was invalid in the earlier session. No E2E-suite pass is claimed. |
| AI UI / real inference | Server's intentional 501 / modelEnabled:false was verified. Enabled-path tests were mocked; real inference and a new manual local-explainer interaction were not tested in this pass. |
| Production preservation | Cloudflare confirmed production routes 100% to version 11. Bindings and API static routing match the baseline; AI binding absent, Logpush false. Version 9 remains available for rollback. |

The evidence directory contains JSON HTTP checks, before reproductions, package audit, secret/install-script inventory, final QA output, source-digest records, final Cloudflare proof and downloaded NASA evidence. No synthetic test result is labelled as a production exploit.

## Production verification

- HTTP smoke: **13/13 PASS**, including valid NASA POWER (26 annual rows), verification (26 rows), NCSI (11 polygons), headers, invalid methods/origins/queries, oversized payload and disabled AI.
- Browser: homepage, navigation, dashboard, annual graph and Verification Lab loaded. Fresh Muscat East T2M reconciliation: **26/26 matched within ±0.01**, 2000–2025.
- Downloads: production original NASA CSV and evidence ZIP completed; offline ZIP CRC32 and SHA-256 checks passed (4 evidence files, 1 location).
- Cost: existing Workers Free plan retained; no upgrade, paid service, AI model or new infrastructure enabled.
- Limitations: no mobile/tablet/Safari pass; no actual WebGL Earth/basemap rendering pass. Shared rate budgets remain approximate and can affect legitimate callers under abuse.

## Cloudflare configuration and plan constraints

The existing hostname is on workers.dev. The authorised zone list returned zero zones. No customer-zone WAF, Managed Rules, DNS, custom domain or TLS controls were changed. Cloudflare documents workers.dev as a Free website environment and recommends routes/custom domains for business-critical production; that does not establish this account's Workers subscription.

The connection cannot read `/accounts/.../subscriptions`: Cloudflare returned a Billing Read permission error and states this endpoint is unavailable to this OAuth connection. The user subsequently supplied a matching-account billing screenshot showing **Workers Free — Active**. This confirms the current plan; usage remains subject to its free-tier limits. The `standard` usage-model field is not evidence of a paid subscription. Existing rate bindings and logging are confirmed operational; no paid security product, extra namespace, storage, AI service or CAPTCHA was introduced.

Version 11 was promoted through the existing deployment API after approval and a fresh configuration/concurrency check. Global WAF, DNS, secrets and billing settings remain unchanged. Intermediate version 10 was never assigned production traffic.

## Approval, deployment and rollback

The user explicitly approved subject to using no paid services. The supplied Workers Free screenshot satisfied that condition; version 11 was promoted without activating paid products. Mobile/WebGL checks remain outstanding on representative devices.

Before promotion, re-read current deployments and settings. If production has changed from `f8fdcfd3-c93c-46dd-98ee-e0fced689e73`, stop and reconcile instead of overwriting another update. Compare the preview's bindings/routes with the current production configuration again. Do not patch WAF, DNS, secrets or global security settings as part of this deployment.

The completed promotion used the existing Worker deployment API, with strategy percentage and:

```json
{"strategy":"percentage","versions":[{"version_id":"0bb77cc4-311a-4a14-a4a0-a59932559ee9","percentage":100}]}
```

Then check the production deployment ID, status/headers, POWER, verification, CSV, boundaries, charts, comparison and desktop/mobile interaction. Do not infer success from the API's deployment response alone.

If a critical regression is confirmed, restore the previous version on the same Worker:

```json
{"strategy":"percentage","versions":[{"version_id":"f8fdcfd3-c93c-46dd-98ee-e0fced689e73","percentage":100}]}
```

The Worker, original URL, original scientific files and version 9 are preserved. No rollback was required: all 13 post-deployment HTTP checks passed, the desktop homepage/dashboard/chart appeared, NASA reconciliation matched 26/26 annual values, and CSV/evidence ZIP downloads completed. The Cloud Browser still used its existing WebGL2-unavailable coordinate fallback; mobile and actual WebGL rendering remain unverified. Captured errors were browser-extension metadata errors, with no application-source errors observed.

For local review: `npm ci` followed by `npm run qa`. Tests/build were run with the existing locked dependency installation; a fresh clean npm ci installation was not separately tested. Run `python3 scripts/security_http_smoke.py <authorised-preview-origin>` for the bounded HTTP smoke check. It intentionally expects AI to remain disabled and is not a load-test tool.

## Monitoring and incident response checklist

1. **Detect:** use the existing Workers dashboard/logs to inspect route request volumes, errors and rate-limit events. Filter application logs on event `api_security`, group by route/status, and correlate the returned X-Request-ID. Sampled 4xx events are not exact traffic totals; use platform metrics for volume.
2. **Triage:** establish whether the issue is upstream NASA/NCSI availability, abusive requests, a deployment regression or exposed credentials. Do not copy prompts, tokens, passwords or private request bodies into tickets/logs.
3. **Contain:** use the existing rollback version if a regression is confirmed. Any emergency WAF/DNS/service disablement requires the user's specific approval; do not invent global blocking rules.
4. **Recover:** restore/verify a known-good version; recheck data integrity and critical workflows, then document the incident and time window.
5. **Credentials:** if a genuine exposure is confirmed, identify the credential owner/scope, obtain explicit rotation approval, rotate through the proper secret interface and verify dependent services. No rotation was necessary or performed in this review.
6. **Improve:** consider query-string redaction in platform invocation logs, per-client fairness/authenticated quotas if abuse occurs, and custom-domain WAF options after plan/zone access is established. Alerting availability and paid thresholds are unverified; no notification service or alert was configured.

## Official references used

- Cloudflare Workers best practices: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- Cloudflare rate-limiting binding (approximate per-location limits): https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Cloudflare workers.dev scope: https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- Cloudflare Workers AI reject-if-busy: https://developers.cloudflare.com/workers-ai/features/reject-if-busy/
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- OWASP Input Validation Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- OWASP SSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html

These measures reduce specific risks. They do not make the website impossible to compromise or prove it is 100% secure.
