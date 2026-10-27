import { accentVoice, type Accent } from '../core/accents';

const DECAY_SEC = 0.03;
const FLOOR_GAIN = 0.0001;

/** Schedules a short decaying blip at audio-clock `time`. Silent for `off`. */
export function playClick(ctx: AudioContext, time: number, accent: Accent): void {
  const voice = accentVoice(accent);
  if (!voice) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(voice.frequency, time);
  gain.gain.setValueAtTime(voice.gain, time);
  gain.gain.exponentialRampToValueAtTime(FLOOR_GAIN, time + DECAY_SEC);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + DECAY_SEC + 0.01);
}
