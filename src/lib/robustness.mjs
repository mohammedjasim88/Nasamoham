/** Descriptive sensitivity diagnostics. Does not alter NASA values or the existing OLS estimator. */
import {linearTrend,median} from './statistics.mjs';

/** Theil–Sen median pairwise slope; descriptive, not an autocorrelation-corrected p-value. */
export function theilSenSlope(records){
 const a=records.filter(r=>Number.isInteger(r.year)&&typeof r.value==='number'&&Number.isFinite(r.value)).sort((x,y)=>x.year-y.year);
 if(a.length<3)return null;
 const slopes=[];
 for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){
  const dt=a[j].year-a[i].year;
  if(dt>0)slopes.push((a[j].value-a[i].value)/dt);
 }
 return median(slopes);
}
export function lagOneResidualCorrelation(records,ols){
 if(!ols?.valid)return null;
 const a=records.filter(r=>Number.isInteger(r.year)&&Number.isFinite(r.value)).sort((x,y)=>x.year-y.year);
 const pairs=[];
 for(let i=1;i<a.length;i++)if(a[i].year-a[i-1].year===1){
  pairs.push([(a[i-1].value-(ols.intercept+ols.slope*a[i-1].year)),(a[i].value-(ols.intercept+ols.slope*a[i].year))]);
 }
 if(pairs.length<5)return null;
 const x=pairs.map(p=>p[0]),y=pairs.map(p=>p[1]);
 const mx=x.reduce((a,b)=>a+b,0)/x.length,my=y.reduce((a,b)=>a+b,0)/y.length;
 const top=pairs.reduce((a,p)=>a+(p[0]-mx)*(p[1]-my),0);
 const sx=x.reduce((a,v)=>a+(v-mx)**2,0),sy=y.reduce((a,v)=>a+(v-my)**2,0);
 return sx>0&&sy>0?Math.max(-1,Math.min(1,top/Math.sqrt(sx*sy))):null;
}
export function trendDiagnostics(series){
 const valid=series.filter(r=>Number.isInteger(r.year)&&Number.isFinite(r.value));
 const ols=linearTrend(valid);
 if(!ols.valid||valid.length<6)return {valid:false,observations:valid.length,reason:'At least six valid annual points required for sensitivity checks'};
 const slope=theilSenSlope(valid);
 const lag1=lagOneResidualCorrelation(valid,ols);
 const omissions=valid.map((item,i)=>{
  const model=linearTrend(valid.filter((_,j)=>j!==i));
  return model.valid?{year:item.year,slopePerDecade:model.perDecade}:null;
 }).filter(Boolean);
 const sorted=[...omissions].sort((a,b)=>Math.abs(a.slopePerDecade-ols.perDecade)-Math.abs(b.slopePerDecade-ols.perDecade));
 const influential=sorted.at(-1)||null;
 const gap=Math.abs((influential?.slopePerDecade??ols.perDecade)-ols.perDecade);
 return {valid:true,observations:valid.length,olsPerDecade:ols.perDecade,theilSenPerDecade:slope===null?null:slope*10,lag1Residual:lag1,leaveOneOutMin:Math.min(...omissions.map(a=>a.slopePerDecade)),leaveOneOutMax:Math.max(...omissions.map(a=>a.slopePerDecade)),mostInfluentialYear:influential?.year??null,maxChangePerDecade:gap,possibleSerialCorrelation:lag1!==null&&Math.abs(lag1)>=.3,sensitivityWarning:gap>Math.max(.1,Math.abs(ols.perDecade)*.3),notes:'Diagnostics are descriptive. No autocorrelation correction or replacement of the original NASA annual data is made.'};
}
