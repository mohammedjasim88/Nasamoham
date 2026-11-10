/** Read-only checks of a deployed Cloudflare Worker. Node.js 20+. */
const supplied=process.argv[2];
if(!supplied||!/^https:\/\/[^\s]+$/.test(supplied)){
 console.error('Usage: node scripts/verify_live.mjs https://your-worker.workers.dev');process.exit(2);
}
const origin=new URL(supplied).origin;
async function request(path){
 const c=new AbortController();const timer=setTimeout(()=>c.abort(),12000);
 try{return await fetch(origin+path,{signal:c.signal,redirect:'follow'});}finally{clearTimeout(timer);}
}
const checks=[];
async function run(name,fn){
 try{const detail=await fn();checks.push({name,status:'PASS',detail});console.log('PASS',name,detail??'');}
 catch(e){checks.push({name,status:'FAIL',detail:String(e)});console.error('FAIL',name,String(e));}
}
await run('Application HTML',async()=>{
 const r=await request('/');const html=await r.text();
 if(!r.ok||!html.includes('id="root"'))throw new Error(`App root not found (HTTP ${r.status})`);
 return `HTTP ${r.status}`;
});
await run('SPA routing /#trends',async()=>{
 const r=await request('/trends');const html=await r.text();
 if(!r.ok||!html.includes('id="root"'))throw new Error(`SPA fallback missing (HTTP ${r.status})`);
 return `HTTP ${r.status}`;
});
await run('API /status',async()=>{
 const r=await request('/api/status');const json=await r.json();
 if(!r.ok||json.ready!==true)throw new Error(`Unexpected status: ${JSON.stringify(json).slice(0,120)}`);
 return `HTTP ${r.status}; aiConfigured=${json.aiConfigured}`;
});
await run('API rejects invalid coordinates',async()=>{
 const r=await request('/api/power?lat=70&lon=90&start=2000&end=2025');
 if(r.status!==400)throw new Error(`Expected HTTP 400, got ${r.status}`);
 return 'HTTP 400';
});
await run('Unknown API route rejects',async()=>{
 const r=await request('/api/nothing-here');
 if(r.status!==404)throw new Error(`Expected HTTP 404, got ${r.status}`);
 return 'HTTP 404';
});
const failures=checks.filter(x=>x.status==='FAIL');
console.log(`\n${checks.length-failures.length}/${checks.length} read-only online checks passed.`);
console.log('IMPORTANT: This does NOT verify map tiles, NCSI geometry, NASA data accuracy, or mobile browser interactions.');
if(failures.length)process.exitCode=1;
