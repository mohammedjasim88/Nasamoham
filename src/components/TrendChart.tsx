import {useMemo,useState} from 'react';
import {type YearValue,type Trend,formatNumber} from '../lib/evidence';

type Props={series:YearValue[];other?:YearValue[];trend?:Trend;label:string;secondLabel?:string;unit:string;lang:'ar'|'en'};
function makeSegments(values:YearValue[],xy:(r:YearValue)=>[number,number]):string[]{
 const paths:string[]=[];let part:string[]=[];
 for(const r of values){if(r.value==null||!Number.isFinite(r.value)){if(part.length)paths.push(part.join(' '));part=[];continue;}
 const [x,y]=xy(r);part.push(`${part.length===0?'M':'L'}${x.toFixed(2)},${y.toFixed(2)}`);}
 if(part.length)paths.push(part.join(' '));return paths;
}
export function TrendChart({series,other,trend,label,secondLabel,unit,lang}:Props){
 const [activeYear,setActiveYear]=useState<number|null>(null);const ar=lang==='ar';
 const model=useMemo(()=>{
  const all=[...series,...(other||[])].filter(r=>r.value!==null&&Number.isFinite(r.value));
  if(!all.length)return null;
  const years=series.map(r=>r.year);const minX=Math.min(...years),maxX=Math.max(...years);
  const values=all.map(r=>r.value as number);const minV=Math.min(...values),maxV=Math.max(...values);const pad=(maxV-minV||1)*.16;
  const lo=minV-pad,hi=maxV+pad;
  const W=740,H=255,L=48,R=18,T=15,B=34;
  const xy=(r:YearValue):[number,number]=>[L+(r.year-minX)/(maxX-minX||1)*(W-L-R),T+((hi-(r.value??lo))/(hi-lo))*(H-T-B)];
  const axis=[0,.25,.5,.75,1].map(t=>({y:T+(H-T-B)*t,value:hi-(hi-lo)*t}));
  const primary=makeSegments(series,xy),secondary=other?makeSegments(other,xy):[];
  const trendLine=trend?.valid&&Number.isFinite(trend.slope)&&Number.isFinite(trend.intercept)?[minX,maxX].map(year=>xy({year,value:(trend.intercept||0)+(trend.slope||0)*year})):null;
  return {W,H,L,R,T,B,minX,maxX,axis,xy,primary,secondary,trendLine};
 },[series,other,trend]);
 if(!model)return <div className="empty-chart" role="status">{ar?'لا تتوفر بيانات صالحة لرسم السلسلة الزمنية.':'No valid values for this time-series chart.'}</div>;
 const a=activeYear===null?null:series.find(r=>r.year===activeYear),b=activeYear===null?null:other?.find(r=>r.year===activeYear);
 return <div className="trend-chart">
  <div className="chart-legend"><span><i className="legend-primary"/>{label}</span>{other&&<span><i className="legend-secondary"/>{secondLabel}</span>}{trend?.valid&&<span><i className="legend-trend"/>{ar?'الانحدار الخطي':'Linear trend'}</span>}</div>
  <svg viewBox={`0 0 ${model.W} ${model.H}`} role="img" aria-label={ar?`رسم الاتجاه السنوي: ${label}`:`Annual trend graph: ${label}`} preserveAspectRatio="xMidYMid meet">
   {model.axis.map((g,i)=><g key={i}><line className="chart-grid" x1={model.L} y1={g.y} x2={model.W-model.R} y2={g.y}/><text x={model.L-9} y={g.y+4} className="axis-label" textAnchor="end">{formatNumber(g.value,g.value>100?0:1)}</text></g>)}
   {[model.minX,Math.round((model.minX+model.maxX)/2),model.maxX].map(y=><text key={y} x={model.xy({year:y,value:0})[0]} y={model.H-7} textAnchor="middle" className="axis-label">{y}</text>)}
   {model.trendLine&&<path d={`M ${model.trendLine[0][0]} ${model.trendLine[0][1]} L ${model.trendLine[1][0]} ${model.trendLine[1][1]}`} className="trend-line"/>}
   {model.primary.map((d,i)=><path key={`p${i}`} d={d} className="series-line series-primary"/>)}
   {model.secondary.map((d,i)=><path key={`s${i}`} d={d} className="series-line series-secondary"/>)}
   {series.filter(r=>r.value!==null).map(r=>{const [x,y]=model.xy(r);return <circle key={r.year} cx={x} cy={y} r={activeYear===r.year?5:2.5} className="chart-dot"/>;})}
   {activeYear!==null&&a!=null&&a.value!=null&&Number.isFinite(a.value)&&<g><line x1={model.xy({year:activeYear,value:0})[0]} x2={model.xy({year:activeYear,value:0})[0]} y1={model.T} y2={model.H-model.B} stroke="#8de8fe" strokeDasharray="3 5"/><circle cx={model.xy(a)[0]} cy={model.xy(a)[1]} r="6" fill="#9bf1ff"/></g>}
  </svg>
  <div className="chart-year-row"><label htmlFor="chart-year">{ar?'افحص سنة:':'Inspect year:'}</label><input id="chart-year" type="range" min={model.minX} max={model.maxX} value={activeYear??model.maxX} onChange={e=>setActiveYear(Number(e.target.value))}/><strong>{activeYear??model.maxX}</strong></div>
  {activeYear!==null&&<p className="year-inspect">{a?.value===null||a?.value===undefined?'—':`${label}: ${formatNumber(a.value)} ${unit}`}{other?` · ${secondLabel}: ${formatNumber(b?.value)} ${unit}`:''}</p>}
 </div>;
}
