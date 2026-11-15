import {useEffect,useMemo,useState} from 'react';
import {RotateCcw,ZoomIn,ZoomOut} from 'lucide-react';
import type {KeyboardEvent} from 'react';
import {type YearValue,type Trend,formatNumber} from '../lib/evidence';

type Props={series:YearValue[];other?:YearValue[];trend?:Trend;label:string;secondLabel?:string;unit:string;lang:'ar'|'en'};
type Range=[number,number];

function makeSegments(values:YearValue[],xy:(r:YearValue)=>[number,number]):string[]{
 const paths:string[]=[];let part:string[]=[];
 for(const r of values){if(r.value==null||!Number.isFinite(r.value)){if(part.length)paths.push(part.join(' '));part=[];continue;}
 const [x,y]=xy(r);part.push(`${part.length===0?'M':'L'}${x.toFixed(2)},${y.toFixed(2)}`);}
 if(part.length)paths.push(part.join(' '));return paths;
}

export function TrendChart({series,other,trend,label,secondLabel,unit,lang}:Props){
 const [activeYear,setActiveYear]=useState<number|null>(null);
 const [zoom,setZoom]=useState<Range|null>(null);
 const ar=lang==='ar';
 useEffect(()=>{setActiveYear(null);setZoom(null);},[series,other]);
 const fullStart=Math.min(...series.map(r=>r.year)),fullEnd=Math.max(...series.map(r=>r.year));
 const minX=zoom?.[0]??fullStart,maxX=zoom?.[1]??fullEnd;
 const model=useMemo(()=>{
  const visible=(values:YearValue[]|undefined)=>values?.filter(r=>r.year>=minX&&r.year<=maxX)||[];
  const primaryValues=visible(series),secondaryValues=visible(other);
  const all=[...primaryValues,...secondaryValues].filter(r=>r.value!==null&&Number.isFinite(r.value));
  if(!all.length)return null;
  const values=all.map(r=>r.value as number),minV=Math.min(...values),maxV=Math.max(...values),pad=(maxV-minV||1)*.16;
  const lo=minV-pad,hi=maxV+pad;
  const W=740,H=255,L=48,R=18,T=15,B=34;
  const xy=(r:YearValue):[number,number]=>[L+(r.year-minX)/(maxX-minX||1)*(W-L-R),T+((hi-(r.value??lo))/(hi-lo))*(H-T-B)];
  const axis=[0,.25,.5,.75,1].map(t=>({y:T+(H-T-B)*t,value:hi-(hi-lo)*t}));
  const primary=makeSegments(primaryValues,xy),secondary=other?makeSegments(secondaryValues,xy):[];
  const trendLine=trend?.valid&&Number.isFinite(trend.slope)&&Number.isFinite(trend.intercept)?[minX,maxX].map(year=>xy({year,value:(trend.intercept||0)+(trend.slope||0)*year})):null;
  return {W,H,L,R,T,B,minX,maxX,axis,xy,primaryValues,secondaryValues,primary,secondary,trendLine};
 },[series,other,trend,minX,maxX]);
 if(!model)return <div className="empty-chart" role="status">{ar?'لا تتوفر بيانات صالحة لرسم السلسلة الزمنية.':'No valid values for this time-series chart.'}</div>;
 const a=activeYear===null?null:series.find(r=>r.year===activeYear),b=activeYear===null?null:other?.find(r=>r.year===activeYear);
 const currentStart=model.minX,currentEnd=model.maxX,fullSpan=fullEnd-fullStart+1,currentSpan=currentEnd-currentStart+1;
 const zoomIn=()=>{const span=Math.max(2,Math.floor(currentSpan*.7));if(span>=currentSpan)return;const center=activeYear??(currentStart+currentEnd)/2;const start=Math.max(fullStart,Math.min(fullEnd-span+1,Math.round(center-(span-1)/2)));const end=start+span-1;setZoom([start,end]);if(activeYear!==null)setActiveYear(Math.max(start,Math.min(end,activeYear)));};
 const zoomOut=()=>{const span=Math.min(fullSpan,Math.max(currentSpan+1,Math.ceil(currentSpan*1.6)));const center=activeYear??(currentStart+currentEnd)/2;const start=Math.max(fullStart,Math.min(fullEnd-span+1,Math.round(center-(span-1)/2)));const end=start+span-1;setZoom(span===fullSpan?null:[start,end]);if(activeYear!==null)setActiveYear(Math.max(start,Math.min(end,activeYear)));};
 const resetZoom=()=>{setZoom(null);setActiveYear(null);};
 const inspectPoint=(year:number)=>setActiveYear(year);
 const valueLabel=(year:number,value:number|null|undefined,seriesLabel:string)=>`${seriesLabel}, ${year}: ${formatNumber(value)} ${unit}`;
 const handlePointKey=(event:KeyboardEvent<SVGElement>,year:number)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();inspectPoint(year);}};
 return <div className="trend-chart">
  <div className="chart-toolbar" role="group" aria-label={ar?'تكبير الرسم البياني':'Chart zoom controls'}>
   <span className="chart-range"><bdi dir="ltr">{currentStart}–{currentEnd}</bdi></span>
   <button type="button" aria-label={ar?'تكبير':'Zoom in'} title={ar?'تكبير':'Zoom in'} onClick={zoomIn} disabled={currentSpan<=2}><ZoomIn size={16}/></button>
   <button type="button" aria-label={ar?'تصغير':'Zoom out'} title={ar?'تصغير':'Zoom out'} onClick={zoomOut} disabled={currentStart===fullStart&&currentEnd===fullEnd}><ZoomOut size={16}/></button>
   <button type="button" aria-label={ar?'إعادة ضبط التكبير':'Reset zoom'} title={ar?'إعادة ضبط التكبير':'Reset zoom'} onClick={resetZoom} disabled={currentStart===fullStart&&currentEnd===fullEnd}><RotateCcw size={15}/></button>
  </div>
  <div className="chart-legend"><span><i className="legend-primary"/>{label}</span>{other&&<span><i className="legend-secondary"/>{secondLabel}</span>}{trend?.valid&&<span><i className="legend-trend"/>{ar?'الانحدار الخطي':'Linear trend'}</span>}</div>
  <svg viewBox={`0 0 ${model.W} ${model.H}`} role="img" aria-label={ar?`رسم الاتجاه السنوي: ${label}`:`Annual trend graph: ${label}`} preserveAspectRatio="xMidYMid meet">
   {model.axis.map((g,i)=><g key={i}><line className="chart-grid" x1={model.L} y1={g.y} x2={model.W-model.R} y2={g.y}/><text x={model.L-9} y={g.y+4} className="axis-label" textAnchor="end">{formatNumber(g.value,g.value>100?0:1)}</text></g>)}
   {[model.minX,Math.round((model.minX+model.maxX)/2),model.maxX].map(y=><text key={y} x={model.xy({year:y,value:0})[0]} y={model.H-7} textAnchor="middle" className="axis-label">{y}</text>)}
   {model.trendLine&&<path d={`M ${model.trendLine[0][0]} ${model.trendLine[0][1]} L ${model.trendLine[1][0]} ${model.trendLine[1][1]}`} className="trend-line"/>}
   {model.primary.map((d,i)=><path key={`p${i}`} d={d} className="series-line series-primary"/>)}
   {model.secondary.map((d,i)=><path key={`s${i}`} d={d} className="series-line series-secondary"/>)}
   {model.primaryValues.filter(r=>r.value!==null&&Number.isFinite(r.value)).map(r=>{const [x,y]=model.xy(r),description=valueLabel(r.year,r.value,label);return <circle key={`p${r.year}`} cx={x} cy={y} r={activeYear===r.year?5:2.5} className="chart-dot" role="button" tabIndex={0} aria-label={description} onPointerEnter={()=>inspectPoint(r.year)} onFocus={()=>inspectPoint(r.year)} onClick={()=>inspectPoint(r.year)} onKeyDown={event=>handlePointKey(event,r.year)}><title>{description}</title></circle>;})}
   {model.secondaryValues.filter(r=>r.value!==null&&Number.isFinite(r.value)).map(r=>{const [x,y]=model.xy(r),description=valueLabel(r.year,r.value,secondLabel||'');return <path key={`s${r.year}`} d={`M ${x} ${y-4} L ${x+4} ${y} L ${x} ${y+4} L ${x-4} ${y} Z`} className="chart-dot-secondary" role="button" tabIndex={0} aria-label={description} onPointerEnter={()=>inspectPoint(r.year)} onFocus={()=>inspectPoint(r.year)} onClick={()=>inspectPoint(r.year)} onKeyDown={event=>handlePointKey(event,r.year)}><title>{description}</title></path>;})}
   {activeYear!==null&&a?.value!=null&&Number.isFinite(a.value)&&<g><line x1={model.xy({year:activeYear,value:0})[0]} x2={model.xy({year:activeYear,value:0})[0]} y1={model.T} y2={model.H-model.B} className="chart-inspection-line"/><circle cx={model.xy(a)[0]} cy={model.xy(a)[1]} r="6" className="chart-inspection-dot"/></g>}
  </svg>
  <div className="chart-year-row"><label htmlFor="chart-year">{ar?'افحص سنة:':'Inspect year:'}</label><input id="chart-year" type="range" min={model.minX} max={model.maxX} value={activeYear??model.maxX} onChange={e=>setActiveYear(Number(e.target.value))}/><strong>{activeYear??model.maxX}</strong></div>
  {activeYear!==null&&<p className="year-inspect">{valueLabel(activeYear,a?.value,label)}{other?` · ${valueLabel(activeYear,b?.value,secondLabel||'')}`:''}</p>}
 </div>;
}
