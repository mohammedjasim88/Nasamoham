/** Pure statistical utilities. No AI-generated metrics. */
export function mean(values) { return values.length ? values.reduce((a,b)=>a+b,0)/values.length : NaN; }
export function round(value,digits=2){return Number.isFinite(value)?Number(value.toFixed(digits)):null;}
const LANCZOS=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
function logGamma(z){
 if(z<0.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
 z-=1;let x=LANCZOS[0];for(let i=1;i<LANCZOS.length;i++)x+=LANCZOS[i]/(z+i);
 const t=z+7.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);
}
function betaCF(a,b,x){
 const TINY=1e-30,EPS=3e-14;let c=1,d=1-(a+b)*x/(a+1);if(Math.abs(d)<TINY)d=TINY;d=1/d;let h=d;
 for(let m=1;m<=250;m++){
  const m2=2*m;let aa=m*(b-m)*x/((a+m2-1)*(a+m2));d=1+aa*d;if(Math.abs(d)<TINY)d=TINY;c=1+aa/c;if(Math.abs(c)<TINY)c=TINY;d=1/d;h*=d*c;
  aa=-(a+m)*(a+b+m)*x/((a+m2)*(a+m2+1));d=1+aa*d;if(Math.abs(d)<TINY)d=TINY;c=1+aa/c;if(Math.abs(c)<TINY)c=TINY;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<EPS)break;
 }return h;
}
function betaI(x,a,b){if(x<=0)return 0;if(x>=1)return 1;let bt=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log(1-x));return x<(a+1)/(a+b+2)?bt*betaCF(a,b,x)/a:1-bt*betaCF(b,a,1-x)/b;}
/** Two-sided Student's t p-value; suitable for ordinary least-squares slope test. */
export function tTwoSidedP(t,df){if(!Number.isFinite(t))return t===Infinity||t===-Infinity?0:null;if(df<1)return null;return Math.max(0,Math.min(1,betaI(df/(df+t*t),df/2,.5)));}
export function tCritical95(df){if(df<1)return null;let lo=0,hi=1000;for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(tTwoSidedP(mid,df)>.05)lo=mid;else hi=mid;}return(hi+lo)/2;}
/** OLS with intercept and two-sided slope t test. Important: does not correct serial correlation. */
export function linearTrend(records){
 const valid=records.filter(r=>Number.isFinite(r.year)&&Number.isFinite(r.value));
 const n=valid.length;if(n<3)return {n,valid:false,reason:'At least 3 annual observations required'};
 const mx=mean(valid.map(r=>r.year)),my=mean(valid.map(r=>r.value));
 let ssx=0,ssy=0,sxy=0;for(const r of valid){const dx=r.year-mx,dy=r.value-my;ssx+=dx*dx;ssy+=dy*dy;sxy+=dx*dy;}
 if(ssx===0)return {n,valid:false,reason:'No variation in years'};
 const slope=sxy/ssx,intercept=my-slope*mx;
 const sse=Math.max(0,ssy-slope*sxy);
 const standardError=Math.sqrt(sse/(n-2)/ssx);
 const t=standardError===0?(slope===0?0:Infinity):slope/standardError;
 const p=tTwoSidedP(t,n-2);
 const critical=tCritical95(n-2);
 const margin=critical*standardError;
 return {n,valid:true,start:Math.min(...valid.map(r=>r.year)),end:Math.max(...valid.map(r=>r.year)),mean:my,slope,perDecade:slope*10,intercept,pValue:p,significant:p!==null&&p<.05,standardError,ci95:[slope-margin,slope+margin],rSquared:ssy>0?Math.max(0,Math.min(1,1-sse/ssy)):(sse===0?1:0),observed:valid};
}
export function median(nums){const arr=nums.filter(Number.isFinite).sort((a,b)=>a-b);if(!arr.length)return null;const i=Math.floor(arr.length/2);return arr.length%2?arr[i]:(arr[i-1]+arr[i])/2;}
/** Flags anomalies; never deletes or corrects observations. Robust threshold is descriptive, not verification of errors. */
export function detectOutliers(records,{threshold=5}={}){
 const valid=records.filter(r=>Number.isFinite(r.value));if(valid.length<6)return [];
 const mid=median(valid.map(r=>r.value));const mad=median(valid.map(r=>Math.abs(r.value-mid)));
 if(mad===0||mad===null)return [];
 return valid.filter(r=>.6745*Math.abs(r.value-mid)/mad>threshold).map(r=>({...r,robustScore:.6745*Math.abs(r.value-mid)/mad}));
}
export const METRICS={
 T2M:{en:'Air temperature',ar:'درجة الحرارة',unit:'°C',annualDescription:'Annual mean',unitLabel:'°C'},
 RH2M:{en:'Relative humidity',ar:'الرطوبة النسبية',unit:'%',annualDescription:'Annual mean',unitLabel:'percentage points'},
 PRECTOTCORR_SUM:{en:'Precipitation',ar:'الأمطار',unit:'NASA reported',annualDescription:'Annual aggregate',unitLabel:'source units'}
};
// Preserve every requested calendar year. A missing year is missing data, not an omitted x-axis entry.
export function metricSeries(dataset,metric,start=2000,end=2025){
 if(!Number.isInteger(start)||!Number.isInteger(end)||end<start||end-start>150)return [];
 const byYear=new Map((dataset?.years||[]).map(row=>[row.year,row]));
 return Array.from({length:end-start+1},(_,i)=>{
  const year=start+i;
  const value=byYear.get(year)?.[metric]?.annual;
  return {year,value:typeof value==='number'&&Number.isFinite(value)&&value!==-999?value:null};
 });
}
// Keep all 12 month positions per calendar year; never compress missing months or invent zeroes.
export function monthlySeries(dataset,metric,start=2000,end=2025){
 if(!Number.isInteger(start)||!Number.isInteger(end)||end<start||end-start>150)return [];
 const byYear=new Map((dataset?.years||[]).map(row=>[row.year,row]));
 return Array.from({length:end-start+1},(_,i)=>start+i).flatMap(year=>
  Array.from({length:12},(_,i)=>{
   const value=byYear.get(year)?.[metric]?.monthly?.[i];
   return {year,month:i+1,value:typeof value==='number'&&Number.isFinite(value)&&value!==-999?value:null,label:`${year}-${String(i+1).padStart(2,'0')}`};
  })
 );
}
export function sameSeries(a,b){if(a.length!==b.length)return false;return a.length>0&&a.every((x,i)=>x.year===b[i].year&&x.value===b[i].value);}
export function checkQuality(dataset,metric,start=2000,end=2025){
 const series=metricSeries(dataset,metric,start,end),missing=series.filter(x=>!Number.isFinite(x.value));
 const invalid=series.filter(x=>Number.isFinite(x.value)&&((metric==='RH2M'&&(x.value<0||x.value>100))||(metric==='PRECTOTCORR_SUM'&&x.value<0)||(metric==='T2M'&&(x.value < -90||x.value > 70))));
 const anomalies=detectOutliers(series);
 const monthly=monthlySeries(dataset,metric,start,end);
 const monthlyOutliers=metric==='PRECTOTCORR_SUM'?detectOutliers(monthly.filter(x=>x.value>0),{threshold:12}):[];
 return {total:series.length,missing,invalid,anomalies,monthlyOutliers,complete:missing.length===0&&invalid.length===0};
}
