# Shared transport refactor

**Goal:** the metronome and drum machine tabs share one transport (start/stop, `resume()` guard,
scheduler, playhead marks, highlight loop) and one set of DOM helpers. No behaviour change.

**Why:** the final review of the ship PR found that the transport was copy-pasted into both tabs,
which is how one start/stop race bug landed in both. One copy means one place to fix.

## Design

- `src/core/transport.ts` (pure, no `audio/` or `ui/` imports): `createTransport(deps)` composes
  `createScheduler` and `createStartGate` with the marks queue and the frame loop. The audio clock,
  `resume()`, "is the panel hidden", timers, animation frames and the UI callbacks
  (`onStep`, `onHighlight`, `onRunningChange`) are injected, so the races are unit-testable.
- `src/ui/transport.ts`: `mountTransport(button, root, options)` fills the browser deps
  (`getAudioContext`, `setInterval`, `requestAnimationFrame`) and wires the Start/Stop button.
- `src/ui/dom.ts`: `el`, `button`, `numberInput`. `drumGrid.ts` stops exporting `el`/`button`.

## Tasks

1. Write `tests/core/transport.test.ts` (failing): start runs after resume; stop during resume
   cancels the start; a start while hidden does nothing; a rejected resume does nothing; double
   start doesn't restart; highlight fires only once a mark's time has passed, with the latest
   passed step; stop clears marks, cancels the frame and highlights `null`; live getters are read
   every step; `onRunningChange` reports true/false.
2. Implement `src/core/transport.ts` until green.
3. Add `src/ui/dom.ts`; point `drumGrid.ts`, `drumTab.ts`, `metronomeTab.ts` at it.
4. Add `src/ui/transport.ts`; replace the transport code in both tabs with `mountTransport`.
5. `npm run check`.
6. Browser smoke test (`npm run dev`): start/stop each tab, switch tabs while playing, switch
   during the `resume()` window, tap tempo (button and Space), live BPM/time-signature changes.
7. Commit (conventional), push, PR against `main` with by-ear checks for the owner. Don't merge.
