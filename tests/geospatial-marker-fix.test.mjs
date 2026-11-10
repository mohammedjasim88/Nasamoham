import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const code=readFileSync(new URL('../src/components/OmanMap.tsx',import.meta.url),'utf8');
const locations=readFileSync(new URL('../src/lib/locations.ts',import.meta.url),'utf8');
test('MapLibre city-marker node uses absolute screen positioning rather than relative',()=>{
  assert.match(css,/\.maplibre-container \.maplibregl-marker\.map-point\s*\{\s*position:\s*absolute\s*!important;/);
  assert.match(css,/\.maplibre-container \.maplibregl-marker\.map-point\s*\{[^}]*top:\s*0;/s);
  assert.match(css,/\.maplibre-container \.maplibregl-marker\.map-point\s*\{[^}]*left:\s*0;/s);
  assert.doesNotMatch(css.split('/* v2.1.5 — precision map-marker positioning.')[1],/\.maplibregl-marker\.map-point\s*\{[^}]*\btransform\s*:/s);
});
test('markers are positioned using true longitude latitude coordinates',()=>{
  assert.match(code,/new maplibregl\.Marker\(\{element:button,anchor:'center'\}\)\.setLngLat\(\[point\.lon,point\.lat\]\)/);
  assert.match(locations,/id:'khasab'[^\n]*lat:26\.1799,lon:56\.2477/);
  assert.match(locations,/id:'salalah'[^\n]*lat:17\.0194,lon:54\.0897/);
});
test('country overview hides labels at low zoom and preserves selected label',()=>{
  assert.match(code,/map\.on\('zoom',syncMarkerLabels\)/);
  assert.match(code,/map\.getZoom\(\)<6\.15/);
  assert.match(css,/\.map-labels-compact \.map-point:not\(\.active\) \.map-point-name\s*\{display:none\}/);
});
test('mobile accidental map rotation is disabled',()=>{
  assert.match(code,/map\.dragRotate\.disable\(\)/);
  assert.match(code,/map\.touchZoomRotate\.disableRotation\(\)/);
});
