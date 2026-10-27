import { DEFAULT_SOUNDS, SOUND_IDS, type SoundId } from './sounds';

export type Track = { sound: SoundId; steps: boolean[] };
export type Pattern = { tracks: Track[] };

function blankSteps(count: number): boolean[] {
  return new Array<boolean>(count).fill(false);
}

export function emptyPattern(stepCount: number, sounds: SoundId[] = DEFAULT_SOUNDS): Pattern {
  return { tracks: sounds.map((sound) => ({ sound, steps: blankSteps(stepCount) })) };
}

export function toggleStep(p: Pattern, track: number, step: number): Pattern {
  const target = p.tracks[track];
  if (!target || !Number.isInteger(step) || step < 0 || step >= target.steps.length) return p;
  return {
    tracks: p.tracks.map((t, i) =>
      i === track ? { sound: t.sound, steps: t.steps.map((on, j) => (j === step ? !on : on)) } : t,
    ),
  };
}

export function resizePattern(p: Pattern, stepCount: number): Pattern {
  return {
    tracks: p.tracks.map((t) => ({
      sound: t.sound,
      steps: Array.from({ length: stepCount }, (_, i) => t.steps[i] ?? false),
    })),
  };
}

export function addTrack(p: Pattern, sound: SoundId): Pattern {
  if (p.tracks.some((t) => t.sound === sound)) return p;
  const stepCount = p.tracks[0]?.steps.length ?? 0;
  return { tracks: [...p.tracks, { sound, steps: blankSteps(stepCount) }] };
}

export function removeTrack(p: Pattern, track: number): Pattern {
  if (!Number.isInteger(track) || track < 0 || track >= p.tracks.length) return p;
  return { tracks: p.tracks.filter((_, i) => i !== track) };
}

export function availableSounds(p: Pattern): SoundId[] {
  const used = new Set(p.tracks.map((t) => t.sound));
  return SOUND_IDS.filter((id) => !used.has(id));
}
