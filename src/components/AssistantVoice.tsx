import {useEffect,useRef,useState} from 'react';
import {Mic,Square,Volume2} from 'lucide-react';
import {chooseWhisperModel,WHISPER_MODELS,type WhisperModel} from '../lib/whisper-models.mjs';
import {checkVoiceAudio,decodeVoiceAudio,recordingMimeType} from '../lib/voice-audio.mjs';
import {VOICE_STAGES,voiceErrorText,voiceDownloadProgress} from '../lib/voice-status.mjs';

type Lang='ar'|'en';
type Stage=keyof typeof VOICE_STAGES;
type Phase='idle'|'permission'|'recording'|'decoding'|'loading'|'transcribing';
type Props={lang:Lang;transcript:(text:string)=>void};
type Recording={audio:Float32Array;lang:Lang;model:WhisperModel};
type Failure={stage:Stage;code:string;file:string};
const consentedModels=new Set<WhisperModel>();

export default function AssistantVoice({lang,transcript}:Props){
 const ar=lang==='ar';
 const [voiceLang,setVoiceLang]=useState<Lang>(lang),[phase,setPhase]=useState<Phase>('idle');
 const [stage,setStage]=useState<Stage>('permission'),[progress,setProgress]=useState<number>();
 const [file,setFile]=useState(''),[elapsed,setElapsed]=useState(0),[error,setError]=useState<Failure|null>(null);
 const [pendingModel,setPendingModel]=useState<WhisperModel|null>(null);
 const [recordingUrl,setRecordingUrl]=useState(''),[transcriptReady,setTranscriptReady]=useState(false);
 const [level,setLevel]=useState(0),[meterError,setMeterError]=useState(false);
 const worker=useRef<Worker|null>(null),recorder=useRef<MediaRecorder|null>(null),request=useRef(0);
 const timer=useRef(0),hardTimer=useRef(0),idleTimer=useRef(0),elapsedTimer=useRef(0);
 const meterFrame=useRef(0),meterContext=useRef<AudioContext|null>(null);
 const meterSource=useRef<MediaStreamAudioSourceNode|null>(null),meterAnalyser=useRef<AnalyserNode|null>(null);
 const previewUrl=useRef(''),started=useRef(0),stageRef=useRef<Stage>('permission'),fileRef=useRef('');
 const lastAudio=useRef<Recording|null>(null);
 const lastBlob=useRef<{blob:Blob;lang:Lang;model:WhisperModel}|null>(null);
 const onTranscript=useRef(transcript);onTranscript.current=transcript;
 const setCurrentStage=(next:Stage)=>{stageRef.current=next;setStage(next);};
 const stopMeter=()=>{
  cancelAnimationFrame(meterFrame.current);meterSource.current?.disconnect();meterAnalyser.current?.disconnect();
  meterSource.current=null;meterAnalyser.current=null;
  const context=meterContext.current;meterContext.current=null;
  if(context&&context.state!=='closed')void context.close().catch(()=>{});
 };
 const release=(discard=false,keepWorker=false)=>{
  request.current++;clearTimeout(timer.current);clearTimeout(hardTimer.current);clearTimeout(idleTimer.current);clearInterval(elapsedTimer.current);stopMeter();
  const active=recorder.current;recorder.current=null;
  if(active){active.onstop=null;active.ondataavailable=null;active.onerror=null;if(active.state==='recording')active.stop();active.stream.getTracks().forEach(track=>track.stop());}
  if(!keepWorker){worker.current?.terminate();worker.current=null;}
  if(discard){lastAudio.current=null;lastBlob.current=null;if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current='';}
 };
 useEffect(()=>()=>release(true),[]);
 useEffect(()=>setVoiceLang(lang),[lang]);
 const fail=(id:number,at:Stage,code:string,filename='')=>{
  if(id!==request.current)return;
  release();setPhase('idle');setProgress(undefined);setLevel(0);
  setError({stage:at,code,file:filename.split('/').at(-1)||''});
 };
 const watch=(id:number,milliseconds:number)=>{clearTimeout(timer.current);timer.current=window.setTimeout(()=>fail(id,stageRef.current,'TIMEOUT',fileRef.current),milliseconds);};
 const startMeter=(stream:MediaStream)=>{
  try{
   const context=new AudioContext();meterContext.current=context;
   const source=context.createMediaStreamSource(stream),analyser=context.createAnalyser();
   source.connect(analyser);analyser.fftSize=256;meterSource.current=source;meterAnalyser.current=analyser;
   const samples=new Uint8Array(analyser.fftSize);let previous=0;
   const measure=(now=0)=>{
    if(meterAnalyser.current!==analyser)return;
    if(now-previous>=100){previous=now;analyser.getByteTimeDomainData(samples);let sum=0;for(const value of samples)sum+=(value-128)**2;setLevel(Math.min(100,Math.round(Math.max(0,Math.sqrt(sum/samples.length)/128-.015)*400)));}
    meterFrame.current=requestAnimationFrame(measure);
   };measure();
  }catch{stopMeter();setMeterError(true);}
 };
 const transcribe=(id:number,recording:Recording)=>{
  if(id!==request.current)return;
  lastAudio.current=recording;setError(null);setProgress(undefined);setFile('');fileRef.current='';setPhase('loading');setCurrentStage('worker');
  const files=new Map<string,number>();
  watch(id,20000);
  hardTimer.current=window.setTimeout(()=>fail(id,stageRef.current,'TIMEOUT'),600000);
  try{
   const engine=worker.current??=new Worker(new URL('../lib/whisper.worker.ts',import.meta.url),{type:'module'});
   engine.onerror=event=>{event.preventDefault();fail(id,stageRef.current,'WORKER_START_FAILED');};
   engine.onmessageerror=()=>fail(id,'worker','WORKER_MESSAGE_FAILED');
   engine.onmessage=({data})=>{
    if(id!==request.current||worker.current!==engine||data.id!==undefined&&data.id!==id)return;
    if(data.status==='ready'){setCurrentStage('model');watch(id,90000);return;}
    if(data.status==='stage'||data.status==='loading'){
     const next=Object.hasOwn(VOICE_STAGES,data.stage)?data.stage as Stage:'model';
     setCurrentStage(next);fileRef.current=String(data.file||'').split('/').at(-1)||'';setFile(fileRef.current);watch(id,90000);
     if(data.status==='loading'){
      const percentage=voiceDownloadProgress(files,data.file,data.loaded,data.total,WHISPER_MODELS[recording.model].bytes);
      if(percentage!==null)setProgress(previous=>Math.max(previous||0,percentage));
      else if(Number.isFinite(data.progress))setProgress(previous=>Math.max(previous||0,Math.min(99,data.progress)));
     }
    }
    if(data.status==='transcribing'){setPhase('transcribing');setCurrentStage('transcribing');setProgress(undefined);watch(id,180000);}
    if(data.status==='error')fail(id,Object.hasOwn(VOICE_STAGES,data.stage)?data.stage:'model',String(data.code||'LOCAL_TRANSCRIPTION_FAILED'),String(data.file||''));
    if(data.status==='done'){
     clearTimeout(timer.current);clearTimeout(hardTimer.current);setPhase('idle');setProgress(undefined);setFile('');
     const text=String(data.text??'').trim().slice(0,600);
     if(text){setTranscriptReady(true);onTranscript.current(text);}else setError({stage:'transcribing',code:'NO_SPEECH',file:''});
     idleTimer.current=window.setTimeout(()=>{if(worker.current===engine){engine.terminate();worker.current=null;}},180000);
    }
   };
   // Keep the owned original for Retry; only transfer a copy.
   const audio=recording.audio.slice();engine.postMessage({id,audio,lang:recording.lang,model:recording.model},[audio.buffer]);
  }catch{fail(id,'worker','WORKER_START_FAILED');}
 };
 const decode=async(id:number,recording:{blob:Blob;lang:Lang;model:WhisperModel})=>{
  setPhase('decoding');setCurrentStage('decoding');watch(id,20000);
  try{
   const audio=await decodeVoiceAudio(recording.blob);if(id!==request.current)return;
   const problem=checkVoiceAudio(audio);if(problem){fail(id,'validation',problem);return;}
   transcribe(id,{audio,lang:recording.lang,model:recording.model});
  }catch(reason){fail(id,'decoding',reason instanceof Error&&reason.message==='EMPTY_RECORDING'?'EMPTY_RECORDING':'DECODE_FAILED');}
 };
 const start=async(model:WhisperModel)=>{
  release(true,true);const id=request.current,recordLanguage=voiceLang;
  setRecordingUrl('');setTranscriptReady(false);setError(null);setProgress(undefined);setFile('');setElapsed(0);setMeterError(false);
  setPhase('permission');setCurrentStage('permission');watch(id,30000);
  let stream:MediaStream|undefined;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1}});
   if(id!==request.current){stream.getTracks().forEach(track=>track.stop());return;}
   clearTimeout(timer.current);const mimeType=recordingMimeType();
   const active=new MediaRecorder(stream,mimeType?{mimeType}:undefined);recorder.current=active;
   const chunks:Blob[]=[];
   active.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   active.onerror=()=>fail(id,'recording','RECORDER_FAILED');
   active.onstop=()=>{
    active.stream.getTracks().forEach(track=>track.stop());if(id!==request.current)return;
    stopMeter();setLevel(0);clearInterval(elapsedTimer.current);clearTimeout(timer.current);recorder.current=null;
    const blob=new Blob(chunks,{type:active.mimeType||mimeType});
    if(!blob.size){fail(id,'recording','EMPTY_RECORDING');return;}
    lastBlob.current={blob,lang:recordLanguage,model};previewUrl.current=URL.createObjectURL(blob);setRecordingUrl(previewUrl.current);
    void decode(id,lastBlob.current);
   };
   active.start(250);started.current=Date.now();startMeter(stream);setPhase('recording');setCurrentStage('recording');
   elapsedTimer.current=window.setInterval(()=>setElapsed(Math.min(25,Math.floor((Date.now()-started.current)/1000))),250);
   timer.current=window.setTimeout(()=>{if(active.state==='recording')active.stop();},25000);
  }catch(reason){
   stream?.getTracks().forEach(track=>track.stop());const name=reason instanceof Error?reason.name:'';
   fail(id,stageRef.current,name==='NotAllowedError'||name==='SecurityError'?'MIC_DENIED':name==='NotFoundError'?'MIC_MISSING':name==='NotReadableError'?'MIC_BUSY':'RECORDER_FAILED');
  }
 };
 const requestRecording=()=>{
  const model=chooseWhisperModel((navigator as Navigator&{deviceMemory?:number}).deviceMemory);
  if(consentedModels.has(model))void start(model);else setPendingModel(model);
 };
 const retry=()=>{
  const recording=lastAudio.current,blob=lastBlob.current;release();const id=request.current;
  setError(null);setTranscriptReady(false);
  if(recording)transcribe(id,{...recording,lang:voiceLang});else if(blob)void decode(id,{...blob,lang:voiceLang});else requestRecording();
 };
 const status=phase==='permission'?(ar?'بانتظار إذن المايك…':'Waiting for microphone permission…'):
  phase==='recording'?(ar?'جارٍ التسجيل ':'Recording ')+String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0')+' / 00:25':
  phase==='decoding'?(ar?'جار فك ترميز التسجيل وتحويله إلى 16 kHz…':'Decoding recording to mono 16 kHz…'):
  phase==='loading'?(ar?'جار تجهيز Whisper… ':'Preparing Whisper… ')+VOICE_STAGES[stage][lang]+(file?' · '+file:'')+(progress!==undefined?' · '+progress+'%':''):
  phase==='transcribing'?(ar?'جارٍ تحويل التسجيل إلى نص…':'Transcribing recording…'):'';
 return <div className="assistant-voice">
  <div className="assistant-voice-controls">
   <label>{ar?'لغة التسجيل':'Recording language'} <select value={voiceLang} disabled={phase!=='idle'} onChange={event=>setVoiceLang(event.target.value as Lang)}><option value="ar">العربية</option><option value="en">English</option></select></label>
   {phase==='recording'?<button type="button" className="outline-button" onClick={()=>{try{if(recorder.current?.state==='recording')recorder.current.stop();}catch{fail(request.current,'recording','RECORDER_STOP_FAILED');}}}><Square size={16}/>{ar?'أوقف التسجيل':'Stop recording'}</button>:
    <button type="button" className="outline-button" disabled={phase!=='idle'||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'} onClick={requestRecording}><Mic size={16}/>{ar?'سجّل سؤالك':'Record question'}</button>}
   {(phase!=='idle'||pendingModel)&&<button type="button" className="outline-button" onClick={()=>{release(true);setPendingModel(null);setRecordingUrl('');setTranscriptReady(false);setProgress(undefined);setError(null);setLevel(0);setElapsed(0);setPhase('idle');}}>{ar?'إلغاء الصوت':'Cancel voice'}</button>}
  </div>
  <small>{ar?'يبقى الصوت والنص على جهازك. تُنزّل ملفات النموذج العامة من Hugging Face عبر هذا الموقع؛ لا يُرفع تسجيلك أو سؤالك إلى خدمة تعرّف صوتي. راجع النص قبل الإرسال.':'Audio and transcript stay on your device. Public model files download from Hugging Face through this site; your recording and question are not uploaded to a speech service. Review the transcript before sending.'}</small>
  {pendingModel&&<div className="voice-consent" role="group" aria-labelledby="voice-consent-title">
   <h4 id="voice-consent-title">{ar?'قبل أول تحويل إلى نص':'Before first transcription'}</h4>
   <p>{ar?'سيُنزل نموذج Whisper المفتوح المصدر (Apache-2.0)، وتُعالج التسجيلات محلياً.':'This downloads open-source Whisper (Apache-2.0); audio is processed locally.'} {pendingModel==='tiny'?'Tiny':'Base'} · {ar?'نحو ':'about '}{Math.round(WHISPER_MODELS[pendingModel].bytes/1048576)} {ar?'ميبيبايت':'MiB'} {ar?'للأوزان، إضافة إلى مشغّل WASM المحلي (14 MiB تقريباً) وملفات إعداد صغيرة.':'of weights, plus the local WASM runtime (about 14 MiB) and small configuration files.'}</p>
   <p>{ar?'يعمل على CPU بخيط واحد. قد يستغرق التنزيل الأول عدة دقائق؛ يمكن إلغاؤه. تُحفظ الملفات المكتملة مؤقتاً، ويمكن إعادة محاولة التسجيل نفسه. يُختار Tiny ما لم يبلغ تقدير الذاكرة 8 GiB.':'Runs on CPU via single-threaded WebAssembly. The first download may take several minutes and can be cancelled. Completed files are cached; the same recording can be retried. Tiny is used unless estimated memory is at least 8 GiB.'}</p>
   <div className="voice-consent-actions"><button type="button" className="primary-button" onClick={()=>{const model=pendingModel;consentedModels.add(model);setPendingModel(null);void start(model);}}>{ar?'أوافق، نزّل وابدأ التسجيل':'Agree, download and record'}</button><button type="button" className="outline-button" onClick={()=>setPendingModel(null)}>{ar?'ليس الآن':'Not now'}</button><a href={'https://huggingface.co/'+WHISPER_MODELS[pendingModel].id+'/tree/'+WHISPER_MODELS[pendingModel].revision} target="_blank" rel="noopener noreferrer">{ar?'راجع النموذج وترخيصه':'Review model and licence'}</a></div>
  </div>}
  {phase==='recording'&&<div className="voice-meter-row"><span>{ar?'مستوى الصوت المباشر':'Live microphone level'}</span><div className="voice-meter" role="meter" aria-label={ar?'مستوى الميكروفون':'Microphone input level'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={level}><span style={{width:level+'%'}}/></div></div>}
  {phase==='recording'&&meterError&&<small role="status">{ar?'مقياس الصوت غير متاح؛ يستمر التسجيل.':'Live level feedback is unavailable; recording continues.'}</small>}
  {status&&<small role="status">{status}</small>}
  {phase==='loading'&&progress!==undefined&&<progress max={100} value={progress} aria-label={ar?'تنزيل النموذج':'Voice model download'}/>}
  {recordingUrl&&<audio controls src={recordingUrl} aria-label={ar?'راجع تسجيل السؤال':'Review question recording'}/>}
  {transcriptReady&&<small role="status">{ar?'النص جاهز للتعديل في خانة السؤال. راجعه قبل الإرسال.':'Transcription is ready to edit in the question field. Review it before sending.'}</small>}
  {error&&<div role="alert" className="assistant-error"><p>{voiceErrorText(error.stage,error.code,lang,error.file)}</p><small>{VOICE_STAGES[error.stage][lang]} · {error.code}</small><button type="button" className="outline-button" onClick={retry}>{lastBlob.current?(ar?'أعد تحويل هذا التسجيل':'Retry transcription'):(ar?'أعد التسجيل':'Retry recording')}</button></div>}
 </div>;
}

export function AnswerVoice({text, lang, auto}: {text: string; lang: Lang; auto: boolean}) {
 const [speaking, setSpeaking] = useState(false);
 const [preparing, setPreparing] = useState(false);
 const [audioUrl, setAudioUrl] = useState('');
 const [played, setPlayed] = useState(false);
 const [error, setError] = useState('');
 const fallback = useRef<Worker | null>(null);
 const playAfterSynthesis = useRef(false);
 const url = useRef('');
 const player = useRef<HTMLAudioElement>(null);
 const timer = useRef(0);
 const playbackGeneration=useRef(0);
 const ar = lang === 'ar';

 const stop = () => {
  playbackGeneration.current++;
  window.clearTimeout(timer.current);
  playAfterSynthesis.current = false;
  fallback.current?.terminate();
  fallback.current = null;
  player.current?.pause();
  if (url.current) URL.revokeObjectURL(url.current);
  url.current = '';
  setAudioUrl('');
  setPreparing(false);
  setSpeaking(false);
 };

 const speak = () => {
  if (audioUrl && player.current) {
   const operation=playbackGeneration.current;
   player.current.currentTime = 0;
   setSpeaking(true);
   void player.current.play().catch(() => {
    if(operation!==playbackGeneration.current)return;
    setSpeaking(false);
    setError(ar ? 'تعذّر تشغيل الصوت. جرّب زر الاستماع مرة أخرى.' : 'Audio playback is unavailable. Try Listen to reply again.');
   });
   return;
  }
  stop();
  const operation=playbackGeneration.current;
  setError('');
  playAfterSynthesis.current = true;
  const spoken = text.replaceAll('°C', ar ? ' درجة مئوية' : ' degrees Celsius')
   .replaceAll('NASA POWER', ar ? 'ناسا باور' : 'NASA POWER');
  setPreparing(true);
  const fail = () => {
   if(operation!==playbackGeneration.current)return;
   stop();
   setError(ar ? 'تعذّر إعداد الصوت محلياً. جرّب زر الاستماع مرة أخرى.' : 'Local speech generation failed. Try Listen to reply again.');
  };
  try {
   const engine = new Worker(new URL('../lib/speech-output.worker.ts', import.meta.url), {type: 'module'});
   fallback.current = engine;
   engine.onerror = fail;
   engine.onmessage = ({data}: MessageEvent<{audio?: ArrayBuffer; error?: string}>) => {
    if (fallback.current !== engine) return;
    if (!data.audio) { fail(); return; }
    engine.terminate();
    fallback.current = null;
    window.clearTimeout(timer.current);
    url.current = URL.createObjectURL(new Blob([data.audio], {type: 'audio/wav'}));
    setAudioUrl(url.current);
    setPreparing(false);
   };
   timer.current = window.setTimeout(fail, 35_000);
   engine.postMessage({text: spoken, lang});
  } catch { fail(); }
 };
 useEffect(()=>{
  if(!audioUrl||!playAfterSynthesis.current||!player.current)return;
  playAfterSynthesis.current=false;
  const operation=playbackGeneration.current;
  void player.current.play().then(()=>{if(operation===playbackGeneration.current)setSpeaking(true);}).catch(()=>{
   if(operation!==playbackGeneration.current)return;
   setError(ar ? 'تعذّر تشغيل الصوت. جرّب زر الاستماع مرة أخرى.' : 'Audio playback is unavailable. Try Listen to reply again.');
  });
 },[audioUrl,ar]);
 useEffect(() => {
  if (auto) speak();
  return stop;
 }, [text, lang, auto]);
 return <div className="assistant-voice">
  <button className="outline-button" type="button" onClick={speaking || preparing ? stop : speak}>
   {speaking || preparing ? <Square size={16}/> : <Volume2 size={16}/>}
   {speaking || preparing ? ar ? 'أوقف الصوت' : 'Stop audio' : audioUrl || played ? ar ? 'أعد تشغيل الرد' : 'Replay reply' : ar ? 'استمع للرد' : 'Listen to reply'}
  </button>
  {preparing && <small role="status">{ar ? 'جارٍ إعداد الرد المسموع…' : 'Preparing spoken reply…'}</small>}
  {audioUrl && <audio ref={player} src={audioUrl} controls
   aria-label={ar ? 'الرد المسموع' : 'Spoken reply'} onPlay={() => setSpeaking(true)}
   onPause={() => setSpeaking(false)} onEnded={() => {setSpeaking(false);setPlayed(true);}}
   onError={() => {setSpeaking(false);setError(ar ? 'تعذّر تشغيل الصوت المجهّز.' : 'The prepared audio could not be played.');}}/>}
  {error && <small role="status">{error}</small>}
  <small className="assistant-voice-note">{ar ?
   'يُنشأ الرد صوتياً محلياً باستخدام eSpeak-NG مفتوح المصدر بصوت آلي؛ لا تُستخدم أصوات الجهاز أو خدمات صوت خارجية.' :
   'Replies are synthesized locally with open-source eSpeak-NG; the voice is robotic, and device or external speech services are not used.'}</small>
 </div>;
}
