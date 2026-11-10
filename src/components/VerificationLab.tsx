import {useCallback,useEffect,useRef,useState,type ChangeEvent} from 'react';
import {AlertCircle,ArrowRightLeft,CheckCircle2,CloudDownload,Database,Download,ExternalLink,FileArchive,FileCheck2,FileDown,FileUp,Globe2,Info,LoaderCircle,MapPin,RefreshCw,ShieldCheck,ShieldQuestion,TriangleAlert,XCircle} from 'lucide-react';
import {POINTS,METRICS,METRIC_DETAILS,type Metric,type Point} from '../lib/locations';
import type {DataSet,YearValue} from '../lib/evidence';
// @ts-ignore - shared ESM comparison utilities are covered by Node tests.
import {compareAnnualSeries,readWebsiteCsv} from '../lib/verification.mjs';
// @ts-ignore - source-preserving ZIP utilities are covered by Node archive tests.
import {buildEvidenceArchive} from '../lib/verification-evidence.mjs';
// @ts-ignore - self-test uses pure Node-tested shared ESM utility.
import {runVerificationSelfTest} from '../lib/verification-selftest.mjs';
import './VerificationLab.css';

type Lang='ar'|'en';
type Status='matched'|'different'|'missingSite'|'missingNasa'|'missingBoth';
type Comparison={rows:{year:number;site:number|null;nasa:number|null;difference:number|null;status:Status}[];summary:{matched:number;different:number;missingSite:number;missingNasa:number;missingBoth:number;total:number};passed:boolean;tolerance:number};
type NasaResponse={source:string;sourceUrl:string;metric:Metric;latitude:number;longitude:number;start:number;end:number;retrievedAt:string;unit:string|null;cached:boolean;annualField:string;years:YearValue[];sourceRawJson:string};
type VerificationResult={location:Point;comparison:Comparison;nasa:NasaResponse;sourceType:'uploaded'|'site';sourceLabel:string};
type Props={lang:Lang;place:Point;secondPlace:Point;metric:Metric;start:number;end:number;dataset:DataSet|null;other:DataSet|null;siteSeries:YearValue[]|null;secondSeries:YearValue[]|null;includeSecond:boolean;busy:boolean;secondBusy:boolean;canSwitchSnapshot:boolean;onIncludeSecond:(value:boolean)=>void;onPlace:(id:string)=>void;onSecondPlace:(id:string)=>void;onMetric:(metric:Metric)=>void;onStart:(year:number)=>void;onEnd:(year:number)=>void;onLive:(live:boolean)=>void;live:boolean;onExportSite:()=>void;onExportSecond:()=>void};

const copy={
 en:{subtitle:'Independent source checks · annual values · NASA POWER',headline:'NASA Verification Lab',hero:'Verify every climate reading against a fresh NASA POWER API response. Compare the exact coordinates, metric and years shown on your dashboard.',scope:'Single point / grid estimate · not a governorate-wide average or a ground-station validation',configure:'Verification scope',place:'Location A',second:'Location B',variable:'Climate variable',years:'Year range',start:'From',end:'To',pair:'Verify two locations',live:'Live API on dashboard',snap:'Historical snapshot on dashboard',fetch:'Verify against NASA',checking:'Requesting independent NASA data…',source:'Website series',upload:'Upload a website CSV for comparison',uploadHint:'Optional · your CSV stays in this browser, never sent to the server. Must include Year, metric and coordinate columns.',clear:'Use current website data',file:'Uploaded CSV',downloadNasa:'Download original NASA CSV',downloadSite:'Download website CSV',downloadReport:'Download comparison report',evidenceTitle:'Verification evidence archive',evidenceBody:'Keep the exact original NASA JSON from this check, annual comparisons, website values, timestamps and SHA-256 checksums together in one ZIP file.',evidenceButton:'Download Verification Evidence',evidenceReview:'Review required — the archive records all differences and missing values, not a successful certification.',evidenceReady:'Evidence is available after a completed verification. No NASA values are fabricated.',evidenceLoading:'Building evidence ZIP…',evidenceFailure:'Evidence could not be prepared. Run verification again if the original NASA response is unavailable.',evidenceFiles:'Original NASA JSON · annual comparison CSV · source values · SHA-256 manifest',nasa:'Open original NASA API response',method:'NASA monthly API documentation',matched:'Matched',different:'Different',missing:'Missing / unverified',yearsLabel:'Annual rows',notRun:'Not checked',notRunDesc:'Choose the same location, variable and dates as your analysis, then run a fresh independent check.',fail:'Could not complete verification',pass:'All annual values match NASA within ±0.01 of the metric unit.',partial:'Differences or missing values need review. This is not a verified match.',header:'Year-by-year evidence',sourceYear:'Website',nasaYear:'NASA original',delta:'Difference',status:'Result',details:'Inspect annual evidence',retrieval:'Independent retrieval',origin:'NASA original URL',uncertainty:'Matching NASA only confirms correspondence with its gridded dataset; it does not verify ground-station accuracy or governorate averages.',rainWarning:'Precipitation aggregation and the 2024 anomaly require careful interpretation even if annual numbers match.',identical:'Both locations return identical annual gridded series. Matching NASA does not establish spatial independence.',snapNotice:'Stored historical values are compared with a new NASA request; they are not treated as NASA-verified before the comparison runs.',apiNotice:'The dashboard API may cache its response; verification always makes a separate uncached request.',fileWarning:'The uploaded website CSV replaces Location A website values for comparison only. It does not change the published data.',noData:'Website data is still loading or unavailable.',refresh:'Check again',official:'Original NASA CSV (monthly + annual)',notComparable:'No comparable annual observations',coordinateMismatch:'Website coordinates differ from the chosen point. Comparison stopped to prevent a false match.',last:'No comparison has been performed for these settings.',errorUpload:'Could not read CSV',tableEmpty:'No annual values to display',checkingFile:'Preparing download…',nasaDownError:'NASA CSV download failed. Use the official NASA link instead.',single:'One location',dual:'Two locations',both:'Sites verified',fileFormat:'Upload a CSV exported by this website, not the raw NASA monthly CSV. The original NASA CSV can be downloaded separately.'},
 ar:{subtitle:'تحقق مستقل · قراءات سنوية · NASA POWER',headline:'مختبر التحقق من بيانات ناسا',hero:'قارن قراءات موقعك مع استجابة جديدة ومباشرة من NASA POWER لنفس الإحداثيات والمتغير والسنوات المحددة في التحليل.',scope:'القراءات تخص نقطة أو خلية شبكية، وليست متوسط محافظة أو قياسات محطة أرضية',configure:'إعدادات المقارنة',place:'الموقع الأول',second:'الموقع الثاني',variable:'المتغير المناخي',years:'الفترة الزمنية',start:'من',end:'إلى',pair:'التحقق من موقعين',live:'بيانات مباشرة في لوحة الموقع',snap:'ملف تاريخي في لوحة الموقع',fetch:'تحقق من NASA الآن',checking:'جار طلب بيانات مستقلة من ناسا…',source:'قراءات الموقع',upload:'ارفع ملف CSV من موقعك للمقارنة',uploadHint:'اختياري · الملف يبقى في متصفحك ولا يُرسل للخادم، ويجب أن يحتوي على السنة والمتغير والإحداثيات.',clear:'العودة إلى بيانات الموقع',file:'ملف CSV المرفوع',downloadNasa:'تنزيل CSV الأصلي من NASA',downloadSite:'تنزيل CSV من الموقع',downloadReport:'تنزيل تقرير المطابقة',evidenceTitle:'حزمة أدلة التحقق',evidenceBody:'احفظ استجابة NASA JSON الأصلية من عملية الفحص نفسها، ومقارنة السنوات، وقيم الموقع، ووقت التحقق، وبصمات SHA-256 داخل ملف ZIP واحد.',evidenceButton:'تنزيل أدلة التحقق',evidenceReview:'تحتاج النتائج إلى مراجعة: يتضمن الأرشيف الاختلافات والقيم المفقودة، وليس شهادة نجاح.',evidenceReady:'تتوفر الأدلة بعد اكتمال التحقق فقط. لا تُنشأ بيانات NASA افتراضية.',evidenceLoading:'جار إعداد ملف الأدلة…',evidenceFailure:'تعذر إعداد الأدلة. أعد إجراء التحقق إذا لم تتوفر استجابة NASA الأصلية.',evidenceFiles:'NASA JSON الأصلي · CSV المقارنة · قيم الموقع · بصمات SHA-256',nasa:'افتح استجابة NASA الأصلية',method:'وثائق API الشهرية من NASA',matched:'متطابق',different:'مختلف',missing:'مفقود / غير متحقق',yearsLabel:'السجلات السنوية',notRun:'لم يتم التحقق',notRunDesc:'اختر الموقع والمتغير والفترة المطابقة لبحثك، ثم شغّل فحصًا مستقلًا.',fail:'تعذر إكمال التحقق',pass:'جميع القيم السنوية متطابقة مع NASA ضمن هامش ±0.01 من وحدة المتغير.',partial:'توجد قيم مختلفة أو مفقودة تحتاج مراجعة؛ لا يمكن اعتماد المطابقة.',header:'أدلة المطابقة سنة بسنة',sourceYear:'الموقع',nasaYear:'NASA الأصلية',delta:'الفرق',status:'النتيجة',details:'عرض جميع السنوات',retrieval:'وقت الاسترجاع المستقل',origin:'رابط المصدر الأصلي من ناسا',uncertainty:'المطابقة مع NASA تثبت اتفاق القيم مع بياناتها الشبكية، ولا تثبت مطابقة محطات الأرصاد أو متوسطات المحافظات.',rainWarning:'وحدات تجميع الأمطار وقيمة 2024 الشاذة تتطلب تفسيرًا حذرًا حتى إذا تطابقت الأرقام.',identical:'الموقعان يعطيان السلسلة الشبكية السنوية نفسها؛ المطابقة لا تثبت الاستقلال المكاني.',snapNotice:'تُقارن قيم الملف التاريخي بطلب جديد من NASA، ولا يُفترض أن الملف موثّق قبل إجراء الفحص.',apiNotice:'قد تحتفظ لوحة الموقع باستجابة API مؤقتًا؛ لكن التحقق يرسل طلبًا منفصلًا بلا تخزين مؤقت.',fileWarning:'يُستخدم CSV المرفوع بدل بيانات الموقع الأول في المقارنة فقط، دون تغيير أي بيانات منشورة.',noData:'بيانات الموقع قيد التحميل أو غير متاحة.',refresh:'إعادة التحقق',official:'CSV الرسمي من ناسا (شهري وسنوي)',notComparable:'لا توجد قيم سنوية قابلة للمقارنة',coordinateMismatch:'إحداثيات بيانات الموقع لا تطابق الموقع المحدد؛ تم إيقاف المقارنة لمنع نتيجة مضللة.',last:'لم يُجرَ تحقق لهذه الإعدادات.',errorUpload:'تعذر قراءة CSV',tableEmpty:'لا توجد سنوات للعرض',checkingFile:'جار تجهيز التنزيل…',nasaDownError:'تعذر تنزيل CSV من NASA؛ افتح رابط المصدر الأصلي.',single:'موقع واحد',dual:'موقعان',both:'المواقع المتحقق منها',fileFormat:'ارفع CSV الذي صدرته من موقعنا، وليس ملف NASA الشهري الأصلي. يمكنك تنزيل ملف NASA منفصلًا.'}
};

const statusKey:Record<Status,'matched'|'different'|'missing'>={matched:'matched',different:'different',missingSite:'missing',missingNasa:'missing',missingBoth:'missing'};
function displayNumber(v:number|null|undefined){return v===null||v===undefined?'—':Number(v).toLocaleString('en-GB',{maximumFractionDigits:5});}
function downloadText(name:string,content:string,type='text/csv;charset=utf-8'){
 const blob=new Blob(['\uFEFF',content],{type});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();window.setTimeout(()=>URL.revokeObjectURL(u),1200);
}
function rowsToCsv(rows:(string|number|null|undefined)[][]){return rows.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\r\n');}
function buildQuery(place:Point,metric:Metric,start:number,end:number){return new URLSearchParams({lat:String(place.lat),lon:String(place.lon),metric,start:String(start),end:String(end)}).toString();}
function officialUrl(place:Point,metric:Metric,start:number,end:number,format:'CSV'|'JSON'){
 return `https://power.larc.nasa.gov/api/temporal/monthly/point?${new URLSearchParams({parameters:metric,community:'AG',longitude:String(place.lon),latitude:String(place.lat),format,start:String(start),end:String(end)})}`;
}
function sameCoordinates(data:DataSet|null,point:Point){return !!data&&Math.abs(data.latitude-point.lat)<=.0001&&Math.abs(data.longitude-point.lon)<=.0001;}

function LocationResult({result,lang,metric,start,end,onDownload}:{result:VerificationResult;lang:Lang;metric:Metric;start:number;end:number;onDownload:(r:VerificationResult)=>void}){
 const t=copy[lang],c=result.comparison,s=c.summary,ar=lang==='ar';
 const incomplete=s.missingBoth+s.missingNasa+s.missingSite;
 return <article className={`verify-result-card ${c.passed?'verify-result-pass':'verify-result-review'}`}>
  <div className="verify-result-head"><div className="verify-result-icon">{c.passed?<CheckCircle2 size={24}/>:<TriangleAlert size={24}/>}</div><div><p className="verify-mini-label">{result.location.en.toUpperCase()} · {metric}</p><h3>{ar?result.location.ar:result.location.en}</h3><span>{c.passed?t.pass:t.partial}</span></div></div>
  <div className="verify-score-grid">
   <div><small>{t.matched}</small><strong>{s.matched}<em>/{s.total}</em></strong></div>
   <div><small>{t.different}</small><strong>{s.different}</strong></div>
   <div><small>{t.missing}</small><strong>{incomplete}</strong></div>
  </div>
  <div className="verify-source-details"><span><Globe2 size={14}/>{result.sourceLabel}</span><span><RefreshCw size={14}/>{new Date(result.nasa.retrievedAt).toLocaleString(ar?'ar-OM':'en-GB')}</span></div>
  <div className="verify-result-actions">
   <a href={result.nasa.sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>{t.nasa}</a>
   <button onClick={()=>onDownload(result)} type="button"><Download size={15}/>{t.downloadReport}</button>
  </div>
  <details className="verify-year-details" open={!c.passed}><summary>{t.details} <span>{start}—{end}</span></summary><div className="verify-table-scroll"><table><thead><tr><th>{ar?'السنة':'Year'}</th><th>{t.sourceYear}</th><th>{t.nasaYear}</th><th>{t.delta}</th><th>{t.status}</th></tr></thead><tbody>{c.rows.map(row=><tr key={row.year}><td>{row.year}</td><td>{displayNumber(row.site)}</td><td>{displayNumber(row.nasa)}</td><td>{displayNumber(row.difference)}</td><td><span className={`verify-row-status ${row.status}`}>{t[statusKey[row.status]]}</span></td></tr>)}</tbody></table></div></details>
  <p className="verify-source-footnote">{t.origin}: <a href={result.nasa.sourceUrl} target="_blank" rel="noopener noreferrer">power.larc.nasa.gov <ExternalLink size={12}/></a> · {result.nasa.unit||'NASA source unit not reported'}</p>
 </article>;
}

export default function VerificationLab(p:Props){
 const {lang,place,secondPlace,metric,start,end,dataset,other,siteSeries,secondSeries,includeSecond,busy,secondBusy,onIncludeSecond,onPlace,onSecondPlace,onMetric,onStart,onEnd,onLive,live,canSwitchSnapshot,onExportSite,onExportSecond}=p;
 const t=copy[lang],ar=lang==='ar';
 const [phase,setPhase]=useState<'idle'|'loading'|'complete'|'error'>('idle');
 const [results,setResults]=useState<VerificationResult[]>([]);
 const [error,setError]=useState<string|null>(null);
 const [file,setFile]=useState<{name:string;rows:YearValue[];originalBytes:Uint8Array}|null>(null);
 const [fileError,setFileError]=useState<string|null>(null);
 const [downloading,setDownloading]=useState<string|null>(null);
 const [archiveBusy,setArchiveBusy]=useState(false);
 const [archiveError,setArchiveError]=useState<string|null>(null);
 const [selfTest,setSelfTest]=useState<'idle'|'passed'|'failed'>('idle');
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>{pending.current?.abort();pending.current=null;setPhase('idle');setResults([]);setError(null);setArchiveError(null);},[place.id,secondPlace.id,metric,start,end,includeSecond,dataset,other,siteSeries,secondSeries]);
 useEffect(()=>{setFile(null);setFileError(null);},[place.id,metric,start,end]);
 useEffect(()=>{pending.current?.abort();pending.current=null;setPhase('idle');setResults([]);setError(null);setArchiveError(null);},[file]);
 useEffect(()=>()=>pending.current?.abort(),[]);
 const onFileChange=async(event:ChangeEvent<HTMLInputElement>)=>{
  const f=event.currentTarget.files?.[0];event.currentTarget.value='';if(!f)return;
  try{
   if(f.size>1_000_000)throw Error('Maximum file size is 1 MB');
   const originalBytes=new Uint8Array(await f.arrayBuffer());
   const contents=new TextDecoder('utf-8').decode(originalBytes);
   const rows=readWebsiteCsv(contents,metric,{latitude:place.lat,longitude:place.lon,start,end}) as YearValue[];
   setFile({name:f.name,rows,originalBytes});setFileError(null);
  }catch(e){setFile(null);setFileError(String((e as Error).message));}
 };
 const ready=(!!file||!!siteSeries&&sameCoordinates(dataset,place))&&(!includeSecond||!!secondSeries&&sameCoordinates(other,secondPlace))&&!busy&&(!includeSecond||!secondBusy);
 const verify=useCallback(async()=>{
  if(!ready){setPhase('error');setError(t.noData);return;}
  pending.current?.abort();const controller=new AbortController();pending.current=controller;
  setPhase('loading');setResults([]);setError(null);setArchiveError(null);
  const timeout=window.setTimeout(()=>{controller.abort();setPhase('error');setError(ar?'انتهت مهلة NASA؛ أعد المحاولة.':'NASA request timed out. Please try again.');},45_000);
  try{
   const list=[place,...(includeSecond?[secondPlace]:[])];
   const all=await Promise.all(list.map(async target=>{
    const response=await fetch(`/api/verification?${buildQuery(target,metric,start,end)}`,{signal:controller.signal,cache:'no-store'});
    const json=await response.json();
    if(!response.ok||!Array.isArray(json.years))throw Error(`${target.en}: ${json.detail||json.error||'NASA unavailable'}`);
    return json as NasaResponse;
   }));
   if(controller.signal.aborted)return;
   const calculated=all.map((nasa,i)=>{
    const loc=list[i],site=i===0?(file?.rows||siteSeries||[]):(secondSeries||[]);
    const comparison=compareAnnualSeries(site,nasa.years,start,end) as Comparison;
    return {location:loc,nasa,comparison,sourceType:i===0&&file?'uploaded' as const:'site' as const,sourceLabel:i===0&&file?file.name:i===0?(dataset?.source||'Website series'):(other?.source||'Website series')};
   });
   setResults(calculated);setPhase('complete');
  }catch(e){if(!controller.signal.aborted){setError(String((e as Error).message));setPhase('error');}}finally{window.clearTimeout(timeout);if(pending.current===controller)pending.current=null;}
 },[ar,ready,t.noData,place,includeSecond,secondPlace,metric,start,end,file,siteSeries,secondSeries,dataset,other]);
 const downloadNasa=async(target:Point)=>{
  const key=target.id;setDownloading(key);setError(null);
  try{
   const r=await fetch(`/api/nasa-csv?${buildQuery(target,metric,start,end)}`,{cache:'no-store'});
   if(!r.ok){const body=await r.json().catch(()=>({}));throw Error(body.detail||`HTTP ${r.status}`);}
   const blob=await r.blob();
   if(!r.headers.get('content-type')?.includes('csv'))throw Error('Unexpected NASA response type');
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`NASA_POWER_${metric}_${target.id}_${start}-${end}.csv`;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  }catch(e){setError(`${t.nasaDownError} (${String((e as Error).message)})`);}finally{setDownloading(null);}
 };
 const downloadComparison=(r:VerificationResult)=>{
  const report=[['Year','Website_value','NASA_value','Difference_website_minus_NASA','Status','Variable','Latitude','Longitude','NASA_URL','Retrieved_UTC','Tolerance'],...r.comparison.rows.map(v=>[v.year,v.site,v.nasa,v.difference,v.status,metric,r.location.lat,r.location.lon,r.nasa.sourceUrl,r.nasa.retrievedAt,r.comparison.tolerance])];
  downloadText(`verification-${r.location.id}-${metric}-${start}-${end}.csv`,rowsToCsv(report));
 };
 const downloadEvidence=async()=>{
  if(phase!=='complete'||!results.length||archiveBusy)return;
  setArchiveBusy(true);setArchiveError(null);
  try{
   const evidence=await buildEvidenceArchive(results,{metric,start,end,uploadedFile:file});
   const blob=new Blob([new Uint8Array(evidence.bytes)],{type:'application/zip'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download=evidence.filename;document.body.appendChild(link);link.click();link.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(e){setArchiveError(`${t.evidenceFailure} ${String((e as Error).message)}`);}
  finally{setArchiveBusy(false);}
 };
 const identical=results.length===2&&results[0].comparison.rows.every((r,i)=>r.nasa===results[1].comparison.rows[i]?.nasa);
 const totalMatched=results.reduce((n,r)=>n+r.comparison.summary.matched,0);
 const totalRows=results.reduce((n,r)=>n+r.comparison.summary.total,0);
 const verified=results.length>0&&results.every(r=>r.comparison.passed);
 return <section className="verification-lab" aria-labelledby="verification-heading">
  <div className="verify-hero"><div className="verify-hero-copy"><p className="verify-eyebrow"><ShieldCheck size={17}/> NASA POWER · INDEPENDENT DATA VALIDATION</p><h2 id="verification-heading">{t.headline}</h2><p>{t.hero}</p><div className="verify-scope"><Info size={15}/>{t.scope}</div></div><div className="verify-hero-art" aria-hidden="true"><Globe2 size={105} strokeWidth={.8}/><div className="verify-orbit orbit-a"/><div className="verify-orbit orbit-b"/><ShieldCheck size={32}/></div></div>
  <div className="verify-main-grid">
   <div className="verify-form"><div className="verify-section-title"><span className="verify-icon"><Database size={19}/></span><div><h3>{t.configure}</h3><p>NASA / MERRA-2 · {metric} · {start}–{end}</p></div></div>
    <div className="verify-field"><label htmlFor="v-location"><MapPin size={15}/>{t.place}</label><select id="v-location" value={place.id} onChange={e=>onPlace(e.target.value)}>{POINTS.map(point=><option key={point.id} value={point.id}>{ar?point.ar:point.en}</option>)}</select><small className="verify-coordinates">{place.lat.toFixed(4)}° N · {place.lon.toFixed(4)}° E</small></div>
    <div className="verify-field"><label htmlFor="v-metric"><Database size={15}/>{t.variable}</label><select id="v-metric" value={metric} onChange={e=>onMetric(e.target.value as Metric)}>{METRICS.map(m=><option key={m} value={m}>{m} · {ar?METRIC_DETAILS[m].ar:METRIC_DETAILS[m].en}</option>)}</select></div>
    <div className="verify-field"><label>{t.years}</label><div className="verify-year-selectors"><div><label htmlFor="v-start">{t.start}</label><select id="v-start" value={start} onChange={e=>onStart(Number(e.target.value))}>{Array.from({length:26},(_,i)=>2000+i).map(y=><option key={y} value={y}>{y}</option>)}</select></div><div><label htmlFor="v-end">{t.end}</label><select id="v-end" value={end} onChange={e=>onEnd(Number(e.target.value))}>{Array.from({length:26},(_,i)=>2000+i).map(y=><option key={y} value={y}>{y}</option>)}</select></div></div></div>
    <label className="verify-pair-toggle"><input type="checkbox" checked={includeSecond} onChange={e=>onIncludeSecond(e.target.checked)}/><ArrowRightLeft size={17}/><span>{t.pair}</span></label>
    {includeSecond&&<div className="verify-field"><label htmlFor="v-second">{t.second}</label><select id="v-second" value={secondPlace.id} onChange={e=>onSecondPlace(e.target.value)}>{POINTS.filter(point=>point.id!==place.id).map(point=><option value={point.id} key={point.id}>{ar?point.ar:point.en}</option>)}</select><small className="verify-coordinates">{secondPlace.lat.toFixed(4)}° N · {secondPlace.lon.toFixed(4)}° E</small></div>}
    <div className="verify-mode-row"><span><span className={`verify-mode-dot ${live?'is-live':''}`}/>{live?t.live:t.snap}</span><button type="button" disabled={!canSwitchSnapshot} onClick={()=>onLive(!live)}>{live?t.snap:t.live}</button></div>
    <div className="verify-upload"><label htmlFor="v-upload"><FileUp size={19}/><span>{t.upload}</span></label><input id="v-upload" type="file" accept=".csv,text/csv" onChange={onFileChange} aria-describedby="v-upload-desc"/><p id="v-upload-desc">{t.uploadHint}</p>{file&&<div className="verify-uploaded"><FileCheck2 size={15}/><span>{file.name}</span><button onClick={()=>{setFile(null);setFileError(null);}}>{t.clear}</button></div>}{fileError&&<div className="verify-error" role="alert"><AlertCircle size={16}/>{t.errorUpload}: {fileError}</div>}<small>{t.fileFormat}</small></div>
    <button type="button" className="verify-run" aria-busy={phase==='loading'} onClick={verify} disabled={!ready||phase==='loading'}>{phase==='loading'?<LoaderCircle className="verify-spin" size={20}/>:<ShieldCheck size={20}/>}<span>{phase==='loading'?t.checking:phase==='complete'?t.refresh:t.fetch}</span></button>
    {phase==='loading'&&<button type="button" className="verify-cancel" onClick={()=>{pending.current?.abort();pending.current=null;setPhase('idle');setError(null);}}>{ar?'إلغاء الطلب':'Cancel request'}</button>}
    {!ready&&<p className="verify-wait" role="status">{t.noData}</p>}
   </div>
   <div className="verify-overview"><div className="verify-section-title"><span className="verify-icon"><ShieldQuestion size={19}/></span><div><h3>{ar?'حالة التحقق':'Verification status'}</h3><p>{t.subtitle}</p></div></div>
    <div className={`verify-status-hero ${phase==='complete'?(verified?'success':'review'):phase==='error'?'failure':''}`} aria-live="polite"><div className="verify-status-glyph">{phase==='complete'?(verified?<CheckCircle2 size={29}/>:<TriangleAlert size={29}/>):phase==='error'?<XCircle size={29}/>:phase==='loading'?<LoaderCircle size={29} className="verify-spin"/>:<ShieldQuestion size={29}/>}</div><div><span>{phase==='complete'?(verified?t.matched:t.different):phase==='error'?t.fail:phase==='loading'?t.checking:t.notRun}</span><strong>{phase==='complete'?`${totalMatched} / ${totalRows}`:'— / —'}</strong><small>{phase==='complete'?(verified?t.pass:t.partial):phase==='error'?error||'NASA unavailable':t.notRunDesc}</small></div></div>
    <div className={`verify-evidence-package ${phase==='complete'&&!verified?'needs-review':''}`} aria-labelledby="verify-package-title">
     <div className="verify-package-head"><span className="verify-package-icon"><FileArchive size={23}/></span><div><h4 id="verify-package-title">{t.evidenceTitle}</h4><p>{t.evidenceBody}</p></div></div>
     <div className="verify-package-content"><FileCheck2 size={15}/><span>{t.evidenceFiles}</span></div>
     {phase==='complete'&&!verified&&<p className="verify-package-review" role="status"><TriangleAlert size={15}/>{t.evidenceReview}</p>}
     <button type="button" className="verify-package-button" onClick={downloadEvidence} disabled={phase!=='complete'||archiveBusy||!results.length} aria-describedby="verify-package-note">
      {archiveBusy?<LoaderCircle size={18} className="verify-spin"/>:<Download size={18}/>}
      <span>{archiveBusy?t.evidenceLoading:t.evidenceButton}</span>
     </button>
     <p id="verify-package-note" className="verify-package-note">{t.evidenceReady}</p>
     {archiveError&&<p role="alert" className="verify-package-error"><AlertCircle size={16}/>{archiveError}</p>}
    </div>
    <div className="verify-downloads"><h4><CloudDownload size={17}/>{ar?'ملفات المصدر الأصلية':'Original source files'}</h4>{[place,...(includeSecond?[secondPlace]:[])].map(point=><div className="verify-download-line" key={point.id}><div><strong>{ar?point.ar:point.en}</strong><small>NASA POWER · {metric} · {start}–{end}</small></div><button type="button" disabled={downloading!==null} onClick={()=>downloadNasa(point)} title={t.official}>{downloading===point.id?<LoaderCircle className="verify-spin" size={17}/>:<FileDown size={17}/>}<span>{t.downloadNasa}</span></button><a href={officialUrl(point,metric,start,end,'CSV')} target="_blank" rel="noopener noreferrer" aria-label={`${t.origin}: ${point.en}`} title={t.origin}><ExternalLink size={16}/></a></div>)}<button type="button" className="verify-site-export" disabled={!siteSeries} onClick={onExportSite}><Download size={16}/>{t.downloadSite} · {ar?place.ar:place.en}</button>{includeSecond&&<button type="button" className="verify-site-export" disabled={!secondSeries} onClick={onExportSecond}><Download size={16}/>{t.downloadSite} · {ar?secondPlace.ar:secondPlace.en}</button>}</div>
    <div className="verify-selftest" aria-label="Verification engine self test"><div><strong>{ar?'اختبار اكتشاف الأخطاء':'Mismatch detection self-test'}</strong><p>{ar?'اختبار آمن بقيم تجريبية فقط: يغيّر سنة افتراضية ويتأكد من ظهور Different وMissing، دون تعديل NASA.':'Safe synthetic values only. Confirms that a changed year is marked Different and an absent year is marked Missing. No NASA data changes.'}</p></div><button type="button" onClick={()=>setSelfTest(runVerificationSelfTest().passed?'passed':'failed')}>{ar?'تشغيل الاختبار':'Run self-test'}</button>{selfTest!=='idle'&&<span role="status" className={selfTest==='passed'?'selftest-pass':'selftest-fail'}>{selfTest==='passed'?(ar?'نجح اكتشاف الاختلاف والفقد':'PASS · mismatch and missing detected'):(ar?'فشل الاختبار':'FAIL · investigate engine')}</span>}</div>
    <div className="verify-explainer"><Info size={18}/><p>{live?t.apiNotice:t.snapNotice} {file&&t.fileWarning}</p></div>
    {metric==='PRECTOTCORR_SUM'&&<div className="verify-rain-warning"><TriangleAlert size={16}/>{t.rainWarning}</div>}
    <a className="verify-method" href="https://power.larc.nasa.gov/docs/services/api/temporal/monthly/" target="_blank" rel="noopener noreferrer">{t.method}<ExternalLink size={15}/></a>
   </div>
  </div>
  {error&&<div className="verify-error verify-global-error" role="alert"><AlertCircle size={18}/><span>{error}</span></div>}
  {phase==='complete'&&<div className="verify-evidence"><div className="verify-evidence-heading"><div><p>ANNUAL VALUE RECONCILIATION</p><h3>{t.header}</h3></div><span>{results.length} {results.length===2?t.dual:t.single}</span></div>{identical&&<div className="verify-identical"><TriangleAlert size={18}/>{t.identical}</div>}<div className="verify-results-grid">{results.map(result=><LocationResult key={result.location.id} result={result} lang={lang} metric={metric} start={start} end={end} onDownload={downloadComparison}/>)}</div></div>}
  <div className="verify-footnote"><ShieldCheck size={20}/><p>{t.uncertainty} <strong>±0.01 {metric==='T2M'?'°C':metric==='RH2M'?'%':results[0]?.nasa.unit||'NASA source unit'}</strong>.</p></div>
 </section>;
}
