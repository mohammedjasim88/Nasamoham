/** CI guardrail, not a Lighthouse score. Checks emitted asset sizes after a real build. */
import {readdir,stat} from 'node:fs/promises';
import {join,extname} from 'node:path';
const dir=new URL('../dist/assets/',import.meta.url);
let files;
try{files=await readdir(dir);}catch{console.error('No dist/assets found. Run npm run build first.');process.exit(2);}
const measured=[];
for(const file of files){if(!['.js','.css'].includes(extname(file)))continue;const size=(await stat(new URL(file,dir))).size;measured.push({file,kb:Math.round(size/1024)});}
const main=measured.filter(r=>r.file.startsWith('index-')&&r.file.endsWith('.js'));
const js=measured.filter(r=>r.file.endsWith('.js'));
console.table(measured);
const tooLarge=js.filter(r=>r.kb>1350),badMain=main.filter(r=>r.kb>450);
if(tooLarge.length||badMain.length){console.error('Bundle budget exceeded. Consider lazy loading and code splitting.');process.exitCode=1;}
else console.log('PASS: JS chunk guardrails met (main <=450KiB, each chunk <=1350KiB).');
console.log('This is a source-asset budget, not a measured load time, LCP, INP or CLS.');
