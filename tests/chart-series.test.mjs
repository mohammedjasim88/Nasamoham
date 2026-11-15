import test from 'node:test';
import assert from 'node:assert/strict';
import {alignAnnualSeries} from '../src/lib/chart-series.mjs';

test('annual comparison alignment keeps source values and preserves absent years as gaps',()=>{
 const primary=[{year:2000,value:22.3},{year:2001,value:null},{year:2003,value:24.1}];
 const secondary=[{year:2000,value:18.4},{year:2002,value:19.2}];
 const aligned=alignAnnualSeries(primary,secondary);
 assert.deepEqual(aligned.years,[2000,2001,2002,2003]);
 assert.deepEqual(aligned.primary,[22.3,null,null,24.1]);
 assert.deepEqual(aligned.secondary,[18.4,null,19.2,null]);
 assert.equal(aligned.primary[0],primary[0].value);
});

test('invalid annual values are gaps and duplicate years are rejected',()=>{
 assert.deepEqual(alignAnnualSeries([{year:2000,value:Infinity}]).primary,[null]);
 assert.throws(()=>alignAnnualSeries([{year:2000,value:1},{year:2000,value:2}]),/Duplicate annual observation/);
});
