# Oman Earth Intelligence — responsive geography and Figma review

Date: 4 November 2026 (Asia/Muscat).
Status: implemented and validated in isolated Cloudflare preview; new production approval pending.

Preview: https://154c2598-oman-earth-intelligence-practice.muhammed-10alajmi.workers.dev/
Preview version: 154c2598-6d4a-42d9-9fd1-b292b079df2d (12).
Production remains: 0bb77cc4-311a-4a14-a4a0-a59932559ee9 (11), deployment 997d08ce-de4b-4c45-86c5-6bb68fc234b6.

## Confirmed problems and changes

1. Without WebGL2 the previous map fell back to a coordinate plot without country outlines, even when the existing NCSI service worked. Added an SVG geographic reference using that same endpoint. All 11 governorate geometries, holes and disconnected territories are preserved in display paths. A single Mercator projection positions both geometry and location points; no scientific coordinates or measurements are changed. SVG does not require WebGL or a paid basemap key.
2. A renderer that failed after creation could retain GPU/network work while the fallback was visible. The failed MapLibre renderer, markers and requests are now disposed/aborted before fallback rendering; the temporary WebGL probe releases its context.
3. The homepage advertised dragging/keyboard interaction even when a static Earth was displayed. The hint now appears only when the 3D renderer reports ready. A lost Earth context stops its animation loop; context-acquisition exceptions fall back safely.
4. Location names in the old coordinate plot could overlap. The geographic reference labels only the selected point, retains keyboard-selectable markers, and provides a separate 44px-minimum location selector. The reference's source/context, controls and data each have separate layout space.

If NCSI is unavailable, the explicitly labelled coordinate-only fallback remains. This is not an offline geographic database. Wilayat outlines still require the full WebGL map; the reference explains this. Geographic display is not independent legal/topological certification.

## Exact code changes relative to deployed security source

Modified:
- src/components/OmanMap.tsx
- src/components/EarthGlobe.tsx
- src/components/PremiumHome.tsx
- src/styles.css

Added:
- src/components/ReferenceMap.tsx
- src/lib/reference-geography.mjs (display-only, no climate calculations)
- tests/reference-geography.test.mjs

All backend/security modules, public/_headers, wrangler.jsonc, package.json and package-lock.json are byte-for-byte unchanged. No dependencies, bindings, paid services, AI models, DNS changes or WAF changes were introduced.

## Figma work actually completed

File: https://www.figma.com/design/W6tQH3AP6bNmtnI9J8Iq3g

- Editable mobile Home: node 8:120, 390px wide.
- Editable mobile Explorer: node 8:148, 390px wide.
- Existing desktop concepts remain in nodes 5:2 and 5:210; they were not revalidated in this iteration.
- Mobile composition uses existing colour variables and linked button instances; text and geography/chart vectors remain editable. Source-backed NASA imagery is a discrete image, not a flattened screenshot of the UI.
- Source product font DM Sans was asserted on all new mobile text. Mobile chart-title wrapping was corrected after visual inspection. The NASA homepage image fill was repaired using a PNG representation of the existing image; final visual inspection showed it rendered.
- Two prototype connections: Home Start exploring to mobile Explorer, and Back to home to mobile Home. Other menu/button mockups are not claimed as fully wired prototype interactions.
- Identity check returned tier student / Education. A real design edit succeeded after an earlier Starter limit message. No paid upgrade or Figma AI image generation was activated.

This iteration implements the geography/reliability improvements in React. The full alternative Figma homepage/dashboard redesign is a design proposal, not a claim that every proposed visual has already replaced the production UI.

## Actual validation

- Scientific integrity: PASS, 11/11 protected original SHA-256 files unchanged.
- Node tests: PASS, 124/124, zero failures (121 prior tests plus 3 new geometry tests).
- TypeScript and Vite production build: PASS; build 8.46 seconds.
- Bundle budget: PASS; entry approximately 292KiB, largest map chunk approximately 1,074KiB, within existing limits. The lazy-chunk 500kB advisory remains; this is not measured Core Web Vitals.
- Preview HTTP smoke: PASS, 13/13; NASA POWER, verification, boundaries, security headers and input/method/origin/payload checks preserved. AI remains intentionally disabled.
- Preview browser: all 11 SVG boundary paths rendered with WebGL2 unavailable. Selecting Muscat West through both the reference selector and SVG marker synchronised the selected point, controls and dataset context. Arabic RTL worked. No horizontal page overflow at 1363px CSS viewport.
- Captured error entries were browser-extension metadata errors; no application-source error was observed in the captured log.
- Mobile/tablet/Safari browser behaviour remains NOT VERIFIED. The Figma 390px frames were visually inspected, but that is not an actual mobile browser pass. Available browser DevTools were organisation-blocked and attempted zoom did not alter the CSS viewport. No restriction was bypassed.
- Actual 3D Earth and WebGL basemap rendering remain NOT VERIFIED in this browser. The SVG reference is now a working geographic alternative.

## Review and reversible promotion

No new production deployment was made in this iteration. After approval, re-read production deployment/settings and compare the preview bindings, asset routing and headers. Stop if another release changed production. Promote version 154c2598-6d4a-42d9-9fd1-b292b079df2d to 100% on the existing Worker; then verify homepage, geography, NASA data and Lab. If a critical regression is confirmed, restore 0bb77cc4-311a-4a14-a4a0-a59932559ee9 to 100%. Keep the same public URL and free plan.

Local validation: npm ci, then npm run qa. Existing locked dependencies were reused for this run; a separate clean installation was not tested. The existing optional browser suite was not reported as passing.
