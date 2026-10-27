import './styles.css';
import { defaultMetronomeState } from './core/metronome';
import { initTabs } from './ui/tabs';
import { mountMetronome } from './ui/metronomeTab';

const metronomePanel = document.getElementById('metronome-panel');
if (!metronomePanel) throw new Error('Missing #metronome-panel');

const metronome = mountMetronome(metronomePanel, defaultMetronomeState(), () => {});
// Task 10: mount the drum machine into #drums-panel and stop it in onSwitch below.

initTabs(() => {
  metronome.stop();
});
