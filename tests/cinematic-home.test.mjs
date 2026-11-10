import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const file=(name)=>readFileSync(new URL(name,root),'utf8');

test('a dedicated home route is linked to all existing scientific features',()=>{
 const app=file('src/App.tsx');const home=file('src/components/PremiumHome.tsx');
 assert.match(app,/Page='home'\|'explorer'/);
 for(const route of ['explorer','quality','trends','compare','about'])assert.ok(home.includes(`'${route}'`));
 assert.match(home,/onClick=\{launch\}/);
 assert.match(home,/onClick=\{\(\)=>go\('quality'\)\}/);
});
test('real WebGL Earth uses a local NASA texture and properly fetched official geometry',()=>{
 const globe=file('src/components/EarthGlobe.tsx');
 assert.match(globe,/new THREE\.WebGLRenderer/);
 assert.match(globe,/\/assets\/nasa-blue-marble\.webp/);
 assert.match(globe,/\/api\/boundaries\?level=governorates/);
 assert.match(globe,/fc\.features\.length!==11/);
 assert.match(globe,/Math\.PI\*2\/120/);
 assert.ok(existsSync(new URL('public/assets/nasa-blue-marble.webp',root)));
 assert.doesNotMatch(globe,/manually.dra(w|wn).*Oman/);
});
test('motion, keyboard and accessibility fallbacks are implemented',()=>{
 const globe=file('src/components/EarthGlobe.tsx');const home=file('src/components/PremiumHome.tsx');const css=file('src/components/PremiumHome.css');
 assert.match(globe,/prefers-reduced-motion/);
 assert.match(globe,/IntersectionObserver/);
 assert.match(globe,/ArrowLeft/);
 assert.match(globe,/earth-first-frame/);
 assert.match(globe,/globe-static-indicator/);
 assert.match(home,/aria-current/);
 assert.match(css,/focus-visible/);
 assert.match(css,/@media\(max-width:520px\)/);
});

test('intro is instant and navigation never waits for WebGL or a mandatory timer',()=>{
 const home=file('src/components/PremiumHome.tsx');const app=file('src/App.tsx');const css=file('src/components/PremiumHome.css');
 assert.match(home,/reduce\?0:440/);
 assert.match(home,/cinematic-transition/);
 assert.doesNotMatch(app,/document\.startViewTransition/);
 assert.match(app,/lazy\(\(\)=>import\('\.\/components\/OmanMap'\)/);
 assert.doesNotMatch(app,/showIntro&&/);
 assert.match(css,/cinematic-warp/);
 assert.ok(existsSync(new URL('public/assets/earth-first-frame.webp',root)));
});
