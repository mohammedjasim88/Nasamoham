# v3.1 – UX, performance and geographic correctness patch

**Scope:** user interface, globe projection, initial page loading, device performance and accessibility.

**Scientific and Worker files were not modified.** SHA-256 checksums for all protected source and snapshot datasets are in `docs/SCIENTIFIC_FILES_UNCHANGED_SHA256.json`. The NASA POWER results and statistical formulas are identical to v3.0.

Changes: sphere UV coordinates now align longitude east with Three.js `SphereGeometry` and use correct initial Oman-facing yaw. Intro no longer fetches a climate dataset until a scientific section opens. Globe frame loop is capped to 45 fps desktop / 30 fps narrow viewports; WebGL context-loss restores static poster. Smaller-screen CTA appears before feature cards and the globe visual height is reduced. Added `aria-pressed`/`aria-current` states, browser metadata, and a vector favicon. "Explore Data" becomes "View Data Records" to accurately describe the existing Quality view. Google Fonts are preconnected in HTML.

## Test on Windows
```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
npx.cmd wrangler dev
```
Review `http://127.0.0.1:8787` and the mobile browser. Only after success and visual verification, deploy with `npx.cmd wrangler deploy` (same Worker name). Please back up the current production release first.

**Not confirmed in this container:** fully installed npm environment, real-site WebGL on iOS Safari, Lighthouse metrics, live NCSI response and live NASA requests. No claim of 100% performance is made.
