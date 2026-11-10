/** Auditable source selection for the numerical assistant.
 * User-provided static examples are preferred when they truly cover the request.
 * If a static file is corrupt/out of scope, use the public NASA POWER proxy.
 * Never present a wrongly positioned/missing dataset as valid evidence.
 */
export function datasetCovers(data, point, plan){
 if(!data||!Array.isArray(data.years)||!Array.isArray(data.parameters)||!data.parameters.includes(plan.metric))return false;
 if(!Number.isFinite(data.latitude)||!Number.isFinite(data.longitude)||
    Math.abs(data.latitude-point.lat)>1e-5||Math.abs(data.longitude-point.lon)>1e-5)return false;
 if(!Number.isInteger(data.start)||!Number.isInteger(data.end)||data.start>plan.start||data.end<plan.end)return false;
 const requested=new Map(data.years.map(r=>[r?.year,r]));
 if(requested.size!==data.years.length)return false;
 for(let year=plan.start;year<=plan.end;year++){
  const item=requested.get(year);
  if(!item||!Object.prototype.hasOwnProperty.call(item,plan.metric))return false;
 }
 return true;
}

export async function loadPointEvidence(point,plan,signal,fetcher=fetch){
 if(signal?.aborted)throw new Error('CANCELLED');
 const sourceUrl=`https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${encodeURIComponent(plan.metric)}&community=AG&longitude=${point.lon}&latitude=${point.lat}&format=JSON&start=${plan.start}&end=${plan.end}`;
 if(point.sample&&plan.start>=2000){
  try{
   const sampleResponse=await fetcher(point.sample,{signal,headers:{Accept:'application/json'}});
   if(sampleResponse.ok){
    const sample=await sampleResponse.json();
    if(datasetCovers(sample,point,plan))return {data:sample,sourceUrl};
   }
  }catch(error){
   if(signal?.aborted)throw error;
   // Invalid or inaccessible optional snapshot: try the authoritative live proxy.
  }
 }
 if(signal?.aborted)throw new Error('CANCELLED');
 const url=`/api/power?${new URLSearchParams({lat:String(point.lat),lon:String(point.lon),start:String(plan.start),end:String(plan.end)})}`;
 const response=await fetcher(url,{signal,headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error(`NASA_SOURCE_HTTP_${response.status}`);
 const data=await response.json();
 if(!datasetCovers(data,point,plan))throw new Error('NASA_SOURCE_INVALID_OR_MISMATCHED');
 return {data,sourceUrl};
}
