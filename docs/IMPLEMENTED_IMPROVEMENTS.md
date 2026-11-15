Implementation and verification — 15 November 2026 (Asia/Muscat)

Actual changes cover 19 source files and five test files. No dependency installation, paid API calls, deployment, or GitHub push was performed.

**Ask AI**

- Retains the last six successful analytical turns in application memory, across dock closure and page navigation. Unspecified locations, metric, years, and discrete-year/period mode inherit the last successful plan. A visible history and New conversation control expose/reset this context. Reloading the app starts a new session.
- Fixes the substring match that interpreted “comparison” as “Paris.” Preserves the requested location order; recognises natural hot/hotter/humid wording; rejects unknown comparison partners, unavailable metrics, and causal questions explicitly.
- Routes the exact English and Arabic follow-ups through numerical evidence instead of the metric glossary.
- View analysis and View chart now carry the successful answer's actual values, units, sources, coordinates, selection mode, and years for pairs, periods, and single years. Navigation does not fetch another dataset.
- Adds an explicit loading view, cancellation feedback, and source-error retry. Failed/cancelled requests do not advance conversation context.
- Separates humidity values (%) from changes (percentage points), aligns location comparisons by calendar year, and refuses subtraction across incompatible units. Endpoint changes remain visible when regression uncertainty is undefined; degenerate variance is distinguished from insufficient observations.
- Keeps NASA's annual ANN values authoritative. Tests verify that monthly values are not silently summed/averaged to reconstruct missing annual values. Source datasets, original CSVs, the existing statistics/evidence modules, NASA normalisation, and verification code retain their protected integrity hashes.

**Voice**

- Adds local recording playback and a clear editable-transcription completion message.
- Rejects silent, too-short, malformed, and oversized audio before model loading/inference. This is input validation, not a claim of speech-recognition accuracy.
- Detaches recorder handlers and stops recording/tracks on cancellation; ignores late transcription and playback results. Transcription failures remove revoked preview URLs and allow recording again.
- Adds actionable microphone-busy feedback and reduces microphone-meter React updates to approximately 10 per second.
- Real bundled eSpeak-NG synthesis/playback was exercised for Arabic and English. Whisper/microphone lifecycle tests use controlled mocks; no actual Whisper accuracy benchmark was run.

**Charts, UI, and local AI**

- Registers ECharts' accessibility component; supplies scientific labels with period and units; distinguishes the second series with diamond symbols; exposes per-year differences with humidity changes in percentage points.
- Uses existing ECharts for source-preserving period/single-year study charts and retains the accessible discrete two-year point chart. Source tables scroll with sticky headers; long periods use compact labels. AI navigation includes clearance for the fixed header.
- Adds reduced-motion-aware assistant opening, answer/loading reveals, and one-time Motion card entrances. The Three.js loop now stops scheduling animation frames while offscreen or in a hidden tab.
- Retains the existing opt-in Qwen2.5 0.5B / SmolLM2 360M architecture. Caps model context at 4,096 tokens, removes duplicate long explanation paragraphs from the model prompt, and retains up to 46 annual rows. Session guards prevent cancelled loads or older generations from interfering with a new worker session.

**Scenario evidence**

| Requested prompt | Verified behaviour | Data used in browser tests |
|---|---|---|
| Compare Muscat temperature in 2000 and 2010. | T2M, Muscat sample East, discrete years only; two evidence rows; no inferred time trend | Existing supplied Muscat source file |
| هل ارتفعت الحرارة في صحار من 2000 إلى 2025؟ | Arabic answer; Sohar coordinates; T2M; inclusive 2000–2025; observed endpoint difference remains available without inferential confidence | Explicit synthetic UI fixture |
| Compare Salalah and Nizwa rainfall. | Both locations, PRECTOTCORR_SUM, inherited period; source-bound values and units | Explicit synthetic UI fixtures |
| Now show the same comparison for humidity. | Both cities and the exact period survive; metric changes to RH2M; chart/table retain the same analytical context | Explicit synthetic UI fixtures |

Synthetic fixtures test processing, arithmetic, and UI state. They do not verify actual NASA climate values or conclusions for Sohar, Salalah, or Nizwa.

**Validation**

- `node --test`: 191 passed, 0 failed, 0 skipped.
- `npm.cmd run test`: 191 passed, 0 failed, 0 skipped. This is the same unit suite, not 382 distinct tests.
- `npm.cmd run build`: passed. Existing warnings remain for the eSpeak dependency's runtime URL/browser externalisation and large lazy-loaded chunks.
- `node scripts/audit_scientific_files_v35.mjs`: 11/11 protected scientific files unchanged.
- Desktop/mobile Chromium regression batch: 49 passed, 0 failed, 1 skipped. The skipped case is explicitly phone-only when executed in the desktop project.
- Final focused checks after the last rebuild: 4 passed, 0 failed (transcription failure cleanup and all four exact prompts with fixed-header navigation, in desktop and mobile Chromium).
- Earlier test failures exposed the “comparison”/Paris match, missing endpoint explanation for degenerate regression, an accessibility label regression, and the protected scientific hash check. They were resolved; the historical integrity manifest was not changed.

Unverified: real Arabic/English microphone recognition and dialect accuracy; actual model inference, speed, and memory use on 8 GB devices; fresh live NASA responses for the three non-Muscat scenarios; Safari/WebKit and physical mobile devices; measured GPU/CPU savings. No new accuracy or hardware performance claim is made.

**Changed source files (19)**

- `src/App.tsx`
- `src/components/AssistantDock.css`
- `src/components/AssistantVoice.tsx`
- `src/components/EarthGlobe.tsx`
- `src/components/InteractiveTrendChart.tsx`
- `src/components/PairStudy.tsx`
- `src/components/PairStudy.css`
- `src/components/PremiumHome.tsx`
- `src/components/ScientificAssistant.tsx`
- `src/components/ScientificAssistant.css`
- `src/lib/assistant-conversation.mjs` (new)
- `src/lib/assistant-study.ts`
- `src/lib/echarts-runtime.ts`
- `src/lib/local-ai-engine.ts`
- `src/lib/local-ai-knowledge.mjs`
- `src/lib/local-ai.worker.ts`
- `src/lib/question-analysis.mjs`
- `src/lib/voice-audio.mjs` (new)
- `src/lib/whisper.worker.ts`

Test files: `tests/assistant-conversation.test.mjs` (new), `tests/voice-audio.test.mjs` (new), `e2e/implemented-improvements.spec.mjs` (new), `e2e/assistant-voice.spec.mjs`, and `e2e/ask-ai-dock.spec.mjs`.

Command logs: `verification-node-test.log`, `verification-npm-test.log`, `verification-build.log`. Browser captures: `test-results/improvements-desktop-chromium.png` and `test-results/improvements-mobile-chromium.png` (explicitly synthetic UI-test data).

Reproduce the desktop/mobile browser regression batch with:

```powershell
node node_modules/@playwright/test/cli.js test e2e/implemented-improvements.spec.mjs e2e/assistant-voice.spec.mjs e2e/trend-chart.spec.mjs e2e/ask-ai-dock.spec.mjs e2e/v38-local-open-source-ai.spec.mjs --project=desktop-chromium --project=mobile-chromium --workers=1 --reporter=list
```

The additional transcription-error case was verified in the final focused run; the complete command now includes that case as well.
