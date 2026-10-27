import { describe, expect, it } from 'vitest';
import { createScheduler, type SchedulerDeps } from '../../src/core/scheduler';

type Harness = {
  deps: SchedulerDeps;
  events: { step: number; time: number }[];
  clock: { t: number };
  tick: () => void;
  state: { fn: (() => void) | null; cleared: boolean; duration: number; count: number };
};

function harness(overrides: Partial<SchedulerDeps> = {}): Harness {
  const clock = { t: 0 };
  const events: { step: number; time: number }[] = [];
  const state = { fn: null as (() => void) | null, cleared: false, duration: 0.125, count: 16 };
  const deps: SchedulerDeps = {
    now: () => clock.t,
    setTimer: (f) => {
      state.fn = f;
      state.cleared = false;
      return 1;
    },
    clearTimer: () => {
      state.cleared = true;
      state.fn = null;
    },
    getStepDuration: () => state.duration,
    getStepCount: () => state.count,
    onStep: (step, time) => events.push({ step, time }),
    ...overrides,
  };
  return {
    deps,
    events,
    clock,
    state,
    tick: () => {
      state.fn?.();
    },
  };
}

describe('createScheduler', () => {
  it('schedules steps ahead without drift', () => {
    const h = harness();
    const s = createScheduler(h.deps);
    s.start();
    for (let i = 0; i < 400; i++) {
      h.clock.t += 0.025;
      h.tick();
    }
    expect(h.events.length).toBeGreaterThan(70);
    h.events.forEach((e, k) => {
      expect(e.time).toBeCloseTo(0.05 + k * 0.125, 9);
      expect(e.step).toBe(k % 16);
    });
  });

  it('tempo change applies from the next step', () => {
    const h = harness();
    const s = createScheduler(h.deps);
    s.start();
    for (let i = 0; i < 40; i++) {
      h.clock.t += 0.025;
      h.tick();
      if (h.events.some((e) => e.step === 3)) h.state.duration = 0.25;
      if (h.events.length >= 7) break;
    }
    const at = (n: number) => h.events.find((e) => e.step === n)!.time;
    expect(at(4) - at(3)).toBeCloseTo(0.125, 9);
    expect(at(5) - at(4)).toBeCloseTo(0.25, 9);
  });

  it('bar shrinking mid-play wraps the step index', () => {
    const h = harness();
    const s = createScheduler(h.deps);
    s.start();
    for (let i = 0; i < 100 && h.events.at(-1)?.step !== 13; i++) {
      h.clock.t += 0.025;
      h.tick();
    }
    expect(h.events.at(-1)?.step).toBe(13);
    h.state.count = 14;
    const before = h.events.length;
    for (let i = 0; i < 40; i++) {
      h.clock.t += 0.025;
      h.tick();
    }
    const after = h.events.slice(before);
    expect(after.length).toBeGreaterThan(0);
    expect(after[0]!.step).toBe(0);
    expect(after.every((e) => e.step < 14)).toBe(true);
  });

  it('does not burst after throttling', () => {
    const h = harness();
    const s = createScheduler(h.deps);
    s.start();
    h.clock.t += 0.025;
    h.tick();
    const before = h.events.length;
    h.clock.t += 5;
    h.tick();
    expect(h.events.length - before).toBeLessThanOrEqual(Math.ceil(0.1 / 0.125) + 1);
  });

  it('stop clears the timer and start begins again at step 0', () => {
    const h = harness();
    const s = createScheduler(h.deps);
    s.start();
    expect(s.isRunning()).toBe(true);
    for (let i = 0; i < 10; i++) {
      h.clock.t += 0.025;
      h.tick();
    }
    expect(h.events.length).toBeGreaterThan(1);
    s.stop();
    expect(s.isRunning()).toBe(false);
    expect(h.state.cleared).toBe(true);
    h.events.length = 0;
    s.start();
    expect(s.isRunning()).toBe(true);
    expect(h.events[0]?.step).toBe(0);
  });

  it('start while running and stop while stopped are no-ops', () => {
    const h = harness();
    const s = createScheduler(h.deps);
    s.stop();
    expect(h.state.cleared).toBe(false);
    s.start();
    const n = h.events.length;
    s.start();
    expect(h.events.length).toBe(n);
  });

  it('applies step offset', () => {
    const h = harness({ getStepOffset: (st) => (st === 1 ? 0.02 : 0) });
    const s = createScheduler(h.deps);
    s.start();
    for (let i = 0; i < 10; i++) {
      h.clock.t += 0.025;
      h.tick();
    }
    const e0 = h.events.find((e) => e.step === 0)!;
    const e1 = h.events.find((e) => e.step === 1)!;
    expect(e0.time).toBeCloseTo(0.05, 9);
    expect(e1.time).toBeCloseTo(0.05 + 0.125 + 0.02, 9);
  });
});
