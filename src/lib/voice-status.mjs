export const VOICE_STAGES={
 permission:{en:'microphone access',ar:'إذن الميكروفون'},recording:{en:'recording',ar:'التسجيل'},
 decoding:{en:'audio decoding',ar:'فك ترميز الصوت'},validation:{en:'audio validation',ar:'فحص الصوت'},
 worker:{en:'voice worker startup',ar:'بدء عامل الصوت'},configuration:{en:'model configuration download',ar:'تنزيل إعدادات النموذج'},
 model:{en:'model download / initialization',ar:'تنزيل النموذج وتهيئته'},runtime:{en:'local WASM runtime',ar:'مشغّل WASM المحلي'},
 transcribing:{en:'transcription',ar:'التعرف على الكلام'}
};
export function voiceErrorText(stage,code,lang='en',file=''){
 const ar=lang==='ar',label=VOICE_STAGES[stage]?.[lang]||VOICE_STAGES.model[lang];
 let hint=ar?'أعد المحاولة. يبقى التسجيل على جهازك.':'Retry; your recording stays on your device.';
 if(code==='SILENT_AUDIO')hint=ar?'التسجيل صامت. تحقق من الميكروفون وسجّل مجدداً.':'The recording is silent. Check your microphone and record again.';
 else if(code==='NO_SPEECH')hint=ar?'لم يُلتقط كلام واضح. استمع إلى التسجيل أو سجّل سؤالاً أوضح.':'No clear speech was detected. Listen to the recording or record a clearer question.';
 else if(code==='EMPTY_RECORDING'||code==='TOO_SHORT')hint=ar?'التسجيل فارغ أو قصير جداً. سجّل سؤالاً واضحاً.':'The recording is empty or too short. Record a clear question.';
 else if(code==='MIC_DENIED')hint=ar?'تم حظر إذن الميكروفون لهذا الموقع.':'Microphone access was denied for this site.';
 else if(code==='MIC_MISSING')hint=ar?'لم يُعثر على ميكروفون.':'No microphone was found.';
 else if(code==='MIC_BUSY')hint=ar?'الميكروفون مشغول. أغلق التطبيق الذي يستخدمه.':'The microphone is busy. Close the app using it.';
 else if(code==='DECODE_FAILED')hint=ar?'تعذّر فك ترميز التسجيل. أعد المحاولة أو سجّل مجدداً.':'The recording could not be decoded. Retry or record again.';
 else if(code==='MODEL_MEMORY')hint=ar?'الذاكرة غير كافية. أغلق علامات التبويب الأخرى أو جرّب النموذج Tiny.':'Insufficient model memory. Close other tabs or try the Tiny model.';
 else if(code==='TIMEOUT')hint=ar?'توقفت الاستجابة في هذه المرحلة. أعد المحاولة؛ الملفات المكتملة تبقى مخزنة مؤقتاً.':'This stage stopped responding. Retry; completed model files remain cached.';
 else if(/DOWNLOAD|HTTP|NETWORK/.test(code))hint=ar?'تعذّر تنزيل ملف النموذج. أعد المحاولة؛ لا يحتاج ذلك إلى تغيير إذن الميكروفون.':'A model file could not be downloaded. Retry; changing microphone permission will not fix a download error.';
 const name=/^[\w.-]+$/.test(file)?` (${file})`:'';
 return ar?`تعذّر تحويل التسجيل محلياً في مرحلة ${label}${name}. ${hint}`:`Local transcription failed at ${label}${name}. ${hint}`;
}
export function voiceDownloadProgress(files,file,loaded,total,expected){
 if(!file?.endsWith('.onnx')||!Number.isFinite(loaded)||loaded<0)return null;
 const previous=files.get(file)||0;files.set(file,Math.max(previous,Math.min(loaded,Number.isFinite(total)&&total>0?total:loaded)));
 return Math.min(99,Math.floor([...files.values()].reduce((a,b)=>a+b,0)/expected*100));
}
