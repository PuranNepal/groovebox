import { describe, expect, it } from 'vitest';
import { createTapTempo, shouldHandleTapKey } from '../../src/core/tapTempo';

describe('createTapTempo', () => {
  it('returns null for the first tap, then the BPM', () => {
    const t = createTapTempo();
    expect(t.tap(0)).toBeNull();
    expect(t.tap(500)).toBe(120);
    expect(t.tap(1000)).toBe(120);
  });

  it('averages only the last 4 taps (3 intervals)', () => {
    const u = createTapTempo();
    [0, 1000, 1500, 2000].forEach((ms) => u.tap(ms));
    expect(u.tap(2500)).toBe(120);
  });

  it('starts over after a gap longer than 2000 ms', () => {
    const u = createTapTempo();
    [0, 1000, 1500, 2000].forEach((ms) => u.tap(ms));
    u.tap(2500);
    expect(u.tap(5000)).toBeNull();
    expect(u.tap(5600)).toBe(100);
  });

  it('does not reset on a gap of exactly 2000 ms', () => {
    const t = createTapTempo();
    t.tap(0);
    expect(t.tap(2000)).toBe(30);
  });

  it('clamps to the BPM range', () => {
    const v = createTapTempo();
    v.tap(0);
    expect(v.tap(100)).toBe(300);
  });

  it('returns null for non-increasing timestamps', () => {
    const t = createTapTempo();
    t.tap(100);
    expect(t.tap(100)).toBeNull();
  });

  it('reset() clears the taps', () => {
    const t = createTapTempo();
    t.tap(0);
    t.tap(500);
    t.reset();
    expect(t.tap(600)).toBeNull();
  });
});

describe('shouldHandleTapKey', () => {
  it('accepts Space on a non-input target', () => {
    expect(shouldHandleTapKey({ key: ' ', targetTag: 'BODY', repeat: false })).toBe(true);
  });

  it('rejects input, textarea and select targets', () => {
    for (const targetTag of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(shouldHandleTapKey({ key: ' ', targetTag, targetType: 'number', repeat: false })).toBe(
        false,
      );
    }
  });

  it('rejects key repeat and other keys', () => {
    expect(shouldHandleTapKey({ key: ' ', targetTag: 'BODY', repeat: true })).toBe(false);
    expect(shouldHandleTapKey({ key: 'a', targetTag: 'BODY', repeat: false })).toBe(false);
  });
});
