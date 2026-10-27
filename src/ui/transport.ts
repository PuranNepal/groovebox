import { getAudioContext } from '../audio/context';
import { createTransport, type Transport, type TransportDeps } from '../core/transport';

export type TransportOptions = Pick<
  TransportDeps,
  'getStepDuration' | 'getStepCount' | 'getStepOffset' | 'onStep' | 'onHighlight'
>;

/**
 * Wires a transport to the shared AudioContext and browser timers, and makes `startBtn`
 * toggle it. Nothing starts while `root` is hidden.
 */
export function mountTransport(
  root: HTMLElement,
  startBtn: HTMLButtonElement,
  options: TransportOptions,
): Transport {
  const transport = createTransport({
    ...options,
    now: () => getAudioContext().currentTime,
    resume: () => getAudioContext().resume(),
    // `hidden` may also be 'until-found', which still means hidden.
    isHidden: () => root.hidden !== false,
    setTimer: (fn, ms) => setInterval(fn, ms),
    clearTimer: (id) => clearInterval(id as ReturnType<typeof setInterval>),
    requestFrame: (fn) => requestAnimationFrame(fn),
    cancelFrame: (id) => cancelAnimationFrame(id as number),
    onRunningChange: (running) => {
      startBtn.textContent = running ? 'Stop' : 'Start';
    },
  });
  startBtn.addEventListener('click', () => transport.toggle());
  return transport;
}
