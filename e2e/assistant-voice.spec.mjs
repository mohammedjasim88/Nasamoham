import {test, expect} from '@playwright/test';

async function installVoiceMocks(page, permission='granted',options={}) {
 await page.addInitScript(({permissionState,options}) => {
  const silentWav=()=>{
   const buffer=new ArrayBuffer(46),view=new DataView(buffer);
   const text=(offset,value)=>[...value].forEach((char,index)=>view.setUint8(offset+index,char.charCodeAt(0)));
   text(0,'RIFF');view.setUint32(4,38,true);text(8,'WAVE');text(12,'fmt ');
   view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
   view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);
   view.setUint16(34,16,true);text(36,'data');view.setUint32(40,2,true);
   return buffer;
  };
  Object.defineProperty(navigator,'deviceMemory',{configurable:true,value:4});
  window.voiceFailures=options;window.voiceMicStarts=0;
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
   getUserMedia:async()=>{window.voiceMicStarts++;return permissionState==='granted'?
    ({getTracks:()=>[{stop(){window.voiceTrackStopped=true;}}]}):
    Promise.reject(new DOMException('Microphone access denied','NotAllowedError'));}
  }});
  class FakeMediaRecorder {
   constructor(stream){this.stream=stream;this.mimeType='audio/webm';this.state='inactive';}
   start(){this.state='recording';}
   stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['encoded audio fixture'])});this.onstop?.();});}
  }
  window.MediaRecorder=FakeMediaRecorder;
  class FakeAudioContext {
   constructor(){this.state='running';this.destination={};}
   async decodeAudioData(){if(options.decodeError)throw new Error('Invalid encoded audio');return {duration:.6};}
   createMediaStreamSource(){return {connect(){},disconnect(){}};}
   createAnalyser(){return {fftSize:256,getByteTimeDomainData(samples){samples.fill(128);},disconnect(){}};}
   async close(){this.state='closed';}
  }
  class FakeOfflineAudioContext {
   constructor(){this.destination={};}
   createBufferSource(){return {connect(){},start(){}};}
   async startRendering(){return {getChannelData:()=>new Float32Array(9600).fill(options.silent?0:.05)};}
  }
  window.AudioContext=FakeAudioContext;
  window.OfflineAudioContext=FakeOfflineAudioContext;
  class FakeWorker {
   constructor(url){this.terminated=false;this.speech=String(url).includes('speech-output');if(options.startupError&&!this.speech)throw new Error('Worker import blocked');}
   postMessage(data){
    if(this.speech){
     window.localSpeechRequests.push({lang:data.lang,text:data.text});
     setTimeout(()=>this.onmessage?.({data:{audio:silentWav()}}),0);
     return;
    }
    window.transcriptionRequest={lang:data.lang,model:data.model,audioLength:data.audio.length};
    if(options.noReply)return;
    if(options.workerError){setTimeout(()=>this.onmessage?.({data:{id:data.id,status:'error',stage:'configuration',file:'config.json',code:'MODEL_DOWNLOAD_FAILED'}}),0);return;}
    setTimeout(()=>{
     this.onmessage?.({data:{status:'loading',progress:100}});
     this.onmessage?.({data:{status:'transcribing'}});
     setTimeout(()=>{
      this.onmessage?.({data:{status:'done',text:data.lang==='ar'?'قارن درجة الحرارة في مسقط عامي 2000 و2010':'Compare Muscat temperature in 2000 and 2010'}});
      window.transcriptionDeliveryComplete=true;
     },options.slow?800:0);
    },0);
   }
   terminate(){this.terminated=true;}
  }
  window.Worker=FakeWorker;
  window.localSpeechRequests=[];
  window.localAudioPlayCount=0;
  window.HTMLMediaElement.prototype.play=function(){
   window.localAudioPlayCount++;
   setTimeout(()=>this.dispatchEvent(new Event('ended')),0);
   return Promise.resolve();
  };
 }, {permissionState:permission,options});
}

test('first-use disclosure is cancellable and microphone denial gives actionable feedback', async ({page}) => {
 await installVoiceMocks(page,'denied');
 await page.goto('/#ask');
 const voice=page.locator('.scientific-assistant .assistant-voice').first();
 await voice.getByRole('button',{name:'Record question'}).click();
 const consent=voice.getByRole('group',{name:'Before first transcription'});
 await expect(consent).toContainText('about 39 MiB');
 await expect(consent).toContainText('Apache-2.0');
 await expect(consent).toContainText('audio is processed locally');
 await consent.getByRole('button',{name:'Not now'}).click();
 await expect(consent).toHaveCount(0);
 await voice.getByRole('button',{name:'Record question'}).click();
 await voice.getByRole('group',{name:'Before first transcription'}).getByRole('button',{name:'Agree, download and record'}).click();
 await expect(voice.getByRole('alert')).toContainText('Microphone access was denied');
});

test('English recording is timed, locally transcribed, editable and spoken in English', async ({page}) => {
 await installVoiceMocks(page);
 await page.goto('/#ask');
 const voice=page.locator('.scientific-assistant .assistant-voice').first();
 await voice.getByRole('button',{name:'Record question'}).click();
 await voice.getByRole('group',{name:'Before first transcription'}).getByRole('button',{name:'Agree, download and record'}).click();
 const recordingStatus=voice.getByRole('status');
 await expect(recordingStatus).toContainText('Recording');
 await expect(voice.locator('.voice-meter')).toBeVisible();
 await expect.poll(async()=>{
  const match=(await recordingStatus.textContent()||'').match(/Recording (\d{2}):(\d{2})/);
  return match?Number(match[1])*60+Number(match[2]):0;
 },{timeout:10000}).toBeGreaterThan(0);
 await voice.getByRole('button',{name:'Stop recording'}).click();
 const question=page.getByRole('textbox',{name:'Your question'});
 await expect(question).toHaveValue('Compare Muscat temperature in 2000 and 2010');
 await expect.poll(()=>page.evaluate(()=>window.transcriptionRequest)).toMatchObject({lang:'en',model:'tiny',audioLength:9600});
 await expect(voice.getByLabel('Review question recording')).toBeVisible();
 await expect(voice.getByRole('status')).toContainText('ready to edit');
 await question.fill('Compare Muscat temperature in 2000 and 2010');
 await page.getByRole('button',{name:'Write evidence-based analysis'}).click();
 await expect(page.locator('.assistant-summary')).toContainText('2000');
 await expect.poll(()=>page.evaluate(()=>window.localSpeechRequests[0]?.lang)).toBe('en');
 const replay=page.getByRole('button',{name:'Replay reply'}).first();
 await replay.click();
 await expect.poll(()=>page.evaluate(()=>window.localAudioPlayCount)).toBeGreaterThan(0);
});

test('Arabic recording selects Arabic transcription and reply speech', async ({page}) => {
 await installVoiceMocks(page);
 await page.goto('/#ask');
 const voice=page.locator('.scientific-assistant .assistant-voice').first();
 await voice.getByLabel('Recording language').selectOption('ar');
 await voice.getByRole('button',{name:'Record question'}).click();
 await voice.getByRole('group',{name:'Before first transcription'}).getByRole('button',{name:'Agree, download and record'}).click();
 await voice.getByRole('button',{name:'Stop recording'}).click();
 const question=page.getByRole('textbox',{name:'Your question'});
 await expect(question).toHaveValue(/قارن درجة الحرارة/);
 await expect.poll(()=>page.evaluate(()=>window.transcriptionRequest?.lang)).toBe('ar');
 await page.getByRole('button',{name:'Write evidence-based analysis'}).click();
 await expect(page.locator('.assistant-summary')).toContainText('2000');
 await expect.poll(()=>page.evaluate(()=>window.localSpeechRequests[0]?.lang)).toBe('ar');
 await page.getByRole('button',{name:'أعد تشغيل الرد'}).first().click();
 await expect.poll(()=>page.evaluate(()=>window.localAudioPlayCount)).toBeGreaterThan(0);
});

test('recording cancellation releases the microphone without starting transcription', async ({page}) => {
 await installVoiceMocks(page);
 await page.goto('/#ask');
 const voice=page.locator('.scientific-assistant .assistant-voice').first();
 await voice.getByRole('button',{name:'Record question'}).click();
 await voice.getByRole('group',{name:'Before first transcription'}).getByRole('button',{name:'Agree, download and record'}).click();
 await expect(voice.getByRole('status')).toContainText('Recording');
 await voice.getByRole('button',{name:'Cancel voice'}).click();
 await expect(voice.getByRole('status')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>window.voiceTrackStopped)).toBe(true);
 expect(await page.evaluate(()=>window.transcriptionRequest)).toBeUndefined();
});

test('silent audio is rejected before any Whisper inference',async({page})=>{
 await installVoiceMocks(page,'granted',{silent:true});await page.goto('/#ask');
 const voice=page.locator('.scientific-assistant .assistant-voice').first();
 await voice.getByRole('button',{name:'Record question'}).click();
 await voice.getByRole('button',{name:'Agree, download and record'}).click();
 await voice.getByRole('button',{name:'Stop recording'}).click();
 await expect(voice.getByRole('alert')).toContainText('recording is silent');
 expect(await page.evaluate(()=>window.transcriptionRequest)).toBeUndefined();
 await expect(page.getByRole('textbox',{name:'Your question'})).toHaveValue('');
});

test('cancelling transcription ignores late worker results and preserves a typed question',async({page})=>{
 await installVoiceMocks(page,'granted',{slow:true});await page.goto('/#ask');
 const voice=page.locator('.scientific-assistant .assistant-voice').first();
 await voice.getByRole('button',{name:'Record question'}).click();
 await voice.getByRole('button',{name:'Agree, download and record'}).click();
 await voice.getByRole('button',{name:'Stop recording'}).click();
 await expect(voice.getByRole('status')).toContainText('Transcribing');
 await voice.getByRole('button',{name:'Cancel voice'}).click();
 await page.getByRole('textbox',{name:'Your question'}).fill('Keep this typed question');
 await expect.poll(()=>page.evaluate(()=>window.transcriptionDeliveryComplete)).toBe(true);
 await expect(page.getByRole('textbox',{name:'Your question'})).toHaveValue('Keep this typed question');
 await expect(voice.getByLabel('Review question recording')).toHaveCount(0);
 expect(await page.evaluate(()=>window.voiceTrackStopped)).toBe(true);
});

for(const lang of ['en','ar'])test(`real bundled eSpeak-NG produces playable ${lang} reply audio`,async({page})=>{
 await page.goto('/#ask');
 await page.getByRole('textbox',{name:'Your question'}).fill(lang==='ar'?'قارن حرارة مسقط عامي 2000 و2010':'Compare Muscat temperature in 2000 and 2010');
 await page.getByRole('button',{name:'Write evidence-based analysis',exact:true}).click();
 const summary=page.locator('.assistant-summary');await expect(summary).toBeVisible();
 await summary.getByRole('button',{name:lang==='ar'?'استمع للرد':'Listen to reply',exact:true}).click();
 await expect(summary.locator('audio')).toHaveAttribute('src',/^blob:/,{timeout:40000});
 await expect.poll(()=>summary.locator('audio').evaluate(element=>Number.isFinite(element.duration)?element.duration:0),{timeout:10000}).toBeGreaterThan(0);
 await summary.getByRole('button',{name:lang==='ar'?'أوقف الصوت':'Stop audio',exact:true}).click();
 await expect(summary.locator('audio')).toHaveCount(0);
});

test('transcription failure retains the valid recording, identifies its stage and permits retry',async({page})=>{
 await installVoiceMocks(page,'granted',{workerError:true});await page.goto('/#ask');
 const voice=page.locator('.scientific-assistant .assistant-voice').first();
 await voice.getByRole('button',{name:'Record question'}).click();
 await voice.getByRole('button',{name:'Agree, download and record'}).click();
 await voice.getByRole('button',{name:'Stop recording'}).click();
 await expect(voice.getByRole('alert')).toContainText('Local transcription failed');
 await expect(voice.getByLabel('Review question recording')).toBeVisible();
 await expect(voice.getByRole('alert')).toContainText('model configuration download');
 await expect(voice.getByRole('button',{name:'Retry transcription'})).toBeEnabled();
 await expect(voice.getByRole('button',{name:'Record question'})).toBeEnabled();
 expect(await page.evaluate(()=>window.voiceTrackStopped)).toBe(true);
 await page.evaluate(()=>{window.voiceFailures.workerError=false;});
 await voice.getByRole('button',{name:'Retry transcription'}).click();
 await expect(page.getByRole('textbox',{name:'Your question'})).toHaveValue('Compare Muscat temperature in 2000 and 2010');
 expect(await page.evaluate(()=>window.voiceMicStarts)).toBe(1);
});

for(const [option,stage] of [['decodeError','audio decoding'],['startupError','voice worker startup']])test(stage+' errors retry the retained recording without another microphone request',async({page})=>{
 await installVoiceMocks(page,'granted',{[option]:true});await page.goto('/#ask');
 const voice=page.locator('.assistant-question > .assistant-voice');
 await voice.getByRole('button',{name:'Record question'}).click();
 await voice.getByRole('button',{name:'Agree, download and record'}).click();
 await voice.getByRole('button',{name:'Stop recording'}).click();
 await expect(voice.getByRole('alert')).toContainText(stage);
 await page.evaluate(option=>{window.voiceFailures[option]=false;},option);
 await voice.getByRole('button',{name:'Retry transcription'}).click();
 await expect(page.getByRole('textbox',{name:'Your question'})).toHaveValue('Compare Muscat temperature in 2000 and 2010');
 expect(await page.evaluate(()=>window.voiceMicStarts)).toBe(1);
});

test('a worker that never replies reports its startup timeout and can be retried',async({page})=>{
 await installVoiceMocks(page,'granted',{noReply:true});await page.clock.install();await page.goto('/#ask');
 const voice=page.locator('.assistant-question > .assistant-voice');
 await voice.getByRole('button',{name:'Record question'}).click();
 await voice.getByRole('button',{name:'Agree, download and record'}).click();
 await voice.getByRole('button',{name:'Stop recording'}).click();
 await expect.poll(()=>page.evaluate(()=>!!window.transcriptionRequest)).toBe(true);
 await page.clock.fastForward(21000);
 await expect(voice.getByRole('alert')).toContainText('voice worker startup');
 await expect(voice.getByRole('alert')).toContainText('TIMEOUT');
 await page.evaluate(()=>{window.voiceFailures.noReply=false;});
 await voice.getByRole('button',{name:'Retry transcription'}).click();
 await expect(page.getByRole('textbox',{name:'Your question'})).toHaveValue('Compare Muscat temperature in 2000 and 2010');
});
