import {useEffect,useRef,useState} from 'react';
import {Cpu,ExternalLink,LoaderCircle,ShieldCheck,Send,Square,WifiOff} from 'lucide-react';
import {OPEN_MODELS,buildLocalAIMessages} from '../lib/local-ai-knowledge.mjs';
import {askLocalAI,checkLocalGPU,loadLocalAI,localAIModel,stopLocalGeneration,unloadLocalAI} from '../lib/local-ai-engine';
import './LocalOpenSourceAI.css';

export type LocalAnswerEvidence = {
  question:string;
  plan:{metric:string;start:number;end:number;mode:string};
  items:Array<{point:{en:string;ar:string;lat:number;lon:number};data:{source:string;isSnapshot:boolean};result:{series:Array<{year:number;value:number|null}>};paragraph:string;sourceUrl:string}>;
};

type Props = {
  question:string;
  lang:'ar'|'en';
  answer:LocalAnswerEvidence|null;
  siteInfo:{answer:string;url:string}|null;
  isLoadingEvidence:boolean;
};

type LocalStatus='checking'|'unsupported'|'available';
export default function LocalOpenSourceAI({question,lang,answer,siteInfo,isLoadingEvidence}:Props){
  const ar=lang==='ar';
  const [hardware,setHardware]=useState<LocalStatus>('checking');
  const [selectedModel,setSelectedModel]=useState(OPEN_MODELS[0].id);
  const [modelReady,setModelReady]=useState(false);
  const [modelLoading,setModelLoading]=useState(false);
  const [progress,setProgress]=useState(0);
  const [progressText,setProgressText]=useState('');
  const [busy,setBusy]=useState(false);
  const [generated,setGenerated]=useState('');
  const [problem,setProblem]=useState('');
  const runToken=useRef(0);
  const alive=useRef(true);
  useEffect(()=>{
    alive.current=true;
    void checkLocalGPU().then(ok=>{if(alive.current)setHardware(ok?'available':'unsupported');});
    return ()=>{alive.current=false;runToken.current++;unloadLocalAI();};
  },[]);
  useEffect(()=>{runToken.current++;setGenerated('');setProblem('');stopLocalGeneration();},[question,answer,siteInfo,lang]);
  const model=OPEN_MODELS.find(x=>x.id===selectedModel)!;
  const prepared=buildLocalAIMessages({question,lang,answer,siteInfo});
  const canGenerate=prepared.ok && modelReady && !modelLoading && !busy && !isLoadingEvidence;
  const changeModel=(next:string)=>{
    if(!OPEN_MODELS.some(x=>x.id===next)||modelLoading||busy)return;
    setSelectedModel(next);setModelReady(localAIModel()===next);setGenerated('');setProblem('');
  };
  const startModel=async()=>{
    if(hardware!=='available'||modelLoading||busy)return;
    const op=++runToken.current;
    setProblem('');setGenerated('');setModelReady(false);setProgress(0);setProgressText('');setModelLoading(true);
    try{
      await loadLocalAI(selectedModel,(fraction,message)=>{
        if(alive.current&&op===runToken.current){setProgress(Math.round(fraction*100));setProgressText(message.slice(0,180));}
      });
      if(alive.current&&op===runToken.current){setModelReady(true);setProgress(100);}
    }catch{
      if(alive.current&&op===runToken.current){setProblem(ar?'تعذّر تحميل النموذج. تحقق من الإنترنت وWebGPU وذاكرة الجهاز، أو جرّب النموذج الأخف.':'Model download failed. Check your network, WebGPU, and GPU memory, or try the lighter model.');}
    }finally{if(alive.current&&op===runToken.current)setModelLoading(false);}
  };
  const generate=async()=>{
    const safe=buildLocalAIMessages({question,lang,answer,siteInfo});
    if(!safe.ok){setProblem(safe.code==='NEEDS_DATA'?(ar?'شغّل التحليل السنوي الموثق أولاً. لا تُولَّد القراءات المناخية بالتخمين.':'Run the verified NASA analysis first. Climate readings cannot be invented.'):(ar?'اطرح سؤالاً يتعلق بالموقع أو خرائط عُمان أو بيانات NASA.':'Ask about this project, Oman maps, or NASA climate data.'));return;}
    if(!modelReady||busy||isLoadingEvidence)return;
    const op=++runToken.current;
    setBusy(true);setGenerated('');setProblem('');
    try{
      const output=await askLocalAI(safe.messages as Array<{role:'system'|'user'|'assistant';content:string}>);
      if(alive.current&&op===runToken.current)setGenerated(output);
    }catch{
      if(alive.current&&op===runToken.current){setProblem(ar?'فشل توليد الرد. حاول مجدداً أو اعتمد على التحليل العلمي أعلاه.':'Local model generation failed. Retry, or use the source-calculated answer above.');}
    }finally{if(alive.current&&op===runToken.current)setBusy(false);}
  };
  const stop=()=>{
    runToken.current++;
    stopLocalGeneration();
    setBusy(false);
    setProblem(ar?'تم طلب إيقاف التوليد.':'Generation stop requested.');
  };
  const release=()=>{runToken.current++;unloadLocalAI();setBusy(false);setModelReady(false);setModelLoading(false);setGenerated('');setProgress(0);setProgressText('');setProblem('');};
  return <section className="assistant-local-open" aria-label={ar?'الذكاء الاصطناعي المحلي المفتوح المصدر':'Local open-source AI'}>
    <div className="assistant-local-head"><span className="assistant-local-icon"><Cpu size={21}/></span><div><h3>{ar?'ذكاء اصطناعي محلي ومجاني':'Free, open-source AI in your browser'}</h3><p>{ar?'WebLLM · يعمل في جهاز الزائر · بلا API Key أو نموذج Cloudflare':'WebLLM · runs on your device · no API key or Cloudflare AI'}</p></div></div>
    <p className="assistant-local-desc">{ar?'اختياري: اختر نموذجاً، ثم حمّله عند الحاجة فقط. يكتب شرحاً عن المشروع أو يفسّر النتائج الموثقة، لكنه لا ينشئ قياسات NASA جديدة.':'Optional: choose a model and download it only when needed. It explains the project or your verified results; it never supplies official NASA measurements.'}</p>
    <label htmlFor="local-ai-model">{ar?'النموذج المفتوح المصدر':'Open-source language model'}</label>
    <select id="local-ai-model" value={selectedModel} onChange={e=>changeModel(e.target.value)} disabled={modelLoading||busy}>
      {OPEN_MODELS.map(x=><option value={x.id} key={x.id}>{x.label}</option>)}
    </select>
    <div className="assistant-local-meta"><span>{ar?'ذاكرة GPU تقديرية':'Estimated GPU memory'}: ~{model.gpuMB} MB</span><a href={model.modelPage} target="_blank" rel="noopener noreferrer">{ar?'ملف النموذج':'Model card'}<ExternalLink size={13}/></a></div>
    {hardware==='checking'&&<p className="assistant-local-muted" role="status">{ar?'جارٍ فحص توافق WebGPU…':'Checking WebGPU support…'}</p>}
    {hardware==='unsupported'&&<p className="assistant-local-warning" role="status"><WifiOff size={16}/>{ar?'هذا المتصفح لا يدعم WebGPU المطلوب أو لا يوفّر GPU مناسباً. التحليل العلمي المجاني يبقى متاحاً.':'WebGPU is unavailable on this browser/device. Your free verified NASA analysis remains available.'}</p>}
    <div className="assistant-local-buttons">
      <button type="button" className="outline-button" disabled={hardware!=='available'||modelLoading||busy||modelReady} onClick={()=>{void startModel();}}>{modelLoading?<LoaderCircle size={16} className="assistant-spinner"/>:<Cpu size={16}/>} {modelLoading?(ar?'جار تحميل النموذج…':'Loading model…'):modelReady?(ar?'النموذج جاهز':'Model ready'):(ar?'حمّل وشغّل AI محلياً':'Download & start local AI')}</button>
      <button type="button" className="outline-button" disabled={!canGenerate} onClick={()=>{void generate();}}>{busy?<LoaderCircle size={16} className="assistant-spinner"/>:<Send size={16}/>} {busy?(ar?'يكتب الرد…':'Generating…'):(ar?'اسأل النموذج المحلي':'Ask local AI')}</button>
      {busy?<button type="button" className="outline-button" onClick={stop}><Square size={15}/>{ar?'إيقاف':'Stop'}</button>:modelReady?<button type="button" className="outline-button" onClick={release}>{ar?'تحرير الذاكرة':'Unload model'}</button>:null}
    </div>
    {modelLoading&&<div className="assistant-local-progress" role="status"><progress max={100} value={progress} aria-label={ar?'تقدم تحميل النموذج':'Model download progress'}/><span>{progress}% · {progressText|| (ar?'تحميل ملفات النموذج من المصدر المفتوح…':'Downloading model from the public repository…')}</span></div>}
    {!modelReady&&hardware==='available'&&!modelLoading&&<small className="assistant-local-muted">{ar?'التنزيل الأول كبير، وقد يتطلب Wi-Fi وذاكرة كافية. يعمل التوليد محلياً بعد التحميل، ولا تُرسل أسئلتك لخادم AI.':'First download is large; Wi-Fi and adequate memory recommended. Inference stays on your device, not on an AI server.'}</small>}
    {modelReady&&!prepared.ok&&question.trim()&&<p className="assistant-local-muted">{prepared.code==='NEEDS_DATA'?(ar?'اطلب التحليل العلمي الموثق أولاً لتجنّب اختراع الأرقام.':'Run source-verified NASA analysis first to avoid fabricated values.'):(ar?'هذا النموذج مخصص لأسئلة الموقع والمناخ فقط.':'This model is limited to site and climate questions.')}</p>}
    {problem&&<p role="alert" className="assistant-local-warning">{problem}</p>}
    {generated&&<div className="assistant-local-result" dir={ar?'rtl':'ltr'}><h4><ShieldCheck size={16}/>{ar?'إجابة النموذج المفتوح المصدر':'Local open-source model response'}</h4><p>{generated}</p><small>{ar?'هذا نص توليدي غير معتمد. للأرقام استخدم جدول NASA الموثق في الأعلى.':'Generated wording is not certified. For numbers, use the NASA evidence table above.'}</small></div>}
    <small className="assistant-local-credits">{ar?'البرنامج: WebLLM (Apache-2.0) · النموذج: Qwen2.5 أو SmolLM2 (Apache-2.0) · تم تنزيل الملفات من المصدر العام بعد موافقتك.':'Engine: WebLLM (Apache-2.0) · model: Qwen2.5 or SmolLM2 (Apache-2.0) · fetched from public model repositories after you opt in.'}</small>
  </section>;
}
