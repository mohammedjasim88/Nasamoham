export const WHISPER_MODELS = Object.freeze({
 tiny: Object.freeze({
  id: 'Xenova/whisper-tiny',
  revision: '5332fcc35e32a33b86612b9a57a89be7906102b1',
  bytes: 40_852_675
 }),
 base: Object.freeze({
  id: 'Xenova/whisper-base',
  revision: '64da57285918e20ea79ea5c88eed7197933abaa8',
  bytes: 76_908_389
 })
});

export function chooseWhisperModel(deviceMemoryGiB) {
 return Number.isFinite(deviceMemoryGiB) && deviceMemoryGiB >= 8 ? 'base' : 'tiny';
}
