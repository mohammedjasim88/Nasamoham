/** Reproduce from preserved responses; --refresh retrieves fresh NASA records first. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {normaliseNasa,nasaUrl} from '../worker/nasa.mjs';
import {metricSeries,linearTrend} from '../src/lib/statistics.mjs';
import {neweyWestTrend,mannKendall,pairedTrendDifference} from '../src/lib/trend-inference.mjs';
import {trendDiagnostics} from '../src/lib/robustness.mjs';
const root=new URL('../docs/readiness-v39/',import.meta.url);await mkdir(root,{recursive:true});
const points=[{id:'muscat',lat:23.5946,lon:58.7351,start:2000,end:2025},{id:'buraimi',lat:24.2486,lon:55.7931,start:2000,end:2025}];
const provenance=JSON.parse(await readFile(new URL('source-provenance.json',root)));
const records=[];
for(const p of points){
 const url=nasaUrl(p),file=new URL(`${p.id}-nasa-response.json`,root);
 if(process.argv.includes('--refresh')){const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error(`NASA ${response.status}`);await writeFile(file,await response.text());provenance[`${p.id}-nasa-response.json`]={sourceUrl:url,retrievedAt:new Date().toISOString()};}
 const bytes=await readFile(file),raw=JSON.parse(bytes),data=normaliseNasa(raw,p,url),series=metricSeries(data,'T2M');
 records.push({point:p,url,sha256:createHash('sha256').update(bytes).digest('hex'),preservedFile:`${p.id}-nasa-response.json`,retrievedAt:provenance[`${p.id}-nasa-response.json`]?.retrievedAt??null,returnedGeometry:raw.geometry,header:raw.header,reportedUnits:data.reportedUnits,series,ols:linearTrend(series),hac:neweyWestTrend(series),bandwidthSensitivity:[0,1,2,3,4].map(lag=>neweyWestTrend(series,{lag})),mannKendall:mannKendall(series),diagnostics:trendDiagnostics(series)});
}
const snapshot=JSON.parse(await readFile(new URL('../public/data/muscat-east.json',import.meta.url)));
const nasa=JSON.parse(await readFile(new URL('muscat-nasa-response.json',root)));
const snapshotComparisons=['T2M','RH2M','PRECTOTCORR_SUM'].map(metric=>{
 const rows=metricSeries(snapshot,metric).map(r=>{const reference=nasa.properties.parameter[metric][`${r.year}13`];return {...r,reference,difference:r.value===null?null:r.value-reference,match:r.value!==null&&Number.isFinite(reference)&&Math.abs(r.value-reference)<=.01};});
 return {metric,tolerance:.01,matched:rows.filter(x=>x.match).length,total:rows.length,rows};
});
const rain=nasa.properties.parameter.PRECTOTCORR_SUM;
let daily=null;
try{const d=JSON.parse(await readFile(new URL('muscat-daily-202408.json',root)));const values=Object.values(d.properties.parameter.PRECTOTCORR);daily={units:d.parameters.PRECTOTCORR.units,days:values.length,sum:values.every(v=>Number.isFinite(v)&&v>=0)?values.reduce((a,b)=>a+b,0):null,monthlyReported:rain['202408'],independentGroundValidation:false};}catch{}
const report={schema:'oei/readiness-case/v39',generatedAt:new Date().toISOString(),sourceCommitBase:'e461633ce1bb58b05007197dccfe33e18f5673cf',metric:'T2M',unit:'C',records,pairedDifference:pairedTrendDifference(records[0].series,records[1].series),snapshotComparisons,precipitation:{sourceUnit:nasa.parameters.PRECTOTCORR_SUM.units,annual2024:rain['202413'],sumMonthly2024:Array.from({length:12},(_,i)=>rain[`2024${String(i+1).padStart(2,'0')}`]).reduce((a,b)=>a+b,0),dailyAugust:daily,interpretation:'API units conflict with accumulated values and GIS metadata. No conversion or physical-accuracy claim. Precipitation supplementary inference is withheld.'},limitations:['Source agreement is not independent station validation.','HAC inference is approximate for 26 observations and bandwidth-sensitive.','Same grid source can induce correlated errors across points.','No national/governorate average or causal attribution.']};
await writeFile(new URL('case-study.json',root),JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--refresh')){for(const r of records)provenance[r.preservedFile].sha256=r.sha256;await writeFile(new URL('source-provenance.json',root),JSON.stringify(provenance,null,2)+'\n');}
console.log(JSON.stringify({snapshotComparisons:snapshotComparisons.map(({metric,matched,total})=>({metric,matched,total})),muscatHAC:records[0].hac,buraimiHAC:records[1].hac,difference:report.pairedDifference,precipitation:report.precipitation},null,2));
