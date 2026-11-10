/** Numeric verification deliberately does not recompute annual climate values. */
export const VERIFICATION_TOLERANCE=0.01;
const toValue=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;
export function compareAnnualSeries(siteRows,nasaRows,start,end,tolerance=VERIFICATION_TOLERANCE){
 const siteMap=new Map(siteRows.map(v=>[Number(v.year),toValue(v.value)]));
 const nasaMap=new Map(nasaRows.map(v=>[Number(v.year),toValue(v.value)]));
 const summary={matched:0,different:0,missingSite:0,missingNasa:0,missingBoth:0,total:end-start+1};
 const rows=[];
 for(let year=start;year<=end;year++){
  const site=siteMap.has(year)?siteMap.get(year):null;
  const nasa=nasaMap.has(year)?nasaMap.get(year):null;
  let status;
  if(site===null&&nasa===null){status='missingBoth';summary.missingBoth++;}
  else if(site===null){status='missingSite';summary.missingSite++;}
  else if(nasa===null){status='missingNasa';summary.missingNasa++;}
  else if(Math.abs(site-nasa)<=tolerance+1e-10){status='matched';summary.matched++;}
  else{status='different';summary.different++;}
  rows.push({year,site,nasa,difference:site===null||nasa===null?null:Number((site-nasa).toFixed(8)),status});
 }
 return {rows,summary,passed:summary.matched===summary.total&&summary.total>0,tolerance};
}
/** A minimal RFC4180-style reader, including quoted cells and embedded commas/newlines. */
export function parseCsv(text){
 const csv=String(text||'').replace(/^\uFEFF/,'');
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<csv.length;i++){
  const c=csv[i];
  if(c==='"'){
   if(quoted&&csv[i+1]==='"'){cell+='"';i++;}else{quoted=!quoted;}
  }else if(!quoted&&c===','){row.push(cell);cell='';}
  else if(!quoted&&(c==='\n'||c==='\r')){
   if(c==='\r'&&csv[i+1]==='\n')i++;
   row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
   row=[];cell='';
  }else{cell+=c;}
 }
 if(quoted)throw Error('CSV contains an unclosed quote');
 row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
 return rows;
}
export function readWebsiteCsv(text,metric,{latitude,longitude,start,end}){
 if(!['T2M','RH2M','PRECTOTCORR_SUM'].includes(metric))throw Error('Unknown metric');
 if(text.length>1_000_000)throw Error('Uploaded CSV exceeds the 1 MB limit');
 const csv=parseCsv(text);
 if(csv.length<2)throw Error('CSV has no data rows');
 const header=csv[0].map(v=>v.trim().replace(/^\uFEFF/,''));
 const yearIndex=header.indexOf('Year'),metricIndex=header.indexOf(metric);
 if(yearIndex<0||metricIndex<0)throw Error(`Upload a website CSV containing Year and ${metric} columns (not NASA raw monthly CSV)`);
 const latIndex=header.indexOf('requested_latitude'),lonIndex=header.indexOf('requested_longitude');
 const statusIndex=header.indexOf('numeric_status');
 if(latIndex<0||lonIndex<0)throw Error('CSV lacks requested_latitude / requested_longitude; cannot verify spatial identity');
 const rows=[],seen=new Set();
 for(const fields of csv.slice(1)){
  const year=Number(fields[yearIndex]);
  if(!Number.isInteger(year)||year<1981||year>2100)throw Error('CSV contains an invalid year');
  if(seen.has(year))throw Error('CSV contains duplicate years');
  seen.add(year);
  const lat=Number(fields[latIndex]),lon=Number(fields[lonIndex]);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat-latitude)>0.0001||Math.abs(lon-longitude)>0.0001)throw Error(`CSV coordinates for ${year} do not match selected location`);
  const raw=String(fields[metricIndex]??'').trim();
  if(raw!==''&&!Number.isFinite(Number(raw)))throw Error(`Invalid numeric value in ${year}`);
  const excluded=fields[statusIndex]==='INVALID_EXCLUDED';
  rows.push({year,value:excluded?null:raw===''?null:Number(raw)});
 }
 if(!rows.some(v=>v.year>=start&&v.year<=end))throw Error('CSV has no entries in the selected year range');
 return rows;
}
