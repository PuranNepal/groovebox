export type NoteValue = 2 | 4 | 8 | 16;
export type TimeSignature = { beats: number; noteValue: NoteValue };

const MIN_BEATS = 1;
const MAX_BEATS = 16;
const NOTE_VALUES: readonly NoteValue[] = [2, 4, 8, 16];

function isNoteValue(value: number): value is NoteValue {
  return (NOTE_VALUES as readonly number[]).includes(value);
}

export function clampTimeSignature(
  beats: number,
  noteValue: number,
  fallback: TimeSignature,
): TimeSignature {
  const clampedBeats = Number.isFinite(beats)
    ? Math.min(MAX_BEATS, Math.max(MIN_BEATS, Math.round(beats)))
    : fallback.beats;
  return {
    beats: clampedBeats,
    noteValue: isNoteValue(noteValue) ? noteValue : fallback.noteValue,
  };
}

export function stepsPerBeat(ts: TimeSignature): number {
  return 16 / ts.noteValue;
}

export function stepsPerBar(ts: TimeSignature): number {
  return ts.beats * stepsPerBeat(ts);
}
