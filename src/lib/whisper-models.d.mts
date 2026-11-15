export type WhisperModel = 'tiny' | 'base';
export const WHISPER_MODELS: Readonly<Record<WhisperModel, Readonly<{
 id: string;
 revision: string;
 bytes: number;
}>>>;
export function chooseWhisperModel(deviceMemoryGiB: number | undefined): WhisperModel;
