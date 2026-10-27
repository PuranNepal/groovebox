import type { Pattern } from '../core/pattern';
import { SOUND_LABELS } from '../core/sounds';
import { stepsPerBeat, type TimeSignature } from '../core/timeSignature';
import { button, el } from './dom';

export type GridHandlers = {
  onToggle: (track: number, step: number) => void;
  onRemove: (track: number) => void;
};

/** Rebuilds the grid rows (label and remove button in a sticky head, then step buttons) for `pattern`. */
export function renderGrid(
  container: HTMLElement,
  pattern: Pattern,
  ts: TimeSignature,
  handlers: GridHandlers,
): void {
  const perBeat = stepsPerBeat(ts);
  const rows = pattern.tracks.map((track, t) => {
    const label = SOUND_LABELS[track.sound];
    const row = el('div', 'drum-row');
    const remove = button('drum-remove', `Remove ${label}`, '✕');
    remove.addEventListener('click', () => handlers.onRemove(t));
    const steps = el('div', 'drum-steps');
    steps.style.setProperty('--steps', String(track.steps.length));
    track.steps.forEach((on, s) => {
      const b = button('drum-step', `${label} step ${s + 1}`, '');
      b.setAttribute('aria-pressed', String(on));
      b.dataset['step'] = String(s);
      if (s % perBeat === 0) b.classList.add('beat-start');
      b.addEventListener('click', () => {
        handlers.onToggle(t, s);
        b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      });
      steps.append(b);
    });
    const head = el('div', 'drum-head');
    head.append(el('span', 'drum-label', label), remove);
    row.append(head, steps);
    return row;
  });
  container.replaceChildren(...rows);
}

/** Marks the column of `step` as current in every row; `null` clears it. */
export function highlightColumn(container: HTMLElement, step: number | null): void {
  const target = step === null ? null : String(step);
  container.querySelectorAll<HTMLElement>('.drum-step').forEach((node) => {
    node.classList.toggle('current', target !== null && node.dataset['step'] === target);
  });
}
