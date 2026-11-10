/** Supplementary inference. Original NASA records and legacy OLS are never changed.
 * Newey–West: Bartlett weights, n/(n-2) covariance correction, approximate t(n-2).
 * Mann–Kendall: tie-adjusted asymptotic normal test, no continuity correction.
 */
import {linearTrend, tTwoSidedP, tCritical95} from './statistics.mjs';

function annualRecords(records) {
  if (!Array.isArray(records)) return {valid:false, reason:'Annual records required'};
  const rows=records.filter(r=>Number.isInteger(r?.year)&&Number.isFinite(r?.value)&&r.value!==-999).map(r=>({...r})).sort((a,b)=>a.year-b.year);
  if (new Set(rows.map(r=>r.year)).size!==rows.length) return {valid:false, reason:'Duplicate years are not independent observations'};
  if (rows.length<10) return {valid:false, reason:'At least 10 valid annual observations required for approximate inference', n:rows.length};
  return {valid:true, rows, n:rows.length, omitted:records.length-rows.length};
}

export function neweyWestTrend(records, options={}) {
  const checked=annualRecords(records);
  if (!checked.valid) return checked;
  const {rows,n}=checked;
  // Never compress calendar gaps into adjacent years for a lag covariance.
  if (checked.omitted || rows.some((r,i)=>i>0&&r.year!==rows[i-1].year+1)) return {valid:false,reason:'HAC requires complete consecutive annual observations; no imputation is performed',n};
  const lag=options.lag??Math.floor(4*(n/100)**(2/9));
  if (!Number.isInteger(lag)||lag<0||lag>=n) return {valid:false,reason:'Invalid HAC bandwidth',n};
  const ols=linearTrend(rows);
  const mx=rows.reduce((s,r)=>s+r.year,0)/n;
  const my=rows.reduce((s,r)=>s+r.value,0)/n;
  const x=rows.map(r=>r.year-mx);
  const residuals=rows.map((r,i)=>r.value-my-ols.slope*x[i]);
  const ssx=x.reduce((s,v)=>s+v*v,0);
  const score=x.map((v,i)=>v*residuals[i]);
  let meat=score.reduce((s,v)=>s+v*v,0);
  for(let k=1;k<=lag;k++) {
    let cross=0;
    for(let i=k;i<n;i++) cross+=score[i]*score[i-k];
    meat+=2*(1-k/(lag+1))*cross;
  }
  const variance=Math.max(0,meat/(ssx*ssx)*n/(n-2));
  const standardError=Math.sqrt(variance);
  if (standardError<1e-14) return {valid:false,reason:'Degenerate residual variance: inferential uncertainty cannot be estimated reliably',n,perDecade:ols.perDecade};
  const pValue=tTwoSidedP(ols.slope/standardError,n-2);
  const margin=tCritical95(n-2)*standardError;
  return {valid:true,n,start:rows[0].year,end:rows.at(-1).year,lag,slope:ols.slope,perDecade:ols.perDecade,standardError,pValue,ci95:[ols.slope-margin,ols.slope+margin],significant:pValue<.05,method:'Newey–West HAC, Bartlett, n/(n-2), approximate t(n-2)',limitations:'Short annual series; bandwidth-sensitive approximation. Assumes a meaningful linear trend and weakly dependent errors. Not proof of causality or source accuracy.'};
}

// Normal two-sided tail approximation (absolute error below 1.5e-7).
function normalTwoSided(z) {
  const x=Math.abs(z),t=1/(1+.2316419*x);
  return Math.min(1,2*Math.exp(-x*x/2)/Math.sqrt(2*Math.PI)*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429)))));
}
export function mannKendall(records) {
  const checked=annualRecords(records);
  if(!checked.valid)return checked;
  const {rows,n}=checked;
  let s=0;const counts=new Map();
  for(let i=0;i<n;i++) {
    counts.set(rows[i].value,(counts.get(rows[i].value)||0)+1);
    for(let j=i+1;j<n;j++)s+=Math.sign(rows[j].value-rows[i].value);
  }
  const tieTerm=[...counts.values()].reduce((a,t)=>a+t*(t-1)*(2*t+5),0);
  const variance=(n*(n-1)*(2*n+5)-tieTerm)/18;
  if(variance===0)return {valid:false,n,s,reason:'All observations are tied; rank inference is undefined'};
  const z=s/Math.sqrt(variance),pValue=normalTwoSided(z);
  return {valid:true,n,s,variance,z,pValue,significant:pValue<.05,omitted:checked.omitted,method:'Mann–Kendall, tie-adjusted asymptotic normal, no continuity correction',limitations:'Assumes independent observations. NOT autocorrelation-adjusted. Missing-data selection can bias results.'};
}

/** Regress the within-year difference B-A, preserving concurrent covariance.
 * Inputs must describe the same metric and units (enforced by the caller).
 */
export function pairedTrendDifference(a,b) {
  const ca=annualRecords(a),cb=annualRecords(b);
  if(!ca.valid||!cb.valid)return {valid:false,reason:'Both series require at least 10 unique valid annual observations'};
  if(ca.omitted||cb.omitted||ca.n!==cb.n||ca.rows.some((r,i)=>r.year!==cb.rows[i].year))return {valid:false,reason:'Both series must contain the same complete years; unmatched years are not silently dropped'};
  const series=ca.rows.map((r,i)=>({year:r.year,value:cb.rows[i].value-r.value}));
  return {...neweyWestTrend(series),direction:'B minus A',series};
}
