/** Complete rebuildable Workers package, unlike the previous dist-only ZIP. */
import {mkdir,cp,writeFile,readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const out='release/Oman_Earth_Intelligence_v39';await mkdir(out,{recursive:true});
for(const p of ['src','worker','public','sources','tests','e2e','scripts','index.html','package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.mjs','wrangler.jsonc','README.md','dist'])await cp(p,`${out}/${p}`,{recursive:true});
await mkdir(`${out}/docs`,{recursive:true});
for(const p of await readdir('docs'))if(p.endsWith('.json')||p.endsWith('.md'))await cp(`docs/${p}`,`${out}/docs/${p}`);
await cp('docs/readiness-v39',`${out}/docs/readiness-v39`,{recursive:true});
// Explicit preview target prevents npm run deploy from replacing the practice Worker.
const config=(await readFile(`${out}/wrangler.jsonc`,'utf8')).replace('"name": "oman-earth-intelligence-practice"','"name": "oman-earth-intelligence-preview"');
await writeFile(`${out}/wrangler.jsonc`,config);
await writeFile(`${out}/DEPLOY_WINDOWS.cmd`,'@echo off\r\nsetlocal\r\ncd /d "%~dp0"\r\ncall npm ci --no-audit --no-fund\r\nif errorlevel 1 exit /b 1\r\ncall npm run qa\r\nif errorlevel 1 exit /b 1\r\ncall npx wrangler login\r\nif errorlevel 1 exit /b 1\r\ncall npx wrangler deploy --name oman-earth-intelligence-preview\r\nif errorlevel 1 exit /b 1\r\npause\r\n');
let commit=process.env.GITHUB_SHA||'local-working-tree';
await writeFile(`${out}/RELEASE.json`,JSON.stringify({release:'v39-scientific-readiness',sourceCommit:commit,baseCommit:'e461633ce1bb58b05007197dccfe33e18f5673cf',target:'oman-earth-intelligence-preview',deployed:false,readiness:'Conditional; see docs/readiness-v39/ENGINEERING_REPORT.md'},null,2));
const manifest={};
async function walk(path,relative=''){for(const e of await readdir(path,{withFileTypes:true})){const p=`${path}/${e.name}`,r=relative?`${relative}/${e.name}`:e.name;if(e.isDirectory())await walk(p,r);else manifest[r]=createHash('sha256').update(await readFile(p)).digest('hex');}}
await walk(out);await writeFile(`${out}/SHA256.json`,JSON.stringify(manifest,null,2));
// Python is only used to produce a standard, portable ZIP; no shell interpolation.
execFileSync('python3',['-c','import shutil;shutil.make_archive("release/Oman_Earth_Intelligence_v39", "zip", "release/Oman_Earth_Intelligence_v39")']);
console.log('release/Oman_Earth_Intelligence_v39.zip');
