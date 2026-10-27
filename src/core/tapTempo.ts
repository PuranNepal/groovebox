import { MAX_BPM, clampBpm } from './tempo';

const MAX_TAPS = 4;
const RESET_GAP_MS = 2000;

export interface TapTempo {
  tap(nowMs: number): number | null;
  reset(): void;
}

export function createTapTempo(): TapTempo {
  let taps: number[] = [];

  return {
    tap(nowMs: number): number | null {
      const last = taps[taps.length - 1];
      if (last !== undefined && nowMs - last > RESET_GAP_MS) taps = [];
      taps.push(nowMs);
      if (taps.length > MAX_TAPS) taps.shift();
      if (taps.length < 2) return null;

      const first = taps[0] as number;
      const avgMs = (nowMs - first) / (taps.length - 1);
      if (!(avgMs > 0)) return null;
      return clampBpm(60000 / avgMs, MAX_BPM);
    },
    reset(): void {
      taps = [];
    },
  };
}

export function shouldHandleTapKey(e: {
  key: string;
  targetTag: string;
  targetType?: string;
  repeat: boolean;
}): boolean {
  if (e.key !== ' ' || e.repeat) return false;
  return !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.targetTag.toUpperCase());
}
