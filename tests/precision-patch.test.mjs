import test from 'node:test';
import assert from 'node:assert/strict';
import {metricSeries,monthlySeries,linearTrend} from '../src/lib/statistics.mjs';
import {normaliseNasa} from '../worker/nasa.mjs';

test('missing whole year is retained and counted in annual series',()=>{
 const data={years:[{year:2020,T2M:{annual:26,monthly:Array(12).fill(26)}},{year:2022,T2M:{annual:27,monthly:Array(12).fill(27)}}]};
 const annual=metricSeries(data,'T2M',2020,2022);
 assert.deepEqual(annual,[{year:2020,value:26},{year:2021,value:null},{year:2022,value:27}]);
 assert.equal(linearTrend(annual).n,2);
 assert.equal(monthlySeries(data,'T2M',2020,2022).length,36);
 assert.equal(monthlySeries(data,'T2M',2020,2022)[12].value,null);
});

test('NASA empty-string records are missing, not zero',()=>{
 const payload={properties:{parameter:{T2M:{'202401':'','202402':'26','202413':''}}}};
 assert.throws(()=>normaliseNasa(payload,{lat:23.6,lon:58.7,start:2024,end:2024},'https://power.larc.nasa.gov'),/annual values/);
 payload.properties.parameter.T2M['202413']='28';
 const result=normaliseNasa(payload,{lat:23.6,lon:58.7,start:2024,end:2024},'https://power.larc.nasa.gov');
 assert.equal(result.years[0].T2M.monthly[0],null);
 assert.equal(result.years[0].T2M.monthly[1],26);
 assert.equal(result.years[0].T2M.annual,28);
});
