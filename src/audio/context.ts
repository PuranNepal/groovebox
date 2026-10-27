let ctx: AudioContext | null = null;

/** Lazily creates the shared AudioContext. Call `resume()` on it from a user gesture. */
export function getAudioContext(): AudioContext {
  ctx ??= new AudioContext();
  return ctx;
}
