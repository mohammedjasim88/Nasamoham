/** Opt-in real Edge/Whisper integration check. Generated speech + native fake capture, NOT physical mic validation. */
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import speak from 'espeak-ng';
import assert from 'node:assert/strict';

const origin=process.argv[2]||'http://127.0.0.1:8791';
const language=process.argv[3]||'en',model=process.argv[4]||'tiny';
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin)||!['ar','en'].includes(language)||!['tiny','base'].includes(model))throw new Error('Use a local preview/dev origin, ar/en, and tiny/base');
const out=resolve('audit-results','real-voice-'+Date.now());await mkdir(out,{recursive:true});
const sentence=language==='ar'?'قارن درجة الحرارة في مسقط عام ألفين وعام ألفين وعشرة':'Compare Muscat temperature in two thousand and two thousand and ten.';
const engine=await speak({wasmBinary:await readFile('node_modules/espeak-ng/dist/espeak-ng.wasm'),arguments:['-v',language==='ar'?'ar':'en-gb','-s','140','-w','speech.wav',sentence],printErr:()=>{}});
const wav=Buffer.from(engine.FS.readFile('speech.wav')),wavPath=resolve(out,'speech.wav');await writeFile(wavPath,wav,{flag:'wx'});
const duration=Math.min(12,(wav.byteLength-44)/wav.readUInt32LE(28)+.5);
const result={origin,language,model,physicalMicrophone:false,generatedSpeech:true,mockedASR:false,accuracyValidated:false,expectedSpeech:sentence,started:new Date().toISOString(),requests:[],console:[],checks:[]};
const safe=text=>String(text).replace(/https?:\/\/[^\s"']+/g,value=>{try{const url=new URL(value);return url.origin+url.pathname;}catch{return value;}}).slice(0,1600);
let browser,page;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+wavPath]});
 page=await browser.newPage();
 await page.addInitScript(({model})=>{
  Object.defineProperty(navigator,'deviceMemory',{configurable:true,value:model==='tiny'?4:8});
  window.voiceTrace={recordings:0,blobs:[],decoded:[],resampled:[],workerInputs:[],events:[]};
  const originalStart=MediaRecorder.prototype.start;
  MediaRecorder.prototype.start=function(...args){window.voiceTrace.recordings++;this.addEventListener('dataavailable',event=>window.voiceTrace.blobs.push({bytes:event.data.size,mime:event.data.type}));this.addEventListener('stop',()=>{window.voiceTrace.tracksEnded=this.stream.getTracks().every(track=>track.readyState==='ended');});return originalStart.apply(this,args);};
  const originalDecode=AudioContext.prototype.decodeAudioData;
  AudioContext.prototype.decodeAudioData=function(...args){return originalDecode.apply(this,args).then(buffer=>{window.voiceTrace.decoded.push({sampleRate:buffer.sampleRate,channels:buffer.numberOfChannels,duration:buffer.duration});return buffer;});};
  const originalRender=OfflineAudioContext.prototype.startRendering;
  OfflineAudioContext.prototype.startRendering=function(...args){return originalRender.apply(this,args).then(buffer=>{window.voiceTrace.resampled.push({sampleRate:buffer.sampleRate,channels:buffer.numberOfChannels,frames:buffer.length});return buffer;});};
  const OriginalWorker=Worker;
  window.Worker=class extends OriginalWorker{
   constructor(url,options){super(url,options);if(String(url).includes('whisper')){window.voiceTrace.workers=(window.voiceTrace.workers||0)+1;this.addEventListener('message',({data})=>{if(data.status!=='loading')window.voiceTrace.events.push(data);});}}
   postMessage(data,...args){if(data.audio instanceof Float32Array){let sum=0;for(const value of data.audio)sum+=value*value;window.voiceTrace.workerInputs.push({id:data.id,language:data.lang,model:data.model,samples:data.audio.length,rms:Math.sqrt(sum/data.audio.length)});}return super.postMessage(data,...args);}
  };
 },{model});
 page.on('request',request=>{if(request.url().includes('/api/voice-model/'))result.requests.push({url:new URL(request.url()).pathname,method:request.method()});if(request.method()==='POST')result.unexpectedPost=true;});
 page.on('console',message=>{if(message.type()==='error')result.console.push(safe(message.text()));});
 const response=await page.goto(origin+'/#ask',{waitUntil:'domcontentloaded'});result.csp=response.headers()['content-security-policy']||null;
 const voice=page.locator('.assistant-question > .assistant-voice');
 await voice.getByLabel('Recording language').selectOption(language);
 const injectFailure=process.argv.includes('--retry-download');let injected=false;
 if(injectFailure)await page.route('**/api/voice-model/**/config.json',async route=>{if(!injected){injected=true;await route.abort('failed');}else await route.continue();});
 await voice.getByRole('button',{name:'Record question',exact:true}).click();
 await voice.getByRole('button',{name:'Agree, download and record',exact:true}).click();
 await voice.getByRole('button',{name:'Stop recording',exact:true}).waitFor();
 // Intentional capture duration: the native recorder receives generated speech from Edge's fake device.
 await page.waitForTimeout(duration*1000);
 await voice.getByRole('button',{name:'Stop recording',exact:true}).click();
 if(injectFailure){
  await voice.getByRole('button',{name:'Retry transcription',exact:true}).waitFor({timeout:45000});
  result.injectedFailureText=await voice.getByRole('alert').innerText();
  assert.match(result.injectedFailureText,/configuration download/);
  await page.unroute('**/api/voice-model/**/config.json');
  await voice.getByRole('button',{name:'Retry transcription',exact:true}).click();
 }
 await page.waitForFunction(()=>document.querySelector('#question')?.value||document.querySelector('.assistant-question > .assistant-voice [role="alert"]'),{},{timeout:300000});
 result.transcript=await page.getByRole('textbox',{name:'Your question'}).inputValue();
 if(!result.transcript)throw new Error(await voice.getByRole('alert').innerText());
 result.trace=await page.evaluate(()=>window.voiceTrace);
 assert.equal(result.trace.recordings,1,'Retry must reuse the recording rather than access the microphone again');
 assert.equal(result.trace.tracksEnded,true);assert.ok(result.trace.blobs.some(blob=>blob.bytes>0));
 assert.ok(result.trace.resampled.every(audio=>audio.sampleRate===16000&&audio.channels===1));
 assert.ok(result.trace.workerInputs.every(input=>input.language===language&&input.model===model&&input.samples>4000&&input.rms>0));
 assert.equal(await page.locator('.assistant-summary').count(),0,'Transcription must not submit a climate question automatically');
 assert.ok(!result.unexpectedPost,'No audio may be sent to a server');
 await page.getByRole('textbox',{name:'Your question'}).fill(result.transcript+' editable');
 result.checks=['native MediaRecorder Opus audio','native decode and mono 16 kHz resampling','pinned model download','real local WASM inference','correct language/model request','tracks released','editable transcript without auto-submit','no audio upload'];
 if(injected)result.checks.push('same-recording retry after actual request failure');
 if(process.argv.includes('--warm')){
  const requestsBefore=result.requests.length,workersBefore=result.trace.workers;
  await page.getByRole('textbox',{name:'Your question'}).fill('');
  await voice.getByRole('button',{name:'Record question',exact:true}).click();
  await voice.getByRole('button',{name:'Stop recording',exact:true}).waitFor();
  await page.waitForTimeout(duration*1000);
  await voice.getByRole('button',{name:'Stop recording',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#question')?.value||document.querySelector('.assistant-question > .assistant-voice [role="alert"]'),{},{timeout:180000});
  result.warmTranscript=await page.getByRole('textbox',{name:'Your question'}).inputValue();
  assert.ok(result.warmTranscript,'Warm inference must return a transcript');
  result.trace=await page.evaluate(()=>window.voiceTrace);
  assert.equal(result.trace.workers,workersBefore,'Keep the loaded worker between recordings');
  assert.equal(result.requests.length,requestsBefore,'A warm recording must not download any model file again');
  result.checks.push('second recording reuses worker/model without any extra model requests');
 }
 await page.screenshot({path:resolve(out,'success.png'),fullPage:false});result.status='PASS';
}catch(error){result.status='FAIL';result.error=safe(error);if(page){result.trace=await page.evaluate(()=>window.voiceTrace).catch(()=>null);await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});}process.exitCode=1;}
finally{await browser?.close();result.finished=new Date().toISOString();await writeFile(resolve(out,'result.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({artifact:resolve(out,'result.json'),status:result.status,origin,language,model,transcript:result.transcript,error:result.error,checks:result.checks,recordings:result.trace?.recordings,resampled:result.trace?.resampled,requests:result.requests.length,events:result.trace?.events.slice(-6)},null,2));}
