# The Strength B.I.B.L.E.

**Basic Instructions Before Lifting Everything**

A progressive, interactive digital book and living journal that teaches people how to train safely and intelligently, at their own pace and to whatever depth they want to go.

Live site: https://coachmalcolm.github.io/strength-bible/

## Core Philosophy

- Teach the fundamentals clearly.
- Equip each person to develop their own best practices by evaluating their numbers, notes, RPE/RIR, recovery, and real-world results.
- Training is an ever-evolving science experiment: track, evaluate, iterate.

## Adaptive Learning System

Every concept and movement is taught at four levels: 8th Grade (default), High School Senior, College, and PhD / Scientific Depth.

Each level ends with a **Check for Understanding (CFU)**:

- Answer order is shuffled on every visit.
- **Correct** → the next level unlocks.
- **Incorrect** → the answer is not revealed. The concept is re-taught a different way (using the level's `retry` content when it's written), followed by a second question. If there's no re-teach written yet, the athlete is sent back to re-read and try again.

## Adding Content

All content lives in `src/content/`, one Markdown file per item. The code reads these files; you never have to touch code to add or edit content.

| Folder | What goes there |
|---|---|
| `front-matter` | How to Use, Safety, Adaptive System, Journal System |
| `concepts` | Concepts (foundational, goals, conditioning, sports) |
| `lifts` | Barbell, Olympic and strongman lifts |
| `bodyweight` | Bodyweight exercises |
| `mobility` | Mobility flows |
| `programs` | Training programs |
| `journal` | Journal templates |
| `stories` | Quiet stories |

Level bodies support normal Markdown formatting: **bold**, lists, and tables.

### Writing a CFU with a re-teach

```yaml
cfu:
  question: "What causes knees to cave inward during a squat?"
  options:
    - "Weak adductors"
    - "Overactive adductors and poor motor control"
    - "Tight hamstrings"
  correct_index: 1          # position in the list above, starting at 0
  retry: |                  # optional: a different explanation shown after a miss
    The adductors pull the knee inward...
  retry_options:            # optional: the follow-up question's answers
    - "..."
  retry_correct_index: 1
```

Order doesn't matter: answers are shuffled on screen.

## Running It Locally

```bash
npm install
npm run dev      # local preview at http://localhost:4321/strength-bible
npm run build    # builds the site into dist/
```

Pushing to `main` deploys automatically to GitHub Pages (`.github/workflows/deploy.yml`).

## Project Docs

- `docs/build-spec.md` — build phases and the content corrections log
- `docs/CHECKPOINT.md` — current state and what's next
- `docs/video-gaps.md` — videos still to source

## Repository Structure

```
src/
  content/      all book content (Markdown + YAML)
  components/   CFU, levels, journal forms, trackers
  layouts/      page shells
  lib/          shared helpers (saved progress, Markdown rendering)
  pages/        site routes
docs/           planning and status notes
```
