import {useEffect,useRef,useState} from 'react';
import {RotateCcw} from 'lucide-react';
import {POINTS,type Point} from '../lib/locations';
import {projectReference,referencePaths} from '../lib/reference-geography.mjs';

type Props={canRetry?:boolean;selected:Point;select:(id:string)=>void;lang:'en'|'ar';showBoundaries:boolean;showWilayats:boolean;onRetry:()=>void;onBoundaryStatus:(message:string)=>void;unavailable:React.ReactNode};
/** Uses the existing NCSI endpoint. SVG needs neither WebGL nor a tile service. */
export default function ReferenceMap({canRetry=true,selected,select,lang,showBoundaries,showWilayats,onRetry,onBoundaryStatus,unavailable}:Props){
 const [paths,setPaths]=useState<Array<{id:string;d:string}>|null>(null);
 const [failed,setFailed]=useState(false),ar=lang==='ar';
 const report=useRef(onBoundaryStatus);report.current=onBoundaryStatus;
 useEffect(()=>{
  const abort=new AbortController();let active=true;
  const timer=window.setTimeout(()=>abort.abort(),18000);
  fetch('/api/boundaries?level=governorates',{signal:abort.signal})
   .then(async r=>{if(!r.ok)throw new Error('Boundaries unavailable');return r.json();})
   .then(data=>{const result=referencePaths(data);if(active)setPaths(result);})
   .catch(()=>{if(active)setFailed(true);}).finally(()=>clearTimeout(timer));
  return ()=>{active=false;abort.abort();clearTimeout(timer);};
 },[]);
 useEffect(()=>{
  if(paths)report.current(ar?'مرجع NCSI ثنائي الأبعاد: 11 محافظة؛ حدود الولايات غير معروضة في هذا الوضع':'2D NCSI reference: 11 governorates; wilayat outlines are not displayed in this mode');
 },[paths,ar]);
 if(failed)return <div className="reference-map reference-map-unavailable">{unavailable}</div>;
 return <div className="reference-map" dir={ar?'rtl':'ltr'}>
  <div className="reference-map-heading"><div><strong>{ar?'عُمان · مرجع جغرافي':'Oman · geographic reference'}</strong><small>{ar?'عرض خفيف يعمل دون رسومات ثلاثية الأبعاد':'Lightweight view · no 3D graphics required'}</small></div>{canRetry?<button type="button" onClick={onRetry}><RotateCcw size={16}/>{ar?'إعادة محاولة الخريطة الكاملة':'Retry full map'}</button>:<small>{ar?'العرض الكامل والأنماط يتطلبان WebGL2':'Full map and styles require WebGL2'}</small>}</div>
  {!paths?<div className="reference-map-loading" role="status">{ar?'جار تحميل حدود NCSI…':'Loading NCSI geography…'}</div>:<>
   <svg className="reference-geography" viewBox="0 0 680 860" role="group" aria-label={ar?'حدود عُمان من NCSI ومواقع مرجعية':'NCSI Oman geography and reference locations'}>
    <g className="reference-graticule" aria-hidden="true">{[18,20,22,24,26].map(lat=>{const y=projectReference(52,lat)[1];return <path key={lat} d={`M20 ${y}H660`}/>;})}</g>
    <g className={`reference-regions ${showBoundaries?'':'hide-boundaries'}`} fillRule="evenodd">{paths.map(path=><path key={path.id} d={path.d}/>)}</g>
    {POINTS.filter(p=>p.id!==selected.id).concat(selected).map(p=>{const [anchorX,anchorY]=projectReference(p.lon,p.lat),active=p.id===selected.id;
     // Separate the two nearby Muscat controls, while retaining the exact coordinate anchor.
     const offset=p.id==='muscat-east'?[38,-30]:p.id==='muscat-west'?[-38,30]:[0,0];const x=anchorX+offset[0],y=anchorY+offset[1];
     return <g key={p.id}>
      {(offset[0]!==0)&&<g className="reference-point-leader" aria-hidden="true"><path d={`M${anchorX} ${anchorY}L${x} ${y}`}/><circle cx={anchorX} cy={anchorY} r="3"/></g>}
      <g className={`reference-point ${active?'selected':''}`} role="button" tabIndex={0} aria-label={`${ar?p.ar:p.en}: ${p.lat}°N, ${p.lon}°E`} aria-pressed={active} onClick={()=>select(p.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(p.id);}}}>
       <circle cx={x} cy={y} r="22" className="reference-point-hit"/><circle cx={x} cy={y} r={active?9:5} className="reference-point-dot"/>
       {active&&<circle cx={x} cy={y} r="17" className="reference-point-ring"/>}
      </g>
      {active&&<text className="reference-selected-label" x={x>500?x-23:x+23} y={y-24} textAnchor={x>500?'end':'start'} direction="ltr" pointerEvents="none">{ar?p.ar:p.en}</text>}
     </g>;})}
   </svg>
   <label className="reference-location-picker">{ar?'اختر موقعاً مرجعياً':'Choose a reference location'}<select value={selected.id} onChange={e=>select(e.target.value)}>{POINTS.map(p=><option key={p.id} value={p.id}>{ar?p.ar:p.en}</option>)}</select></label>
   <p className="reference-map-source">{ar?'المصدر: NCSI · إسقاط مركاتور · لا يمثل متوسط المحافظة أو صور الأقمار الصناعية':'NCSI source · Mercator projection · point estimates, not area averages or satellite imagery'}{showWilayats&&(ar?' · حدود الولايات تتطلب الخريطة الكاملة':' · Wilayat outlines require the full map')}</p>
  </>}
 </div>;
}
