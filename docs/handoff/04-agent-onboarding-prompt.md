# 04 — Cold-Start Prompt for Any AI Agent

Give this whole file to an AI coding agent that has never seen the project. It is self-contained.

---

## Your role

You are joining an in-progress project as a software engineer. Your job is to continue the work **without breaking or rewriting what already exists**. Read this entire document before touching anything.

## The project in one paragraph

**The Strength B.I.B.L.E.** (Basic Instructions Before Lifting Everything) is a self-paced, interactive training and mentorship site built from Coach Malcolm's 40 years of strength and conditioning coaching. It teaches every concept at four depth levels (8th grade → high-school senior → college → PhD), each followed by a Check for Understanding (CFU) that unlocks the next level or re-teaches the idea a different way. It includes a living glossary, a workout journal, stories, programs, a concept network graph, and a full interval timer. The audience is **everyone** — athletes and non-athletes, any age. Long-term it becomes a product coaches and programs use with their own athletes, so it will need real accounts, roles and privacy (coaches will hold minors' data).

## The owner

Coach Malcolm is a coach, not a developer. Communicate in plain language, recommend a clear option with a reason, and confirm your understanding before large or irreversible changes. He may say "CFU" — that means restate what you understood before acting.

## Where things are

- **Repo:** https://github.com/CoachMalcolm/strength-bible (public)
- **Live site:** https://coachmalcolm.github.io/strength-bible/ (GitHub Pages, base path `/strength-bible`)
- **Technical source of truth:** `docs/handoff/01-development-status.md` — read it next. It has the code map, data keys, what's done and what's left.

## Stack

Astro 4 (static), Tailwind 3, TypeScript in Astro `<script>` blocks. No backend yet: user progress lives in the browser's `localStorage` under keys prefixed `bible:`. Content is Markdown + YAML frontmatter in `src/content/<collection>/`, validated by schemas in `src/content/config.ts`.

## Rules you must follow

1. **Never commit directly to `main`.** `main` auto-deploys to the live site. Work on a branch.
2. **Push your branch and wait for the "Build check" workflow** (`.github/workflows/check.yml`): timer unit tests → `npm run build` → `scripts/verify-build.mjs` → Playwright smoke test `scripts/smoke-test.mjs`. Merge only when it's green.
3. **Extend the tests when you add features.** Add page checks to `verify-build.mjs` and user flows to `smoke-test.mjs`. Timer logic tests go in `scripts/test-timer.ts` (runs with `node --experimental-strip-types`).
4. **Content stays separate from code.** Add or edit content as Markdown files in `src/content/`, never hard-coded into components. Keep the existing frontmatter formats (see `config.ts` and existing files). Unknown fields are allowed by the schemas but must be wired up to show.
5. **Don't change existing data formats** without a migration: the `localStorage` keys, the timer JSON format (shared with Malcolm's earlier app "The Program"), the CFU fields (`question`, `options`, `correct_index`, optional `retry`, `retry_options`, `retry_correct_index`), glossary fields (`term`, `aliases`, `short`, `category`, `related_concepts`, `status`, `highlight`).
6. **Never put secrets or personal information in the repo** — no API keys, passwords, coach keys, email addresses, or people's names (refer to helpers by role: "product/design reviewer", "voice talent"). Use GitHub Actions secrets for keys. Commit with the GitHub no-reply address, never a personal email.
7. **Escape user-provided text.** Timer names and notes can arrive via share links; render with `textContent`, never `innerHTML`.
8. **Phones first.** Test layouts at ~390px wide. Sound, vibration and wake lock need a real device — say so rather than claiming they work.
9. **Glossary definitions and translations are drafts until a human approves them.** Mark AI-written content `status: "draft"` (or the equivalent) and tell the owner.
10. **Save progress under `bible:` keys only, and tool settings under `bibledev:` only.** The tester tools swap every `bible:` key when switching test athletes; that is what makes new features testable without extra work.
11. **Update the four handoff docs in `docs/handoff/`** when you finish a piece of work: 01 (technical status), 02 (plain-language tracker, shareable), 03 (restart prompt for Claude), 04 (this file).

## Key mechanics to understand before editing

- **Leveled pages:** `ContentDetail.astro` → `LevelBlock.astro` → `CFU.astro`. Level bodies are Markdown rendered by `src/lib/markdown.ts`, which also runs the glossary highlighter (`src/lib/glossary.ts`, a rehype plugin). Mastery is `bible:mastery[slug] = highest level passed`; levels above `mastery + 1` are hidden.
- **Glossary:** highlights the first occurrence of each term per rendered block at build time; the pop-up card (`GlossaryCard.astro`) is in `BaseLayout`. Status lives in `bible:terms`.
- **Tester tools:** `components/DevTools.astro` + `lib/devtools.ts`. Turned on per browser with `?tools=on`. Test athletes are snapshots of all `bible:` localStorage keys.
- **Timer:** `model.ts` (format, presets) → `engine.ts` (wall-clock deadlines; `update()` catches up after sleep and skips stale cues; `snapshot()`/`restore()`) → `runner.ts` (one running session; plays cues; persists to `bible:timer-session` so the timer continues across pages) → UIs: `pages/timer/run.astro` (full player), `components/MiniTimer.astro` (draggable bubble on every page), `lib/timer/pip.ts` (picture-in-picture pop-out). `feedback.ts` holds beeps/speech/vibration/wake lock/ducking.

## Hosting

The site is moving from GitHub Pages (`/strength-bible` path) to Cloudflare Pages (served from the root). Never hard-code `/strength-bible` or `/` in links: use `const base = import.meta.env.BASE_URL.replace(/\/$/, "")` and `${base}/path`. `astro.config.mjs` picks the base from `CF_PAGES`. The Build check also builds for the root address and fails on broken or old-path links (`scripts/check-root-build.mjs`).

## Environment notes

- If your sandbox can't reach the npm registry, you can't build locally; rely on the GitHub check. You can still run `node --experimental-strip-types scripts/test-timer.ts`.
- GitHub annotations show at most 10 notices per step; the step's pass/fail is what counts.

## What to work on

See section 6 ("Left to do") of `docs/handoff/01-development-status.md`. At the time of writing the priorities are:
1. Spanish localization (UI strings, timer phrases, then content per locale with human review).
2. Custom cue voice via ElevenLabs (pre-generated phrase packs per language, built in a GitHub workflow with a repo secret; device voice as fallback).
3. A backend for accounts/coaches/programs (owner must choose; present Supabase vs Firebase plainly first).

Before starting, write the owner a short summary of what you understood and your plan, and wait for approval.
