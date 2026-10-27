import { describe, expect, it } from 'vitest';
import { clampTimeSignature, stepsPerBar, stepsPerBeat } from '../../src/core/timeSignature';

const fb = { beats: 4, noteValue: 4 } as const;

describe('stepsPerBar', () => {
  it('counts 16th-note steps per bar', () => {
    expect(stepsPerBar({ beats: 4, noteValue: 4 })).toBe(16);
    expect(stepsPerBar({ beats: 5, noteValue: 4 })).toBe(20);
    expect(stepsPerBar({ beats: 7, noteValue: 8 })).toBe(14);
    expect(stepsPerBar({ beats: 6, noteValue: 8 })).toBe(12);
  });
});

describe('stepsPerBeat', () => {
  it('is 16 divided by the note value', () => {
    expect(stepsPerBeat({ beats: 4, noteValue: 4 })).toBe(4);
    expect(stepsPerBeat({ beats: 7, noteValue: 8 })).toBe(2);
    expect(stepsPerBeat({ beats: 3, noteValue: 2 })).toBe(8);
    expect(stepsPerBeat({ beats: 3, noteValue: 16 })).toBe(1);
  });
});

describe('clampTimeSignature', () => {
  it('clamps beats to 1-16', () => {
    expect(clampTimeSignature(0, 4, fb)).toEqual({ beats: 1, noteValue: 4 });
    expect(clampTimeSignature(99, 8, fb)).toEqual({ beats: 16, noteValue: 8 });
  });
  it('rounds beats', () => {
    expect(clampTimeSignature(7.6, 8, fb)).toEqual({ beats: 8, noteValue: 8 });
  });
  it('falls back for non-finite beats', () => {
    expect(clampTimeSignature(NaN, 8, fb)).toEqual({ beats: 4, noteValue: 8 });
  });
  it('falls back for invalid note values', () => {
    expect(clampTimeSignature(5, 3, fb)).toEqual({ beats: 5, noteValue: 4 });
  });
});
