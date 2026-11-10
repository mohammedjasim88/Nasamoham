const PARAMS=['T2M','RH2M','PRECTOTCORR_SUM'];
export const NASA_ORIGIN='https://power.larc.nasa.gov';
export function validateQuery(url){
 const p=url.searchParams;const lat=Number(p.get('lat')),lon=Number(p.get('lon'));
 const start=Number(p.get('start')??2000),end=Number(p.get('end')??2025);
 if(!p.has('lat')||!p.has('lon')||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<16||lat>27||lon<52||lon>61)throw new Error('Coordinates must describe a reference point in or near Oman');
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<1981||end>2025||start>end||end-start>45)throw new Error('Invalid year interval (1981–2025, maximum 46 years)');
 return {lat,lon,start,end};
}
export function nasaUrl({lat,lon,start,end}){const q=new URLSearchParams({parameters:PARAMS.join(','),community:'AG',longitude:String(lon),latitude:String(lat),format:'JSON',start:String(start),end:String(end)});return `${NASA_ORIGIN}/api/temporal/monthly/point?${q}`;}
// Avoid Number('') === 0: missing upstream values must never appear as zero rainfall.
const num=x=>{
 if(x===undefined||x===null||(typeof x==='string'&&x.trim()===''))return null;
 const v=Number(x);
 return !Number.isFinite(v)||v===-999?null:v;
};
export function normaliseNasa(json,{lat,lon,start,end},sourceUrl){
 const raw=json?.properties?.parameter;if(!raw||typeof raw!=='object')throw new Error('NASA response does not contain parameter data');
 const years=[];
 for(let y=start;y<=end;y++){
  const record={year:y};
  for(const k of PARAMS){
   const values=raw[k];if(!values||typeof values!=='object')continue;
   const monthly=Array.from({length:12},(_,i)=>num(values[`${y}${String(i+1).padStart(2,'0')}`]));
   const ann=num(values[`${y}13`]);
   // Do not silently calculate aggregate when NASA does not publish ANN.
   record[k]={monthly,annual:ann};
  }
  years.push(record);
 }
 if(years.every(y=>!PARAMS.some(p=>y[p]&&Number.isFinite(y[p].annual))))throw new Error('NASA did not return annual values for requested period');
 return {dataset:'nasa-live',source:'NASA POWER Monthly and Annual API',sourceUrl,sourceRaw:'MERRA-2 / NASA POWER',isSnapshot:false,latitude:lat,longitude:lon,start,end,parameters:PARAMS.filter(k=>years.some(y=>y[k])),reportedUnits:{T2M:json?.parameters?.T2M?.units||'°C',RH2M:json?.parameters?.RH2M?.units||'%',PRECTOTCORR_SUM:json?.parameters?.PRECTOTCORR_SUM?.units||'NASA reported unit (aggregation must be verified)'},gridNote:'Model-grid estimates, not individual station measurements',years};
}
