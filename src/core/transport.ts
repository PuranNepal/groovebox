import { createScheduler, type SchedulerDeps } from './scheduler';
import { createStartGate } from './startGate';

export type TransportDeps = Omit<SchedulerDeps, 'onStep'> & {
  /** Unlocks audio (ctx.resume()). Start waits for it; a rejection cancels the start. */
  resume: () => Promise<void>;
  /** True when the tab's panel is hidden; nothing may start from a hidden tab. */
  isHidden: () => boolean;
  requestFrame: (fn: () => void) => unknown;
  cancelFrame: (id: unknown) => void;
  /** Schedule the step's sound at `time` (audio clock). */
  onStep: (step: number, time: number) => void;
  /** Called from the frame loop once a step's time has passed; `null` on stop. */
  onHighlight: (step: number | null) => void;
  /** Called with true when playback starts and false on every stop. */
  onRunningChange?: (running: boolean) => void;
};

export interface Transport {
  start(): Promise<void>;
  stop(): void;
  toggle(): void;
  isRunning(): boolean;
}

type Mark = { step: number; time: number };

/** Start/stop, the resume() race guard, the scheduler and the playhead highlight loop. */
export function createTransport(deps: TransportDeps): Transport {
  const marks: Mark[] = [];
  const gate = createStartGate();
  let frameId: unknown = null;

  const scheduler = createScheduler({
    ...deps,
    onStep: (step, time) => {
      deps.onStep(step, time);
      marks.push({ step, time });
    },
  });

  function frame(): void {
    const now = deps.now();
    let latest: number | null = null;
    for (let m = marks[0]; m && m.time <= now; m = marks[0]) {
      latest = m.step;
      marks.shift();
    }
    if (latest !== null) deps.onHighlight(latest);
    frameId = deps.requestFrame(frame);
  }

  function stop(): void {
    gate.cancel();
    scheduler.stop();
    if (frameId !== null) deps.cancelFrame(frameId);
    frameId = null;
    marks.length = 0;
    deps.onHighlight(null);
    deps.onRunningChange?.(false);
  }

  async function start(): Promise<void> {
    const token = gate.begin();
    try {
      await deps.resume();
    } catch {
      return;
    }
    if (!gate.isCurrent(token) || deps.isHidden() || scheduler.isRunning()) return;
    scheduler.start();
    frameId = deps.requestFrame(frame);
    deps.onRunningChange?.(true);
  }

  return {
    start,
    stop,
    toggle: () => {
      if (scheduler.isRunning()) stop();
      else void start();
    },
    isRunning: () => scheduler.isRunning(),
  };
}
