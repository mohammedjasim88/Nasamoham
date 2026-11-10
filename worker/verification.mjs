/** Independent NASA POWER verification: separate source request, never a stored snapshot or /api/power cache. */
import {NASA_ORIGIN,validateQuery} from './nasa.mjs';

export const VERIFY_METRICS=Object.freeze(['T2M','RH2M','PRECTOTCORR_SUM']);
const REQUEST_TIMEOUT_MS=18000;
const MAX_CSV_BYTES=3_000_000;
const MAX_JSON_BYTES=1_000_000;

export function verificationQuery(url){
 const point=validateQuery(url);
 const metric=url.searchParams.get('metric');
 if(!VERIFY_METRICS.includes(metric))throw Error('Unsupported NASA variable: choose T2M, RH2M or PRECTOTCORR_SUM');
 return {...point,metric};
}
export function originalNasaUrl(query,format='JSON'){
 if(!VERIFY_METRICS.includes(query.metric)||!['JSON','CSV'].includes(format))throw Error('Invalid NASA request');
 const search=new URLSearchParams({parameters:query.metric,community:'AG',longitude:String(query.lon),latitude:String(query.lat),format,start:String(query.start),end:String(query.end)});
 return `${NASA_ORIGIN}/api/temporal/monthly/point?${search}`;
}
function annualNumber(v){
 if(v===null||v===undefined||(typeof v==='string'&&!v.trim()))return null;
 const n=Number(v);return !Number.isFinite(n)||n===-999?null:n;
}
async function getRemote(url,accept,fetcher){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
 try{
  const response=await fetcher(url,{headers:{Accept:accept},signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw Error(`NASA POWER HTTP ${response.status}`);
  return response;
 }finally{clearTimeout(timer);}
}
export async function verifyFromNasa(q,fetcher=globalThis.fetch){
 const sourceUrl=originalNasaUrl(q);
 const response=await getRemote(sourceUrl,'application/json',fetcher);
 const sourceRawJson=await response.text();
 if(new TextEncoder().encode(sourceRawJson).length>MAX_JSON_BYTES)throw Error('NASA original JSON response exceeds the verification limit');
 let json;try{json=JSON.parse(sourceRawJson);}catch{throw Error('NASA original response was not valid JSON');}
 const values=json?.properties?.parameter?.[q.metric];
 if(!values||typeof values!=='object'||Array.isArray(values))throw Error('NASA returned no valid annual parameter series');
 const years=Array.from({length:q.end-q.start+1},(_,i)=>{
  const year=q.start+i;
  return {year,value:annualNumber(values[`${year}13`])}; // NASA annual field, NOT monthly recomputation.
 });
 if(years.every(row=>row.value===null))throw Error('NASA returned no annual observations for this interval');
 return {source:'NASA POWER Monthly and Annual API',sourceUrl,metric:q.metric,latitude:q.lat,longitude:q.lon,start:q.start,end:q.end,retrievedAt:new Date().toISOString(),unit:json?.parameters?.[q.metric]?.units||null,years,annualField:'YYYY13',cached:false,sourceRawJson};
}
export async function originalCsvFromNasa(q,fetcher=globalThis.fetch){
 const sourceUrl=originalNasaUrl(q,'CSV');
 const response=await getRemote(sourceUrl,'text/csv,text/plain',fetcher);
 const length=Number(response.headers?.get('content-length'));
 if(Number.isFinite(length)&&length>MAX_CSV_BYTES)throw Error('NASA CSV exceeds safety limit');
 const csv=await response.text();
 if(csv.length>MAX_CSV_BYTES)throw Error('NASA CSV exceeds safety limit');
 // NASA format includes metadata comments, followed by YEAR and variable columns.
 if(!/\bYEAR\b/i.test(csv)||!csv.includes(q.metric)||/<html|<!doctype/i.test(csv))throw Error('NASA response was not a recognised CSV data file');
 return {csv,sourceUrl};
}
export function safeNasaCsvName(q){return `NASA_POWER_${q.metric}_${q.lat}_${q.lon}_${q.start}-${q.end}.csv`.replace(/[^A-Za-z0-9_.-]/g,'_');}
