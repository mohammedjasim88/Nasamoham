# Oman Earth Intelligence — Open-source browser AI integration (v3.8)

## User requirement

Install an actual FREE open-source language model selected from GitHub, not the optional Cloudflare Workers AI service or a paid API. Keep verified NASA calculations independent of generated prose, preserve privacy and mobile responsiveness.

## GitHub candidates (stars observed 10 November 2026; counts change over time)

| Project | GitHub stars (approx.) | Licence | Why it is or is not used |
| --- | ---: | --- | --- |
| [Ollama](https://github.com/ollama/ollama) | 186,560 | MIT | Excellent local server; would require the visitor to install/run a service or us to host one; NOT suitable as free serverless browser deployment. |
| [llama.cpp](https://github.com/ggml-org/llama.cpp) | 133,940 | MIT | Excellent native/local inference, but browser deployment and mobile GPU would need more infrastructure. |
| [WebLLM](https://github.com/mlc-ai/web-llm) | 19,366 | Apache-2.0 | SELECTED. Native browser WebGPU inference, worker thread, no API key, can be deployed as static assets plus Cloudflare's existing NASA worker. |
| [Transformers.js](https://github.com/huggingface/transformers.js) | 16,411 | Apache-2.0 | Strong second choice for browser ONNX/transformer tasks; WebLLM's OpenAI-like chat interface and known prebuilt quantized model records simplify this scoped assistant. |

**Stars measure popularity, not correctness or model intelligence.** We also assessed maintenance, licence, integration cost, hardware constraints, bilingual capability and scientific reproducibility.

### Open-source model choices

- Default: [Qwen2.5-0.5B-Instruct-q4f16_1-MLC](https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC) (Apache-2.0 original model). Multilingual including Arabic; approximate **945 MB WebGPU VRAM** requirement according to WebLLM's official model config. Model repository is around 290 MB; actual first-download traffic may differ.
- Lighter fallback: [SmolLM2-360M-Instruct-q4f16_1-MLC](https://huggingface.co/mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC) (Apache-2.0). Approx. 377 MB WebGPU VRAM; mainly English-focused.

The model files are retrieved from public Hugging Face repositories only AFTER the visitor chooses **Download & start local AI**. The language-model inference executes in the browser's Web Worker using WebGPU. Browser/device compatibility, first download availability, and quality are not guaranteed; the source-calculated NASA assistant still works independently without WebGPU. No model is bundled into the ZIP itself.

## Safety and accuracy constraints

- **No model runs during the landing page load.** A separate dynamic chunk loads WebLLM only after consent. The model is not uploaded to Cloudflare.
- **No Cloudflare Workers AI integration** in the new Local AI flow. The previous optional `/api/ask` Worker route is legacy and is not used by the browser AI UI.
- No OpenAI API key, Hugging Face inference token, NASA API key, or paid endpoint.
- For numeric requests, the visitor must FIRST run the deterministic NASA annual-data analysis. The model receives the checked annual series and derived explanation and is told not to invent/change numbers.
- AI output is prominently marked **generated and unverified**. Source-calculated values and NASA links remain authoritative for this app.
- Only site/climate-domain questions are sent to the model. Prompts are not uploaded to a third-party AI endpoint. The library fetches the model and runtime resources from their public hosts.
- GPU availability may vary on iPhone, Android, and desktop browsers. No WebGPU => fail gracefully with the regular NASA analysis intact.
- App/site scientific code, NASA CSVs and NCSI boundary shapes are deliberately not altered by this change.

## Verify before release

Run `npm ci`, `npm run qa`, and `npx playwright test e2e/v38-local-open-source-ai.spec.mjs --project=desktop-chromium --project=mobile-webkit` in CI. Run a **manual model inference test in a real compatible browser** separately: choose Qwen, verify download progress, ask a simple bilingual site question, test low-RAM failure and disconnect scenarios, and confirm the NASA annual table is not altered. Emulated iPhone WebKit in GitHub Actions usually does not have a real WebGPU device, so automated tests prove gating/fallback, not live model output.

## Cloudflare publication

The updated ZIP is an isolated Cloudflare **Workers** package (SPA + NASA API worker), not a Pages static upload. Deploy to `oman-earth-intelligence-preview` first. Production/practice Worker is untouched unless explicitly released. The local model runs on each user device and may download several hundred MB on first use; this is disclosed in the UI.
