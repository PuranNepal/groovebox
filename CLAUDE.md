# Groovebox

## What this is

A static, browser-based metronome and drum machine (Vite + TypeScript, no UI framework, no runtime
dependencies), deployed to GitHub Pages under `/groovebox/`.

- Spec: [docs/superpowers/specs/2026-10-27-groovebox-design.md](docs/superpowers/specs/2026-10-27-groovebox-design.md)
- Plan: [docs/superpowers/plans/2026-10-27-groovebox.md](docs/superpowers/plans/2026-10-27-groovebox.md)

## Commands

- `npm run dev`: start the Vite dev server.
- `npm run build`: type-check, then build to `dist/`.
- `npm test`: run the Vitest suite once (`tests/**/*.test.ts`).
- `npm run lint`: ESLint over the whole repo.
- `npm run format`: rewrite files with Prettier.
- `npm run format:check`: verify Prettier formatting without writing.
- `npm run typecheck`: `tsc --noEmit`.
- `npm run check`: format:check, lint, typecheck, test, build in order, stopping on first failure.

## Rules

- `src/core` is pure and test-first; it must not import from `audio/` or `ui/`.
- Never schedule audio from a timer callback; use the scheduler.
- Feature branch plus PR; never commit to `main`.
- Run `npm run check` and read its output before saying "done".
- Use conventional commit messages.
- If a saved-state shape changes, bump the `.v1` localStorage keys or add a migration.
- Switching tabs must stop all playback, and nothing may play from a hidden tab.

## Manual checks

Per-PR manual checklists live in the plan (`docs/superpowers/plans/2026-10-27-groovebox.md`).
