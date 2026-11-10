/** Optional read-only remote QA. Makes at most one NASA request and two NCSI requests. */
const origin=(process.argv[2]||'').replace(/\/$/,'');
if(!/^https:\/\/[^/]+/.test(origin)){console.error('Usage: node scripts/audit_live_sources.mjs https://your-site.workers.dev');process.exit(2);}
const checks=[];
async function run(name,path,inspect){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),22000);
 try{const res=await fetch(origin+path,{signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'});
  if(!res.ok)throw Error(`HTTP ${res.status}`);const data=await res.json();
  const info=inspect(data);console.log('PASS',name,info);checks.push({name,result:'PASS',info});
 }catch(e){console.error('INCOMPLETE',name,String(e.message||e));checks.push({name,result:'INCOMPLETE',detail:String(e)});}
 finally{clearTimeout(timer);}
}
await run('Governorates structural geometry','/api/boundaries?level=governorates',d=>{
 if(d?.features?.length!==11||!d?.metadata?.geometryCheck?.ok)throw Error('11 geometry-checked polygons not available');
 return `NCSI ${d.features.length} polygons; bbox ${d.metadata.geometryCheck.bbox.join(',')}`;
});
await run('Wilayats structural geometry','/api/boundaries?level=wilayats',d=>{
 if(d?.features?.length<60||!d?.metadata?.geometryCheck?.ok)throw Error('60+ geometry-checked polygons not available');
 return `NCSI ${d.features.length} polygons`;
});
await run('NASA independent Muscat test','/api/verification?lat=23.5946&lon=58.7351&start=2000&end=2025&metric=T2M',d=>{
 if(d?.years?.length!==26||d?.annualField!=='YYYY13'||d?.cached!==false)throw Error('NASA annual response incomplete');
 const row=d.years.find(r=>r.year===2000);
 if(Math.abs(row?.value-28.14)>.01)throw Error('Expected baseline mismatch');
 return '26 annual NASA observations retrieved, year 2000 T2M matched baseline';
});
console.log(`\n${checks.filter(x=>x.result==='PASS').length}/${checks.length} live external-source checks passed.`);
console.log('IMPORTANT: These are real upstream calls. Availability and map visual alignment still require device review.');
if(checks.some(c=>c.result!=='PASS'))process.exitCode=1;
