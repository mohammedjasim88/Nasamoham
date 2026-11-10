import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {ArrowDown,ArrowRight,BarChart3,ChevronDown,Database,GitCompareArrows,Globe2,Info,Layers3,MapPinned,Menu,Search,Moon,Play,ShieldCheck,Sun,X} from 'lucide-react';
import './PremiumHome.css';
import HomeSnapshot from './HomeSnapshot';
import './FigmaExperience.css';

const EarthGlobe=lazy(()=>import('./EarthGlobe'));
type Destination='home'|'explorer'|'quality'|'trends'|'compare'|'verify'|'about';
type Props={lang:'en'|'ar';theme:'dark'|'light';onLanguage:()=>void;onTheme:()=>void;onNavigate:(target:Destination)=>void;onOpenCommand:()=>void};
const strings={
 en:{brand:'Oman Earth Intelligence',subtitle:'NASA POWER · Climate Explorer',home:'Home',explorer:'Explorer',data:'Data',analysis:'Analysis',about:'About',verify:'Verify NASA Data',eyebrow:'OMAN · FROM A NEW PERSPECTIVE',headlineOne:"A new perspective",headlineTwo:"on Oman’s climate.",intro:'Explore the places you know. Discover the patterns you cannot see. Historical NASA POWER data, made clear.',cards:['Interactive Maps','NASA Climate Data','Trend Analysis','Location Comparison'],start:'Start Exploring',explore:'Explore Climate Data',by:'Powered by NASA POWER',source:'Historical gridded climate data · not live weather',scroll:'Scroll to learn more',hint:'Drag the globe to explore · Arrow keys also work',value:'SCIENCE, NOT GUESSWORK',explain:'The interactive dashboard preserves source information, allows location-level comparisons and keeps scientific limitations visible.',method:'See the scientific data',provenance:'NASA Blue Marble imagery · geographic boundaries from Oman NCSI when available.',label:'Open',menu:'Open navigation',close:'Close navigation'},
 ar:{brand:'ذكاء الأرض العُماني',subtitle:'NASA POWER · مستكشف المناخ',home:'الرئيسية',explorer:'المستكشف',data:'البيانات',analysis:'التحليل',about:'عن المشروع',verify:'التحقق من NASA',eyebrow:'OMAN · FROM A NEW PERSPECTIVE',headlineOne:'منظور جديد',headlineTwo:'لمناخ سلطنة عُمان.',intro:'اكتشف البيانات التاريخية لدرجات الحرارة والرطوبة والهطول من NASA POWER عبر خرائط تفاعلية وتحليل مرئي ومعلومات علمية عن عُمان.',cards:['الخرائط التفاعلية','بيانات ناسا المناخية','تحليل الاتجاهات','مقارنة المواقع'],start:'ابدأ الاستكشاف',explore:'عرض سجلات البيانات',by:'مدعوم ببيانات NASA POWER',source:'بيانات مناخية شبكية تاريخية · وليست طقسًا مباشرًا',scroll:'مرر لمعرفة المزيد',hint:'اسحب الكرة لتدويرها · تعمل مفاتيح الأسهم أيضًا',value:'العلم بدل التخمين',explain:'تحافظ لوحة التحليل على مصادر البيانات وتتيح المقارنة بين المواقع وتوضح القيود العلمية.',method:'اعرض البيانات العلمية',provenance:'صور NASA Blue Marble · حدود عُمان من NCSI عند توفرها.',label:'فتح',menu:'فتح القائمة',close:'إغلاق القائمة'}
};
const cards:[Destination,typeof MapPinned,string][]=[
 ['explorer',MapPinned,'01'],['quality',Layers3,'02'],['trends',BarChart3,'03'],['compare',GitCompareArrows,'04']
];
export default function PremiumHome({lang,theme,onLanguage,onTheme,onNavigate,onOpenCommand}:Props){
 const t=strings[lang];const ar=lang==='ar';
 const [menuOpen,setMenuOpen]=useState(false),[launching,setLaunching]=useState(false),[focusSignal,setFocusSignal]=useState(0),[loadGlobe,setLoadGlobe]=useState(false);
 const [globeState,setGlobeState]=useState<'loading'|'ready'|'fallback'>('loading');
 const go=(target:Destination)=>{window.clearTimeout(launchTimer.current);setMenuOpen(false);setLaunching(false);onNavigate(target);};
 const launchTimer=useRef<number|undefined>(undefined);
 // The NASA Earth still is immediately visible; WebGL starts only after the first paint.
 useEffect(()=>{
  // Reduced-motion users still receive the interactive static WebGL globe when supported.
  let cancelled=false;
  let id:number|undefined;
  const start=()=>{if(!cancelled)setLoadGlobe(true);};
  const schedule=window.requestIdleCallback?.bind(window);
  if(schedule){id=schedule(start,{timeout:1000});return()=>{cancelled=true;if(id!==undefined)window.cancelIdleCallback(id);};}
  id=window.setTimeout(start,240);
  return()=>{cancelled=true;window.clearTimeout(id);};
 },[]);
 useEffect(()=>()=>window.clearTimeout(launchTimer.current),[]);
 const launch=()=>{
  if(launching)return;
  setLaunching(true);setFocusSignal(v=>v+1);
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // A short, deliberate camera move only on click: never block navigation on WebGL or API work.
  launchTimer.current=window.setTimeout(()=>go('explorer'),reduce?0:440);
 };
 const nav:[Destination,string][]=[['home',t.home],['explorer',t.explorer],['quality',t.data],['trends',t.analysis],['verify',t.verify],['about',t.about]];
 return <div className={`cinematic-home figma-home ${theme==='light'?'is-light':''} ${launching?'is-launching':''}`} dir={ar?'rtl':'ltr'}>
  <div className="cinematic-transition" aria-hidden="true"/>
  <div className="cinematic-sky" aria-hidden="true"/>
  <div className="cinematic-horizon" aria-hidden="true"/>
  <header className="cinematic-topbar">
    <button className="cinematic-brand" onClick={()=>go('home')} type="button" aria-label={t.home}>
      <span className="cinematic-brand-icon"><Globe2 size={38} strokeWidth={1.55}/><span className="brand-orbit"/></span>
      <span className="cinematic-brand-copy"><strong>{t.brand}</strong><small>{t.subtitle}</small></span>
    </button>
    <span className="cinematic-nav-divider"/>
    <nav className={`cinematic-nav ${menuOpen?'open':''}`} aria-label={ar?'التنقل الرئيسي':'Main navigation'}>
      {nav.map(([dest,label])=><button type="button" key={dest} onClick={()=>go(dest)} className={dest==='home'?'active':''} aria-current={dest==='home'?'page':undefined}>
        {dest==='home'?<Globe2 size={19}/>:dest==='explorer'?<MapPinned size={19}/>:dest==='quality'?<Layers3 size={19}/>:dest==='trends'?<BarChart3 size={19}/>:dest==='verify'?<ShieldCheck size={19}/>:<Info size={19}/>}
        <span>{label}</span>
      </button>)}
    </nav>
    <div className="cinematic-top-actions">
      <button className="cinematic-command" type="button" onClick={onOpenCommand} aria-label={ar?'التنقل السريع':'Quick navigation'} title="Ctrl / ⌘ + K"><Search size={19}/><span>{ar?'بحث':'Explore'}</span></button>
      <button className="cinematic-theme" type="button" aria-label={theme==='dark'?(ar?'الوضع الفاتح':'Switch to light mode'):(ar?'الوضع الداكن':'Switch to dark mode')} onClick={onTheme}>{theme==='dark'?<Sun size={23}/>:<Moon size={23}/>}</button>
      <div className="cinematic-language" aria-label="Language">
       <button type="button" className={lang==='en'?'selected':''} onClick={()=>lang!=='en'&&onLanguage()} aria-pressed={lang==='en'}>EN</button>
       <button type="button" className={lang==='ar'?'selected':''} onClick={()=>lang!=='ar'&&onLanguage()} aria-pressed={lang==='ar'}>AR</button>
      </div>
      <button className="cinematic-menu-btn" aria-label={menuOpen?t.close:t.menu} aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?<X size={22}/>:<Menu size={22}/>}</button>
    </div>
  </header>
  <main className="cinematic-content">
    <section className="cinematic-hero" aria-labelledby="cinematic-heading">
      <div className="cinematic-visual">
        <div className="orbital-loop orbital-loop-one" aria-hidden="true"/>
        <div className="orbital-loop orbital-loop-two" aria-hidden="true"/>
        {loadGlobe?<Suspense fallback={<div className="cinematic-earth-poster" aria-hidden="true"/>}>
          <EarthGlobe focusSignal={focusSignal} lang={lang} onRenderState={setGlobeState}/>
        </Suspense>:<div className="cinematic-earth-poster" role="img" aria-label={ar?'كوكب الأرض: صورة ناسا أولية':'Earth: NASA preview image'}/>}
        {globeState==='ready'&&<div className="globe-gesture">{t.hint}</div>}
      </div>
      <div className="cinematic-copy">
       <p className="cinematic-eyebrow"><span/>{t.eyebrow}</p>
       <h1 id="cinematic-heading"><span>{t.headlineOne}</span><em>{t.headlineTwo}</em></h1>
       <p className="cinematic-description">{t.intro}</p>
       <div className="cinematic-ctas">
        <button type="button" className="cinematic-primary" disabled={launching} onClick={launch} onPointerEnter={()=>{void import('./OmanMap');}} onFocus={()=>{void import('./OmanMap');}}><Play size={21} fill="currentColor"/><span>{launching?(ar?'الانتقال إلى عُمان…':'Entering Oman…'):t.start}</span><ArrowRight className="cinematic-arrow" size={24}/></button>
        <button type="button" className="cinematic-secondary" onClick={()=>go('trends')}><BarChart3 size={22}/><span>{t.explore}</span></button>
       </div>
       <div className="cinematic-powered"><div className="cinematic-nasa-badge">NASA</div><span className="powered-rule"/><div><strong>{t.by}</strong><small>{t.source}</small></div><ShieldCheck size={19} className="powered-check"/></div>
      </div>
    </section>
    <HomeSnapshot ar={ar} onVerify={()=>go('verify')}/>
    <div className="cinematic-scroll-indicator" aria-hidden="true"><span>{t.scroll}</span><ArrowDown size={18}/><ChevronDown size={18}/></div>
  </main>
  <section className="cinematic-next" aria-label={t.value}>
    <div className="figma-journey"><p className="eyebrow">EXPLORE → UNDERSTAND → VERIFY</p><h2>{ar?'فضولك بداية الرحلة العلمية.':'Your curiosity. A scientific path.'}</h2><p>{ar?'اختر مكاناً، تابع سجله المناخي، ثم افحص الدليل.':'Choose a place, follow its climate story, then inspect the evidence.'}</p>       <div className="cinematic-features">
        {cards.map(([dest,Icon,num],index)=><button key={dest} type="button" className="cinematic-feature" onClick={()=>go(dest)} aria-label={`${t.label}: ${t.cards[index]}`}>
         <Icon size={30} strokeWidth={1.8}/><strong>{t.cards[index]}</strong><span className="feature-no">{num}</span>
        </button>)}
       </div>
</div>
    <div className="cinematic-next-content"><p>{t.value}</p><h2>{t.by}</h2><span>{t.explain}</span><button onClick={()=>go('quality')}>{t.method}<ArrowRight size={17}/></button></div>
    <button type="button" className="cinematic-verify-link" onClick={()=>go('verify')}><ShieldCheck size={19}/><span>{t.verify}</span><ArrowRight size={18}/></button><div className="cinematic-source-note"><Database size={18}/><span>{t.provenance}</span><a target="_blank" rel="noopener noreferrer" href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/">NASA Blue Marble</a></div>
  </section>
 </div>;
}
