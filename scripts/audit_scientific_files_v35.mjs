/** Reproducible byte-for-byte scientific source integrity check. */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const report=JSON.parse(readFileSync(new URL('../docs/SCIENTIFIC_INTEGRITY_v3_4.json',import.meta.url),'utf8'));
let count=0;const bad=[];
for(const [name,info] of Object.entries(report.files)){
 const actual=createHash('sha256').update(readFileSync(new URL(`../${name}`,import.meta.url))).digest('hex');
 if(actual!==info.sha256){bad.push(name);console.error('CHANGED',name);}else{count++;console.log('UNCHANGED',name);}
}
console.log(`Scientific source integrity: ${count}/${Object.keys(report.files).length} unchanged.`);
if(bad.length){console.error('Data/science source changes must be reviewed before release.');process.exitCode=1;}
