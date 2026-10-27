import { describe, expect, it } from 'vitest';
import { clampSwing, swingOffset } from '../../src/core/swing';

describe('swingOffset', () => {
  it('returns exactly 0 for every step when straight', () => {
    for (const note of [8, 16] as const) {
      for (let s = 0; s < 16; s++) {
        expect(swingOffset(s, 0.5, note, 0.1, 16)).toBe(0);
      }
    }
  });

  it('delays every second 16th', () => {
    expect(swingOffset(1, 0.75, 16, 0.1, 16)).toBeCloseTo(0.05);
    expect(swingOffset(2, 0.75, 16, 0.1, 16)).toBe(0);
    expect(swingOffset(3, 0.75, 16, 0.1, 16)).toBeCloseTo(0.05);
  });

  it('delays the off-beat 8th', () => {
    expect(swingOffset(2, 2 / 3, 8, 0.1, 16)).toBeCloseTo(0.0667, 3);
    expect(swingOffset(0, 2 / 3, 8, 0.1, 16)).toBe(0);
    expect(swingOffset(1, 2 / 3, 8, 0.1, 16)).toBeCloseTo(0.0333, 3);
    expect(swingOffset(3, 2 / 3, 8, 0.1, 16)).toBeCloseTo(0.0333, 3);
  });

  it('plays a partial trailing group straight', () => {
    expect(swingOffset(13, 0.75, 8, 0.1, 14)).toBe(0);
    expect(swingOffset(12, 0.75, 8, 0.1, 14)).toBe(0);
    expect(swingOffset(10, 0.75, 8, 0.1, 14)).toBeCloseTo(0.1);
    expect(swingOffset(14, 0.75, 16, 0.1, 15)).toBe(0);
  });
});

describe('clampSwing', () => {
  it('clamps to 0.5-0.75', () => {
    expect(clampSwing(0.9, 0.5)).toBe(0.75);
    expect(clampSwing(0.2, 0.5)).toBe(0.5);
    expect(clampSwing(0.6, 0.5)).toBe(0.6);
  });

  it('falls back for non-finite input', () => {
    expect(clampSwing(NaN, 0.6)).toBe(0.6);
    expect(clampSwing(Infinity, 0.6)).toBe(0.6);
  });
});
