export type SwingNote = 8 | 16;

export const MIN_SWING = 0.5;
export const MAX_SWING = 0.75;

/** Clamp swing to [0.5, 0.75]; non-finite input yields `fallback`. */
export function clampSwing(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(MAX_SWING, Math.max(MIN_SWING, value));
}

/**
 * Seconds to add to a step's straight time. Never accumulates: depends only
 * on the step index. A trailing group that doesn't fit in the bar plays straight.
 */
export function swingOffset(
  step: number,
  swing: number,
  swingNote: SwingNote,
  stepDuration: number,
  stepCount: number,
): number {
  const e = swing - 0.5;
  if (e === 0) return 0;
  const groupSize = swingNote === 8 ? 4 : 2;
  const pos = step % groupSize;
  const groupStart = step - pos;
  if (groupStart + groupSize > stepCount) return 0;
  if (swingNote === 16) return pos === 1 ? 2 * e * stepDuration : 0;
  if (pos === 2) return 4 * e * stepDuration;
  if (pos === 1 || pos === 3) return 2 * e * stepDuration;
  return 0;
}
