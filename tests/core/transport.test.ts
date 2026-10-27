import { describe, expect, it } from 'vitest';
import { createTransport, type TransportDeps } from '../../src/core/transport';

type Harness = {
  deps: TransportDeps;
  clock: { t: number };
  hidden: { value: boolean };
  steps: { step: number; time: number }[];
  highlights: (number | null)[];
  running: boolean[];
  /** Runs the scheduler's lookahead timer once. */
  tick: () => void;
  /** Runs the pending animation frame once. */
  frame: () => void;
  timer: { fn: (() => void) | null };
  raf: { fn: (() => void) | null; cancelled: number };
  resume: { resolve: () => void; reject: () => void; pending: boolean };
};

function harness(overrides: Partial<TransportDeps> = {}): Harness {
  const clock = { t: 0 };
  const hidden = { value: false };
  const steps: { step: number; time: number }[] = [];
  const highlights: (number | null)[] = [];
  const running: boolean[] = [];
  const timer = { fn: null as (() => void) | null };
  const raf = { fn: null as (() => void) | null, cancelled: 0 };
  const resume = {
    resolve: () => {},
    reject: () => {},
    pending: false,
  };
  const deps: TransportDeps = {
    now: () => clock.t,
    resume: () =>
      new Promise<void>((res, rej) => {
        resume.pending = true;
        resume.resolve = () => {
          resume.pending = false;
          res();
        };
        resume.reject = () => {
          resume.pending = false;
          rej(new Error('blocked'));
        };
      }),
    isHidden: () => hidden.value,
    setTimer: (fn) => {
      timer.fn = fn;
      return 1;
    },
    clearTimer: () => {
      timer.fn = null;
    },
    requestFrame: (fn) => {
      raf.fn = fn;
      return 7;
    },
    cancelFrame: () => {
      raf.cancelled++;
      raf.fn = null;
    },
    getStepDuration: () => 0.5,
    getStepCount: () => 4,
    onStep: (step, time) => steps.push({ step, time }),
    onHighlight: (step) => highlights.push(step),
    onRunningChange: (r) => running.push(r),
    ...overrides,
  };
  return {
    deps,
    clock,
    hidden,
    steps,
    highlights,
    running,
    timer,
    raf,
    resume,
    tick: () => timer.fn?.(),
    frame: () => {
      const fn = raf.fn;
      raf.fn = null;
      fn?.();
    },
  };
}

/** Starts the transport and lets `resume()` succeed. */
async function started(h: Harness): Promise<ReturnType<typeof createTransport>> {
  const t = createTransport(h.deps);
  const p = t.start();
  h.resume.resolve();
  await p;
  return t;
}

describe('createTransport', () => {
  it('starts the scheduler and the frame loop once resume succeeds', async () => {
    const h = harness();
    const t = createTransport(h.deps);
    const p = t.start();
    expect(t.isRunning()).toBe(false);
    expect(h.steps).toHaveLength(0);
    h.resume.resolve();
    await p;
    expect(t.isRunning()).toBe(true);
    expect(h.steps[0]).toEqual({ step: 0, time: 0.05 });
    expect(h.raf.fn).not.toBeNull();
    expect(h.running).toEqual([true]);
  });

  it('a stop while resume is pending cancels the start', async () => {
    const h = harness();
    const t = createTransport(h.deps);
    const p = t.start();
    t.stop();
    h.resume.resolve();
    await p;
    expect(t.isRunning()).toBe(false);
    expect(h.steps).toHaveLength(0);
    expect(h.raf.fn).toBeNull();
    expect(h.running).toEqual([false]);
  });

  it('does not start if the panel became hidden during resume', async () => {
    const h = harness();
    const t = createTransport(h.deps);
    const p = t.start();
    h.hidden.value = true;
    h.resume.resolve();
    await p;
    expect(t.isRunning()).toBe(false);
    expect(h.steps).toHaveLength(0);
  });

  it('does not start if resume rejects', async () => {
    const h = harness();
    const t = createTransport(h.deps);
    const p = t.start();
    h.resume.reject();
    await p;
    expect(t.isRunning()).toBe(false);
    expect(h.running).toEqual([]);
  });

  it('a second start while running does not restart the bar', async () => {
    const h = harness();
    const t = await started(h);
    h.clock.t = 0.3;
    h.tick();
    const before = h.steps.length;
    const p = t.start();
    h.resume.resolve();
    await p;
    expect(h.steps.length).toBe(before);
    expect(h.running).toEqual([true]);
  });

  it('highlights the latest step whose time has passed, and nothing early', async () => {
    const h = harness({ getStepDuration: () => 0.02 });
    await started(h);
    // Steps scheduled at 0.05, 0.07, 0.09 (lookahead 0.1s).
    h.frame();
    expect(h.highlights).toEqual([]);
    h.clock.t = 0.08;
    h.frame();
    expect(h.highlights).toEqual([1]);
    h.clock.t = 0.085;
    h.frame();
    expect(h.highlights).toEqual([1]);
    h.clock.t = 0.2;
    h.frame();
    expect(h.highlights).toEqual([1, 2]);
  });

  it('the frame loop keeps requesting frames while running', async () => {
    const h = harness();
    await started(h);
    h.frame();
    expect(h.raf.fn).not.toBeNull();
  });

  it('stop halts the scheduler, cancels the frame, clears marks and the highlight', async () => {
    const h = harness();
    const t = await started(h);
    t.stop();
    expect(t.isRunning()).toBe(false);
    expect(h.timer.fn).toBeNull();
    expect(h.raf.cancelled).toBe(1);
    expect(h.highlights).toEqual([null]);
    expect(h.running).toEqual([true, false]);

    // A stale mark from before the stop must not light up after a restart.
    const p = t.start();
    h.resume.resolve();
    await p;
    h.clock.t = 0.06;
    h.frame();
    expect(h.highlights).toEqual([null, 0]);
  });

  it('reads tempo and bar length live on every step', async () => {
    const live = { duration: 0.5, count: 4 };
    const h = harness({
      getStepDuration: () => live.duration,
      getStepCount: () => live.count,
    });
    await started(h);
    live.duration = 0.25;
    live.count = 2;
    for (let i = 0; i < 8; i++) {
      h.clock.t += 0.25;
      h.tick();
    }
    const times = h.steps.map((s) => s.time);
    expect(times[2]! - times[1]!).toBeCloseTo(0.25, 9);
    expect(h.steps.map((s) => s.step).slice(0, 5)).toEqual([0, 1, 0, 1, 0]);
  });

  it('toggle starts when stopped and stops when running', async () => {
    const h = harness();
    const t = createTransport(h.deps);
    t.toggle();
    h.resume.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(t.isRunning()).toBe(true);
    t.toggle();
    expect(t.isRunning()).toBe(false);
  });
});
