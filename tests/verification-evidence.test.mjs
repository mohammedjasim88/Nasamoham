import test from 'node:test';
import assert from 'node:assert/strict';
import {createZipArchive,buildEvidenceArchive} from '../src/lib/verification-evidence.mjs';
import {compareAnnualSeries} from '../src/lib/verification.mjs';
import {verifyFromNasa} from '../worker/verification.mjs';
import fs from 'node:fs';
const q={lat:24.2486,lon:55.7931,start:2000,end:2001,metric:'T2M'};
const sample={type:'Feature',geometry:{type:'Point',coordinates:[55.793,24.249,257.71]},properties:{parameter:{T2M:{200001:19.15,200013:28.75,200113:28.76}}},header:{title:'NASA/POWER Source Native Resolution Monthly and Annual',sources:['MERRA2']},parameters:{T2M:{units:'C'}}};
const textRaw=JSON.stringify(sample,null,2)+'\n';
const dummy=async()=>new Response(textRaw,{headers:{'Content-Type':'application/json'}});
const point={id:'buraimi',en:'Al Buraimi',ar:'البريمي',lat:q.lat,lon:q.lon};
async function example(rows=[{year:2000,value:28.75},{year:2001,value:28.76}]){
 const nasa=await verifyFromNasa(q,dummy);
 return {location:point,nasa,comparison:compareAnnualSeries(rows,nasa.years,2000,2001),sourceType:'site',sourceLabel:'Website series'};
}
// Read ZIP STORE entries in Node without third-party packages.
function zipFiles(buffer){
 const data=Buffer.from(buffer),files=new Map();let p=0;
 while(p<data.length&&data.readUInt32LE(p)===0x04034b50){
  assert.equal(data.readUInt16LE(p+8),0,'ZIP must use STORE');
  const size=data.readUInt32LE(p+18),nameLength=data.readUInt16LE(p+26),extra=data.readUInt16LE(p+28);
  const name=data.subarray(p+30,p+30+nameLength).toString();
  const start=p+30+nameLength+extra;
  files.set(name,data.subarray(start,start+size));p=start+size;
 }
 assert.equal(data.readUInt32LE(data.length-22),0x06054b50);
 return files;
}
const decode=bytes=>bytes.toString('utf8');
test('independent NASA response retains exact original upstream JSON text for audit',async()=>{
 const nasa=await verifyFromNasa(q,dummy);
 assert.equal(nasa.sourceRawJson,textRaw);
 assert.equal(nasa.years[0].value,28.75);
 assert.equal(nasa.years[1].value,28.76);
});
test('evidence ZIP packages same-response NASA JSON, website values, comparison, manifest and README',async()=>{
 const result=await example();const archive=await buildEvidenceArchive([result],{metric:'T2M',start:2000,end:2001,generatedAt:'2026-11-03T20:55:00.000Z'});
 const files=zipFiles(archive.bytes);
 const dir='locations/buraimi/';
 assert.equal(decode(files.get(dir+'nasa-original-response.json')),textRaw);
 assert.match(decode(files.get(dir+'annual-comparison.csv')),/"2000","28.75","28.75","0","matched"/);
 assert.match(decode(files.get(dir+'website-values-used.csv')),/"2001","28.76"/);
 assert.match(decode(files.get('README.txt')),/ground-station/);
 const manifest=JSON.parse(decode(files.get('manifest.json')));
 assert.equal(manifest.overallStatus,'matched');
 assert.equal(manifest.isNasaCertification,false);
 assert.equal(manifest.locations[0].nasaRetrievedAt,result.nasa.retrievedAt);
 assert.equal(manifest.locations[0].nasaSourceUrl,result.nasa.sourceUrl);
 assert.equal(manifest.locations[0].counts.matched,2);
 for(const entry of manifest.files){
  const bytes=files.get(entry.path);assert.equal(entry.bytes,bytes.length);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  assert.equal(entry.sha256,Buffer.from(digest).toString('hex'));
 }
});
test('evidence does not claim success for a changed annual value',async()=>{
 const result=await example([{year:2000,value:99},{year:2001,value:28.76}]);
 const archive=await buildEvidenceArchive([result],{metric:'T2M',start:2000,end:2001});
 const files=zipFiles(archive.bytes);
 const manifest=JSON.parse(decode(files.get('manifest.json')));
 assert.equal(manifest.overallStatus,'review_required');
 assert.equal(manifest.locations[0].counts.different,1);
 assert.match(decode(files.get('README.txt')),/REVIEW REQUIRED/);
});
test('missing source JSON or manipulated NASA values prevent evidence issuance',async()=>{
 const result=await example();
 delete result.nasa.sourceRawJson;
 await assert.rejects(buildEvidenceArchive([result],{metric:'T2M',start:2000,end:2001}),/not preserved/);
 const other=await example();other.comparison.rows[0].nasa=98;
 await assert.rejects(buildEvidenceArchive([other],{metric:'T2M',start:2000,end:2001}),/diverged/);
});
test('uploaded website CSV is included only as local source evidence, never sent upstream',async()=>{
 const result=await example();result.sourceType='uploaded';result.sourceLabel='uploaded.csv';
 const source='Year,T2M,numeric_status\n2000,28.75,NUMERIC_CHECK_PASSED\n';
 const zip=await buildEvidenceArchive([result],{metric:'T2M',start:2000,end:2001,uploadedFile:{originalBytes:new TextEncoder().encode(source)}});
 const files=zipFiles(zip.bytes);
 assert.equal(decode(files.get('locations/buraimi/uploaded-website-original.csv')),source);
});
test('one archive can include two source responses and per-site results',async()=>{
 const one=await example();const two=await example();two.location={...point,id:'second'};
 const zip=await buildEvidenceArchive([one,two],{metric:'T2M',start:2000,end:2001});
 const files=zipFiles(zip.bytes);
 assert.equal(JSON.parse(decode(files.get('manifest.json'))).locations.length,2);
 assert.ok(files.has('locations/second/nasa-original-response.json'));
});
test('ZIP writer forbids entry traversal, duplicate names and excessive files',()=>{
 assert.throws(()=>createZipArchive([{name:'../outside',content:'bad'}]),/Unsafe/);
 assert.throws(()=>createZipArchive([{name:'same',content:'a'},{name:'same',content:'b'}]),/duplicate/);
 assert.throws(()=>createZipArchive([{name:'large',content:'x'.repeat(6_000_001)}]),/size limit/);
});
test('UI integrates evidence button with accurate status and reset on upload changes',()=>{
 const app=fs.readFileSync(new URL('../src/components/VerificationLab.tsx',import.meta.url),'utf8');
 assert.match(app,/Download Verification Evidence/);
 assert.match(app,/buildEvidenceArchive\(results/);
 assert.match(app,/setResults\(\[\]\);setError\(null\);setArchiveError\(null\);},\[file\]/);
 assert.match(app,/disabled=\{phase!=='complete'/);
});

test('standalone Node archive integrity auditor validates SHA-256 and CRC32',async()=>{
 const {checkArchive}=await import('../scripts/check_evidence_archive.mjs');
 const zipped=await buildEvidenceArchive([await example()],{metric:'T2M',start:2000,end:2001});
 const verified=checkArchive(zipped.bytes);
 assert.equal(verified.checkedFiles,4);
 assert.equal(verified.overallStatus,'matched');
 const corrupted=Uint8Array.from(zipped.bytes);corrupted[140]^=1;
 assert.throws(()=>checkArchive(corrupted),/CRC32 mismatch|SHA-256 mismatch|Invalid ZIP/);
});
