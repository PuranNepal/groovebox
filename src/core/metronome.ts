import { defaultAccents, type Accent } from './accents';
import type { TimeSignature } from './timeSignature';

export type MetronomeState = {
  bpm: number;
  timeSignature: TimeSignature;
  accents: Accent[];
};

export function defaultMetronomeState(): MetronomeState {
  return {
    bpm: 120,
    timeSignature: { beats: 4, noteValue: 4 },
    accents: defaultAccents(4),
  };
}
