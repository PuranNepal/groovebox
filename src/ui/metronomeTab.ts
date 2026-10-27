import { getAudioContext } from '../audio/context';
import { playClick } from '../audio/click';
import { nextAccent, resizeAccents } from '../core/accents';
import type { MetronomeState } from '../core/metronome';
import { clampBpm, secondsPerBeat } from '../core/tempo';
import { clampTimeSignature, type NoteValue } from '../core/timeSignature';
import { createTapTempo, shouldHandleTapKey } from '../core/tapTempo';
import { button, el, numberInput } from './dom';
import { mountTransport } from './transport';

const NOTE_VALUES: readonly NoteValue[] = [2, 4, 8, 16];
const MINUS = '−';

export function mountMetronome(
  root: HTMLElement,
  initial: MetronomeState,
  onChange: (s: MetronomeState) => void,
): { stop(): void } {
  const state: MetronomeState = {
    bpm: initial.bpm,
    timeSignature: { ...initial.timeSignature },
    accents: [...initial.accents],
  };
  const tap = createTapTempo();

  // --- DOM ---
  const bpmInput = numberInput('bpm-input', 'Tempo in BPM', 20, 300);
  const bpmDown = button('step-btn', 'Decrease tempo', MINUS);
  const bpmUp = button('step-btn', 'Increase tempo', '+');
  const bpmRow = el('div', 'bpm-row');
  bpmRow.append(bpmDown, bpmInput, bpmUp);

  const beatsInput = numberInput('beats-input', 'Beats per bar', 1, 16);
  const noteSelect = el('select', 'note-select');
  noteSelect.setAttribute('aria-label', 'Note value');
  for (const n of NOTE_VALUES) noteSelect.append(new Option(String(n), String(n)));
  const sigRow = el('div', 'sig-row');
  sigRow.append(beatsInput, el('span', 'sig-slash', '/'), noteSelect);

  const beatsRow = el('div', 'beats-row');
  const startBtn = button('start-btn', 'Start or stop the metronome', 'Start');
  const tapBtn = button('tap-btn', 'Tap tempo', 'Tap tempo');
  root.replaceChildren(bpmRow, sigRow, beatsRow, startBtn, tapBtn);

  // --- rendering ---
  function describeBeat(index: number, accent: string): string {
    return `Beat ${index + 1}: ${accent}`;
  }

  function renderBeats(): void {
    const buttons = state.accents.map((accent, i) => {
      const b = button('beat-btn', describeBeat(i, accent), String(i + 1));
      b.dataset['accent'] = accent;
      b.addEventListener('click', () => setAccent(i));
      return b;
    });
    beatsRow.replaceChildren(...buttons);
  }

  function renderAll(): void {
    bpmInput.value = String(state.bpm);
    beatsInput.value = String(state.timeSignature.beats);
    noteSelect.value = String(state.timeSignature.noteValue);
    renderBeats();
  }

  function highlight(beat: number | null): void {
    beatsRow.querySelectorAll('.beat-btn').forEach((node, i) => {
      node.classList.toggle('current', i === beat);
    });
  }

  function commit(): void {
    onChange({
      bpm: state.bpm,
      timeSignature: { ...state.timeSignature },
      accents: [...state.accents],
    });
  }

  // --- state changes ---
  function setBpm(value: number): void {
    state.bpm = clampBpm(value, state.bpm);
    bpmInput.value = String(state.bpm);
    commit();
  }

  function setTimeSignature(beats: number, noteValue: number): void {
    state.timeSignature = clampTimeSignature(beats, noteValue, state.timeSignature);
    state.accents = resizeAccents(state.accents, state.timeSignature.beats);
    renderAll();
    commit();
  }

  function setAccent(index: number): void {
    const current = state.accents[index];
    if (current === undefined) return;
    const next = nextAccent(current);
    state.accents[index] = next;
    const b = beatsRow.children[index];
    if (b instanceof HTMLElement) {
      b.dataset['accent'] = next;
      b.setAttribute('aria-label', describeBeat(index, next));
    }
    commit();
  }

  // --- audio ---
  const transport = mountTransport(root, startBtn, {
    getStepDuration: () => secondsPerBeat(state.bpm),
    getStepCount: () => state.timeSignature.beats,
    onStep: (beat, time) => playClick(getAudioContext(), time, state.accents[beat] ?? 'soft'),
    onHighlight: highlight,
  });

  function applyTap(): void {
    const bpm = tap.tap(performance.now());
    if (bpm !== null) setBpm(bpm);
  }

  // --- events ---
  bpmInput.addEventListener('change', () => setBpm(bpmInput.valueAsNumber));
  bpmDown.addEventListener('click', () => setBpm(state.bpm - 1));
  bpmUp.addEventListener('click', () => setBpm(state.bpm + 1));
  const onSigChange = (): void =>
    setTimeSignature(beatsInput.valueAsNumber, Number(noteSelect.value));
  beatsInput.addEventListener('change', onSigChange);
  noteSelect.addEventListener('change', onSigChange);
  tapBtn.addEventListener('click', applyTap);
  document.addEventListener('keydown', (e) => {
    if (root.hidden) return;
    const target = e.target instanceof HTMLElement ? e.target : null;
    const handled = shouldHandleTapKey({
      key: e.key,
      targetTag: target?.tagName ?? '',
      targetType: target instanceof HTMLInputElement ? target.type : undefined,
      repeat: e.repeat,
    });
    if (!handled) return;
    e.preventDefault();
    applyTap();
  });

  renderAll();
  return { stop: transport.stop };
}
