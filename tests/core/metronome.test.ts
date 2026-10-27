import { describe, expect, it } from 'vitest';
import { defaultMetronomeState } from '../../src/core/metronome';

describe('defaultMetronomeState', () => {
  it('is 120 BPM, 4/4, strong then soft accents', () => {
    expect(defaultMetronomeState()).toEqual({
      bpm: 120,
      timeSignature: { beats: 4, noteValue: 4 },
      accents: ['strong', 'soft', 'soft', 'soft'],
    });
  });

  it('returns a fresh object each call', () => {
    const a = defaultMetronomeState();
    const b = defaultMetronomeState();
    expect(a).not.toBe(b);
    expect(a.timeSignature).not.toBe(b.timeSignature);
    expect(a.accents).not.toBe(b.accents);
  });
});
