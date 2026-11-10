/** WebLLM runs away from the React/main-rendering thread. */
import {WebWorkerMLCEngineHandler} from '@mlc-ai/web-llm';
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (event: MessageEvent) => handler.onmessage(event);
