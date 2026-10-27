import { getAudioContext } from '../audio/context';
import { playDrum } from '../audio/drums';
import { addTrack, availableSounds, removeTrack, resizePattern, toggleStep } from '../core/pattern';
import { PRESETS, presetById, type DrumState } from '../core/presets';
import { createScheduler } from '../core/scheduler';
import { SOUND_LABELS, isSoundId } from '../core/sounds';
import { clampSwing, swingOffset, type SwingNote } from '../core/swing';
import { clampBpm, secondsPerStep } from '../core/tempo';
import { clampTimeSignature, stepsPerBar, type NoteValue } from '../core/timeSignature';
import { button, el, highlightColumn, renderGrid } from './drumGrid';

type StepMark = { step: number; time: number };

const NOTE_VALUES: readonly NoteValue[] = [2, 4, 8, 16];

function numberInput(className: string, label: string, min: number, max: number): HTMLInputElement {
  const input = el('input', className);
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = '1';
  input.inputMode = 'numeric';
  input.setAttribute('aria-label', label);
  return input;
}

export function mountDrumMachine(
  root: HTMLElement,
  initial: DrumState,
  onChange: (s: DrumState) => void,
): { stop(): void } {
  let state: DrumState = structuredClone(initial);
  const marks: StepMark[] = [];
  let rafId = 0;

  // --- DOM ---
  const startBtn = button('start-btn', 'Start or stop the drum machine', 'Start');
  const bpmInput = numberInput('drum-bpm', 'Drum tempo in BPM', 20, 300);
  const beatsInput = numberInput('beats-input', 'Beats per bar', 1, 16);
  const noteSelect = el('select', 'note-select');
  noteSelect.setAttribute('aria-label', 'Note value');
  for (const n of NOTE_VALUES) noteSelect.append(new Option(String(n), String(n)));
  const sigRow = el('div', 'sig-row');
  sigRow.append(beatsInput, el('span', 'sig-slash', '/'), noteSelect);

  const swingInput = el('input', 'swing-input');
  swingInput.type = 'range';
  swingInput.min = '50';
  swingInput.max = '75';
  swingInput.step = '1';
  swingInput.setAttribute('aria-label', 'Swing amount');
  const swingValue = el('span', 'swing-value');
  const swing8 = button('swing-note-btn', 'Swing on 8th notes', '8ths');
  const swing16 = button('swing-note-btn', 'Swing on 16th notes', '16ths');
  const swingRow = el('div', 'swing-row');
  swingRow.append(el('span', 'drum-field', 'Swing'), swingInput, swingValue, swing8, swing16);

  const presetSelect = el('select', 'preset-select');
  presetSelect.setAttribute('aria-label', 'Load preset');

  const controls = el('div', 'drum-controls');
  controls.append(el('span', 'drum-field', 'BPM'), bpmInput, sigRow);

  const grid = el('div', 'drum-grid');
  const addSelect = el('select', 'add-sound-select');
  addSelect.setAttribute('aria-label', 'Add sound');

  root.replaceChildren(startBtn, controls, swingRow, presetSelect, grid, addSelect);

  function fillPresets(): void {
    presetSelect.replaceChildren(new Option('Load preset…', ''));
    for (const p of PRESETS) presetSelect.append(new Option(p.name, p.id));
  }

  function fillAddSelect(): void {
    const sounds = availableSounds(state.pattern);
    addSelect.replaceChildren(new Option('+ Add sound', ''));
    for (const s of sounds) addSelect.append(new Option(SOUND_LABELS[s], s));
    addSelect.hidden = sounds.length === 0;
  }

  function renderControls(): void {
    bpmInput.value = String(state.bpm);
    beatsInput.value = String(state.timeSignature.beats);
    noteSelect.value = String(state.timeSignature.noteValue);
    swingInput.value = String(Math.round(state.swing * 100));
    swingValue.textContent = `${Math.round(state.swing * 100)}%`;
    swing8.setAttribute('aria-pressed', String(state.swingNote === 8));
    swing16.setAttribute('aria-pressed', String(state.swingNote === 16));
    presetSelect.value = '';
  }

  function commit(): void {
    onChange(structuredClone(state));
  }

  function renderPattern(): void {
    renderGrid(grid, state.pattern, state.timeSignature, {
      onToggle: (track, step) => {
        state.pattern = toggleStep(state.pattern, track, step);
        commit();
      },
      onRemove: (track) => {
        state.pattern = removeTrack(state.pattern, track);
        renderPattern();
        commit();
      },
    });
    fillAddSelect();
  }

  function renderAll(): void {
    renderControls();
    renderPattern();
  }

  // --- state changes (scheduler getters read `state` live) ---
  function setBpm(value: number): void {
    state.bpm = clampBpm(value, state.bpm);
    bpmInput.value = String(state.bpm);
    commit();
  }

  function setTimeSignature(beats: number, noteValue: number): void {
    state.timeSignature = clampTimeSignature(beats, noteValue, state.timeSignature);
    state.pattern = resizePattern(state.pattern, stepsPerBar(state.timeSignature));
    renderAll();
    commit();
  }

  function setSwing(percent: number): void {
    state.swing = clampSwing(percent / 100, state.swing);
    swingValue.textContent = `${Math.round(state.swing * 100)}%`;
    commit();
  }

  function setSwingNote(note: SwingNote): void {
    state.swingNote = note;
    renderControls();
    commit();
  }

  function loadPreset(id: string): void {
    const preset = presetById(id);
    if (!preset) return;
    state = preset.state;
    renderAll();
    commit();
  }

  function addSound(id: string): void {
    if (!isSoundId(id)) return;
    state.pattern = addTrack(state.pattern, id, stepsPerBar(state.timeSignature));
    renderPattern();
    commit();
  }

  // --- audio ---
  const scheduler = createScheduler({
    now: () => getAudioContext().currentTime,
    setTimer: (fn, ms) => setInterval(fn, ms),
    clearTimer: (id) => clearInterval(id as ReturnType<typeof setInterval>),
    getStepDuration: () => secondsPerStep(state.bpm, state.timeSignature),
    getStepCount: () => stepsPerBar(state.timeSignature),
    getStepOffset: (step) =>
      swingOffset(
        step,
        state.swing,
        state.swingNote,
        secondsPerStep(state.bpm, state.timeSignature),
        stepsPerBar(state.timeSignature),
      ),
    onStep: (step, time) => {
      const ctx = getAudioContext();
      for (const track of state.pattern.tracks) {
        if (track.steps[step]) playDrum(ctx, track.sound, time);
      }
      marks.push({ step, time });
    },
  });

  function frame(): void {
    const now = getAudioContext().currentTime;
    let latest: number | null = null;
    for (let m = marks[0]; m && m.time <= now; m = marks[0]) {
      latest = m.step;
      marks.shift();
    }
    if (latest !== null) highlightColumn(grid, latest);
    rafId = requestAnimationFrame(frame);
  }

  function stop(): void {
    scheduler.stop();
    cancelAnimationFrame(rafId);
    marks.length = 0;
    highlightColumn(grid, null);
    startBtn.textContent = 'Start';
  }

  async function start(): Promise<void> {
    await getAudioContext().resume();
    if (scheduler.isRunning()) return;
    scheduler.start();
    rafId = requestAnimationFrame(frame);
    startBtn.textContent = 'Stop';
  }

  // --- events ---
  startBtn.addEventListener('click', () => {
    if (scheduler.isRunning()) stop();
    else void start();
  });
  bpmInput.addEventListener('change', () => setBpm(bpmInput.valueAsNumber));
  const onSigChange = (): void =>
    setTimeSignature(beatsInput.valueAsNumber, Number(noteSelect.value));
  beatsInput.addEventListener('change', onSigChange);
  noteSelect.addEventListener('change', onSigChange);
  swingInput.addEventListener('input', () => setSwing(swingInput.valueAsNumber));
  swing8.addEventListener('click', () => setSwingNote(8));
  swing16.addEventListener('click', () => setSwingNote(16));
  presetSelect.addEventListener('change', () => {
    if (presetSelect.value) loadPreset(presetSelect.value);
  });
  addSelect.addEventListener('change', () => {
    if (addSelect.value) addSound(addSelect.value);
  });

  fillPresets();
  renderAll();
  return { stop };
}
