import type { Accent } from './accents';
import { resizeAccents } from './accents';
import { defaultMetronomeState, type MetronomeState } from './metronome';
import type { Track } from './pattern';
import { defaultDrumState, type DrumState } from './presets';
import { isSoundId } from './sounds';
import { clampSwing, type SwingNote } from './swing';
import { clampBpm } from './tempo';
import { clampTimeSignature, stepsPerBar, type TimeSignature } from './timeSignature';

export const METRONOME_KEY = 'groovebox.metronome.v1';
export const DRUMS_KEY = 'groovebox.drums.v1';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAccent(value: unknown): value is Accent {
  return value === 'strong' || value === 'medium' || value === 'soft' || value === 'off';
}

function isSwingNote(value: unknown): value is SwingNote {
  return value === 8 || value === 16;
}

function parseTimeSignature(raw: unknown, fallback: TimeSignature): TimeSignature | null {
  if (!isRecord(raw)) return null;
  const { beats, noteValue } = raw;
  if (typeof beats !== 'number' || typeof noteValue !== 'number') return null;
  return clampTimeSignature(beats, noteValue, fallback);
}

export function parseMetronomeState(raw: unknown): MetronomeState | null {
  if (!isRecord(raw)) return null;
  const defaults = defaultMetronomeState();
  const { bpm, accents } = raw;
  if (typeof bpm !== 'number') return null;
  const timeSignature = parseTimeSignature(raw.timeSignature, defaults.timeSignature);
  if (!timeSignature) return null;
  if (!Array.isArray(accents)) return null;
  const valid: Accent[] = [];
  for (const a of accents as unknown[]) {
    if (!isAccent(a)) return null;
    valid.push(a);
  }
  return {
    bpm: clampBpm(bpm, defaults.bpm),
    timeSignature,
    accents: resizeAccents(valid, timeSignature.beats),
  };
}

function parseTrack(raw: unknown, expectedSteps: number): Track | null {
  if (!isRecord(raw)) return null;
  const { sound, steps } = raw;
  if (!isSoundId(sound) || !Array.isArray(steps) || steps.length !== expectedSteps) return null;
  const out: boolean[] = [];
  for (const s of steps as unknown[]) {
    if (typeof s !== 'boolean') return null;
    out.push(s);
  }
  return { sound, steps: out };
}

export function parseDrumState(raw: unknown): DrumState | null {
  if (!isRecord(raw)) return null;
  const defaults = defaultDrumState();
  const { bpm, swing, swingNote, pattern } = raw;
  if (typeof bpm !== 'number' || typeof swing !== 'number') return null;
  if (!isSwingNote(swingNote)) return null;
  const timeSignature = parseTimeSignature(raw.timeSignature, defaults.timeSignature);
  if (!timeSignature) return null;
  if (!isRecord(pattern) || !Array.isArray(pattern.tracks)) return null;
  const expectedSteps = stepsPerBar(timeSignature);
  const tracks: Track[] = [];
  const seen = new Set<string>();
  for (const t of pattern.tracks as unknown[]) {
    const track = parseTrack(t, expectedSteps);
    if (!track || seen.has(track.sound)) return null;
    seen.add(track.sound);
    tracks.push(track);
  }
  return {
    bpm: clampBpm(bpm, defaults.bpm),
    timeSignature,
    swing: clampSwing(swing, defaults.swing),
    swingNote,
    pattern: { tracks },
  };
}

export function loadState<T>(
  storage: StorageLike | undefined,
  key: string,
  parse: (raw: unknown) => T | null,
): T | null {
  if (!storage) return null;
  try {
    const text = storage.getItem(key);
    if (text === null) return null;
    return parse(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

export function saveState(storage: StorageLike | undefined, key: string, state: unknown): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(state));
  } catch {
    // Storage may be full or blocked (private mode); settings just won't persist.
  }
}
