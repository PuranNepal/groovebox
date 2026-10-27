import './styles.css';
import { defaultMetronomeState } from './core/metronome';
import {
  DRUMS_KEY,
  METRONOME_KEY,
  loadState,
  parseDrumState,
  parseMetronomeState,
  saveState,
  type StorageLike,
} from './core/persistence';
import { defaultDrumState } from './core/presets';
import { initTabs } from './ui/tabs';
import { mountMetronome } from './ui/metronomeTab';
import { mountDrumMachine } from './ui/drumTab';

const metronomePanel = document.getElementById('metronome-panel');
if (!metronomePanel) throw new Error('Missing #metronome-panel');
const drumsPanel = document.getElementById('drums-panel');
if (!drumsPanel) throw new Error('Missing #drums-panel');

function getStorage(): StorageLike | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const SAVE_DELAY_MS = 300;

// Debounced saver that remembers the latest value; flush() writes it immediately.
function debouncedSaver<T>(storage: StorageLike | undefined, key: string) {
  let timer: number | undefined;
  let pending: { value: T } | undefined;
  const flush = (): void => {
    window.clearTimeout(timer);
    timer = undefined;
    if (pending) saveState(storage, key, pending.value);
    pending = undefined;
  };
  const save = (value: T): void => {
    pending = { value };
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, SAVE_DELAY_MS);
  };
  return { save, flush };
}

const storage = getStorage();
const metronomeSaver = debouncedSaver(storage, METRONOME_KEY);
const drumsSaver = debouncedSaver(storage, DRUMS_KEY);

const metronome = mountMetronome(
  metronomePanel,
  loadState(storage, METRONOME_KEY, parseMetronomeState) ?? defaultMetronomeState(),
  metronomeSaver.save,
);
const drums = mountDrumMachine(
  drumsPanel,
  loadState(storage, DRUMS_KEY, parseDrumState) ?? defaultDrumState(),
  drumsSaver.save,
);

window.addEventListener('pagehide', () => {
  metronomeSaver.flush();
  drumsSaver.flush();
});

initTabs(() => {
  metronome.stop();
  drums.stop();
});
