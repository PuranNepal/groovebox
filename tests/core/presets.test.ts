import { describe, expect, it } from 'vitest';
import { defaultDrumState, PRESETS, presetById } from '../../src/core/presets';
import { clampSwing } from '../../src/core/swing';
import { clampBpm } from '../../src/core/tempo';
import { stepsPerBar } from '../../src/core/timeSignature';

describe('PRESETS', () => {
  it('has the expected ids in order', () => {
    expect(PRESETS.map((p) => p.id)).toEqual([
      'rock',
      'metal',
      'blues-shuffle',
      'hip-hop',
      'odd-7-8',
    ]);
  });

  for (const preset of PRESETS) {
    describe(preset.id, () => {
      const { state } = preset;

      it('has track lengths matching the bar', () => {
        for (const t of state.pattern.tracks) {
          expect(t.steps.length).toBe(stepsPerBar(state.timeSignature));
        }
      });

      it('has valid bpm and swing', () => {
        expect(clampBpm(state.bpm, 0)).toBe(state.bpm);
        expect(clampSwing(state.swing, 0)).toBe(state.swing);
      });

      it('has at least one kick step on', () => {
        const kick = state.pattern.tracks.find((t) => t.sound === 'kick');
        expect(kick?.steps.some(Boolean)).toBe(true);
      });

      it('has no duplicate sounds', () => {
        const sounds = state.pattern.tracks.map((t) => t.sound);
        expect(new Set(sounds).size).toBe(sounds.length);
      });
    });
  }

  it('sets the genre tempo, meter and swing', () => {
    const get = (id: string) => presetById(id)?.state;
    expect(get('rock')?.bpm).toBe(110);
    expect(get('metal')?.bpm).toBe(180);
    expect(get('blues-shuffle')?.swingNote).toBe(8);
    expect(get('blues-shuffle')?.swing).toBeCloseTo(0.67);
    expect(get('hip-hop')?.swingNote).toBe(16);
    expect(get('hip-hop')?.swing).toBeCloseTo(0.58);
    expect(get('odd-7-8')?.timeSignature).toEqual({ beats: 7, noteValue: 8 });
    expect(get('odd-7-8')?.bpm).toBe(140);
  });
});

describe('presetById', () => {
  it('finds presets and returns undefined for unknown ids', () => {
    expect(presetById('metal')?.name).toBe('Metal');
    expect(presetById('nope')).toBeUndefined();
  });
});

describe('defaultDrumState', () => {
  it('returns an independent deep copy of rock', () => {
    const a = defaultDrumState();
    expect(a).toEqual(presetById('rock')?.state);
    a.bpm = 999;
    a.pattern.tracks[0]!.steps[0] = !a.pattern.tracks[0]!.steps[0];
    const b = defaultDrumState();
    expect(b.bpm).toBe(110);
    expect(b).toEqual(presetById('rock')?.state);
  });
});
