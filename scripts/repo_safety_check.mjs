/**
 * Repository guardrail; not a substitute for a complete secrets audit.
 * Runs without third-party dependencies and does not print secret contents.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const omitted = new Set(['node_modules', 'dist', '.git', '.wrangler', 'coverage', 'test-results', 'playwright-report', 'audit-results', 'release-artifacts']);
const textExtensions = new Set(['.js','.mjs','.cjs','.ts','.tsx','.json','.jsonc','.html','.css','.scss','.md','.yml','.yaml','.toml','.txt','.svg','.py','.sh','.bat','.ps1','.xml','.csv','.gitignore']);
const secretPatterns = [
  {name:'private key', re:/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/},
  {name:'GitHub token', re:/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/},
  {name:'AWS access key', re:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/}
];
const blockedNames = [/^\.env(?:\..+)?$/, /^\.dev\.vars(?:\..+)?$/, /^id_(?:rsa|ed25519)$/, /\.(?:pem|p12|pfx)$/i];
const findings=[];
let inspected=0;
function visit(dir){
 for(const d of readdirSync(dir,{withFileTypes:true})){
  if(d.isSymbolicLink()) continue;
  const full=join(dir,d.name); const rel=relative(root,full).split(sep).join('/');
  if(d.isDirectory()) { if(!omitted.has(d.name)) visit(full); continue; }
  if(!d.isFile()) continue;
  if(d.name==='.env.example') continue;
  if(blockedNames.some(p=>p.test(d.name))){ findings.push(`${rel}: sensitive filename`); continue; }
  const dot=d.name.lastIndexOf('.'); const ext=dot===-1 ? '' : d.name.slice(dot);
  if(!textExtensions.has(ext) && d.name!=='.gitignore') continue;
  if(statSync(full).size>2_000_000) continue;
  inspected++;
  const content=readFileSync(full,'utf8');
  for(const pattern of secretPatterns){ if(pattern.re.test(content))findings.push(`${rel}: possible ${pattern.name}`); }
 }
}
visit(root);
if(findings.length){
 console.error(`Repository safety check: ${findings.length} issue(s) to inspect.`);
 for(const finding of findings) console.error(`- ${finding}`);
 process.exitCode=1;
}else console.log(`Repository safety check OK (${inspected} text files scanned; heuristic only).`);
