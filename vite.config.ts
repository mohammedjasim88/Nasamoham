import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {localApiPlugin} from './scripts/vite-local-api.mjs';
// Whisper explicitly uses CPU/WASM. The WebGPU ORT build exceeds Workers' 25 MiB asset limit.
const resolve={alias:[{find:/^onnxruntime-web\/webgpu$/,replacement:'onnxruntime-web/wasm'}]};
export default defineConfig({plugins:[react(),localApiPlugin()],resolve,optimizeDeps:{include:['@huggingface/transformers']},server:{port:5173},build:{sourcemap:false,target:'es2022'}});
