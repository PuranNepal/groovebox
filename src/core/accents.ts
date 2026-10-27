export type Accent = 'strong' | 'medium' | 'soft' | 'off';

const NEXT: Record<Accent, Accent> = {
  strong: 'medium',
  medium: 'soft',
  soft: 'off',
  off: 'strong',
};

const VOICES: Record<Exclude<Accent, 'off'>, { gain: number; frequency: number }> = {
  strong: { gain: 1.0, frequency: 1600 },
  medium: { gain: 0.7, frequency: 1200 },
  soft: { gain: 0.4, frequency: 800 },
};

export function nextAccent(a: Accent): Accent {
  return NEXT[a];
}

export function defaultAccents(beats: number): Accent[] {
  return Array.from({ length: beats }, (_, i) => (i === 0 ? 'strong' : 'soft'));
}

export function resizeAccents(accents: Accent[], beats: number): Accent[] {
  return Array.from({ length: beats }, (_, i) => accents[i] ?? 'soft');
}

export function accentVoice(a: Accent): { gain: number; frequency: number } | null {
  if (a === 'off') return null;
  return { ...VOICES[a] };
}
