import { describe, expect, it } from 'vitest';
import {
  accentVoice,
  defaultAccents,
  nextAccent,
  resizeAccents,
  type Accent,
} from '../../src/core/accents';

describe('nextAccent', () => {
  it('cycles strong -> medium -> soft -> off -> strong', () => {
    expect(nextAccent('strong')).toBe('medium');
    expect(nextAccent('medium')).toBe('soft');
    expect(nextAccent('soft')).toBe('off');
    expect(nextAccent('off')).toBe('strong');
  });
});

describe('defaultAccents', () => {
  it('makes beat 1 strong and the rest soft', () => {
    expect(defaultAccents(4)).toEqual(['strong', 'soft', 'soft', 'soft']);
  });

  it('returns only strong for a single beat', () => {
    expect(defaultAccents(1)).toEqual(['strong']);
  });
});

describe('resizeAccents', () => {
  it('fills new beats with soft', () => {
    expect(resizeAccents(['strong', 'off', 'medium'], 5)).toEqual([
      'strong',
      'off',
      'medium',
      'soft',
      'soft',
    ]);
  });

  it('truncates when shrinking', () => {
    expect(resizeAccents(['strong', 'off', 'medium'], 2)).toEqual(['strong', 'off']);
  });

  it('returns a copy of the input when the length is unchanged', () => {
    const input: Accent[] = ['strong', 'off'];
    const out = resizeAccents(input, 2);
    expect(out).toEqual(['strong', 'off']);
    expect(out).not.toBe(input);
  });
});

describe('accentVoice', () => {
  it('returns null for off', () => {
    expect(accentVoice('off')).toBeNull();
  });

  it('uses the specified gain and frequency values', () => {
    expect(accentVoice('strong')).toEqual({ gain: 1.0, frequency: 1600 });
    expect(accentVoice('medium')).toEqual({ gain: 0.7, frequency: 1200 });
    expect(accentVoice('soft')).toEqual({ gain: 0.4, frequency: 800 });
  });

  it('orders gain and frequency from strong to soft', () => {
    expect(accentVoice('strong')!.gain).toBeGreaterThan(accentVoice('medium')!.gain);
    expect(accentVoice('medium')!.frequency).toBeGreaterThan(accentVoice('soft')!.frequency);
  });
});
