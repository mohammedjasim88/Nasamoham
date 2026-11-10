/** Compare a prepared v3.3 baseline to the current v3.4 source bytes. */
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const base=process.argv[2];if(!base){console.error('Usage: node scripts/check_scientific_integrity.mjs /path/to/v3.3');process.exit(2);}
const paths=['public/data/muscat-east.json','public/data/muscat-west.json','public/data/salalah-rh.json','sources/muscat-east-original.csv','sources/muscat-west-original.csv','sources/salalah-rh-original.csv','src/lib/statistics.mjs','src/lib/evidence.ts','worker/nasa.mjs','worker/verification.mjs','src/lib/verification.mjs'];
let failed=0;for(const p of paths){const digest=f=>createHash('sha256').update(readFileSync(f)).digest('hex');const a=digest(`${base}/${p}`),b=digest(new URL(`../${p}`,import.meta.url));console.log(a===b?'UNCHANGED':'MODIFIED',p);if(a!==b)failed++;}
console.log(`${paths.length-failed}/${paths.length} source and analysis files unchanged`);if(failed)process.exitCode=1;
