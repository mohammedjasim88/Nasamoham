/** Reject empty/invalid recordings before any model download or inference. Not a speech recognizer. */
export function checkVoiceAudio(audio) {
 if(!(audio instanceof Float32Array)||audio.length<4000)return 'TOO_SHORT';
 if(audio.length>25*16000+16000)return 'TOO_LONG';
 let power=0;
 for(const value of audio){
  if(!Number.isFinite(value))return 'INVALID_AUDIO';
  power+=value*value;
 }
 return power/audio.length<1e-8?'SILENT_AUDIO':null;
}

export function recordingMimeType(recorder=globalThis.MediaRecorder){
 return ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'].find(type=>recorder?.isTypeSupported?.(type))||'';
}

/** Browser-native decode/downmix/resample; returns an owned buffer safe to retain and transfer. */
export async function decodeVoiceAudio(blob){
 if(!blob?.size)throw new Error('EMPTY_RECORDING');
 const context=new AudioContext();
 try{
  const decoded=await context.decodeAudioData(await blob.arrayBuffer());
  if(!Number.isFinite(decoded.duration)||decoded.duration<=0||decoded.duration>26)throw new Error('INVALID_RECORDING_DURATION');
  const output=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000);
  const source=output.createBufferSource();source.buffer=decoded;source.connect(output.destination);source.start();
  return (await output.startRendering()).getChannelData(0).slice();
 }finally{await context.close();}
}
