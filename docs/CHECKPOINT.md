# CHECKPOINT — The Strength B.I.B.L.E.

**Last Updated:** 2026-10-17

## Live Site

https://coachmalcolm.github.io/strength-bible/

## Done

- CFU: answers shuffled; wrong answers re-teach instead of revealing (retry content when written)
- Level text renders as formatted Markdown (tables, bold, lists)
- Living glossary: 49 draft terms (`src/content/glossary`), auto-highlighted in level text,
  pop-up card with "I know this" / "Still learning", `/glossary` list with filters, term pages
- Timer (`/timer`): builder, player, presets, share links; same timer format as The Program;
  clock-based engine (accurate when the phone locks), voice + beeps + vibration, screen kept awake
- Build check on every non-main branch: timer tests, build, page checks, browser smoke test

## How changes ship

Work on a branch → the "Build check" workflow tests it → merge to `main` → GitHub Pages deploys.

## Open items

- Malcolm to review glossary drafts (set `status: "final"` when approved)
- Re-teach (`retry`) explanations written for only one CFU (Back Squat L2)
- Highlighting not yet applied to programs and stories
- Program prerequisites listed but not enforced
- All progress is per-browser (localStorage); no accounts or coach view yet

## Big decision pending

Backend for accounts, coaches and programs (Supabase vs Firebase). Replaces the Google Sheets +
PIN/coach-key model from The Program / Daily Dose, which isn't suitable for selling to programs
that hold minors' data.

## Worth carrying over from earlier apps

- The Program: target types (reps, left-in-tank, RPE, failure, burn, feel, time, AMRAP, check),
  tempo, warm-up sets, "last time" panel, offline set queue, profiles, AI program creator, messaging
- Daily Dose: plate math (`computeLoadPlan`), weekly allotments + guardrails, auto-rest after a set,
  card shading by rep-range result, deload banner, 1–5 check-ins
