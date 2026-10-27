# Groovebox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A free, static, browser-based metronome and editable drum machine, with swing and odd time signatures, deployed to GitHub Pages.

**Architecture:** All musical logic (tempo math, swing, tap tempo, accents, pattern editing, the scheduler loop, presets and saved-state parsing) lives in `src/core/` as pure TypeScript with injected clocks, and is built test-first with Vitest. `src/audio/` (Web Audio synthesis) and `src/ui/` (plain DOM) are thin layers that call into core; they are verified by hand using the checklists in this plan.

**Tech Stack:** Node 24, Vite 8, TypeScript, Vitest, ESLint (flat config + typescript-eslint), Prettier, GitHub Actions, GitHub Pages. No UI framework and no runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-27-groovebox-design.md`. Read it before starting any task.

## Global Constraints

- Static site only; no server, no runtime npm dependencies, no analytics, cookies or tracking.
- Vite `base` is `/groovebox/`.
- Tempo: 20–300 BPM, integer, clamped. BPM counts the time signature's own note value.
- Beats per bar: 1–16. Note value: 2, 4, 8 or 16.
- Grid resolution: 16th notes. `stepsPerBar = beats × (16 ÷ noteValue)`.
- Swing amount: 50%–75% (stored as 0.5–0.75). Swing note: 8 or 16. Defaults: 0.5 and 16.
- Tap tempo: average of the intervals between the last 4 taps; a gap > 2000 ms starts over.
- Accent cycle: `strong → medium → soft → off → strong`. Default: beat 1 `strong`, others `soft`.
- Built-in sound ids (exact): `kick, snare, hihat, openhat, crash, ride, clap, tomHigh, tomFloor, cowbell, rimshot`. Default rows: `kick, snare, hihat`.
- Notes are always scheduled on `AudioContext.currentTime` with a lookahead scheduler: a ~25 ms timer that schedules notes ≤ 100 ms ahead. Never trigger sound directly from a timer callback.
- localStorage keys: `groovebox.metronome.v1`, `groovebox.drums.v1`. Every storage access is wrapped in try/catch.
- Metronome and drum machine state are fully independent.
- Workflow (`CLAUDE.md`): one feature branch per PR, CI green before merge, never commit directly to `main`, and run `npm run check` before claiming a task is done.

**Decisions this plan makes (not in the spec):**
- Switching tabs stops whatever is playing, so sound never comes from a hidden tab.
- "+ Add sound" lists only sounds not already in the grid, so there are no duplicate rows.
- Swing applies only to a complete swing group. In odd-length bars the trailing partial group plays straight.
- The Space key triggers tap tempo only when focus is not in a text/number input.

## Review Focus

1. **Garbage in number fields** (empty, `abc`, `-5`, `999`, `7.5`). Tempo and beats must clamp, or fall back to the last valid value, and never become `NaN`. Tests are in Task 2.
2. **Space bar while typing in the BPM box.** It must not count as a tap, and must not scroll the page or double-trigger a focused button. Tests are in Task 3 (`shouldHandleTapKey`).
3. **Changing tempo or time signature while playing.** There should be no burst of notes, no skipped bar and no index past the end when the bar shrinks. Tests are in Task 5 (scheduler).
4. **Swing in odd bars (7/8, 5/4 with 8th swing).** A partial trailing group plays straight; it doesn't produce a misplaced note. Tests are in Task 7.
5. **Corrupt, old or blocked saved state** (bad JSON, missing fields, storage throwing in private mode). The app loads with defaults. Tests are in Task 11.

## Before PR 1
The spec and this plan sit on branch `docs/design-spec`. Open that as PR 0 ("Design spec and implementation plan") and merge it into `main` first, so every later branch starts from a `main` that contains them.

---

## File Structure

```
index.html                    app shell: tab bar + two tab panels
vite.config.ts                base '/groovebox/', vitest config
eslint.config.js, .prettierrc, tsconfig.json, package.json
.github/workflows/ci.yml      lint, typecheck, test, build on PRs and on main
.github/workflows/deploy.yml  build + deploy to Pages on main (Task 13)
CLAUDE.md, LICENSE, README.md
src/
  main.ts                     wires tabs, both tab controllers, persistence
  styles.css                  dark theme
  core/                       PURE: no DOM, no Web Audio
    timeSignature.ts          TimeSignature, clampTimeSignature, stepsPerBar
    tempo.ts                  clampBpm, secondsPerStep, secondsPerBeat
    tapTempo.ts               createTapTempo, shouldHandleTapKey
    accents.ts                Accent, nextAccent, defaultAccents, resizeAccents, accentVoice
    metronome.ts              MetronomeState, defaultMetronomeState
    scheduler.ts              createScheduler (clock + timer injected)
    swing.ts                  SwingNote, clampSwing, swingOffset
    sounds.ts                 SOUND_IDS, SoundId, SOUND_LABELS, DEFAULT_SOUNDS
    pattern.ts                Pattern, Track, emptyPattern, toggleStep, resizePattern, addTrack, removeTrack, availableSounds
    presets.ts                DrumState, PRESETS, defaultDrumState
    persistence.ts            parseMetronomeState, parseDrumState, saveState, loadState
  audio/
    context.ts                getAudioContext (lazy, resumes on gesture)
    click.ts                  playClick(ctx, time, accent)
    drums.ts                  playDrum(ctx, sound, time)
  ui/
    tabs.ts                   initTabs(onSwitch)
    metronomeTab.ts           mountMetronome(root, initial, onChange) -> { stop }
    drumTab.ts                mountDrumMachine(root, initial, onChange) -> { stop }
tests/core/*.test.ts          one file per core module
```

---

# PR 1: Foundation (branch `feat/foundation`)

### Task 1: Project scaffold, quality gates, CI and project docs

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `index.html`, `src/main.ts`, `src/styles.css`, `.github/workflows/ci.yml`, `CLAUDE.md`, `LICENSE`, `README.md`
- Test: `tests/core/smoke.test.ts` (deleted in Task 2)

**Interfaces:**
- Produces: npm scripts used by every later task: `dev`, `build`, `test` (`vitest run`), `lint` (`eslint .`), `format` / `format:check` (Prettier), `typecheck` (`tsc --noEmit`), and `check` (format:check, lint, typecheck, test and build in that order, stopping on first failure).

- [ ] **Step 1:** Create the branch: `git switch main && git pull && git switch -c feat/foundation`.
- [ ] **Step 2:** `npm init -y`, then install dev dependencies: `npm i -D vite vitest typescript eslint @eslint/js typescript-eslint globals prettier`. Set `"type": "module"`, `"private": true` and `"engines": { "node": ">=24" }`.
- [ ] **Step 3:** Config files. `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `target/module: ES2022`, `moduleResolution: bundler`, `lib: [ES2022, DOM, DOM.Iterable]`, include `src`, `tests` and `vite.config.ts`. `vite.config.ts` uses `defineConfig` from `vitest/config`, with `base: '/groovebox/'` and `test: { include: ['tests/**/*.test.ts'] }`. ESLint: recommended JS + typescript-eslint recommended; ignore `dist`, `coverage` and `.superpowers`.
- [ ] **Step 4:** `index.html` contains a tab bar with two buttons (`data-tab="metronome"`, `data-tab="drums"`) and two panels (`#metronome-panel`, `#drums-panel`). `src/main.ts` imports `styles.css`. The page title is `Groovebox`.
- [ ] **Step 5:** Write `tests/core/smoke.test.ts` with `expect(1 + 1).toBe(2)` so the pipeline has a test to run.
- [ ] **Step 6:** Run `npm run check`. Expected: every stage passes and `dist/` is built.
- [ ] **Step 7:** `.github/workflows/ci.yml`: job id `ci`, on `pull_request` and on `push` to `main`, ubuntu-latest, `actions/checkout`, `actions/setup-node` with Node 24 and npm cache, `npm ci`, `npm run check`.
- [ ] **Step 8:** Write `CLAUDE.md` with these sections:
  - **What this is**, with a link to the spec and this plan.
  - **Commands**: what each npm script does.
  - **Rules**:
    - `src/core` is pure and test-first; it must not import from `audio/` or `ui/`.
    - Never schedule audio from a timer callback; use the scheduler.
    - Feature branch plus PR, never commit to `main`.
    - Run `npm run check` and read its output before saying "done".
    - Conventional commit messages.
  - **Manual checks**: where the per-PR manual checklists live (this plan).
- [ ] **Step 9:** `LICENSE`: MIT, © 2026 Puran Nepal. `README.md` stub: name, one-line description, "Status: in development", and links to the spec and the plan.
- [ ] **Step 10:** Commit: `chore: scaffold Vite + TypeScript with lint, format, tests and CI`.

### PR 1 wrap-up
- [ ] Push the branch and run `gh pr create --base main --title "Foundation: tooling, CI and project docs"`. The body says what is included and how it was verified.
- [ ] Wait for CI to go green, run `superpowers:requesting-code-review`, fix what it finds, and merge with `gh pr merge --squash --delete-branch`.
- [ ] **Owner step (one time, in GitHub settings):** Settings → Branches → add a rule for `main`: require a pull request and require the `ci` status check.

---

# PR 2: Metronome (branch `feat/metronome`)

**Start:** `git switch main && git pull && git switch -c feat/metronome`

### Task 2: Time signature and tempo math

**Files:**
- Create: `src/core/timeSignature.ts`, `src/core/tempo.ts`
- Test: `tests/core/timeSignature.test.ts`, `tests/core/tempo.test.ts`
- Delete: `tests/core/smoke.test.ts`

**Interfaces:**
- Produces:
  - `type NoteValue = 2 | 4 | 8 | 16`
  - `type TimeSignature = { beats: number; noteValue: NoteValue }`
  - `clampTimeSignature(beats: number, noteValue: number, fallback: TimeSignature): TimeSignature`
  - `stepsPerBar(ts: TimeSignature): number`
  - `stepsPerBeat(ts: TimeSignature): number` (= 16 / noteValue)
  - `MIN_BPM = 20`, `MAX_BPM = 300`
  - `clampBpm(value: number, fallback: number): number`
  - `secondsPerBeat(bpm: number): number`
  - `secondsPerStep(bpm: number, ts: TimeSignature): number`

- [ ] **Step 1: Write the failing tests.**
```ts
// timeSignature.test.ts
expect(stepsPerBar({ beats: 4, noteValue: 4 })).toBe(16);
expect(stepsPerBar({ beats: 5, noteValue: 4 })).toBe(20);
expect(stepsPerBar({ beats: 7, noteValue: 8 })).toBe(14);
expect(stepsPerBar({ beats: 6, noteValue: 8 })).toBe(12);
const fb = { beats: 4, noteValue: 4 } as const;
expect(clampTimeSignature(0, 4, fb)).toEqual({ beats: 1, noteValue: 4 });
expect(clampTimeSignature(99, 8, fb)).toEqual({ beats: 16, noteValue: 8 });
expect(clampTimeSignature(7.6, 8, fb)).toEqual({ beats: 8, noteValue: 8 });   // rounds
expect(clampTimeSignature(NaN, 8, fb)).toEqual({ beats: 4, noteValue: 8 });   // beats falls back
expect(clampTimeSignature(5, 3, fb)).toEqual({ beats: 5, noteValue: 4 });     // invalid note value falls back
// tempo.test.ts
expect(clampBpm(10, 120)).toBe(20);
expect(clampBpm(400, 120)).toBe(300);
expect(clampBpm(99.6, 120)).toBe(100);
expect(clampBpm(NaN, 120)).toBe(120);
expect(secondsPerBeat(120)).toBeCloseTo(0.5);
expect(secondsPerStep(120, { beats: 4, noteValue: 4 })).toBeCloseTo(0.125);
expect(secondsPerStep(120, { beats: 7, noteValue: 8 })).toBeCloseTo(0.25);  // BPM counts 8ths in x/8
```
- [ ] **Step 2:** Run `npx vitest run tests/core/timeSignature.test.ts tests/core/tempo.test.ts`. Expected: FAIL (modules don't exist yet).
- [ ] **Step 3:** Implement both modules and delete the smoke test.
- [ ] **Step 4:** Run the same command again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): time signature and tempo math`.

### Task 3: Tap tempo

**Files:**
- Create: `src/core/tapTempo.ts`
- Test: `tests/core/tapTempo.test.ts`

**Interfaces:**
- Consumes: `clampBpm`, `MIN_BPM`, `MAX_BPM` from Task 2.
- Produces:
  - `createTapTempo(): { tap(nowMs: number): number | null; reset(): void }`. It returns the rounded, clamped BPM once there are ≥ 2 taps, otherwise `null`.
  - `shouldHandleTapKey(e: { key: string; targetTag: string; targetType?: string; repeat: boolean }): boolean`

- [ ] **Step 1: Write the failing tests.**
```ts
const t = createTapTempo();
expect(t.tap(0)).toBeNull();
expect(t.tap(500)).toBe(120);
expect(t.tap(1000)).toBe(120);
// averages the intervals between the LAST 4 taps only (3 intervals):
const u = createTapTempo();
[0, 1000, 1500, 2000].forEach((ms) => u.tap(ms));
expect(u.tap(2500)).toBe(120);            // last 4 taps: 1000,1500,2000,2500 → 500 ms
// gap > 2000 ms starts over:
expect(u.tap(5000)).toBeNull();
expect(u.tap(5600)).toBe(100);
// clamps:
const v = createTapTempo(); v.tap(0);
expect(v.tap(100)).toBe(300);
// keyboard filter:
expect(shouldHandleTapKey({ key: ' ', targetTag: 'BODY', repeat: false })).toBe(true);
expect(shouldHandleTapKey({ key: ' ', targetTag: 'INPUT', targetType: 'number', repeat: false })).toBe(false);
expect(shouldHandleTapKey({ key: ' ', targetTag: 'BODY', repeat: true })).toBe(false);
expect(shouldHandleTapKey({ key: 'a', targetTag: 'BODY', repeat: false })).toBe(false);
```
- [ ] **Step 2:** Run `npx vitest run tests/core/tapTempo.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Keep at most the last 4 tap timestamps. `shouldHandleTapKey` is true only for `' '`, not repeat, and when the target is not an `INPUT`, `TEXTAREA` or `SELECT`.
- [ ] **Step 4:** Run the test again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): tap tempo with keyboard filter`.

### Task 4: Accents

**Files:**
- Create: `src/core/accents.ts`
- Test: `tests/core/accents.test.ts`

**Interfaces:**
- Produces:
  - `type Accent = 'strong' | 'medium' | 'soft' | 'off'`
  - `nextAccent(a: Accent): Accent`
  - `defaultAccents(beats: number): Accent[]`
  - `resizeAccents(accents: Accent[], beats: number): Accent[]`. It keeps existing values and fills new beats with `'soft'`.
  - `accentVoice(a: Accent): { gain: number; frequency: number } | null`. Values: strong `{1.0, 1600}`, medium `{0.7, 1200}`, soft `{0.4, 800}`, off `null`.

- [ ] **Step 1: Write the failing tests.**
```ts
expect(nextAccent('strong')).toBe('medium');
expect(nextAccent('off')).toBe('strong');
expect(defaultAccents(4)).toEqual(['strong', 'soft', 'soft', 'soft']);
expect(resizeAccents(['strong', 'off', 'medium'], 5)).toEqual(['strong', 'off', 'medium', 'soft', 'soft']);
expect(resizeAccents(['strong', 'off', 'medium'], 2)).toEqual(['strong', 'off']);
expect(accentVoice('off')).toBeNull();
expect(accentVoice('strong')!.gain).toBeGreaterThan(accentVoice('medium')!.gain);
expect(accentVoice('medium')!.frequency).toBeGreaterThan(accentVoice('soft')!.frequency);
```
- [ ] **Step 2:** Run `npx vitest run tests/core/accents.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the test again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): accent levels`.

### Task 5: Lookahead scheduler

**Files:**
- Create: `src/core/scheduler.ts`
- Test: `tests/core/scheduler.test.ts`

**Interfaces:**
- Produces:
```ts
type SchedulerDeps = {
  now: () => number;                                   // audio clock, seconds (ctx.currentTime)
  setTimer: (fn: () => void, ms: number) => unknown;   // setInterval
  clearTimer: (id: unknown) => void;
  getStepDuration: () => number;                       // seconds, read every step
  getStepCount: () => number;                          // read every step
  getStepOffset?: (step: number) => number;            // swing offset in seconds, default 0
  onStep: (step: number, time: number) => void;        // schedule sound + UI at `time`
  lookaheadMs?: number;                                 // default 25
  scheduleAheadSec?: number;                            // default 0.1
};
createScheduler(deps: SchedulerDeps): { start(): void; stop(): void; isRunning(): boolean }
```
- Algorithm (not fixed by the tests): on `start`, set `nextTime = now() + 0.05` and `step = 0`, then call `tick` immediately and every `lookaheadMs` ms. `tick`: `while (nextTime < now() + scheduleAheadSec) { if (step >= getStepCount()) step = 0; onStep(step, nextTime + getStepOffset(step)); nextTime += getStepDuration(); step = (step + 1) % getStepCount(); }`. Time always advances from `nextTime`, never from `now()`; this is what prevents drift. If `nextTime < now() - 0.2` (the tab was throttled), resync with `nextTime = now() + 0.05` rather than firing a burst.

- [ ] **Step 1: Write the failing tests** using a fake clock and a manual timer (`let t = 0; let fn; setTimer: (f) => (fn = f)`).
  - `schedules steps ahead without drift`: step duration 0.125. Advance `t` by 0.025 and call `fn()` 400 times (10 s). Collected times are exactly `0.05 + k*0.125` (`toBeCloseTo`, 9 digits), with steps cycling 0..15.
  - `tempo change applies from the next step`: change the duration from 0.125 to 0.25 after step 3. The gap between steps 3 and 4 is 0.125, and from 4 to 5 it is 0.25.
  - `bar shrinking mid-play wraps the step index`: count 16 → 14 while at step 15. The next step reported is 0, never ≥ 14.
  - `no burst after throttling`: jump `t` forward by 5 s and call `fn()` once. At most `ceil(0.1 / 0.125) + 1` steps are emitted.
  - `stop` clears the timer and `isRunning()` returns false; `start` after `stop` begins again at step 0.
  - `applies step offset`: `getStepOffset = (s) => s === 1 ? 0.02 : 0`. Step 1's time is its base time + 0.02.
- [ ] **Step 2:** Run `npx vitest run tests/core/scheduler.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `createScheduler` as described above.
- [ ] **Step 4:** Run the test again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): drift-free lookahead scheduler`.

### Task 6: Metronome audio and tab UI

**Files:**
- Create: `src/core/metronome.ts`, `src/audio/context.ts`, `src/audio/click.ts`, `src/ui/tabs.ts`, `src/ui/metronomeTab.ts`
- Modify: `src/main.ts`, `src/styles.css` (dark theme as in the approved mockup), `index.html`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces:
  - `getAudioContext(): AudioContext`. It is created lazily, and `resume()` is called on every Play click.
  - `playClick(ctx: AudioContext, time: number, accent: Accent): void`. A short sine/triangle blip with an exponential decay of about 30 ms, using `accentVoice`. It does nothing for `off`.
  - `initTabs(onSwitch: (tab: 'metronome' | 'drums') => void): void`
  - In `src/core/metronome.ts`: `type MetronomeState = { bpm: number; timeSignature: TimeSignature; accents: Accent[] }` and `defaultMetronomeState(): MetronomeState`, which returns 120 BPM, 4/4 and `defaultAccents(4)`.
  - `mountMetronome(root: HTMLElement, initial: MetronomeState, onChange: (s: MetronomeState) => void): { stop(): void }`

- [ ] **Step 1:** Build the tab shell. `initTabs` toggles `hidden` on the panels and `aria-selected` on the buttons, and calls `onSwitch`. `main.ts` stops both tools on every switch.
- [ ] **Step 2:** Build the metronome panel to match the mockup:
  - **Tempo:** a large `<input type="number">` that commits on `change` via `clampBpm(value, current)` and writes the clamped value back, plus −/+ buttons (±1).
  - **Time signature:** a beats `<input type="number">` (1–16) and a note-value `<select>` (2/4/8/16), both through `clampTimeSignature`.
  - **Accents:** one button per beat whose height and colour reflect its accent level. A click applies `nextAccent`, and the beat count changes via `resizeAccents`.
  - **Start/Stop:** a single button.
  - **Tap tempo:** a button, plus a `keydown` listener on `document` gated by `shouldHandleTapKey`, which calls `preventDefault()` when handled.
  - **Beat highlight:** each `onStep` pushes `{ beat, time }` to a queue. A `requestAnimationFrame` loop highlights a beat when `ctx.currentTime >= time`.
  - Wire the scheduler with `getStepDuration = () => secondsPerBeat(bpm)` (the metronome steps per beat, not per 16th) and `getStepCount = () => beats`.
- [ ] **Step 3:** Call `onChange(state)` after every state change. In this PR, `main.ts` passes a no-op.
- [ ] **Step 4:** Run `npm run check`. Expected: all stages pass.
- [ ] **Step 5:** **Manual checklist** (`npm run dev`, Chrome):
  - [ ] Clicks start on Start with no console errors (autoplay policy satisfied).
  - [ ] 120 BPM in 4/4 matches a phone metronome for 3 minutes with no audible drift.
  - [ ] 7/8 with accents 2+2+3 (strong, soft, medium, soft, medium, soft, soft) sounds right; Off beats are silent.
  - [ ] Typing 999 in BPM shows 300; typing `abc` or clearing the field restores the previous value.
  - [ ] Space taps tempo when focus is not in an input, and doesn't scroll the page. Space inside the BPM input does nothing special.
  - [ ] Changing BPM or time signature while playing takes effect smoothly.
  - [ ] Switching to the Drum Machine tab stops the metronome.
- [ ] **Step 6:** Commit: `feat: metronome tab with tap tempo and accents`.

### PR 2 wrap-up
- [ ] Push the branch and open a PR titled "Metronome tab". Paste the manual checklist results into the PR body. Then CI green → `superpowers:requesting-code-review` → fix → squash merge.

---

# PR 3: Drum machine (branch `feat/drum-machine`)

**Start:** `git switch main && git pull && git switch -c feat/drum-machine`

### Task 7: Swing

**Files:**
- Create: `src/core/swing.ts`
- Test: `tests/core/swing.test.ts`

**Interfaces:**
- Produces:
  - `type SwingNote = 8 | 16`
  - `clampSwing(value: number, fallback: number): number`. Clamps to 0.5–0.75.
  - `swingOffset(step: number, swing: number, swingNote: SwingNote, stepDuration: number, stepCount: number): number`. Returns seconds to add to the step's straight time.
- Algorithm. Let `d = stepDuration` and `e = swing − 0.5`.
  - **16th swing:** groups of 2 steps. Odd steps (`step % 2 === 1`) get `2·e·d`.
  - **8th swing:** groups of 4 steps. `step % 4 === 2` gets `4·e·d`; `step % 4` of 1 or 3 gets `2·e·d`; `step % 4 === 0` gets 0.
  - A step whose group doesn't fit completely in the bar (`groupStart + groupSize > stepCount`) gets 0.

- [ ] **Step 1: Write the failing tests** (`d = 0.1`, bar of 16 unless stated):
```ts
expect(swingOffset(1, 0.5, 16, 0.1, 16)).toBe(0);                     // straight
expect(swingOffset(1, 0.75, 16, 0.1, 16)).toBeCloseTo(0.05);
expect(swingOffset(2, 0.75, 16, 0.1, 16)).toBe(0);
expect(swingOffset(2, 2 / 3, 8, 0.1, 16)).toBeCloseTo(0.0667, 3);     // triplet shuffle: off-beat 8th at 2/3 of the beat
expect(swingOffset(0, 2 / 3, 8, 0.1, 16)).toBe(0);
expect(swingOffset(1, 2 / 3, 8, 0.1, 16)).toBeCloseTo(0.0333, 3);
// 7/8 = 14 steps, 8th swing: group 12–15 is incomplete → straight
expect(swingOffset(13, 0.75, 8, 0.1, 14)).toBe(0);
expect(swingOffset(10, 0.75, 8, 0.1, 14)).toBeCloseTo(0.1);
expect(clampSwing(0.9, 0.5)).toBe(0.75);
expect(clampSwing(0.2, 0.5)).toBe(0.5);
expect(clampSwing(NaN, 0.6)).toBe(0.6);
```
- [ ] **Step 2:** Run `npx vitest run tests/core/swing.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the test again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): 8th and 16th swing`.

### Task 8: Sounds list and pattern editing

**Files:**
- Create: `src/core/sounds.ts`, `src/core/pattern.ts`
- Test: `tests/core/pattern.test.ts`

**Interfaces:**
- Produces:
  - `SOUND_IDS` (the exact list in Global Constraints, as a `const` tuple)
  - `type SoundId`
  - `SOUND_LABELS: Record<SoundId, string>` (e.g. `openhat: 'Open hi-hat'`, `tomFloor: 'Floor tom'`)
  - `DEFAULT_SOUNDS: SoundId[] = ['kick', 'snare', 'hihat']`
  - `type Track = { sound: SoundId; steps: boolean[] }`
  - `type Pattern = { tracks: Track[] }`
  - `emptyPattern(stepCount: number, sounds?: SoundId[]): Pattern`
  - `toggleStep(p: Pattern, track: number, step: number): Pattern`
  - `resizePattern(p: Pattern, stepCount: number): Pattern`
  - `addTrack(p: Pattern, sound: SoundId): Pattern` (does nothing if the sound is already present)
  - `removeTrack(p: Pattern, track: number): Pattern`
  - `availableSounds(p: Pattern): SoundId[]`
  - All functions return new objects and never mutate their input.

- [ ] **Step 1: Write the failing tests.**
  - `emptyPattern(16)` has 3 tracks (kick, snare, hihat), each with 16 `false` steps.
  - `toggleStep` flips one cell and leaves the original pattern unchanged (`toEqual` on a saved deep copy).
  - `resizePattern` 16 → 14 keeps steps 0–13. Then 14 → 16 keeps those and adds `false` for 14 and 15.
  - `addTrack(p, 'crash')` appends a crash row with the current step count; adding `'kick'` again is a no-op.
  - `removeTrack(p, 0)` removes kick; `availableSounds` then includes `'kick'` and excludes `'snare'`.
  - Out-of-range track or step indexes in `toggleStep` and `removeTrack` return the pattern unchanged.
- [ ] **Step 2:** Run `npx vitest run tests/core/pattern.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the test again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): drum pattern editing`.

### Task 9: Presets

**Files:**
- Create: `src/core/presets.ts`
- Test: `tests/core/presets.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 7 and 8.
- Produces:
  - `type DrumState = { bpm: number; timeSignature: TimeSignature; swing: number; swingNote: SwingNote; pattern: Pattern }`
  - `type Preset = { id: string; name: string; state: DrumState }`
  - `PRESETS: Preset[]`. The ids, in order, are `rock`, `metal`, `blues-shuffle`, `hip-hop` and `odd-7-8`.
  - `defaultDrumState(): DrumState`. Returns a deep copy of the Rock preset.
- Preset values (the patterns are the builder's call, but must sound like the genre):
  - Rock: 110 BPM, 4/4, straight.
  - Metal: 180 BPM, 4/4, straight, double-kick 16ths.
  - Blues Shuffle: 90 BPM, 4/4, swing 0.67 on 8ths.
  - Hip-Hop: 88 BPM, 4/4, swing 0.58 on 16ths.
  - 7/8: 140 BPM, 7/8, straight, grouped 2+2+3.

- [ ] **Step 1: Write the failing tests.** For every preset:
  - each track's `steps.length === stepsPerBar(timeSignature)`
  - `clampBpm(bpm, 0) === bpm`
  - `clampSwing(swing, 0) === swing`
  - at least one kick step is on
  - no duplicate sounds

  Also check:
  - the ids match the list
  - `blues-shuffle` has `swingNote === 8` and `swing ≈ 0.67`, and `hip-hop` has `swingNote === 16`
  - `defaultDrumState()` returns a new object each call (mutating one doesn't affect the next)
- [ ] **Step 2:** Run `npx vitest run tests/core/presets.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the patterns as boolean arrays, written as readable strings like `'x...x...x...x...'` and parsed by a local helper.
- [ ] **Step 4:** Run the test again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): genre presets`.

### Task 10: Drum sounds and drum machine tab UI

**Files:**
- Create: `src/audio/drums.ts`, `src/ui/drumTab.ts`
- Modify: `src/main.ts`, `src/styles.css`

**Interfaces:**
- Consumes: Tasks 5 and 7–9, plus `getAudioContext`.
- Produces:
  - `playDrum(ctx: AudioContext, sound: SoundId, time: number): void`
  - `mountDrumMachine(root: HTMLElement, initial: DrumState, onChange: (s: DrumState) => void): { stop(): void }`
- Synthesis guide (tune by ear):
  - **kick:** sine sweeping from 150 to 50 Hz over 0.15 s.
  - **snare:** a noise burst through a high-pass filter at ~1 kHz, plus a 180 Hz triangle.
  - **hats, crash, ride:** noise through a high-pass filter at 7–10 kHz. The decay length tells them apart: closed hat 0.05 s, open hat 0.3 s, ride 0.6 s, crash 1.2 s.
  - **clap:** 3 short noise bursts 10 ms apart.
  - **toms:** pitched sine sweeps (high tom 220→160 Hz, floor tom 120→80 Hz).
  - **cowbell:** two square waves at 540 and 800 Hz through a band-pass filter.
  - **rimshot:** a very short 1.7 kHz triangle wave plus a click of noise.
  - Cache one noise buffer per `AudioContext`.

- [ ] **Step 1:** Build the controls row:
  - Play/Stop.
  - BPM number input (`clampBpm`).
  - Time signature (beats input + note select, through `clampTimeSignature`). A change calls `resizePattern(p, stepsPerBar(ts))`.
  - Swing slider, 50–75% with the % shown, through `clampSwing`, plus a swing-note toggle (8ths / 16ths).
  - Preset `<select>`. Choosing one replaces the whole state with a deep copy of that preset.
- [ ] **Step 2:** Build the grid: CSS grid with one row per track (label, ✕ button, step buttons). Shade every beat's first step slightly so beats are visible. A click calls `toggleStep`. Under the grid goes a "+ Add sound" `<select>` filled from `availableSounds`, labelled with `SOUND_LABELS`.
- [ ] **Step 3:** Wire the scheduler:
  - `getStepDuration = () => secondsPerStep(bpm, ts)`
  - `getStepCount = () => stepsPerBar(ts)`
  - `getStepOffset = (s) => swingOffset(s, swing, swingNote, secondsPerStep(bpm, ts), stepsPerBar(ts))`
  - `onStep` plays every track whose step is on, and queues the playhead highlight using the same `requestAnimationFrame` pattern as Task 6.
- [ ] **Step 4:** Run `npm run check`. Expected: all stages pass.
- [ ] **Step 5:** **Manual checklist:**
  - [ ] Every one of the 11 sounds is audible and recognisable when added.
  - [ ] Blues Shuffle sounds like a shuffle (8th swing); setting swing to 50% makes it straight.
  - [ ] Hip-Hop has a laid-back 16th swing.
  - [ ] The 7/8 preset loops cleanly with no hiccup at the bar line.
  - [ ] Building a beat from an empty grid and adding a crash row works with no instructions.
  - [ ] Changing 4/4 → 5/4 → 7/8 while playing keeps the pattern where it fits and never errors.
  - [ ] The drum tab's BPM doesn't change the metronome's BPM, and the reverse.
  - [ ] Switching tabs stops the drums.
- [ ] **Step 6:** Commit: `feat: drum machine tab with swing, presets and sound rows`.

### PR 3 wrap-up
- [ ] Push the branch and open a PR titled "Drum machine tab" with the checklist results. Then CI green → `superpowers:requesting-code-review` → fix → squash merge.

---

# PR 4: Ship (branch `feat/ship`)

**Start:** `git switch main && git pull && git switch -c feat/ship`

### Task 11: Saved state

**Files:**
- Create: `src/core/persistence.ts`
- Test: `tests/core/persistence.test.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `MetronomeState` and `defaultMetronomeState` (Task 6), `DrumState` and `defaultDrumState` (Task 9), and the clamp functions.
- Produces:
  - `METRONOME_KEY = 'groovebox.metronome.v1'`, `DRUMS_KEY = 'groovebox.drums.v1'`
  - `parseMetronomeState(raw: unknown): MetronomeState | null`
  - `parseDrumState(raw: unknown): DrumState | null`
  - `type StorageLike = Pick<Storage, 'getItem' | 'setItem'>`
  - `loadState<T>(storage: StorageLike | undefined, key: string, parse: (raw: unknown) => T | null): T | null`
  - `saveState(storage: StorageLike | undefined, key: string, state: unknown): void`
- Parsers validate shape and run every number through its clamp function. They return `null` for wrong types, unknown sound ids, or a step count that doesn't match `stepsPerBar`. Accents are resized to the beat count.

- [ ] **Step 1: Write the failing tests.**
  - A save/load round-trip with an in-memory storage returns an equal state for both kinds of state.
  - `loadState` returns `null` for:
    - a missing key
    - invalid JSON
    - `{}`
    - a drum state with `sound: 'banjo'`
    - steps of the wrong length
  - `loadState` with a storage whose `getItem` throws returns `null` and doesn't throw. `saveState` with a throwing `setItem` doesn't throw. Both accept `undefined` storage.
  - `parseMetronomeState({ bpm: 999, timeSignature: { beats: 3, noteValue: 4 }, accents: ['strong'] })` returns BPM 300 and accents of length 3.
- [ ] **Step 2:** Run `npx vitest run tests/core/persistence.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. In `main.ts`, load each state, falling back to `defaultMetronomeState()` and `defaultDrumState()`. Pass `onChange` handlers that call `saveState`, debounced to 300 ms. Get storage safely: `try { return window.localStorage } catch { return undefined }`.
- [ ] **Step 4:** Run the test again, then `npm run check`. Expected: PASS.
- [ ] **Step 5:** Manual: set 7/8 with custom accents and edit a drum pattern, then reload. Both are restored. In a private window, the app works.
- [ ] **Step 6:** Commit: `feat: remember settings between visits`.

### Task 12: Deploy to GitHub Pages and finish the README

**Files:**
- Create: `.github/workflows/deploy.yml`, `docs/screenshot.png`
- Modify: `README.md`

- [ ] **Step 1:** Write `deploy.yml`. It runs on `push` to `main` and `workflow_dispatch`, with permissions `pages: write`, `id-token: write` and `contents: read`. Steps: `npm ci`, `npm run build`, `actions/upload-pages-artifact` with `path: dist`, `actions/deploy-pages`. Set a `concurrency` group of `pages`.
- [ ] **Step 2:** **Owner step:** in GitHub, Settings → Pages → Source: GitHub Actions. (Alternatively, run `gh api -X POST repos/PuranNepal/groovebox/pages -f build_type=workflow` after the owner approves it.)
- [ ] **Step 3:** Run `npm run build && npx vite preview --base /groovebox/` and confirm the app loads at `/groovebox/` with all assets.
- [ ] **Step 4:** Take a screenshot of the drum machine tab with the Blues Shuffle preset loaded and save it as `docs/screenshot.png`.
- [ ] **Step 5:** Write the README:
  - title, one-paragraph pitch, **Live demo** link `https://purannepal.github.io/groovebox/`, screenshot
  - features list
  - Run locally (`npm ci`, `npm run dev`, `npm run check`)
  - **How it was built**: spec → builder check → plan → TDD tasks → per-PR review → CI, linking the spec, the plan and the PR list
  - licence
- [ ] **Step 6:** Run `npm run check`, commit `chore: deploy to GitHub Pages and complete README`, then open the PR "Ship: saved settings, Pages deploy, README". After CI green → review → merge, confirm the Pages workflow succeeds and the live URL plays sound.

---

## Done when
- All four PRs are merged with CI green.
- The live URL works.
- Every manual checklist is ticked in its PR body.
- The spec's §8 success criteria hold.
