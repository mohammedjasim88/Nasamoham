import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
test('DataSet declares an optional sourceRaw label for raw NASA provenance', () => {
  const types=read('../src/lib/evidence.ts');
  const component=read('../src/App.tsx');
  const backend=read('../worker/nasa.mjs');
  assert.match(types, /sourceRaw\?:string/);
  assert.match(component, /dataset\?\.sourceRaw\|\|dataset\?\.source/);
  assert.match(backend, /sourceRaw:/);
});
