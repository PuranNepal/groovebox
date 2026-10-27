export const SOUND_IDS = [
  'kick',
  'snare',
  'hihat',
  'openhat',
  'crash',
  'ride',
  'clap',
  'tomHigh',
  'tomFloor',
  'cowbell',
  'rimshot',
] as const;

export type SoundId = (typeof SOUND_IDS)[number];

export const SOUND_LABELS: Record<SoundId, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-hat',
  openhat: 'Open hi-hat',
  crash: 'Crash',
  ride: 'Ride',
  clap: 'Clap',
  tomHigh: 'High tom',
  tomFloor: 'Floor tom',
  cowbell: 'Cowbell',
  rimshot: 'Rimshot',
};

export const DEFAULT_SOUNDS: SoundId[] = ['kick', 'snare', 'hihat'];

export function isSoundId(value: unknown): value is SoundId {
  return typeof value === 'string' && (SOUND_IDS as readonly string[]).includes(value);
}
