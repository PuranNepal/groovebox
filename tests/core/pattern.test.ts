import { describe, expect, it } from 'vitest';
import {
  addTrack,
  availableSounds,
  emptyPattern,
  removeTrack,
  resizePattern,
  toggleStep,
} from '../../src/core/pattern';
import { DEFAULT_SOUNDS, SOUND_IDS, SOUND_LABELS, isSoundId } from '../../src/core/sounds';

describe('sounds', () => {
  it('lists the built-in ids in order', () => {
    expect([...SOUND_IDS]).toEqual([
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
    ]);
  });

  it('has a label for every sound id', () => {
    for (const id of SOUND_IDS) {
      expect(SOUND_LABELS[id].length).toBeGreaterThan(0);
    }
    expect(SOUND_LABELS.openhat).toBe('Open hi-hat');
    expect(SOUND_LABELS.tomFloor).toBe('Floor tom');
    expect(SOUND_LABELS.tomHigh).toBe('High tom');
    expect(SOUND_LABELS.hihat).toBe('Hi-hat');
  });

  it('defaults to kick, snare, hihat', () => {
    expect(DEFAULT_SOUNDS).toEqual(['kick', 'snare', 'hihat']);
  });

  it('isSoundId recognises ids only', () => {
    expect(isSoundId('kick')).toBe(true);
    expect(isSoundId('banjo')).toBe(false);
    expect(isSoundId(5)).toBe(false);
    expect(isSoundId(undefined)).toBe(false);
  });
});

describe('emptyPattern', () => {
  it('has the default tracks with all steps off', () => {
    const p = emptyPattern(16);
    expect(p.tracks.map((t) => t.sound)).toEqual(['kick', 'snare', 'hihat']);
    for (const t of p.tracks) {
      expect(t.steps).toEqual(new Array<boolean>(16).fill(false));
    }
  });

  it('accepts custom sounds and copies the list', () => {
    const sounds: ('crash' | 'ride')[] = ['crash', 'ride'];
    const p = emptyPattern(4, sounds);
    sounds.push('ride');
    expect(p.tracks.map((t) => t.sound)).toEqual(['crash', 'ride']);
  });

  it('does not share step arrays between tracks', () => {
    const p = emptyPattern(4);
    expect(p.tracks[0]?.steps).not.toBe(p.tracks[1]?.steps);
  });
});

describe('toggleStep', () => {
  it('flips one cell without mutating the input', () => {
    const p = emptyPattern(16);
    const copy = structuredClone(p);
    const next = toggleStep(p, 1, 4);
    expect(p).toEqual(copy);
    expect(next.tracks[1]?.steps[4]).toBe(true);
    expect(next.tracks[0]?.steps[4]).toBe(false);
    expect(toggleStep(next, 1, 4).tracks[1]?.steps[4]).toBe(false);
  });

  it('returns the pattern unchanged for out-of-range indexes', () => {
    const p = emptyPattern(16);
    expect(toggleStep(p, 3, 0)).toEqual(p);
    expect(toggleStep(p, -1, 0)).toEqual(p);
    expect(toggleStep(p, 0, 16)).toEqual(p);
    expect(toggleStep(p, 0, -1)).toEqual(p);
  });
});

describe('resizePattern', () => {
  it('truncates then pads with false, keeping surviving steps', () => {
    let p = emptyPattern(16);
    p = toggleStep(p, 0, 0);
    p = toggleStep(p, 0, 13);
    p = toggleStep(p, 0, 15);
    const copy = structuredClone(p);
    const small = resizePattern(p, 14);
    expect(p).toEqual(copy);
    expect(small.tracks[0]?.steps).toHaveLength(14);
    expect(small.tracks[0]?.steps[0]).toBe(true);
    expect(small.tracks[0]?.steps[13]).toBe(true);
    const big = resizePattern(small, 16);
    expect(big.tracks[0]?.steps).toHaveLength(16);
    expect(big.tracks[0]?.steps[0]).toBe(true);
    expect(big.tracks[0]?.steps[13]).toBe(true);
    expect(big.tracks[0]?.steps[14]).toBe(false);
    expect(big.tracks[0]?.steps[15]).toBe(false);
  });
});

describe('addTrack', () => {
  it('appends a row with the current step count', () => {
    const p = emptyPattern(12);
    const copy = structuredClone(p);
    const next = addTrack(p, 'crash', 12);
    expect(p).toEqual(copy);
    expect(next.tracks).toHaveLength(4);
    expect(next.tracks[3]).toEqual({ sound: 'crash', steps: new Array<boolean>(12).fill(false) });
  });

  it('uses the given step count when all tracks were removed', () => {
    let p = emptyPattern(16);
    p = removeTrack(removeTrack(removeTrack(p, 0), 0), 0);
    expect(p.tracks).toHaveLength(0);
    expect(addTrack(p, 'crash', 16).tracks).toEqual([
      { sound: 'crash', steps: new Array<boolean>(16).fill(false) },
    ]);
  });

  it('is a no-op for a sound already present', () => {
    const p = emptyPattern(16);
    expect(addTrack(p, 'kick', 16)).toEqual(p);
  });
});

describe('removeTrack / availableSounds', () => {
  it('removes a row and frees its sound', () => {
    const p = emptyPattern(16);
    const copy = structuredClone(p);
    const next = removeTrack(p, 0);
    expect(p).toEqual(copy);
    expect(next.tracks.map((t) => t.sound)).toEqual(['snare', 'hihat']);
    const avail = availableSounds(next);
    expect(avail).toContain('kick');
    expect(avail).not.toContain('snare');
  });

  it('returns the pattern unchanged for out-of-range indexes', () => {
    const p = emptyPattern(16);
    expect(removeTrack(p, 3)).toEqual(p);
    expect(removeTrack(p, -1)).toEqual(p);
  });

  it('lists available sounds in SOUND_IDS order', () => {
    const p = emptyPattern(16);
    expect(availableSounds(p)).toEqual([
      'openhat',
      'crash',
      'ride',
      'clap',
      'tomHigh',
      'tomFloor',
      'cowbell',
      'rimshot',
    ]);
  });
});
