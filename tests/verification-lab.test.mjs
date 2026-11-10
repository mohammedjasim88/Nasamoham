import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../worker/index.mjs';
import {verificationQuery,originalNasaUrl,verifyFromNasa,originalCsvFromNasa,safeNasaCsvName} from '../worker/verification.mjs';
import {compareAnnualSeries,readWebsiteCsv,parseCsv} from '../src/lib/verification.mjs';

const q={lat:23.5946,lon:58.7351,start:2000,end:2001,metric:'T2M'};
const sample={properties:{parameter:{T2M:{'200013':28.14,'200113':28.20,'200001':26.35,'200101':22.03}}},parameters:{T2M:{units:'C'}}};
const fetcher=async()=>Response.json(sample);

test('independent verification URL targets NASA monthly JSON for a single metric',()=>{
 const url=originalNasaUrl(q);
 assert.equal(new URL(url).origin,'https://power.larc.nasa.gov');
 assert.equal(new URL(url).searchParams.get('format'),'JSON');
 assert.equal(new URL(url).searchParams.get('parameters'),'T2M');
 assert.equal(originalNasaUrl(q,'CSV').includes('format=CSV'),true);
});
test('invalid coordinates and unsupported metric are blocked before outbound fetch',()=>{
 assert.throws(()=>verificationQuery(new URL('https://example.test/api/verification?lat=100&lon=58&start=2000&end=2025&metric=T2M')));
 assert.throws(()=>verificationQuery(new URL('https://example.test/api/verification?lat=23.5&lon=58&start=2000&end=2025&metric=APIKEY')));
 assert.throws(()=>originalNasaUrl({...q,metric:'x'}));
});
test('annual values come exclusively from NASA YYYY13, not estimated from months',async()=>{
 const result=await verifyFromNasa(q,fetcher);
 assert.deepEqual(result.years,[{year:2000,value:28.14},{year:2001,value:28.2}]);
 assert.equal(result.cached,false);
 assert.equal(result.annualField,'YYYY13');
 assert.equal(result.unit,'C');
});
test('NASA empty annual values are missing rather than zero',async()=>{
 const data={...sample,properties:{parameter:{T2M:{'200013':'','200113':28.2}}}};
 const result=await verifyFromNasa(q,async()=>Response.json(data));
 assert.equal(result.years[0].value,null);
 assert.equal(result.years[1].value,28.2);
});
test('NASA missing annual series is rejected',async()=>{
 await assert.rejects(verifyFromNasa(q,async()=>Response.json({properties:{parameter:{T2M:{'200013':-999,'200113':null}}}})));
});
test('tolerance comparison counts missing, mismatches and matches separately',()=>{
 const r=compareAnnualSeries([{year:2000,value:28.14},{year:2001,value:null},{year:2002,value:30}],[{year:2000,value:28.149},{year:2001,value:null},{year:2002,value:29}],2000,2002);
 assert.equal(r.summary.matched,1);
 assert.equal(r.summary.missingBoth,1);
 assert.equal(r.summary.different,1);
 assert.equal(r.passed,false);
 assert.equal(r.rows[2].difference,1);
});
test('all numeric annual values within tolerance pass',()=>{
 const r=compareAnnualSeries([{year:2000,value:28.14},{year:2001,value:28.2}],[{year:2000,value:28.14},{year:2001,value:28.2}],2000,2001);
 assert.equal(r.passed,true);
 assert.equal(r.summary.matched,2);
});
test('CSV quote parser supports commas and escaped quotes',()=>{
 assert.deepEqual(parseCsv('Year,T2M,source\r\n2000,28.14,"NASA ""POWER"", original"\r\n')[1],['2000','28.14','NASA "POWER", original']);
});
test('website CSV coordinates must match selected NASA point',()=>{
 const csv='Year,T2M,numeric_status,requested_latitude,requested_longitude\n2000,28.14,NUMERIC_CHECK_PASSED,23.5946,58.7351\n2001,28.20,NUMERIC_CHECK_PASSED,23.5946,58.7351';
 const read=readWebsiteCsv(csv,'T2M',{latitude:23.5946,longitude:58.7351,start:2000,end:2001});
 assert.deepEqual(read,[{year:2000,value:28.14},{year:2001,value:28.2}]);
 assert.throws(()=>readWebsiteCsv(csv,'T2M',{latitude:23.6137,longitude:58.594,start:2000,end:2001}),/coordinates/);
 assert.throws(()=>readWebsiteCsv(csv,'RH2M',{latitude:23.5946,longitude:58.7351,start:2000,end:2001}),/Year and RH2M/);
});
test('raw official NASA CSV passes through unaltered and HTML errors are rejected',async()=>{
 const source='-BEGIN HEADER-\nNASA POWER\n-END HEADER-\nYEAR,T2M\n2000,28.14\n';
 const output=await originalCsvFromNasa(q,async()=>new Response(source));
 assert.equal(output.csv,source);
 await assert.rejects(originalCsvFromNasa(q,async()=>new Response('<html>YEAR T2M error</html>')));
 assert.equal(safeNasaCsvName(q).endsWith('.csv'),true);
});
test('Worker verification route returns no-store independent JSON and accepts valid coordinate',async()=>{
 const fetch0=globalThis.fetch;
 globalThis.fetch=async(url)=>{assert.equal(new URL(url).host,'power.larc.nasa.gov');return Response.json(sample);};
 try{
  const req=new Request('https://test.example/api/verification?lat=23.5946&lon=58.7351&metric=T2M&start=2000&end=2001');
  const response=await worker.fetch(req,{},{});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const data=await response.json();
  assert.equal(data.years.length,2);
 }finally{globalThis.fetch=fetch0;}
});
test('Worker rejects bogus verification query without NASA outbound calls',async()=>{
 const fetch0=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('Should not be reached');};
 try{
  const response=await worker.fetch(new Request('https://local.test/api/verification?lat=23.59&lon=58.7&start=2000&end=2025&metric=UNKNOWN'),{},{});
  assert.equal(response.status,400);
 }finally{globalThis.fetch=fetch0;}
});
test('Worker original NASA CSV download is an attachment from official upstream',async()=>{
 const fetch0=globalThis.fetch;
 globalThis.fetch=async()=>new Response('-BEGIN HEADER-\nNASA POWER\n-END HEADER-\nYEAR,T2M\n2000,28.14\n');
 try{
  const response=await worker.fetch(new Request('https://local.test/api/nasa-csv?lat=23.5946&lon=58.7351&metric=T2M&start=2000&end=2001'),{},{});
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-disposition'),/attachment/);
  assert.match(await response.text(),/NASA POWER/);
 }finally{globalThis.fetch=fetch0;}
});
test('lab has a dedicated route and allows contextual verification of location comparisons',()=>{
 const app=fs.readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 const home=fs.readFileSync(new URL('../src/components/PremiumHome.tsx',import.meta.url),'utf8');
 const lab=fs.readFileSync(new URL('../src/components/VerificationLab.tsx',import.meta.url),'utf8');
 assert.match(app,/'verify'/);
 assert.match(app,/openVerification\(page==='compare'\)/);
 assert.match(app,/onExportSite/);
 assert.match(home,/go\('verify'\)/);
 assert.match(lab,/\/api\/verification/);
 assert.match(lab,/\/api\/nasa-csv/);
 assert.match(lab,/readWebsiteCsv/);
});
