import speak from 'espeak-ng';
import runtimeUrl from '../../node_modules/espeak-ng/dist/espeak-ng.wasm?url';

self.onmessage = async ({data}: MessageEvent<{text: string; lang: 'ar' | 'en'}>) => {
 try {
  const runtime = await fetch(runtimeUrl);
  if (!runtime.ok) throw Error('Speech runtime unavailable');
  const engine = await speak({
   wasmBinary: await runtime.arrayBuffer(),
   arguments: ['-v', data.lang === 'ar' ? 'ar' : 'en-gb', '-b', '1', '-s', '155', '-w', 'reply.wav', data.text],
   printErr: message => console.warn(message)
  });
  const source = new Uint8Array(engine.FS.readFile('reply.wav'));
  const audio = new ArrayBuffer(source.byteLength);
  new Uint8Array(audio).set(source);
  self.postMessage({audio}, {transfer: [audio]});
 } catch (error) {
  self.postMessage({error: error instanceof Error ? error.message : 'Local speech generation failed'});
 }
};
