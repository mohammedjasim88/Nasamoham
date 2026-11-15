Voice transcription failure — 15 November 2026 (Asia/Muscat)

**Root cause: VERIFIED for the reproduced software failure. Physical microphone validation remains outstanding.**

Microsoft Edge reproduced a failure on the existing public site before inference, while downloading:

`Xenova/whisper-base/resolve/64da57285918e20ea79ea5c88eed7197933abaa8/config.json`

The browser reported: “blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.” The worker returned only a generic error. Both the model revision and file exist; direct server-side checks returned HTTP 200. The failure was not established to be a microphone-permission or Stop Recording problem. A separate native Edge check successfully transferred an OfflineAudioContext buffer to a worker.

Before-fix evidence: [live Edge console/network diagnostic](../audit-results/voice-live-before-1794693382150/evidence.json).

**Implemented fix**

- Public model artifacts now download through `/api/voice-model/` on the app's own origin. The route permits GET only, the two existing model repositories, exact pinned revisions, and an explicit file list. It rejects arbitrary URLs, revisions, query parameters, cross-site origins, and unrestricted ranges. It never accepts or forwards microphone audio, questions, caller credentials, or speech-inference requests.
- Model files stream with a size bound and inactivity deadline. Immutable full files can be cached. The one-byte Range requests used for metadata remain one byte and cannot populate the full-model cache.
- Whisper uses the installed CPU-only ONNX runtime, with a same-origin WASM URL. Its binary is 14,264,838 bytes (about 13.6 MiB), replacing the 26,861,777-byte binary that exceeded Cloudflare's 25 MiB static-asset limit. No dependency was installed or upgraded. CSP was not relaxed, and no external runtime CDN is required.
- Transformers v4 performs an initial file-discovery lookup using `main` before forwarding pipeline revision options. The worker now pins the download URL template as well, so that discovery and model loading use the same immutable revision.
- MIME selection prefers a browser-supported Opus/WebM encoder. Recording stops and releases tracks before native decoding, mono downmixing, 16 kHz resampling, validation, and worker transfer.
- The UI identifies microphone access, recording, decoding, validation, worker startup, model configuration/download, runtime loading, and transcription stages. It displays download progress, file name, safe error code, inactivity timeouts, and Retry.
- Retry retains the valid recording/decoded audio instead of requesting the microphone again. Completed files remain cached. Successful workers/models stay warm between recordings; cancellation terminates the active worker and ignores late messages.
- Arabic and English are explicitly passed as transcription languages. Recognized text goes to the editable question field and is never automatically submitted.
- The Node production preview now applies the existing static `_headers`, including CSP. Vite pre-optimizes Transformers to prevent a first-use dependency reload from interrupting recording.

**Validation**

| Check | Result | Scope |
|---|---|---|
| `node --test` | 199 passed, 0 failed | Unit/security/scientific suite |
| `npm.cmd run build` | Passed | TypeScript and production bundle |
| `npm.cmd run test` | 199 passed, 0 failed | Same unit suite, not another 199 distinct tests |
| Voice lifecycle Playwright suite | 24 passed, 0 failed | Desktop/mobile Chromium; microphone/ASR mocks for cancellation, decoder/startup failures, timeout and retry; real eSpeak playback cases |
| Real Edge development run | Pipeline completed | Native recorder/decoder, real Tiny model, generated English speech, retry after an actual aborted download |
| Real Edge production-preview runs | 3 pipelines completed | Actual CSP; English/Tiny, Arabic/Base, same-recording retry and warm worker reuse |
| Scientific integrity audit | 11/11 unchanged | Protected source data, original CSVs, statistics, NASA and verification modules |
| Asset budget | Passed | Every static asset below 25 MiB |
| Wrangler dry run | Passed; nothing uploaded | Existing assets and rate-limit bindings, no paid AI binding |

Real Edge tests use Edge's fake capture device fed a generated WAV. MediaRecorder, audio decoding, resampling, network downloads, ONNX/WASM and Whisper inference are real; they are not replaced with mocked transcription. The tests verify an editable result, released tracks, no automatic submission, no audio-upload POST, and retry/reuse behavior.

**Recognition quality is not validated.** Generated-speech transcripts did not accurately reproduce the complete intended phrases. The integration result means transport/loading/inference/UI completed; it does not establish microphone accuracy, Arabic dialect quality, or a physical-device benchmark. No physical microphone was tested.

Real-inference evidence:

- [Development English/Tiny](../audit-results/real-voice-1794694661001/result.json)
- [Production preview English/Tiny and retry](../audit-results/real-voice-1794695096617/result.json)
- [Production preview Arabic/Base](../audit-results/real-voice-1794695110659/result.json)
- [Production preview retry and second-recording reuse](../audit-results/real-voice-1794695445714/result.json)

Reproduce after starting the corresponding dev/preview server:

```powershell
node scripts/verify_real_voice.mjs http://127.0.0.1:5174 en tiny --retry-download
node scripts/verify_real_voice.mjs http://127.0.0.1:8791 en tiny --retry-download --warm
node scripts/verify_real_voice.mjs http://127.0.0.1:8791 ar base
```

These commands explicitly download the existing free public models for testing. They do not use a paid speech API.

**Manual physical-microphone check still required**

1. Restart any older preview server, then run `npm.cmd run build` and `npm.cmd run preview:node` in this workspace. Open `http://127.0.0.1:8787/#ask` in Edge. The changed voice notice should say public model files download through this site.
2. Select English, click Record question, accept the model download, speak clearly for 5–10 seconds, and click Stop recording. Try “Compare Muscat temperature in 2000 and 2010.”
3. Expect decoding, model/runtime loading with progress, then transcription. Confirm that the microphone stops and the recognized words appear in the editable question field without submitting the question. Listen to the recording and correct any recognition errors.
4. Repeat with Arabic and “قارن درجة الحرارة في مسقط عامي 2000 و2010”.
5. If either attempt fails, provide the displayed stage/code/file, the first red Edge Console message, and the failed Network request's file name and HTTP status. Actual microphone evidence was requested during the task and has not been received.
6. After a deployment you separately approve, repeat this hardware check on the HTTPS site. Frontend and Worker must be published together because the new download route belongs to the Worker.

**Changed files**

- `src/components/AssistantVoice.tsx`
- `src/lib/whisper.worker.ts`
- `src/lib/voice-audio.mjs`
- `src/lib/voice-status.mjs` (new)
- `worker/index.mjs`
- `worker/voice-model.mjs` (new)
- `vite.config.ts`
- `scripts/local_node_preview.mjs`
- `scripts/check_bundle_budget.mjs`
- `scripts/verify_real_voice.mjs` (new)
- `tests/voice-model.test.mjs` (new)
- `tests/voice-status.test.mjs` (new)
- `e2e/assistant-voice.spec.mjs`

No Cloudflare deployment or GitHub push was performed for this fix. The earlier authorized deployment attempt stopped before upload at the oversized WASM asset; it did not publish a new version. A final read-only Cloudflare check still showed deployment `27524fc2-a0b8-46d5-b007-6d6dd751ac1d`, version `63b51c51-fb07-4972-9d63-a38ce2c16072` from 11 November. The repaired code is local only.
