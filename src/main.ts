import './styles.css';
import { defaultMetronomeState } from './core/metronome';
import { defaultDrumState } from './core/presets';
import { initTabs } from './ui/tabs';
import { mountMetronome } from './ui/metronomeTab';
import { mountDrumMachine } from './ui/drumTab';

const metronomePanel = document.getElementById('metronome-panel');
if (!metronomePanel) throw new Error('Missing #metronome-panel');
const drumsPanel = document.getElementById('drums-panel');
if (!drumsPanel) throw new Error('Missing #drums-panel');

const metronome = mountMetronome(metronomePanel, defaultMetronomeState(), () => {});
const drums = mountDrumMachine(drumsPanel, defaultDrumState(), () => {});

initTabs(() => {
  metronome.stop();
  drums.stop();
});
