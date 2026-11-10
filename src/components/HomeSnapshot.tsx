import {useEffect,useState} from 'react';
import {ArrowUpRight,Thermometer,Droplets,CloudRain} from 'lucide-react';
type Row={year:number;T2M?:{annual?:number|null};RH2M?:{annual?:number|null};PRECTOTCORR_SUM?:{annual?:number|null}};
export default function HomeSnapshot({ar,onVerify}:{ar:boolean;onVerify:()=>void}){
 const [row,setRow]=useState<Row|null>(null);
 useEffect(()=>{const controller=new AbortController();fetch('/data/muscat-east.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Snapshot unavailable');return r.json();}).then(d=>{const source=Array.isArray(d.years)?d.years.find((v:Row)=>v.year===2025):null;if(source)setRow(source);}).catch(()=>{});return()=>controller.abort();},[]);
 const cards=[{key:'T2M' as const,title:ar?'درجة الحرارة':'AIR TEMPERATURE',unit:'°C',Icon:Thermometer},{key:'RH2M' as const,title:ar?'الرطوبة النسبية':'RELATIVE HUMIDITY',unit:'%',Icon:Droplets},{key:'PRECTOTCORR_SUM' as const,title:ar?'الهطول المجمع':'PRECIPITATION',unit:ar?'وحدة المصدر قيد المراجعة':'source units under review',Icon:CloudRain}];
 return <section className="home-snapshot" aria-label={ar?'عينة تاريخية من مسقط شرق':'Muscat East historical snapshot'}>
  <div className="home-provenance"><strong>{ar?'مسقط · عينة شرق':'MUSCAT EAST'}</strong><span dir="ltr">23.5946°N · 58.7351°E</span><span>{ar?'لقطة 2025 · NASA POWER':'2025 snapshot · NASA POWER'}</span><button type="button" onClick={onVerify}>{ar?'تحقق من المصدر':'Verify source'}<ArrowUpRight size={15}/></button></div>
  <div className="home-snapshot-cards">{cards.map(({key,title,unit,Icon})=>{const value=row?.[key]?.annual;return <article key={key} className={`home-reading reading-${key}`}><div><Icon size={17}/><span>{title} · {key}</span></div><p><strong>{typeof value==='number'&&Number.isFinite(value)?value.toFixed(2):'—'}</strong><span>{unit}</span></p><small>{key==='PRECTOTCORR_SUM'?(ar?'دلالة وحدة التجميع تحتاج مراجعة':'Aggregation unit requires review'):(ar?'2025 · عينة مسقط شرق':'2025 · Muscat east snapshot')}</small></article>;})}</div>
 </section>;
}
