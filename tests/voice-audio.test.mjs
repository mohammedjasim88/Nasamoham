import test from 'node:test';
import assert from 'node:assert/strict';
import {checkVoiceAudio} from '../src/lib/voice-audio.mjs';

test('silent recordings and short clicks are rejected before local inference',()=>{
 assert.equal(checkVoiceAudio(new Float32Array(16000)),'SILENT_AUDIO');
 assert.equal(checkVoiceAudio(new Float32Array(3999).fill(.2)),'TOO_SHORT');
});
test('invalid and oversized recordings are rejected; quiet non-silent audio is retained',()=>{
 const invalid=new Float32Array(16000);invalid[0]=NaN;
 assert.equal(checkVoiceAudio(invalid),'INVALID_AUDIO');
 assert.equal(checkVoiceAudio(new Float32Array(26*16000+1)),'TOO_LONG');
 assert.equal(checkVoiceAudio(new Float32Array(16000).fill(.0002)),null);
});
