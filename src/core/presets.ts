import type { Pattern } from './pattern';
import type { SoundId } from './sounds';
import type { SwingNote } from './swing';
import { stepsPerBar, type TimeSignature } from './timeSignature';

export type DrumState = {
  bpm: number;
  timeSignature: TimeSignature;
  swing: number;
  swingNote: SwingNote;
  pattern: Pattern;
};

export type Preset = { id: string; name: string; state: DrumState };

// 'x' = step on, '.' = step off; one character per 16th step.
function parseSteps(text: string, ts: TimeSignature): boolean[] {
  if (text.length !== stepsPerBar(ts)) {
    throw new Error(`Pattern "${text}" has ${text.length} steps, expected ${stepsPerBar(ts)}`);
  }
  return Array.from(text, (c) => c === 'x');
}

function makeState(
  bpm: number,
  timeSignature: TimeSignature,
  swing: number,
  swingNote: SwingNote,
  rows: [SoundId, string][],
): DrumState {
  return {
    bpm,
    timeSignature,
    swing,
    swingNote,
    pattern: {
      tracks: rows.map(([sound, text]) => ({ sound, steps: parseSteps(text, timeSignature) })),
    },
  };
}

const FOUR_FOUR: TimeSignature = { beats: 4, noteValue: 4 };
const SEVEN_EIGHT: TimeSignature = { beats: 7, noteValue: 8 };

export const PRESETS: Preset[] = [
  {
    id: 'rock',
    name: 'Rock',
    state: makeState(110, FOUR_FOUR, 0.5, 16, [
      ['kick', 'x.......x.x.....'],
      ['snare', '....x.......x...'],
      ['hihat', 'x.x.x.x.x.x.x.x.'],
      ['crash', 'x...............'],
    ]),
  },
  {
    id: 'metal',
    name: 'Metal',
    state: makeState(180, FOUR_FOUR, 0.5, 16, [
      ['kick', 'xxxxxxxxxxxxxxxx'],
      ['snare', '....x.......x...'],
      ['ride', 'x...x...x...x...'],
      ['crash', 'x...............'],
    ]),
  },
  {
    id: 'blues-shuffle',
    name: 'Blues Shuffle',
    state: makeState(90, FOUR_FOUR, 0.67, 8, [
      ['kick', 'x.......x.......'],
      ['snare', '....x.......x...'],
      ['hihat', 'x.x.x.x.x.x.x.x.'],
    ]),
  },
  {
    id: 'hip-hop',
    name: 'Hip-Hop',
    state: makeState(88, FOUR_FOUR, 0.58, 16, [
      ['kick', 'x......x..x.....'],
      ['snare', '....x.......x...'],
      ['hihat', 'x.x.x.x.x.x.x.x.'],
    ]),
  },
  {
    id: 'odd-7-8',
    name: '7/8 (2+2+3)',
    state: makeState(140, SEVEN_EIGHT, 0.5, 16, [
      ['kick', 'x...x...x.....'],
      ['snare', '........x.....'],
      ['hihat', 'x.x.x.x.x.x.x.'],
    ]),
  },
];

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function defaultDrumState(): DrumState {
  const rock = presetById('rock');
  if (!rock) throw new Error('Rock preset missing');
  return structuredClone(rock.state);
}
