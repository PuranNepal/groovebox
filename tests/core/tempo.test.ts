import { describe, expect, it } from 'vitest';
import { clampBpm, secondsPerBeat, secondsPerStep } from '../../src/core/tempo';

describe('clampBpm', () => {
  it('clamps to 20-300', () => {
    expect(clampBpm(10, 120)).toBe(20);
    expect(clampBpm(400, 120)).toBe(300);
  });
  it('rounds to an integer', () => {
    expect(clampBpm(99.6, 120)).toBe(100);
  });
  it('falls back for NaN', () => {
    expect(clampBpm(NaN, 120)).toBe(120);
  });
});

describe('secondsPerBeat', () => {
  it('is 60 / bpm', () => {
    expect(secondsPerBeat(120)).toBeCloseTo(0.5);
  });
});

describe('secondsPerStep', () => {
  it('divides a beat into 16th-note steps', () => {
    expect(secondsPerStep(120, { beats: 4, noteValue: 4 })).toBeCloseTo(0.125);
  });
  it('counts the time signature note value as the beat', () => {
    expect(secondsPerStep(120, { beats: 7, noteValue: 8 })).toBeCloseTo(0.25);
  });
});
