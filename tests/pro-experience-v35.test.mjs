import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateQuery} from '../worker/nasa.mjs';
import {verificationQuery} from '../worker/verification.mjs';

const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const code=read('src/App.tsx');
const home=read('src/components/PremiumHome.tsx');
const commands=read('src/components/CommandPalette.tsx');
const css=read('src/styles.css');
const manifest=JSON.parse(read('docs/SCIENTIFIC_INTEGRITY_v3_4.json'));
const sha=p=>createHash('sha256').update(readFileSync(new URL(`../${p}`,import.meta.url))).digest('hex');

test('v3.5 preserves the complete authoritative source and scientific calculation baseline',()=>{
 assert.equal(Object.keys(manifest.files).length,11);
 for(const [name,entry] of Object.entries(manifest.files))assert.equal(sha(name),entry.sha256,name);
});
test('live source label distinguishes not-loaded, pending and failed states',()=>{
 assert.match(code,/status-orb \$\{error\?'status-error'/);
 assert.match(code,/dataset\?\.isSnapshot\?t\.snapshot/);
 assert.match(css,/mission-indicator\.is-error/);
});
test('global palette exposes the eight routes and supports accessible keyboard commands',()=>{
 for(const route of ['home','explorer','trends','compare','quality','verify','ask','about'])assert.match(commands,new RegExp(`route:'${route}'`));
 assert.match(commands,/ctrlKey\|\|e\.metaKey/);
 assert.match(commands,/role="dialog" aria-modal="true"/);
 assert.match(commands,/e\.key==='Escape'/);
 assert.match(commands,/e\.key==='Tab'/);
 assert.match(commands,/onNavigate\(route\)/);
});
test('home content is immediately visible before WebGL and does not block navigation',()=>{
 assert.match(home,/requestIdleCallback\?\.bind/);
 assert.match(home,/cinematic-earth-poster/);
 assert.match(home,/const launch=/);
 assert.match(home,/onNavigate\(target\)/);
 assert.match(home,/onOpenCommand/);
});
test('non-geographic pages do not instantiate MapLibre; user can explicitly return to map',()=>{
 assert.match(code,/\['explorer','trends','compare'\]/);
 assert.match(code,/context-map-preview/);
 assert.match(code,/onClick=\{\(\)=>selectPage\('explorer'\)\}/);
});
test('v3.5 layout has narrow-phone breakpoints, focus and reduced-motion support',()=>{
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/\.mission-strip/);
 assert.match(read('src/components/CommandPalette.css'),/focus-visible/);
 assert.match(read('src/components/PremiumHome.css'),/prefers-reduced-motion/);
});
test('NASA query boundaries and annual source verification still reject invalid requests',()=>{
 assert.throws(()=>validateQuery(new URL('https://example.invalid?lat=40&lon=58&start=2000&end=2025')));
 assert.throws(()=>verificationQuery(new URL('https://example.invalid?lat=23.5&lon=58.7&start=2000&end=2025&metric=FAKE')));
 assert.equal(verificationQuery(new URL('https://example.invalid?lat=23.5946&lon=58.7351&start=2000&end=2025&metric=T2M')).metric,'T2M');
});
