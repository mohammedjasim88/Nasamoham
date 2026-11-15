# Open-source engineering comparison — 11 November 2026

GitHub REST observations are preserved in repository-research.json and repository-releases.json. Stars are exact at observation, not quality scores. Open issue counts include pull requests; they do not measure resolution speed. Latest push is not a security guarantee.

| Repository | Stars | Licence metadata | Last push (UTC) | Latest release | Open issues/PRs |
|---|---:|---|---|---|---:|
| [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) | 12061 | NOASSERTION | 2026-11-10T17:09:11Z | v6.17.0 | 307 |
| [Leaflet/Leaflet](https://github.com/Leaflet/Leaflet) | 45905 | BSD-2-Clause | 2026-11-10T19:49:23Z | v1.9.4 | 229 |
| [openlayers/openlayers](https://github.com/openlayers/openlayers) | 12651 | BSD-2-Clause | 2026-11-07T10:34:10Z | v10.11.0 | 891 |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | 118074 | MIT | 2026-11-10T20:06:37Z | r187 | 409 |
| [CesiumGS/cesium](https://github.com/CesiumGS/cesium) | 15939 | Apache-2.0 | 2026-11-10T20:56:04Z | 1.147 | 1693 |
| [vasturiano/globe.gl](https://github.com/vasturiano/globe.gl) | 3225 | MIT | 2026-08-22T20:36:21Z | unverified | 133 |
| [apache/echarts](https://github.com/apache/echarts) | 67703 | Apache-2.0 | 2026-10-13T09:27:20Z | 6.1.0 | 1476 |
| [vega/vega-lite](https://github.com/vega/vega-lite) | 5551 | BSD-3-Clause | 2026-11-07T10:51:22Z | v6.5.0 | 825 |
| [recharts/recharts](https://github.com/recharts/recharts) | 27694 | MIT | 2026-11-10T13:56:07Z | v3.10.1 | 470 |
| [mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) | 19366 | Apache-2.0 | 2026-11-10T09:20:02Z | v0.2.88 | 152 |
| [huggingface/transformers.js](https://github.com/huggingface/transformers.js) | 16411 | Apache-2.0 | 2026-11-10T15:00:24Z | 4.3.2 | 328 |
| [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) | 133947 | MIT | 2026-11-10T20:54:23Z | v0.9.0 | 2596 |
| [ollama/ollama](https://github.com/ollama/ollama) | 186565 | MIT | 2026-11-10T18:42:12Z | v0.40.16 | 4620 |
| [simple-statistics/simple-statistics](https://github.com/simple-statistics/simple-statistics) | 3528 | ISC | 2026-11-09T18:42:21Z | simple-statistics@8.0.0 | 22 |
| [scipy/scipy](https://github.com/scipy/scipy) | 15201 | BSD-3-Clause | 2026-11-10T11:23:46Z | v1.18.1 | 1899 |
| [statsmodels/statsmodels](https://github.com/statsmodels/statsmodels) | 11747 | BSD-3-Clause | 2026-11-10T18:10:33Z | v0.15.0 | 2765 |
| [radix-ui/primitives](https://github.com/radix-ui/primitives) | 19491 | MIT | 2026-10-14T21:52:47Z | unverified | 287 |
| [adobe/react-spectrum](https://github.com/adobe/react-spectrum) | 16025 | Apache-2.0 | 2026-11-09T22:05:38Z | react-aria-components@1.22.0 | 678 |
| [tailwindlabs/headlessui](https://github.com/tailwindlabs/headlessui) | 28821 | MIT | 2026-04-13T16:12:31Z | @headlessui/react@v2.2.10 | 127 |
| [microsoft/playwright](https://github.com/microsoft/playwright) | 99792 | Apache-2.0 | 2026-11-10T20:45:31Z | v1.65.0 | 32 |
| [cypress-io/cypress](https://github.com/cypress-io/cypress) | 51025 | MIT | 2026-11-10T20:02:41Z | v16.3.0 | 1161 |
| [puppeteer/puppeteer](https://github.com/puppeteer/puppeteer) | 95821 | Apache-2.0 | 2026-11-10T18:46:18Z | browsers-v3.2.7 | 193 |

## Selection and compatibility

| Area | Candidates | Decision and cost | Evidence / limitations |
|---|---|---|---|
| Maps | MapLibre, Leaflet, OpenLayers | Retain MapLibre: replacing established coordinate/boundary logic adds regression cost. | Current Vite build passes. Online basemap was unavailable in this browser; coordinate fallback worked. No assertion of physical-phone GPU performance. |
| Globe | Three.js, CesiumJS, globe.gl | Retain Three.js. Cesium is appropriate for extensive geospatial scenes but migration is unjustified for an introductory globe. | Existing geometry/motion unit tests retained. Frame rate and device GPU memory unmeasured. |
| Charts | ECharts, Vega-Lite, Recharts | Use modular ECharts 6.1.0 (Apache-2.0) on demand for the main trend and location-comparison charts; retain SVG as a loading/error fallback and retain the exact two-year point chart. | Adds a separate 564.50 kB / 191.73 kB gzipped runtime chunk. Provides axis tooltips, synchronized slider/inside zoom, keyboard year inspection and a source-value table. Missing annual values remain null gaps; no interpolation. No physical-device performance benchmark. |
| Cinematic motion | Motion, Anime.js, Lenis | Use Motion 14.13.0 (MIT) with async `domAnimation` features for page/heading/card transitions; retain the existing Three.js globe camera and reduced-motion behavior. | Feature chunk is 50.49 kB / 19.76 kB gzipped. Continuous star motion is disabled for reduced-motion, small and constrained devices. No new WebGL or scroll library. |
| AI | WebLLM, Transformers.js, llama.cpp, Ollama | Retain consent-gated WebLLM plus deterministic fallback. | Browser WebGPU differs from native/server deployment. llama.cpp/Ollama require visitor installation or compute hosting; free software does not imply free hosted inference. Arabic model quality and physical-device inference remain unverified. |
| Statistics | simple-statistics, SciPy, statsmodels | Add small transparent JS HAC/MK module; use SciPy/statsmodels as independent test oracles outside browser. | NumPy/SciPy/statsmodels versions recorded in fixture. Python packages are test tooling, not Worker dependencies. No scientific claims from popularity. |
| Accessible UI | Radix, React Spectrum, Headless UI | Retain semantic native controls for this bounded enhancement. | Focus, details, bilingual labels and LTR numeric values added. No full WCAG certification; component-library migration unnecessary. |
| Browser testing | Playwright, Cypress, Puppeteer | Retain Playwright; Chromium and WebKit workflow. | Broad engine coverage is useful; emulation does not establish physical-device acceptance. |
| Provenance/security | Existing Web Crypto SHA-256, Node crypto, Worker validation | Retain platform primitives and evidence archive; do not add a framework. | Fresh raw NASA responses, hashes, independent oracle fixture, npm audit report. No claim of a full penetration test. |

## Licence handling

MapLibre GitHub metadata reports NOASSERTION because its licence file contains multiple notices; the inspected LICENSE.txt includes BSD-3-Clause terms plus embedded MIT/BSD notices. Preserve all applicable notices. MIT/BSD require preservation of notices/disclaimers; Apache-2.0 requires licence/notice retention and applicable modification notices. Motion and ECharts direct-package licence metadata was checked against their installed package manifests. The existing eSpeak-NG 1.0.2 package is GPL-3.0-or-later and its notice is present in `public/licenses/espeak-ng-GPL-3.0.txt`; distributing the bundled voice engine requires complying with that licence. This is not a blanket licence for NCSI geography, map tiles, NASA artwork, or model weights. Those sources require their own attribution/terms review. No candidate source code was copied.

## Measurement boundaries

Only installed project dependencies were audited: npm reported zero known advisories in the current lockfile. Security advisories, issue response times, mobile benchmarks and overhead for every unselected candidate were not independently measured. I cannot verify this. Candidate compatibility is architectural assessment, not a tested integration claim. Existing bundle budgets were measured; see qa.txt. Motion and ECharts are the only dependencies added for this follow-up.
