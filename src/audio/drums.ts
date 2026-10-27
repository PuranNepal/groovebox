import type { SoundId } from '../core/sounds';

const FLOOR_GAIN = 0.0001;
const MASTER_GAIN = 0.8;

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();
const masters = new WeakMap<AudioContext, GainNode>();

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

function master(ctx: AudioContext): GainNode {
  let node = masters.get(ctx);
  if (!node) {
    node = ctx.createGain();
    node.gain.value = MASTER_GAIN;
    node.connect(ctx.destination);
    masters.set(ctx, node);
  }
  return node;
}

/** Gain node that decays exponentially from `peak` at `time` over `decay` seconds. */
function envelope(ctx: AudioContext, time: number, peak: number, decay: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, time);
  gain.gain.exponentialRampToValueAtTime(FLOOR_GAIN, time + decay);
  return gain;
}

type NoiseOptions = {
  filter: BiquadFilterType;
  frequency: number;
  peak: number;
  decay: number;
  q?: number;
};

function noise(ctx: AudioContext, time: number, o: NoiseOptions): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = o.filter;
  filter.frequency.value = o.frequency;
  if (o.q !== undefined) filter.Q.value = o.q;
  src
    .connect(filter)
    .connect(envelope(ctx, time, o.peak, o.decay))
    .connect(master(ctx));
  src.start(time);
  src.stop(time + o.decay + 0.02);
}

type ToneOptions = {
  type: OscillatorType;
  from: number;
  to?: number;
  sweep?: number;
  peak: number;
  decay: number;
};

function tone(ctx: AudioContext, time: number, o: ToneOptions): void {
  const osc = ctx.createOscillator();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.from, time);
  if (o.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(o.to, time + (o.sweep ?? o.decay));
  }
  osc.connect(envelope(ctx, time, o.peak, o.decay)).connect(master(ctx));
  osc.start(time);
  osc.stop(time + o.decay + 0.02);
}

function cowbell(ctx: AudioContext, time: number): void {
  const decay = 0.3;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 670;
  band.Q.value = 1;
  band.connect(envelope(ctx, time, 0.5, decay)).connect(master(ctx));
  for (const freq of [540, 800]) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.connect(band);
    osc.start(time);
    osc.stop(time + decay + 0.02);
  }
}

/** Schedules one drum hit at audio-clock `time`. */
export function playDrum(ctx: AudioContext, sound: SoundId, time: number): void {
  switch (sound) {
    case 'kick':
      tone(ctx, time, { type: 'sine', from: 150, to: 50, sweep: 0.15, peak: 0.8, decay: 0.3 });
      break;
    case 'snare':
      noise(ctx, time, { filter: 'highpass', frequency: 1000, peak: 0.5, decay: 0.18 });
      tone(ctx, time, { type: 'triangle', from: 180, peak: 0.4, decay: 0.1 });
      break;
    case 'hihat':
      noise(ctx, time, { filter: 'highpass', frequency: 8000, peak: 0.4, decay: 0.05 });
      break;
    case 'openhat':
      noise(ctx, time, { filter: 'highpass', frequency: 8000, peak: 0.4, decay: 0.3 });
      break;
    case 'ride':
      noise(ctx, time, { filter: 'highpass', frequency: 9000, peak: 0.3, decay: 0.6 });
      break;
    case 'crash':
      noise(ctx, time, { filter: 'highpass', frequency: 7000, peak: 0.45, decay: 1.2 });
      break;
    case 'clap':
      for (let i = 0; i < 3; i++) {
        noise(ctx, time + i * 0.01, {
          filter: 'bandpass',
          frequency: 1500,
          q: 1,
          peak: 0.5,
          decay: i === 2 ? 0.12 : 0.02,
        });
      }
      break;
    case 'tomHigh':
      tone(ctx, time, { type: 'sine', from: 220, to: 160, sweep: 0.2, peak: 0.7, decay: 0.3 });
      break;
    case 'tomFloor':
      tone(ctx, time, { type: 'sine', from: 120, to: 80, sweep: 0.25, peak: 0.8, decay: 0.4 });
      break;
    case 'cowbell':
      cowbell(ctx, time);
      break;
    case 'rimshot':
      tone(ctx, time, { type: 'triangle', from: 1700, peak: 0.5, decay: 0.03 });
      noise(ctx, time, { filter: 'highpass', frequency: 2000, peak: 0.4, decay: 0.02 });
      break;
  }
}
