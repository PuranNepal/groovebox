export type SchedulerDeps = {
  /** Audio clock in seconds (ctx.currentTime). */
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (id: unknown) => void;
  /** Seconds per step, read every step. */
  getStepDuration: () => number;
  /** Steps per bar, read every step. */
  getStepCount: () => number;
  /** Swing offset in seconds for a step, default 0. */
  getStepOffset?: (step: number) => number;
  /** Schedule sound and UI at `time` (audio clock). Never play from here directly. */
  onStep: (step: number, time: number) => void;
  lookaheadMs?: number;
  scheduleAheadSec?: number;
};

const START_DELAY_SEC = 0.05;
const RESYNC_THRESHOLD_SEC = 0.2;

export function createScheduler(deps: SchedulerDeps): {
  start(): void;
  stop(): void;
  isRunning(): boolean;
} {
  const lookaheadMs = deps.lookaheadMs ?? 25;
  const scheduleAheadSec = deps.scheduleAheadSec ?? 0.1;

  let running = false;
  let timerId: unknown = null;
  let nextTime = 0;
  let step = 0;

  function tick(): void {
    if (nextTime < deps.now() - RESYNC_THRESHOLD_SEC) {
      nextTime = deps.now() + START_DELAY_SEC;
    }
    while (nextTime < deps.now() + scheduleAheadSec) {
      if (step >= deps.getStepCount()) step = 0;
      deps.onStep(step, nextTime + (deps.getStepOffset?.(step) ?? 0));
      nextTime += deps.getStepDuration();
      step = (step + 1) % deps.getStepCount();
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      nextTime = deps.now() + START_DELAY_SEC;
      step = 0;
      tick();
      timerId = deps.setTimer(tick, lookaheadMs);
    },
    stop() {
      if (!running) return;
      running = false;
      deps.clearTimer(timerId);
      timerId = null;
    },
    isRunning: () => running,
  };
}
