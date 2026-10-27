# Groovebox: Design

**Date:** 2026-10-27
**Status:** Approved by owner 2026-10-27

## 1. Intent and the why

Groovebox is a free, browser-based practice companion for a musician who plays
guitar and piano in rock, metal, blues and hip-hop styles. It has two
independent tools:

- a **metronome** for strict time, with editable odd time signatures and per-beat accents
- an **editable drum machine** (step sequencer) with swing, so practice feels like
  playing with a drummer

**Why it exists:**

1. The owner wants a tool they will actually use when practising. Free metronomes
   tend to handle only plain 4/4, and good drum apps cost money or carry ads.
2. It is a **learning project**. The owner is starting a job where they will do
   agentic AI coding, and this repo is where they practise the professional
   workflow end to end: spec â†’ plan â†’ test-driven implementation â†’ review â†’
   verification â†’ PR â†’ CI â†’ deploy. The process artifacts (this spec, the plan,
   tests, CI, `CLAUDE.md`, PR history) matter as much as the app.

## 2. Goals, non-goals, anti-goals

### Goals (v1)
- Metronome and drum machine as **two separate tabs with independent settings**.
- Odd time signatures in both tools.
- Swing in the drum machine, covering a straight feel, a blues shuffle and a laid-back hip-hop groove.
- A drum grid the user can edit, with presets as starting points and sound rows that can be added or removed.
- Free and public: deployed to GitHub Pages, with the demo link in the README.
- A repo that shows good engineering practice (see Â§6).

### Non-goals (v1, maybe later)
- Uploading your own drum samples.
- Saving multiple named patterns, or sharing patterns by link.
- Accounts, a backend, sync across devices.
- MIDI in/out, audio recording, a mobile app.
- Mixing in the game ideas (math game, Battle City). Those are separate future projects.

### Anti-goals (failure even if it "works")
- **Timing that drifts or stutters.** A metronome that drifts against the audio clock is useless. Timing must be sample-accurate (see Â§5.1).
- Noticeable lag between a tap or click and the response.
- Ads, tracking, analytics or cookies.
- The two tabs interfering: changing the drum machine tempo must not change the metronome, and the reverse.

## 3. Constraints
- Runs in a current desktop Chrome, Edge or Firefox with no install. It should not break on mobile, but mobile layout is not optimised in v1.
- Static site only (GitHub Pages): no server.
- Built-in sounds must be free of licensing problems.
- Practice-sized scope. The time figure is an estimate, not a hard limit: the owner accepted that the process steps make this longer than the original "1 hour". The work is delivered in small PRs (Â§6.1) so each one is usable on its own.

## 4. Behaviour (decided with the owner)

### 4.1 Metronome tab
| Feature | Behaviour |
|---|---|
| Tempo | A large number that can be typed into directly, plus âˆ’ / + buttons. |
| Tap tempo | A **Tap tempo** button, also triggered by the **Space bar**. |
| Time signature | Both parts editable: beats per bar and the note value (e.g. 7/8). |
| Accents | Each beat is shown as a bar. Clicking it cycles **Strong â†’ Medium â†’ Soft â†’ Off**. Stronger beats are louder and higher pitched. This covers groupings like 7/8 as 2+2+3. |
| Start/Stop | A single button. The beat currently playing is highlighted. |

### 4.2 Drum Machine tab
| Feature | Behaviour |
|---|---|
| Transport | Play/Stop. |
| Tempo, time signature, swing | All editable, independent of the metronome. |
| Presets | A dropdown. Choosing one **loads its pattern into the grid**, which can then be edited freely. |
| Grid | One row per sound, one square per step. Clicking a square toggles it. The step being played is highlighted. |
| Sound rows | Kick, snare and hi-hat by default. **+ Add sound** picks from the built-in library; âœ• removes a row. |
| Built-in sounds | Kick, snare, closed hi-hat, open hi-hat, crash, ride, clap, high tom, floor tom, cowbell, rimshot. |

## 5. Decisions made by Claude (open to override)

These were not discussed with the owner. They are the builder's starting point.

### 5.1 Technical
- **Stack:** Vite + TypeScript, no UI framework (plain DOM). It stays small, is fast to build, and has no framework to learn on top of the process.
- **Audio:** Web Audio API, using the standard *lookahead scheduler* pattern: a JS timer wakes every ~25 ms and schedules notes ~100 ms ahead on `AudioContext.currentTime`. Notes are never triggered directly from `setTimeout`. This is what prevents drift.
- **Sounds:** synthesised in code (oscillators plus filtered noise), so there are no sample files and no licensing questions. Swapping in CC0 samples later should only touch the sound module.
- **Architecture:** pure, unit-testable logic (timing math, swing, tap tempo, grid resizing, accent cycling, state serialisation) is kept separate from the audio and DOM code, which stays thin.
- **Testing:** Vitest for the pure logic, written test-first. Audio output and UI feel are verified by hand in the browser and listed in a manual checklist in the plan.
- **Quality gates:** ESLint, Prettier and `tsc --noEmit`. CI (GitHub Actions) runs lint, typecheck, tests and build on every PR. Deploying to GitHub Pages happens on merge to `main`.

### 5.2 Musical rules
- **Grid resolution:** 16th notes. Steps per bar = beats Ã— (16 Ã· note value). For example, 4/4 â†’ 16, 5/4 â†’ 20, 7/8 â†’ 14, 6/8 â†’ 12.
- **Allowed values:** beats per bar 1â€“16; note value 2, 4, 8 or 16; tempo 20â€“300 BPM. Out-of-range input is clamped.
- **Tempo unit:** BPM counts the time signature's own note value (quarter notes in x/4, eighth notes in x/8). This is how standard metronomes behave.
- **Swing:** an amount from 50% to 75%, plus a **swing note** setting of **8ths or 16ths**. The amount sets where the off-beat note of each pair lands: 50% is straight, ~67% is a triplet shuffle and 75% is a hard dotted feel.
  - *8th swing* delays the off-beat 8th (grid steps 3, 7, 11â€¦, counting from 1). This is the blues shuffle.
  - *16th swing* delays every second 16th (steps 2, 4, 6â€¦). This is the hip-hop / half-time feel.
  - The defaults are 50% and 16ths.
  - *Builder check finding:* 16th-only swing can't produce a blues shuffle at normal tempos, so the swing-note setting was added.
- **Tap tempo:** averages the intervals between the last 4 taps. A gap of more than 2 s starts a new measurement. The result is clamped to the tempo range.
- **Changing the time signature in the drum machine** resizes the grid. Existing steps are kept where they still fit; steps past the new length are dropped.
- **Default metronome accents:** beat 1 Strong, the rest Soft.
- **Presets (v1):** Rock, Metal (double kick), Blues Shuffle (8th swing ~67%), Hip-Hop (16th swing ~58%) and a 7/8 odd-time groove. Each preset sets its own tempo, time signature, swing amount and swing note.

### 5.3 Persistence
- Each tab's current settings and the drum grid **auto-save to `localStorage`** and are restored on load. There is no "save" button. Storage errors are caught and ignored, and the app still works without saved state.

### 5.4 Look
- A dark theme, matching the approved mockup (`.superpowers/brainstorm/â€¦/layout-v2.html`, local only).

## 6. Engineering practice (this repo is a portfolio piece)
- `CLAUDE.md` states the project rules for AI agents: TDD for logic, no direct commits to `main`, run the checks before claiming done, keep audio/DOM separate from logic.
- `README.md`: what it is, the live demo link, a screenshot, how to run, how it was built (spec â†’ plan â†’ TDD), and links to this spec and the plan.
- MIT licence.
- Work on feature branches and merge through PRs with CI green.
- `.superpowers/` and build output are git-ignored.

### 6.1 Delivery order (Claude's call)
Each PR goes in only with CI green, and each leaves the app usable:
1. **Foundation:** project scaffold, lint/format/typecheck/test tooling, CI workflow, `CLAUDE.md`, licence, README stub.
2. **Metronome tab:** the scheduler, tap tempo, time signature, accents and synthesised click.
3. **Drum machine tab:** the grid, the swing engine, the sound library (kick, snare and hi-hat first, then the rest), presets, add/remove rows.
4. **Ship:** saving to `localStorage`, GitHub Pages deploy, README screenshot and demo link.

### 6.2 GitHub setup
- Public repo **https://github.com/PuranNepal/groovebox**, so Vite's `base` is `/groovebox/`. *(Owner approved; created 2026-10-27.)*
- The GitHub CLI (`gh`) is installed and signed in as `PuranNepal`.
- `main` starts with an empty root commit. Everything, including this spec, arrives through PRs.
- Pages source: GitHub Actions.
- Branch protection requiring CI on `main`: owner enables it in repo settings (a step-by-step note in the plan).

## 7. Left to the builder
- Exact file/module layout, CSS details and component structure.
- Exact synthesis recipes for each drum sound.
- The precise step patterns for each preset (they should sound recognisably like the genre).
- Keyboard shortcuts beyond Space for tap tempo (e.g. Enter for start/stop) are optional.

## 8. Success criteria
- The owner can open the GitHub Pages link and practise to a 7/8 metronome with custom accents, and to a swung blues shuffle on the drum machine, without timing drift over several minutes.
- Building their own pattern from an empty grid, adding a crash row, works without instructions.
- CI is green on `main`; the README, spec and plan tell the story of how it was built.
