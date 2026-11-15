# Oman Earth Intelligence — Design System Master (Refined)

> Status: proposed UI/UX design specification, not an implemented code change.
> Project: Oman Earth Intelligence — NASA-powered geospatial climate intelligence.
> Applies to the existing React / TypeScript / Vite website. Prioritise existing functionality, scientific integrity and accessibility over decorative effects.
> If a page-specific file is present, apply its rules only when consistent with the scientific, accessibility and security requirements here.

## 1. Product identity and experience

- **Category:** bilingual scientific geospatial analytics platform, not a sales website.
- **Visual direction:** premium space-mission-control interface, midnight/navy surfaces, cyan data accents, restrained warm amber emphasis, polished but never visually noisy.
- **Primary user journeys:** enter the experience; explore Oman on an interactive geographic map; select a place, scientific metric and time span; inspect NASA POWER observations and trends; compare two locations or periods; verify source evidence; ask the integrated scientific assistant by text or voice where supported.
- **Navigation:** preserve the existing implemented routes and scientific tools. Make the core path to Explorer prominent. Do not add Contact Sales, Login, business-industry categories or client logo carousels unless genuine requirements later call for them.
- **Trust:** identify the dataset, unit, geographic scope, timeframe, missing-data status and verification status alongside scientific outputs. Avoid claims of national spatial averages based on a single grid point.

## 2. Colour system

Use design tokens rather than hard-coded colours scattered through JSX and CSS. The following palette is a proposed dark-mode direction, not evidence of existing CSS values.

| Token | Hex | Role |
|---|---|---|
| `--color-background` | `#081525` | Primary page background |
| `--color-surface` | `#112438` | Cards / panels |
| `--color-surface-raised` | `#1A344A` | Elevated / selected surfaces |
| `--color-foreground` | `#F2F7FB` | Primary text |
| `--color-muted-foreground` | `#B9CAD7` | Secondary text |
| `--color-border` | `#365468` | Dividers and boundaries |
| `--color-primary` | `#64DDEB` | Links, highlighted data and primary control |
| `--color-on-primary` | `#06212B` | Primary control text |
| `--color-accent` | `#F4C176` | Restrained emphasis / secondary highlight |
| `--color-on-accent` | `#241400` | Accent control text |
| `--color-success` | `#77D7B8` | Verified / positive states |
| `--color-warning` | `#FFD48A` | Caution / incomplete evidence |
| `--color-danger` | `#FF9E9E` | Error / destructive warnings |
| `--color-focus` | `#A0EFFF` | Keyboard focus ring |

- Validate actual text/background combinations against WCAG contrast: at least 4.5:1 for normal text and 3:1 for large text and non-text UI affordances where applicable. Never infer contrast from colour names.
- Keep scientific series distinguishable by colour **and** marker/dash/labels; do not rely on colour alone.
- Use semantic warning colours for scientific uncertainty, rather than treating warnings as aesthetic accents.
- Preserve existing map imagery and NASA source textures; do not recolour data rasters in ways that misrepresent measurements.

## 3. Typography and bilingual layout

- Arabic-first UI when Arabic is selected: use a readable Arabic-capable stack such as `"Noto Sans Arabic", "Cairo", system-ui, sans-serif` with an installed or loaded font only when it is available and compatible with CSP.
- English UI: `"Inter", system-ui, sans-serif`; numeric technical labels can use `"Fira Code", Consolas, monospace` sparingly.
- Avoid Fira Code as the default heading font and Fira Sans as the sole body font for Arabic.
- Respect `dir="rtl"` for Arabic and `dir="ltr"` for English at the appropriate layout scope. Keep coordinates, year ranges, unit abbreviations, code, and URLs bidirectionally isolated as needed.
- Use font sizes that remain legible on narrow screens; labels, axis ticks, legends and tooltips must not become tiny to force more data into view.

## 4. Layout, spacing, and responsive behaviour

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 px; use CSS tokens.
- Desktop: clear top navigation, strong content hierarchy, resizable-feeling map/chart area where feasible, adjacent control panel with sufficient whitespace and readable legends.
- Tablet: collapse secondary panels without hiding essential metric, year or comparison controls.
- Mobile: single-column layouts, collapsible filter groups, readable chart labels and legend, no horizontal viewport scrolling or obscured map controls; controls remain touch-friendly.
- Minimum verification widths: 375, 768, 1024, 1440 px, plus a narrow 320px smoke test if the existing product supports it.
- Prefer `minmax()`, Grid and Flexbox over fixed-width panels. Fixed/overlay UI must not obscure the map, navigation, assistant panel or fullscreen-exit controls.
- Data-dense does **not** mean minimal padding everywhere: use information density with progressive disclosure and clear grouping.

## 5. Component rules

### Navigation and landing
- Preserve existing intro/3D Earth entry where functional; provide immediately accessible text and navigation, even if WebGL is slow or unavailable.
- Avoid mandatory waits, oversized hero content or sales-driven calls to action. Use mission-relevant entry labels such as "Explore Oman" / "استكشف عُمان".
- Keep user-visible active route state and accessible focus movement.

### Scientific controls and cards
- Standardise cards and filters; apply consistent headings, borders, labels and hover/focus states.
- Only actual controls should use `cursor: pointer`; static informational cards must not falsely appear clickable.
- Clearly show selected location, coordinates, date range, metric, units, source status and data availability.
- Use skeletons or status text for loading, distinct empty/error/missing-data states, and a recovery path.
- Avoid decoration that competes with temperature, humidity, precipitation and trend interpretation.

### MapLibre / globe
- Preserve longitude/latitude positioning, real administrative boundaries, Oman coverage including disconnected territories, layer controls and existing geospatial validation.
- Do not replace geographic geometry with CSS percentage positions. Do not alter CRS conversion or source endpoints as part of a design refresh.
- Keep map legends and overlay controls accessible, responsive and discoverable; maintain fullscreen entry/exit behaviour.
- Respect WebGL context-loss fallback and reduced GPU capability on mobile.

### Charts and comparison
- Accurate axis scales, labels, units, uncertainty and year interval representation are mandatory.
- Provide hover + keyboard-accessible data inspection, and a text/table alternative for charts where appropriate.
- Never generate or smooth data to fill missing years silently. Maintain verified NASA values, original CSV and independent verification evidence unchanged.

### AI voice/text assistant
- Preserve bilingual Arabic/English input and output design, distinguish text answers from verified calculations and show processing / error states.
- Make the microphone control discoverable, label its recording state and permission requirements, and never imply voice synthesis or generative model access is configured unless confirmed in the actual deployment.
- Do not create new AI API keys or add remote model services while implementing visual changes.

## 6. Interaction and accessibility

- Provide visible `:focus-visible` state on all keyboard controls; target 3:1 for focus indicators against adjacent colours.
- Maintain semantic HTML, labels, descriptive buttons, accessible chart descriptions and appropriate `aria-live` status regions.
- Use 150–250ms microinteractions sparingly; never animate layout in a way that shifts panels unexpectedly.
- Respect `prefers-reduced-motion` and provide meaningful non-animated fallbacks; do not hide information behind cinematic effects.
- For moving media, offer accessible pause/stop where required; suspend work when offscreen/hidden.
- Test navigation, search/filter, map control, assistant and download flows with keyboard and touch.

## 7. Technical boundaries — non-negotiable

- Inspect the current component and CSS architecture **before changing it**. Extend rather than rewrite functional logic.
- Remain within the existing React / TypeScript / Vite / Cloudflare Worker stack; do not add heavy UI frameworks or paid third-party services solely for appearance.
- Preserve NASA POWER endpoints, geospatial coordinate conversions, map data provenance, scientific calculations, source verification, CSV/ZIP exports, security headers, input validation and existing API routes.
- Do not change model configuration, Worker secrets, authentication, CSP or deployment configuration without a separate technical requirement and verification.
- Do not alter actual NASA measurements, fabricate data points, or silently change scientific units/labels.
- Do not deploy to Cloudflare production as part of a local design upgrade.

## 8. Recommended implementation sequence

1. **Audit:** identify existing CSS tokens, components, routes, responsive issues and visual conflicts. Record current baseline screenshots where possible.
2. **Tokens and typography:** implement coherent dark palette and bilingual type scale with fallbacks; avoid breaking current theme logic.
3. **Layout components:** improve global shell, navigation, content spacing, filters, cards, panels, mobile states and focus affordances.
4. **Scientific views:** refine map overlays, charts, comparison and verification lab without changing calculations or scientific data.
5. **Assistant and intro:** polish placement and states, preserve functional AI/voice configuration and all existing 3D fallbacks.
6. **QA:** run existing `node --test`, `npm.cmd run build`, available browser checks and visually inspect 375/768/1024/1440 widths, RTL and LTR. Fix regressions before claiming completion.

## 9. Definition of done

- Consistent, premium, NASA-inspired bilingual dark interface with readable scientific output.
- No enterprise-sales or login sections added by a generic template.
- No overlapping panels, clipped content, inaccessible keyboard controls or mobile horizontal scroll.
- Stable NASA source data, units, maps, charts, verification features and export logic.
- All baseline tests continue to pass; build passes; failures and skipped checks are reported plainly.
- Changes are limited to the local test project until explicitly approved for deployment.

