import {useEffect,useMemo,useRef,useState,type KeyboardEvent as ReactKeyboardEvent} from 'react';
import {BarChart3,BookOpen,FileCheck2,GitCompareArrows,Globe2,MapPinned,MessageSquareText,Search,ShieldCheck,X} from 'lucide-react';
import './CommandPalette.css';

export type Route='home'|'explorer'|'trends'|'compare'|'quality'|'verify'|'ask'|'about';
type Props={lang:'ar'|'en';open:boolean;onOpen:()=>void;onClose:()=>void;onNavigate:(route:Route)=>void};
const entries=[
 {route:'explorer' as Route,icon:MapPinned,en:'Interactive Earth Explorer',ar:'مستكشف الأرض',descEn:'Open map, choose a location and climate metric',descAr:'افتح الخريطة وحدّد الموقع والمتغير',tags:'map locations oman geography'},
 {route:'trends' as Route,icon:BarChart3,en:'Trend Analysis',ar:'تحليل الاتجاهات',descEn:'Review the annual trend and uncertainty',descAr:'افحص الاتجاه السنوي وحدود الدقة',tags:'graph chart slope data'},
 {route:'compare' as Route,icon:GitCompareArrows,en:'Compare Locations',ar:'مقارنة موقعين',descEn:'Compare two reference coordinates',descAr:'قارن بين إحداثيين مرجعيين',tags:'two sites compare cities'},
 {route:'verify' as Route,icon:FileCheck2,en:'NASA Verification Lab',ar:'مختبر التحقق من ناسا',descEn:'Check NASA data and download evidence',descAr:'طابق البيانات ونزّل ملف الأدلة',tags:'csv nasa api verify evidence download'},
 {route:'quality' as Route,icon:ShieldCheck,en:'Data Quality',ar:'جودة البيانات',descEn:'Inspect missing values and anomalies',descAr:'راجع القيم المفقودة والشاذة',tags:'quality anomaly provenance'},
 {route:'ask' as Route,icon:MessageSquareText,en:'Scientific Assistant',ar:'المساعد العلمي',descEn:'Ask about annual data, periods and reference locations',descAr:'اسأل عن البيانات السنوية والفترات والمواقع المرجعية',tags:'question explain ai temperature compare years assistant'},
 {route:'about' as Route,icon:BookOpen,en:'Sources & Methodology',ar:'المصادر والمنهجية',descEn:'See the datasets and their limitations',descAr:'اطلع على المصادر والقيود العلمية',tags:'source credits methodology'},
 {route:'home' as Route,icon:Globe2,en:'Cinematic Home',ar:'الصفحة الرئيسية',descEn:'Return to the interactive Earth',descAr:'العودة إلى الأرض ثلاثية الأبعاد',tags:'home intro earth'}
];
export default function CommandPalette({lang,open,onOpen,onClose,onNavigate}:Props){
 const [query,setQuery]=useState(''),[current,setCurrent]=useState(0);
 const search=useRef<HTMLInputElement>(null),panel=useRef<HTMLDivElement>(null),prior=useRef<HTMLElement|null>(null);
 const ar=lang==='ar';
 const results=useMemo(()=>{const q=query.trim().toLocaleLowerCase();return q?entries.filter(item=>`${item.en} ${item.ar} ${item.descEn} ${item.descAr} ${item.tags}`.toLocaleLowerCase().includes(q)):entries;},[query]);
 useEffect(()=>{const hotkey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open?onClose():onOpen();}};document.addEventListener('keydown',hotkey);return()=>document.removeEventListener('keydown',hotkey);},[open,onOpen,onClose]);
 useEffect(()=>{if(!open)return;prior.current=document.activeElement as HTMLElement;setQuery('');setCurrent(0);const old=document.body.style.overflow;document.body.style.overflow='hidden';search.current?.focus();return()=>{document.body.style.overflow=old;prior.current?.focus?.();};},[open]);
 useEffect(()=>{setCurrent(0);},[query]);
 if(!open)return null;
 const choose=(route:Route)=>{onClose();onNavigate(route);};
 const onKey=(e:ReactKeyboardEvent<HTMLDivElement>)=>{
  if(e.key==='Escape'){e.preventDefault();onClose();}
  if(e.key==='ArrowDown'){e.preventDefault();setCurrent(i=>Math.min(results.length-1,i+1));}
  if(e.key==='ArrowUp'){e.preventDefault();setCurrent(i=>Math.max(0,i-1));}
  if(e.key==='Enter'&&e.target===search.current&&results[current]){e.preventDefault();choose(results[current].route);}
  if(e.key==='Tab'){
   const els=[...(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])')||[])];
   if(!els.length)return;const first=els[0],last=els[els.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
 };
 return <div className="command-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div className="command-dialog" ref={panel} onKeyDown={onKey} role="dialog" aria-modal="true" aria-labelledby="command-title" dir={ar?'rtl':'ltr'}>
   <div className="command-heading"><div><span className="command-kicker">OMAN EARTH INTELLIGENCE</span><h2 id="command-title">{ar?'انتقل إلى أي قسم':'Quick navigation'}</h2></div><button className="command-close" onClick={onClose} aria-label={ar?'إغلاق':'Close'}><X size={20}/></button></div>
   <div className="command-search"><Search size={21} aria-hidden="true"/><input ref={search} role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="command-options" aria-activedescendant={results[current]?`command-option-${results[current].route}`:undefined} value={query} onChange={e=>setQuery(e.target.value)} placeholder={ar?'ابحث عن خريطة أو تحليل أو تحقق…':'Search maps, trends, verification…'} aria-label={ar?'البحث عن قسم':'Search navigation'}/><kbd>ESC</kbd></div>
   <div className="command-results" id="command-options" role="listbox" aria-label={ar?'نتائج الأقسام':'Navigation results'}>{results.length?results.map((item,i)=>{const Icon=item.icon;return <button id={`command-option-${item.route}`} key={item.route} role="option" aria-selected={current===i} onMouseEnter={()=>setCurrent(i)} className={`command-result ${current===i?'is-active':''}`} onClick={()=>choose(item.route)}><span className="command-result-icon"><Icon size={20}/></span><span className="command-result-text"><strong>{ar?item.ar:item.en}</strong><small>{ar?item.descAr:item.descEn}</small></span><span className="command-enter" aria-hidden="true">↵</span></button>;}):<div className="command-empty" role="status">{ar?'لا توجد أقسام مطابقة':'No matching sections'}</div>}</div>
   <div className="command-footer"><span>{ar?'استخدم الأسهم و Enter للتنقل':'Use ↑ ↓ and Enter to navigate'}</span><span>Ctrl / ⌘ + K</span></div>
  </div>
 </div>;
}
