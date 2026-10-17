# 01 — Development Status (technical)

**Project:** The Strength B.I.B.L.E. (Basic Instructions Before Lifting Everything)
**Owner:** Coach Malcolm (GitHub: `CoachMalcolm`)
**Repo:** https://github.com/CoachMalcolm/strength-bible
**Live site:** https://coachmalcolm.github.io/strength-bible/
**Last updated:** 2026-10-17 (evening)

> Refresh this file at the end of every work session. Never put passwords, API keys or coach keys in it — the repo is public.

---

## 1. Overview

A living, self-paced training and mentorship system that "downloads" Coach Malcolm's 40 years of coaching into a structured, interactive site. Everyone can use it — not only athletes, not only young people, not only lifting. Long-term it becomes a product sold to coaches and programs.

Core ideas:
- Every concept is taught at four levels (8th grade → HS senior → college → PhD), each ending in a Check for Understanding (CFU). Pass → next level unlocks. Miss → re-taught a different way.
- Training is an ongoing science experiment: track, evaluate, iterate.
- Mind and life skills (ownership, agency, consistency, social life, *Invictus*) carry equal weight with sets/reps/rest.

## 2. Stack

- **Astro 4** static site + **Tailwind 3**, TypeScript in `<script>` tags (bundled by Astro).
- Hosted on **GitHub Pages** at base path `/strength-bible`.
- **No backend yet.** All athlete data is per-browser in `localStorage`.
- Content is Markdown + YAML frontmatter in `src/content/<collection>/`, schemas in `src/content/config.ts`.

## 3. How changes ship (do not skip)

1. Work on a branch (never commit straight to `main`).
2. Push → **Build check** workflow (`.github/workflows/check.yml`) runs: Node 22, `npm ci`, timer engine tests, `astro build`, page checks (`scripts/verify-build.mjs`), browser smoke test with Playwright (`scripts/smoke-test.mjs`).
3. Green → merge to `main` → **Deploy** workflow (`deploy.yml`) publishes to GitHub Pages.
4. Results appear as annotations on the check run (max 10 notices per step are shown; the step's pass/fail is authoritative).
5. **Site audit** (`.github/workflows/audit.yml`, runs on `jamie-review` and `audit/**` branches): visits every page at 390px, checks links, script errors, raw formatting and overflow, takes screenshots of key pages, and force-pushes `report.md` + `screens/` to the `audit-reports` branch. Read it with `git fetch origin +audit-reports:refs/remotes/origin/audit-reports` then `git show origin/audit-reports:report.md`.

The Claude cloud workspace cannot reach the npm registry, so builds/tests that need packages run on GitHub, not locally. `node --experimental-strip-types scripts/test-timer.ts` runs locally (no packages needed).

## 4. Code map

| Path | What it is |
|---|---|
| `src/content/` | All book content: `concepts`, `lifts`, `bodyweight`, `mobility`, `programs`, `journal`, `stories`, `front-matter`, `glossary` |
| `src/content/config.ts` | Content schemas (zod) |
| `src/layouts/BaseLayout.astro` | Site shell: nav, glossary card, mini timer |
| `src/layouts/ContentDetail.astro` | Leveled page (concepts/lifts/bodyweight/mobility) |
| `src/components/LevelBlock.astro` | One level: Markdown body → HTML, CFU, stories, lock overlay |
| `src/components/CFU.astro` | Shuffled answers; wrong → re-teach (`retry`) or re-read; mastery saved |
| `src/components/GlossaryCard.astro` | Pop-up definition card, "I know this / Still learning" |
| `src/components/MiniTimer.astro` | Draggable mini timer on every page while a timer runs |
| `src/lib/markdown.ts` | Renders frontmatter Markdown; applies glossary highlighting |
| `src/lib/glossary-core.mjs` | Glossary highlighter (rehype plugin), shared by `markdown.ts` and `astro.config.mjs` |
| `src/lib/glossary.ts` | Builds the matcher from the glossary collection; pop-up card data |
| `src/pages/guide/[slug].astro` | "Start here" pages from `src/content/front-matter` |
| `src/lib/storage.ts` | Older localStorage helpers (mastery, stories, journal, export/import) |
| `src/lib/timer/model.ts` | Timer data model (same format as The Program), presets, durations |
| `src/lib/timer/engine.ts` | Clock-based timer engine (deadlines, catch-up, cues, snapshot/restore) |
| `src/lib/timer/runner.ts` | Running session shared by player/mini/pop-out; cues; persistence |
| `src/lib/timer/feedback.ts` | Beeps (Web Audio), speech, vibration, wake lock, ducking (`audioSession`) |
| `src/lib/timer/pip.ts` | Pop-out: canvas → live video → picture-in-picture; media-session controls |
| `src/lib/timer/store.ts` | Saved timers + share links (`#t=` base64url JSON) |
| `src/pages/timer/` | `index` (library), `edit` (builder), `run` (full-screen player) |
| `src/pages/glossary/` | A–Z list with filters; per-term pages with "where you'll see it" |
| `scripts/` | `test-timer.ts`, `verify-build.mjs`, `smoke-test.mjs`, `site-audit.mjs`, `checkpoint.sh` (old) |
| `docs/handoff/` | These four handoff docs |

### localStorage keys (all prefixed `bible:`)
`mastery` (slug → highest level passed), `stories` (opened, dates), `journal` (entries), `terms` (glossary status: seen/learning/known), `timers` (saved timers), `timer-options` (voice/beeps/vibrate), `timer-session` (the running timer).

## 5. Done

**Learning system**
- CFU answer order shuffled every load (197 of 213 were in slot B before).
- Wrong answer never reveals the answer first: shows authored re-teach (`retry`, `retry_options`, `retry_correct_index`) or sends athlete to re-read; answer revealed only after missing the re-teach.
- Level text renders as real Markdown (tables, bold, lists) with `.md-body` typography.
- Progressive level unlocking by mastery (existing, retained).

**Living glossary**
- 49 draft entries in `src/content/glossary/` (`status: draft` until Malcolm approves).
- Auto-highlight at build time in level and re-teach text; acronyms (2+ capitals) case-sensitive; skips links/headings/code.
- Pop-up card with status buttons; `/glossary` with Known / Still learning / Not marked filters and search; per-term pages with related concepts and every page the term appears on.

**Timer**
- Builder: intervals (work/rest/prep/lift/mobility/cooldown), circuits with rounds, rest between rounds / after circuit, colors, per-interval voice and halfway toggles, reorder, duplicate; presets (Tabata, EMOM 10, 30/30×10, strength rest).
- Player: full-screen, colored by interval, 3-2-1, halfway, next-up, skip/back, tap to jump, hold-to-unlock lock, screen kept awake, voice + beeps + vibration.
- Engine uses wall-clock deadlines: accurate when the phone locks; catches up without replaying stale cues. 24 unit tests.
- **Mini mode:** shrink to a draggable bubble that follows you to every page (position remembered); pause/skip/expand/stop from the bubble; "tap for sound" after page change (browsers block audio until a tap).
- **Pop-out:** picture-in-picture window over other apps; play/pause/skip via the window's media controls where supported.
- **Ducking:** sets `navigator.audioSession.type = 'transient'` where supported (newer Safari) so music is lowered, not paused. Elsewhere the phone decides.
- Share links carry the whole timer; "Save to my timers" on open.

**Review prep (for Jamie Paradis, product/design reviewer)**
- "Start here" guide pages (`/guide/…`) for How to Use, Adaptive System, Living Journal, Safety — the content existed but was never displayed; linked from the top of the home page.
- Program, story, journal and tracker pages render formatted text (`.md-body`); long fill-in lines wrap on phones.
- Glossary highlighting on programs, stories, journal and guide pages.
- Journal: date defaults to today; reflections refresh after saving; saved text escaped.
- Network fits phones; tap once to select, again to open.
- Review guide for Jamie: a Claude Doc ("Strength B.I.B.L.E. — Review Guide for Jamie") with walkthrough, product questions and a known-unfinished list.

**Voices (on the back burner)**
- Voice plan: Coach Malcolm (Standard, Hype, NSFW, Hype NSFW), Lucia (Standard, Hype), O'Shane (Jamerican), Southern male/female (standard + slang), English accent, LGBTQ+ voice, slang voice. Real people in their natural voices only; signed consent; explicit voices kept separate.
- Each voice gets its own lines per "moment" (countdown, halfway, up next, rest, motivation…), several per moment, picked at random. Tracker spreadsheet: `BIBLE-Timer-Voices.xlsx` (Malcolm keeps it; may move to Google Sheets).
- ElevenLabs: cloning needs a paid plan (Starter ~$6/mo, ~30k credits, commercial license). Subscribe only when the generator is built and recordings are collected.

**Housekeeping**
- README rewritten; `docs/build-spec.md` restored with corrections log; site URL fixed to `coachmalcolm.github.io`.
- Security: The Program's coach key was exposed in its public README; Malcolm rotated it in both Apps Scripts, removed it from the README, and archived the old workout-tracker deployment.

## 6. Left to do

**Next up**
- Act on Jamie's review feedback.
- Spanish (first additional language): i18n structure for UI strings + timer phrases; content structured per locale; AI-drafted translations reviewed by Malcolm's Spanish reviewer before publishing.
- Custom voice: ElevenLabs Instant Voice Clone of Malcolm (he is creating the account). Pre-generate fixed cue phrases per language as audio files via a GitHub workflow using an `ELEVENLABS_API_KEY` repo secret. Custom interval names need a backend → fall back to device voice until then.

**Backlog**
- Backend for accounts / coaches / programs (Supabase vs Firebase — decision pending). Must replace the Google-Sheets + PIN + shared-coach-key model; coaches will hold minors' data.
- Highlight glossary terms in programs and stories (they render via Astro's Markdown pipeline, not `renderMarkdown`).
- Enforce program prerequisites (listed in 24 programs, not enforced).
- Write `retry` re-teach content for all CFUs (only Back Squat L2 has one).
- Journal entry saving/reflection wiring (partly built earlier).
- Port from earlier apps: target types (reps, left-in-tank, RPE, failure, burn, feel, time, AMRAP, check), tempo, warm-up sets, "last time" panel, offline set queue, profiles, AI program creator, messaging (The Program); plate math `computeLoadPlan`, weekly allotments + guardrails, auto-rest, rep-range card shading, deload banner, 1–5 check-ins (Daily Dose).
- Content roadmap from Malcolm's email: more sports, other disciplines (yoga, trail running, swimming, cycling, meditation), nutrition, supplements and misinformation, drugs/alcohol, peer pressure, athlete's mindset, video library (`docs/video-gaps.md`), competition stories, network guided paths/search, printable journals.
- Content voice: audience is now "everyone", but content is still written for HS novice athletes.

## 7. Known limits

- All progress is per-browser; clearing the browser or switching devices loses it (export/import exists in `storage.ts`).
- Pop-out and ducking depend on the phone/browser; iOS may suspend the page in the background, which can freeze the pop-out window.
- Sound and vibration can't be tested in CI; they need a real phone.

## 8. Related repositories (reference only — do not modify)

- `gpgamerboy-ai/the-program` — Malcolm's earlier coaching platform (Google Sheets + Apps Script). Source of the timer format and many feature ideas.
- `DailyDoseCoach/DailyDoseApp` — another earlier app (single `index.html`), source of plate math and weekly allotments.
- `gpgamerboy-ai/workout-tracker` — first app; its backend deployment is archived.
