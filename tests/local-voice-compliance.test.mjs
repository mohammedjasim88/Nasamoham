import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('spoken replies use the bundled local synthesizer, not browser or remote speech services',()=>{
 const voice=source('../src/components/AssistantVoice.tsx');
 assert.match(voice,/speech-output\.worker\.ts/);
 assert.doesNotMatch(voice,/speechSynthesis|SpeechSynthesisUtterance/);
 assert.match(voice,/synthesized locally|يُنشأ الرد صوتياً محلياً/);
});

test('the React app does not invoke the optional Cloudflare AI endpoint',()=>{
 const app=source('../src/App.tsx');
 assert.doesNotMatch(app,/\/api\/ask/);
});
