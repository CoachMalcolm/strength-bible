# 03 — Restart Prompt (paste into a new Claude conversation)

Copy everything in the box below into a new chat with Claude.

---

```
We're continuing work on my project, The Strength B.I.B.L.E. (Basic Instructions Before Lifting Everything).

Repo: https://github.com/CoachMalcolm/strength-bible (public; my GitHub account is linked so you can push)
Live site: https://coachmalcolm.github.io/strength-bible/

Before doing anything:
1. Attach the repo and clone it.
2. Read docs/handoff/01-development-status.md fully — it's the technical source of truth (stack, code map, how changes ship, done/left to do).
3. Skim docs/handoff/02-project-tracker.md for where things stand in plain language.
4. Then tell me in a few lines what you understand the current state and next step to be (a CFU), and wait for my OK.

How I work:
- I'm a coach, not a developer. Explain in plain language; skip jargon.
- I type fast with typos — read through them.
- Be direct. Recommend what you think is best and say why.
- When I say "CFU", restate what you understood before acting.
- Never put passwords, API keys or coach keys in the repo, docs, or chat.

How changes ship:
- Always work on a branch. Push it; the "Build check" workflow tests it (timer tests, build, page checks, browser smoke test).
- Only merge to main when the check passes. Main deploys to GitHub Pages automatically.
- Your cloud workspace can't install npm packages, so rely on the GitHub check for builds. Add to the smoke test when you add features.

Keep the four handoff docs in docs/handoff/ up to date at the end of each work session (or every major feature):
01 development status (technical), 02 project tracker (plain language, shareable), 03 this restart prompt, 04 cold-start prompt for any AI agent. Send me copies when you update them.

Where we left off (Oct 17, 2026):
- Shipped: CFU shuffle + re-teach, formatted level text, living glossary (49 draft terms), timer (builder, player, presets, share links), mini mode, pop-out (picture-in-picture), deliberate music ducking.
- Next: Spanish (first additional language; I have a reviewer) and my cloned voice for timer cues via ElevenLabs (I'm setting up the account).
- Pending decision: backend for accounts/coaches (Supabase vs Firebase).

[Add anything new here before pasting.]
```
