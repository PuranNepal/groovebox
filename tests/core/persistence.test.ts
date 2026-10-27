import { describe, expect, it } from 'vitest';
import { defaultMetronomeState } from '../../src/core/metronome';
import { defaultDrumState } from '../../src/core/presets';
import {
  DRUMS_KEY,
  METRONOME_KEY,
  loadState,
  parseDrumState,
  parseMetronomeState,
  saveState,
  type StorageLike,
} from '../../src/core/persistence';

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
}

const throwing: StorageLike = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('keys', () => {
  it('are versioned', () => {
    expect(METRONOME_KEY).toBe('groovebox.metronome.v1');
    expect(DRUMS_KEY).toBe('groovebox.drums.v1');
  });
});

describe('round trip', () => {
  it('restores a metronome state', () => {
    const s = storageWith();
    const state = {
      bpm: 77,
      timeSignature: { beats: 7, noteValue: 8 as const },
      accents: ['strong', 'off', 'soft', 'medium', 'soft', 'soft', 'off'] as const,
    };
    const value = { ...state, accents: [...state.accents] };
    saveState(s, METRONOME_KEY, value);
    expect(loadState(s, METRONOME_KEY, parseMetronomeState)).toEqual(value);
  });

  it('restores a drum state', () => {
    const s = storageWith();
    const state = defaultDrumState();
    saveState(s, DRUMS_KEY, state);
    expect(loadState(s, DRUMS_KEY, parseDrumState)).toEqual(state);
  });
});

function storageWith(): StorageLike {
  return memoryStorage();
}

describe('loadState', () => {
  it('returns null for a missing key', () => {
    expect(loadState(memoryStorage(), METRONOME_KEY, parseMetronomeState)).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    const s = memoryStorage({ [METRONOME_KEY]: '{nope' });
    expect(loadState(s, METRONOME_KEY, parseMetronomeState)).toBeNull();
  });

  it('returns null for {}', () => {
    const s = memoryStorage({ [METRONOME_KEY]: '{}', [DRUMS_KEY]: '{}' });
    expect(loadState(s, METRONOME_KEY, parseMetronomeState)).toBeNull();
    expect(loadState(s, DRUMS_KEY, parseDrumState)).toBeNull();
  });

  it('returns null for an unknown sound', () => {
    const state = defaultDrumState();
    const bad = {
      ...state,
      pattern: { tracks: [{ sound: 'banjo', steps: state.pattern.tracks[0]?.steps }] },
    };
    const s = memoryStorage({ [DRUMS_KEY]: JSON.stringify(bad) });
    expect(loadState(s, DRUMS_KEY, parseDrumState)).toBeNull();
  });

  it('returns null for steps of the wrong length', () => {
    const state = defaultDrumState();
    const bad = {
      ...state,
      pattern: { tracks: [{ sound: 'kick', steps: [true, false] }] },
    };
    const s = memoryStorage({ [DRUMS_KEY]: JSON.stringify(bad) });
    expect(loadState(s, DRUMS_KEY, parseDrumState)).toBeNull();
  });

  it('returns null and does not throw when getItem throws', () => {
    expect(loadState(throwing, METRONOME_KEY, parseMetronomeState)).toBeNull();
  });

  it('accepts undefined storage', () => {
    expect(loadState(undefined, METRONOME_KEY, parseMetronomeState)).toBeNull();
  });
});

describe('saveState', () => {
  it('does not throw when setItem throws', () => {
    expect(() => {
      saveState(throwing, METRONOME_KEY, defaultMetronomeState());
    }).not.toThrow();
  });

  it('accepts undefined storage', () => {
    expect(() => {
      saveState(undefined, METRONOME_KEY, defaultMetronomeState());
    }).not.toThrow();
  });
});

describe('parseMetronomeState', () => {
  it('clamps bpm and resizes accents', () => {
    const parsed = parseMetronomeState({
      bpm: 999,
      timeSignature: { beats: 3, noteValue: 4 },
      accents: ['strong'],
    });
    expect(parsed?.bpm).toBe(300);
    expect(parsed?.accents).toEqual(['strong', 'soft', 'soft']);
  });

  it('rejects invalid accents and non-objects', () => {
    const ts = { beats: 4, noteValue: 4 };
    expect(parseMetronomeState({ bpm: 100, timeSignature: ts, accents: ['loud'] })).toBeNull();
    expect(parseMetronomeState({ bpm: 100, timeSignature: ts, accents: 'strong' })).toBeNull();
    expect(parseMetronomeState(null)).toBeNull();
    expect(parseMetronomeState('x')).toBeNull();
    expect(parseMetronomeState({ bpm: '100', timeSignature: ts, accents: [] })).toBeNull();
  });
});

describe('parseDrumState', () => {
  const valid = () => ({
    bpm: 100,
    timeSignature: { beats: 4, noteValue: 4 },
    swing: 0.6,
    swingNote: 16,
    pattern: { tracks: [{ sound: 'kick', steps: new Array<boolean>(16).fill(false) }] },
  });

  it('accepts a valid state and clamps numbers', () => {
    expect(parseDrumState({ ...valid(), bpm: 5, swing: 2 })).toMatchObject({
      bpm: 20,
      swing: 0.75,
    });
  });

  it('rejects bad swingNote', () => {
    expect(parseDrumState({ ...valid(), swingNote: 4 })).toBeNull();
  });

  it('rejects duplicate sounds', () => {
    const v = valid();
    const t = v.pattern.tracks[0];
    expect(parseDrumState({ ...v, pattern: { tracks: [t, t] } })).toBeNull();
  });

  it('rejects when clamping changes the step count', () => {
    const v = valid();
    expect(parseDrumState({ ...v, timeSignature: { beats: 99, noteValue: 4 } })).toBeNull();
  });

  it('rejects non-boolean steps and non-array tracks', () => {
    const v = valid();
    expect(
      parseDrumState({
        ...v,
        pattern: { tracks: [{ sound: 'kick', steps: new Array(16).fill(0) }] },
      }),
    ).toBeNull();
    expect(parseDrumState({ ...v, pattern: { tracks: 'x' } })).toBeNull();
  });
});
