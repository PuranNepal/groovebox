import { describe, expect, it } from 'vitest';
import { createStartGate } from '../../src/core/startGate';

describe('createStartGate', () => {
  it('a token is current after begin', () => {
    const gate = createStartGate();
    expect(gate.isCurrent(gate.begin())).toBe(true);
  });

  it('cancel invalidates an outstanding token', () => {
    const gate = createStartGate();
    const t = gate.begin();
    gate.cancel();
    expect(gate.isCurrent(t)).toBe(false);
  });

  it('a second begin invalidates the first token', () => {
    const gate = createStartGate();
    const first = gate.begin();
    const second = gate.begin();
    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
  });

  it('begin after cancel is current', () => {
    const gate = createStartGate();
    gate.begin();
    gate.cancel();
    expect(gate.isCurrent(gate.begin())).toBe(true);
  });
});
