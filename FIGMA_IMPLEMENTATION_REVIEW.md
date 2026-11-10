# Oman Earth Intelligence — Figma implementation and device verification

4 November 2026, Asia/Muscat.

## Current status

The code now includes the Figma-based homepage and explorer layout, a real-device diagnostic screen, and a corrected geographic transform for the 3D Earth. Local tests and production build pass. **The user subsequently explicitly approved preview-only upload.** The final tested preview is version 15: `27570420-c53f-4457-94c4-e648ed471aaf`. It has no production traffic. The earlier automatic-review rejection was resolved through that user approval; no production deployment was performed.

Existing production: version 0bb77cc4-311a-4a14-a4a0-a59932559ee9.
Final preview: https://27570420-oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev/
Device check: https://27570420-oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev/?device-check=1
Intermediate version 13 (`6fa9ed61-ba33-4984-ab3b-1b07a422184f`) supplied the corrected WebGL/framebuffer evidence and NASA Lab match. Versions 14/15 only corrected desktop navigation CSS. All versions remain recoverable; production stays on version 11.

## What was actually tested

Cloudflare Browser Rendering successfully loaded the existing preview with a 390×844 CSS viewport, mobile emulation and touch capability enabled. Its actual canvas reported three.js r181, 390×255 drawing dimensions and ready state. The saved screenshot visibly shows the NASA-textured 3D Earth and NCSI outline. This is real WebGL browser rendering in a mobile emulation environment; it is **not a physical-phone test** and does not certify touch-drag performance or Safari.

One snapshot attempt timed out during navigation. A later bounded DOMContentLoaded request succeeded. Image responses were chunked to avoid connector string truncation; the saved WebP is the complete successful response. No browser-runtime error scan, measured frame-rate benchmark, thermal test or real-device performance claim is made.

No physical phone/device-cloud connection exists in the currently available tools. I cannot verify physical-device behaviour here. No paid device testing service, subscription or account was created.

## Confirmed 3D geographic defect

The original overlay helper used positive local z for east-positive longitude, while the installed Three.js SphereGeometry UV mapping requires negative z for the NASA equirectangular texture. Inspection of node_modules/three/src/geometries/SphereGeometry.js confirms x=-r*cos(2πu), z=+r*sin(2πu). Substituting u=(longitude+180)/360 gives x=r*cos(longitude), z=-r*sin(longitude).

The screenshot exposed the label/outline mismatch. The new display-only helper uses that actual UV convention. The camera focus now uses XYZ Euler order, longitude -147.5° and latitude 21.5°, bringing the Oman reference coordinate to the camera-facing centre. NASA measurements and statistical calculations are untouched.

Three new tests compare the helper with more than 1,000 actual installed mesh vertices, verify Oman camera centring, and reject invalid coordinates. One old source-regex regression test that explicitly required the wrong positive-z convention was corrected; it was not evidence of geographic correctness. The new functional mesh comparison provides the stronger check.

The corrected build was visually rechecked in mobile emulation on version 13. The label is now positioned over Oman on the NASA texture. The local diagnostic recorded WebGL 2.0, 3 frames, 7 draw calls, a 3072px texture, a 358×350 drawing canvas and a centre RGBA sample [236,255,255,255]. The old version-12 screenshot is retained only as BEFORE evidence. Version 15 shares the same Earth code and adds the final desktop CSS fix.

## Figma and implementation

Figma file: https://www.figma.com/design/W6tQH3AP6bNmtnI9J8Iq3g

- Read the high-fidelity desktop Home (5:2) and Explorer (5:210) design contexts with screenshots before implementation.
- Repaired the desktop NASA image fill and aligned the Home font to the source product font DM Sans. Updated the mobile heading to the same narrative.
- Implemented editorial homepage layout: narrative left / live Earth right on desktop; responsive stacked layout; Figma colours; historical Muscat source strip; three climate cards; scientific exploration actions.
- Home card values come from the unchanged original muscat-east.json 2025 rows, not copied or fabricated constants. Precipitation retains its unit-review warning.
- Implemented horizontal desktop navigation, filters above geography, map beside the scientific rail, wider evidence/chart content, mobile stacking and light-theme safeguards.
- Existing navigation, NASA Lab, charts, comparisons, language/theme controls, security boundaries, SVG reference and live Three.js component remain present.

The implemented Home and Explorer were inspected in the preview. Desktop: narrative/Earth placement, source strip, navigation and map/scientific rail appeared as intended; the desktop nav was corrected from a 344px column to a 56px horizontal row. No horizontal overflow was observed at 1363px. Arabic RTL and all 11 SVG governorate paths worked in the Cloud Browser fallback. Mobile emulation: Home and textured Earth rendered at 390×844; diagnostic scrollWidth=390; the version-15 Explorer reached map-state-ready with a real MapLibre canvas and scientific results present. This is targeted validation, not a full visual regression suite or physical-device certification. Secondary screens were preserved rather than all being redesigned.

## Real-device diagnostic screen

The hosted preview includes /?device-check=1. It mounts the same EarthGlobe component, records rendered frames/draw calls/texture size/canvas size and a same-frame framebuffer pixel sample locally, and downloads a JSON report. Two unchecked user confirmations distinguish physical-phone use and observed drag rotation. No device report is sent to the server. These confirmations were not filled or claimed on behalf of the user.

## Exact files changed in this iteration relative to version-12 source

Modified:
- src/App.tsx
- src/main.tsx
- src/components/PremiumHome.tsx
- src/components/EarthGlobe.tsx
- tests/ux-performance-v31.test.mjs (incorrect longitude assumption corrected)

Added:
- src/components/HomeSnapshot.tsx
- src/components/FigmaExperience.css
- src/components/DeviceCheck.tsx
- src/components/DeviceCheck.css
- src/lib/globe-coordinates.mjs
- tests/globe-coordinates.test.mjs

The prior version-12 ReferenceMap and geometry improvements are also included. All Worker backend/security code, public/_headers, wrangler.jsonc, manifests/lockfile and 11 protected scientific files remain unchanged. No dependency or service was added.

## Final checks

| Check | Actual result |
|---|---|
| Scientific SHA-256 integrity | PASS 11/11 unchanged |
| Node suite | PASS 127/127, zero failures |
| TypeScript | PASS |
| Vite production build | PASS, 9.04 seconds in the full QA run; final CSS build also passed (see final-preview-build.txt) |
| Bundle performance budget | PASS, existing limits retained; advisory for lazy chunks remains |
| Final version-15 HTTP checks | PASS 13/13, NASA POWER/verification, NCSI, headers and rejection cases |
| NASA Verification Lab UI | Version 13: 26/26 T2M annual values matched within ±0.01; final CSS-only navigation fixes retain the same Lab code |
| Corrected 3D render in mobile emulation | Confirmed on version 13, with saved screenshot and actual framebuffer evidence |
| Corrected 3D transform | Mesh/camera tests pass and post-fix visual inspection completed |
| Figma desktop Home visual check | Passed after source image repair; saved reference screenshot |
| New design desktop/mobile browser check | Targeted preview checks passed as described above; no physical-device claim |
| Physical phone / mobile Safari / touch-drag | Not verified |

## Safe next step

Preview-only upload and the targeted checks are complete. The user can open the hosted device-check link on a physical phone, try dragging the actual Earth, confirm the two local checkboxes only if true, and download the JSON report. This final hardware/touch observation cannot be completed by the remote emulated browser. Production remains subject to a separate explicit approval. No DNS, secrets, plan, WAF or new paid service was changed; Cloudflare confirmed bindings, headers and routing unchanged.

Until a later explicit production approval, keep production at version 11. If a later approved release causes a critical regression, restore that retained version on the same Worker.
