/** Independent NASA POWER comparison of a CSV exported by Oman Earth Intelligence.
 * Requires Node 20+. No external dependencies. Never silently invents NASA data.
 * Usage: node scripts/verify_nasa_csv.mjs "C:\\path\\oman-earth-muscat-east-T2M-2000-2023.csv"
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

function parseCsv(source){
 const result=[];let row=[],field='',quoted=false;
 const data=source.replace(/^\uFEFF/,'');
 for(let i=0;i<data.length;i++){
  const ch=data[i];
  if(ch==='"'){
   if(quoted&&data[i+1]==='"'){field+='"';i++;}else quoted=!quoted;
  }else if(!quoted&&ch===','){row.push(field);field='';}
  else if(!quoted&&(ch==='\n'||ch==='\r')){
   if(ch==='\r'&&data[i+1]==='\n')i++;
   row.push(field);field='';if(row.some(Boolean))result.push(row);row=[];
  }else field+=ch;
 }
 if(quoted)throw Error('Malformed CSV quote');
 row.push(field);if(row.some(Boolean))result.push(row);
 if(result.length<2)throw Error('CSV has no data rows');
 const cols=result[0];return result.slice(1).map(values=>Object.fromEntries(cols.map((k,i)=>[k,values[i]??''])));
}
const path=process.argv[2];
if(!path){console.error('Usage: node scripts/verify_nasa_csv.mjs exported.csv');process.exit(2);}
let rows;
try{rows=parseCsv(readFileSync(path,'utf8'));}catch(e){console.error('Cannot parse CSV:',e.message);process.exit(2);}
const metric=Object.keys(rows[0]).find(k=>['T2M','RH2M','PRECTOTCORR_SUM'].includes(k));
if(!metric)throw Error('CSV lacks a supported NASA metric');
const lat=Number(rows[0].requested_latitude),lon=Number(rows[0].requested_longitude);
const years=rows.map(r=>Number(r.Year));
if(!Number.isFinite(lat)||!Number.isFinite(lon)||years.some(y=>!Number.isInteger(y)))throw Error('Invalid coordinate/year values');
if(rows.some(r=>Number(r.requested_latitude)!==lat||Number(r.requested_longitude)!==lon))throw Error('Mixed coordinates are not comparable');
const start=Math.min(...years),end=Math.max(...years);
const url=new URL('https://power.larc.nasa.gov/api/temporal/monthly/point');
url.search=new URLSearchParams({parameters:metric,community:'AG',longitude:String(lon),latitude:String(lat),format:'JSON',start:String(start),end:String(end)}).toString();
console.log(`Checking ${rows.length} years: ${metric}, ${lat},${lon}, ${start}–${end}`);
console.log('Independent source:',url.toString());
try {
 const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw Error(`NASA POWER returned HTTP ${response.status}`);
 const payload=await response.json();const values=payload?.properties?.parameter?.[metric];
 if(!values||typeof values!=='object')throw Error('NASA JSON did not include expected metric');
 const mismatch=[];let matches=0,skipped=0;
 for(const r of rows){
  const year=Number(r.Year),localRaw=r[metric],nasaRaw=values[`${year}13`];
  const local=localRaw===''?null:Number(localRaw),nasa=nasaRaw===null||nasaRaw===undefined||nasaRaw===-999?null:Number(nasaRaw);
  if(local===null&&nasa===null){skipped++;continue;}
  if(local!==null&&Number.isFinite(local)&&nasa!==null&&Number.isFinite(nasa)&&Math.abs(local-nasa)<=.011){matches++;continue;}
  mismatch.push({year,exported:local,onlineNASA:nasa});
 }
 console.log(`MATCH: ${matches} / ${rows.length} | missing on both: ${skipped} | different: ${mismatch.length}`);
 if(mismatch.length){console.table(mismatch);process.exitCode=1;}
 else if(matches===0){console.error('No numeric NASA values verified');process.exitCode=1;}
 else console.log('SUCCESS: Export matches NASA API annual data to 0.01 unit tolerance.');
 console.log('Note: Agreement validates these data values, not ground-station accuracy or governorate spatial averages.');
}catch(e){console.error('CANNOT VERIFY ONLINE:',e?.message||e);process.exitCode=2;}
