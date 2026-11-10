/** Soft upstream budget applied only to costly API routes. Cloudflare limits are POP-local and approximate. */
export const COSTLY_ROUTES=new Set(['/api/power','/api/verification','/api/nasa-csv','/api/boundaries','/api/ask']);
export async function applyRateControl(env,route){
 if(!COSTLY_ROUTES.has(route))return null;
 // Status and static assets intentionally do not consume the budget.
 const limiter=route==='/api/ask'?env.AI_RATE:env.NASA_RATE;
 if(!limiter?.limit)return null; // Lightweight Node preview/testing without Cloudflare bindings.
 try{
  const {success}=await limiter.limit({key:route==='/api/ask'?'ai:shared':route==='/api/boundaries'?'ncsi:shared':'nasa:shared'}); // public shared upstream budget, not an identity record
  if(success)return null;
  return new Response(JSON.stringify({error:'Too many upstream requests. Please retry in 60 seconds.',code:'RATE_LIMITED'}),{status:429,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Retry-After':'60','X-Content-Type-Options':'nosniff'}});
 }catch{
  return new Response(JSON.stringify({error:'API protection temporarily unavailable',code:'RATE_LIMIT_UNAVAILABLE'}),{status:503,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Retry-After':'10','X-Content-Type-Options':'nosniff'}});
 }
}
