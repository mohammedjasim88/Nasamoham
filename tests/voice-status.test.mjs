import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceErrorText,voiceDownloadProgress} from '../src/lib/voice-status.mjs';
import {recordingMimeType,decodeVoiceAudio} from '../src/lib/voice-audio.mjs';
test('errors distinguish permission, decoding, runtime and model downloads in both languages',()=>{
 assert.match(voiceErrorText('configuration','MODEL_DOWNLOAD_FAILED','en','config.json'),/configuration download \(config.json\)/);
 assert.match(voiceErrorText('configuration','MODEL_DOWNLOAD_FAILED'),/changing microphone permission will not fix/);
 assert.match(voiceErrorText('runtime','TIMEOUT','ar'),/WASM/);
 assert.match(voiceErrorText('decoding','DECODE_FAILED'),/could not be decoded/);
 assert.doesNotMatch(voiceErrorText('model','MODEL_DOWNLOAD_FAILED','en','https://private.test/?secret=x'),/private|secret/);
});
test('download bytes accumulate across files without counting duplicate events twice',()=>{
 const files=new Map();assert.equal(voiceDownloadProgress(files,'encoder.onnx',20,40,100),20);
 assert.equal(voiceDownloadProgress(files,'decoder.onnx',30,60,100),50);
 assert.equal(voiceDownloadProgress(files,'encoder.onnx',10,40,100),50);
 assert.equal(voiceDownloadProgress(files,'config.json',100,100,100),null);
 assert.equal(voiceDownloadProgress(files,'decoder.onnx',10000,60,100),80);
});
test('MIME negotiation selects a supported encoder and empty audio fails before decoding',async()=>{
 assert.equal(recordingMimeType({isTypeSupported:type=>type==='audio/webm;codecs=opus'}),'audio/webm;codecs=opus');
 assert.equal(recordingMimeType({isTypeSupported:type=>type==='audio/mp4'}),'audio/mp4');
 assert.equal(recordingMimeType({}),'');await assert.rejects(decodeVoiceAudio(new Blob()),/EMPTY_RECORDING/);
});
