/** CI guardrail: bound initial and normal JS; permit ONLY the opt-in WebGPU worker's larger runtime. */
import {readdir,readFile,stat} from 'node:fs/promises';
const dir=new URL('../dist/assets/',import.meta.url);
let files;
try{files=await readdir(dir);}catch{console.error('dist/assets missing; run npm run build.');process.exit(2);}
const measured=[];
for(const file of files){if(!/\.(js|css)$/.test(file))continue;const kb=(await stat(new URL(file,dir))).size/1024;measured.push({file,kb:Math.round(kb)});}
console.table(measured);
let html;
try{html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');}catch{console.error('dist/index.html missing');process.exit(2);}
const mainName=html.match(/<script[^>]+src="\/assets\/([^"/]+\.js)"/i)?.[1];
if(!mainName){console.error('Cannot identify initial Vite entry script');process.exit(2);}
const main=measured.find(r=>r.file===mainName);
const localAI=measured.filter(r=>r.file.startsWith('local-ai.worker-')&&r.file.endsWith('.js'));
if(localAI.length!==1){console.error('Expected exactly one isolated, on-demand open-source AI worker');process.exitCode=1;}
const other=measured.filter(r=>r.file.endsWith('.js')&&!r.file.startsWith('local-ai.worker-'));
const tooLarge=other.filter(r=>r.kb>1350);
const hugeOptInWorker=localAI.filter(r=>r.kb>7500);
if(!main||main.kb>450||tooLarge.length||hugeOptInWorker.length){
 console.error('Bundle budget exceeded: initial entry <=450KiB; other JS <=1350KiB; isolated opt-in AI worker <=7500KiB.');
 process.exitCode=1;
}else console.log('PASS: initial entry and normal JS budgets met; heavyweight WebGPU worker isolated behind explicit opt-in.');
console.log('This tests asset size only, not network performance or model-run quality.');
