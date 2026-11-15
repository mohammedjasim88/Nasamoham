import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {RotateCcw,ZoomIn,ZoomOut} from 'lucide-react';
import type {Trend,YearValue} from '../lib/evidence';
import {formatNumber} from '../lib/evidence';
import {alignAnnualSeries} from '../lib/chart-series.mjs';
import {TrendChart} from './TrendChart';

type Props={
 series:YearValue[];
 other?:YearValue[];
 trend?:Trend;
 label:string;
 secondLabel?:string;
 unit:string;
 lang:'ar'|'en';
 theme:'dark'|'light';
};
type YearRange=[number,number];
type ZoomEvent={start?:number;end?:number;batch?:{start?:number;end?:number}[]};

function escapeHtml(text:string):string{
 return text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));
}

function readZoomRange(value:unknown):[number,number]|null{
 if(!value||typeof value!=='object')return null;
 const event=value as ZoomEvent;
 const range=event.batch?.[0]??event;
 return Number.isFinite(range.start)&&Number.isFinite(range.end)?[range.start as number,range.end as number]:null;
}

export function InteractiveTrendChart({series,other,trend,label,secondLabel,unit,lang,theme}:Props){
 const id=useId().replaceAll(':','');
 const wrapperRef=useRef<HTMLDivElement>(null);
 const stageRef=useRef<HTMLDivElement>(null);
 const chartRef=useRef<import('echarts/core').EChartsType|null>(null);
 const aligned=useMemo(()=>alignAnnualSeries(series,other),[series,other]);
 const [ready,setReady]=useState(false);
 const [failed,setFailed]=useState(false);
 const [activeYear,setActiveYear]=useState<number|null>(null);
 const [zoom,setZoom]=useState<YearRange|null>(null);
 const ar=lang==='ar';
 const firstYear=aligned.years[0]??0;
 const lastYear=aligned.years[aligned.years.length-1]??0;
 const currentRange=zoom??[firstYear,lastYear];
 const fullSpan=lastYear-firstYear+1;
 const currentSpan=currentRange[1]-currentRange[0]+1;
 const hasValues=aligned.primary.some(Number.isFinite)||aligned.secondary.some(Number.isFinite);
 const visibleYear=activeYear??lastYear;
 const primaryValue=series.find(record=>record.year===visibleYear)?.value??null;
 const secondaryValue=other?.find(record=>record.year===visibleYear)?.value??null;

 useEffect(()=>{
  setActiveYear(null);
  setZoom(null);
 },[series,other]);

 useEffect(()=>{
  const element=stageRef.current;
  const wrapper=wrapperRef.current;
  if(!element||!wrapper||!hasValues)return;
  let disposed=false;
  let observer:ResizeObserver|undefined;
  let chart:import('echarts/core').EChartsType|undefined;
  setReady(false);setFailed(false);
  const resize=()=>chart?.resize();
  void import('../lib/echarts-runtime').then(({echarts})=>{
   if(disposed)return;
   chart=echarts.init(element,undefined,{renderer:'canvas'});
   chartRef.current=chart;
   chart.on('datazoom',event=>{
    const range=readZoomRange(event);
    if(!range)return;
    const span=lastYear-firstYear;
    if(!span)return;
    const start=Math.round(firstYear+span*range[0]/100);
    const end=Math.round(firstYear+span*range[1]/100);
    setZoom(start<=firstYear&&end>=lastYear?null:[start,end]);
   });
   if(typeof ResizeObserver!=='undefined'){
    observer=new ResizeObserver(resize);
    observer.observe(wrapper);
   }else{
    window.addEventListener('resize',resize);
   }
   setReady(true);
  }).catch(()=>{
   if(!disposed)setFailed(true);
  });
  return()=>{
   disposed=true;
   observer?.disconnect();
   window.removeEventListener('resize',resize);
   chart?.dispose();
   if(chartRef.current===chart)chartRef.current=null;
  };
 },[hasValues,firstYear,lastYear]);

 useEffect(()=>{
  if(!ready||!chartRef.current||!wrapperRef.current||!aligned.years.length)return;
  const styles=getComputedStyle(wrapperRef.current);
  const color=(token:string,fallback:string)=>styles?.getPropertyValue(token).trim()||fallback;
  const palette={
   text:color('--chart-text','#dce9f2'),
   muted:color('--chart-muted','#a9bdca'),
   grid:color('--chart-grid','rgba(130,168,190,.25)'),
   primary:color('--chart-primary','#49dcf3'),
   secondary:color('--chart-secondary','#ffb884'),
   trend:color('--chart-trend','#ad8bff'),
   tooltip:color('--chart-tooltip','#102235')
  };
  const span=lastYear-firstYear;
  const range=zoom??[firstYear,lastYear];
  const start=span?Math.max(0,(range[0]-firstYear)/span*100):0;
  const end=span?Math.min(100,(range[1]-firstYear)/span*100):100;
  const observations=[
   {name:label,values:aligned.primary,color:palette.primary},
   ...(other?[{name:secondLabel||'',values:aligned.secondary,color:palette.secondary}]:[])
  ];
  const seriesOptions:import('echarts/charts').LineSeriesOption[]=[
   ...observations.map(observation=>({
    name:observation.name,
    type:'line' as const,
    data:observation.values,
    connectNulls:false,
    showSymbol:true,
    symbol:observation.name===label?'circle' as const:'diamond' as const,
    symbolSize:6,
    lineStyle:{color:observation.color,width:2.5},
    itemStyle:{color:observation.color},
    emphasis:{focus:'series' as const,scale:1.3}
   }))
  ];
  const hasTrend=!!trend?.valid&&Number.isFinite(trend.slope)&&Number.isFinite(trend.intercept);
  const trendLabel=ar?'اتجاه OLS الوصفي':'Descriptive OLS trend';
  if(hasTrend){
   seriesOptions.push({
    name:trendLabel,
    type:'line',
    data:aligned.years.map(year=>trend!.intercept!+trend!.slope!*year),
    symbol:'none',
    connectNulls:false,
    lineStyle:{color:palette.trend,width:1.8,type:'dashed'}
   });
  }
  const option={
   animation:!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&
    Number.isFinite((navigator as Navigator&{deviceMemory?:number}).deviceMemory)&&
    (navigator as Navigator&{deviceMemory?:number}).deviceMemory!>=8,
   animationDuration:180,
   aria:{enabled:true,label:{description:ar?`الرسم البياني للاتجاه السنوي: ${label}، ${firstYear}–${lastYear}، ${unit}`:`Annual trend graph: ${label}, ${firstYear}–${lastYear}, ${unit}`}},
   color:[palette.primary,palette.secondary,palette.trend],
   grid:{left:14,right:20,top:30,bottom:77,containLabel:true},
   legend:{show:!!other||hasTrend,top:0,textStyle:{color:palette.muted},type:'scroll'},
   tooltip:{
    axisPointer:{type:'line',snap:true},
    renderMode:'html',
    trigger:'axis',
    confine:true,
    borderWidth:1,
    borderColor:palette.grid,
    backgroundColor:palette.tooltip,
    textStyle:{color:palette.text},
    formatter:(parameters:unknown)=>{
     const point=Array.isArray(parameters)?parameters[0]:parameters;
     const index=point&&typeof point==='object'&&'dataIndex'in point&&typeof point.dataIndex==='number'?point.dataIndex:-1;
     if(index<0||index>=aligned.years.length)return '';
     const year=aligned.years[index];
     setActiveYear(current=>current===year?current:year);
     const lines=observations.map(observation=>{
      const value=observation.values[index];
      return `<br><span style="color:${observation.color}">●</span> ${escapeHtml(observation.name)}: ${value==null?'—':escapeHtml(formatNumber(value))} ${escapeHtml(unit)}`;
     });
     if(other&&Number.isFinite(aligned.primary[index])&&Number.isFinite(aligned.secondary[index])){
      lines.push(`<br>${escapeHtml(ar?'الأول ناقص الثاني':'First minus second')}: ${escapeHtml(formatNumber(aligned.primary[index]-aligned.secondary[index]))} ${escapeHtml(unit==='%'?(ar?'نقطة مئوية':'percentage points'):unit)}`);
     }
     return `<strong>${year}</strong>${lines.join('')}`;
    }
   },
   xAxis:{
    type:'category',
    data:aligned.years.map(String),
    boundaryGap:false,
    axisLabel:{color:palette.muted,hideOverlap:true},
    axisLine:{lineStyle:{color:palette.grid}},
    axisTick:{alignWithLabel:true}
   },
   yAxis:{
    type:'value',
    scale:true,
    name:unit,
    nameTextStyle:{color:palette.muted},
    axisLabel:{color:palette.muted,formatter:(value:number)=>formatNumber(value,Number.isInteger(value)?0:1)},
    axisLine:{show:false},
    splitLine:{lineStyle:{color:palette.grid,type:'dashed'}}
   },
   dataZoom:[
    {type:'inside',xAxisIndex:0,start,end,filterMode:'none',zoomOnMouseWheel:true,moveOnMouseWheel:false},
    {type:'slider',xAxisIndex:0,start,end,bottom:13,height:19,filterMode:'none',borderColor:palette.grid,
     textStyle:{color:palette.muted},handleStyle:{color:palette.primary},dataBackground:{lineStyle:{color:palette.grid},areaStyle:{color:palette.grid}}}
   ],
   series:seriesOptions
  } satisfies import('echarts').EChartsOption;
  chartRef.current.setOption(option,{notMerge:true,lazyUpdate:true});
 },[aligned,ar,firstYear,lastYear,label,other,ready,secondLabel,theme,trend,unit,zoom]);

 useEffect(()=>{
  if(!ready||activeYear===null||!chartRef.current)return;
  chartRef.current.dispatchAction({type:'showTip',seriesIndex:0,dataIndex:activeYear-firstYear});
 },[activeYear,firstYear,ready]);

 if(!hasValues)return <div className="empty-chart" role="status">{ar?'لا تتوفر بيانات صالحة لرسم السلسلة الزمنية.':'No valid values for this time-series chart.'}</div>;

 const zoomIn=()=>{
  const span=Math.max(2,Math.floor(currentSpan*.7));
  if(span>=currentSpan)return;
  const center=activeYear??(currentRange[0]+currentRange[1])/2;
  const start=Math.max(firstYear,Math.min(lastYear-span+1,Math.round(center-(span-1)/2)));
  setZoom([start,start+span-1]);
 };
 const zoomOut=()=>{
  const span=Math.min(fullSpan,Math.max(currentSpan+1,Math.ceil(currentSpan*1.6)));
  const center=activeYear??(currentRange[0]+currentRange[1])/2;
  const start=Math.max(firstYear,Math.min(lastYear-span+1,Math.round(center-(span-1)/2)));
  setZoom(span===fullSpan?null:[start,start+span-1]);
 };
 const resetZoom=()=>{setZoom(null);setActiveYear(null);};
 const valueLabel=(seriesLabel:string,value:number|null)=>`${seriesLabel}, ${visibleYear}: ${formatNumber(value)} ${unit}`;
 const difference=primaryValue!==null&&secondaryValue!==null?primaryValue-secondaryValue:null;
 const chartName=ar?`الرسم البياني للاتجاه السنوي: ${label}`:`Annual trend graph: ${label}`;

 return <div ref={wrapperRef} className="interactive-trend-chart" data-theme={theme}>
  <div className="chart-toolbar" role="group" aria-label={ar?'عناصر تكبير الرسم البياني':'Chart zoom controls'}>
   <span className="chart-range"><bdi dir="ltr">{currentRange[0]}–{currentRange[1]}</bdi></span>
   <button type="button" aria-label={ar?'تكبير':'Zoom in'} title={ar?'تكبير':'Zoom in'} onClick={zoomIn} disabled={currentSpan<=2}><ZoomIn size={16}/></button>
   <button type="button" aria-label={ar?'تصغير':'Zoom out'} title={ar?'تصغير':'Zoom out'} onClick={zoomOut} disabled={!zoom}><ZoomOut size={16}/></button>
   <button type="button" aria-label={ar?'إعادة ضبط التكبير':'Reset zoom'} title={ar?'إعادة ضبط التكبير':'Reset zoom'} onClick={resetZoom} disabled={!zoom&&!activeYear}><RotateCcw size={15}/></button>
  </div>
  <div className={`interactive-chart-stage ${ready?'is-ready':''}`} ref={stageRef} role="img" aria-label={chartName} aria-hidden={!ready}/>
  {!ready&&<div className="interactive-chart-fallback"><TrendChart series={series} other={other} trend={trend} label={label} secondLabel={secondLabel} unit={unit} lang={lang}/></div>}
  {failed&&<p className="chart-fallback-status" role="status">{ar?'تعذّر تحميل الرسم التفاعلي؛ ما زال الرسم البديل متاحاً.':'Interactive chart unavailable; the accessible SVG chart remains available.'}</p>}
  {ready&&<div className="chart-year-row">
   <label htmlFor={`${id}-year`}>{ar?'افحص سنة:':'Inspect year:'}</label>
   <input id={`${id}-year`} type="range" min={firstYear} max={lastYear} value={visibleYear} onChange={event=>setActiveYear(Number(event.target.value))}/>
   <strong>{visibleYear}</strong>
  </div>}
  {ready&&<p className="year-inspect" aria-live="polite">
   {valueLabel(label,primaryValue)}{other?` · ${valueLabel(secondLabel||'',secondaryValue)}`:''}
   {other&&difference!==null&&<span className="chart-difference"> · {ar?'الأول ناقص الثاني':'First minus second'}: {formatNumber(difference)} {unit==='%'?(ar?'نقطة مئوية':'percentage points'):unit}</span>}
  </p>}
  {ready&&<details className="chart-data-table">
   <summary>{ar?'عرض جدول القيم السنوية':'View annual values table'}</summary>
   <div className="chart-table-scroll"><table><thead><tr><th>{ar?'السنة':'Year'}</th><th>{label} ({unit})</th>{other&&<th>{secondLabel} ({unit})</th>}</tr></thead>
    <tbody>{aligned.years.map((year,index)=><tr key={year}><th scope="row">{year}</th><td>{aligned.primary[index]===null?'—':formatNumber(aligned.primary[index])}</td>{other&&<td>{aligned.secondary[index]===null?'—':formatNumber(aligned.secondary[index])}</td>}</tr>)}</tbody>
   </table></div>
  </details>}
 </div>;
}
