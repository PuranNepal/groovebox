import { stepsPerBeat, type TimeSignature } from './timeSignature';

export const MIN_BPM = 20;
export const MAX_BPM = 300;

export function clampBpm(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

export function secondsPerBeat(bpm: number): number {
  return 60 / bpm;
}

export function secondsPerStep(bpm: number, ts: TimeSignature): number {
  return secondsPerBeat(bpm) / stepsPerBeat(ts);
}
