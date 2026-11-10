# Verified CI results

Application/test commit: `ac895c79f3ec19721c9d7ece663bee97ce29b0db`.

Run: https://github.com/mohammedjasim88/Nasamoham/actions/runs/42903240404

- Outcome: success (all job steps, including release packaging and artifact upload).
- Scientific integrity: 11/11 original protected files unchanged.
- Unit tests: 165 passed, zero failed, zero skipped.
- TypeScript / Vite / bundle budget: passed.
- Playwright: 31 passed, 2 skipped, 57.0 seconds. The two skips are phone-only tests under the desktop project, not failed checks disabled after the fact.
- Environments: Ubuntu GitHub Actions; Chromium desktop, emulated Pixel Chromium, emulated iPhone WebKit.
- No real-phone or actual WebGPU inference claim. The paired UI test replays a preserved NASA response; source comparisons are separately documented.

Subsequent documentation/packaging changes retain this application source. The branch's latest CI status must be checked for the final commit; this historical run is not silently relabelled with another SHA.
