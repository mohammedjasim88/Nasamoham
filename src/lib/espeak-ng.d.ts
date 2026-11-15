declare module 'espeak-ng' {
 type Options = {wasmBinary: ArrayBuffer; arguments: string[]; printErr: (message: string) => void};
 export default function speak(options: Options): Promise<{FS: {readFile(path: string): Uint8Array}}>;
}
