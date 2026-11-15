import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseWhisperModel, WHISPER_MODELS} from '../src/lib/whisper-models.mjs';

test('unknown and constrained devices use the smaller pinned Whisper model', () => {
 for (const memory of [undefined, 0, 4, 7.9, NaN]) assert.equal(chooseWhisperModel(memory), 'tiny');
 assert.equal(WHISPER_MODELS.tiny.bytes, 40_852_675);
});

test('the larger model is selected only at the high-memory threshold', () => {
 assert.equal(chooseWhisperModel(8), 'base');
 assert.equal(chooseWhisperModel(16), 'base');
 assert.equal(WHISPER_MODELS.base.bytes, 76_908_389);
});
