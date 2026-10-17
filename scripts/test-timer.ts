// Tests for the timer model + engine. Run: node --experimental-strip-types scripts/test-timer.ts
import { expand, totalSeconds, formatClock, parseDuration, presets } from '../src/lib/timer/model.ts';
import { TimerEngine, type EngineEvent } from '../src/lib/timer/engine.ts';

let failed = 0;
function eq(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  if (!ok) failed++;
}

// ---- model ----
const tabata = presets().find((p) => p.timerId === 'PRESET-TABATA')!;
eq('Tabata expands to 17 steps', expand(tabata.structure).length, 17);
eq('Tabata total is 4:10', formatClock(totalSeconds(tabata.structure)), '4:10');
const sets = presets().find((p) => p.timerId === 'PRESET-STRENGTH-REST')!;
eq('Rest between rounds only (5 lifts + 4 rests)', expand(sets.structure).map((s) => s.type).join(','),
  'lift,rest,lift,rest,lift,rest,lift,rest,lift');
eq('Program-style JSON string structure accepted', expand('[{"type":"work","name":"A","duration":"30"}]').length, 1);
eq('Zero-length intervals dropped', expand([{ type: 'work', name: 'x', duration: 0 }]).length, 0);
eq('parse 1:30', parseDuration('1:30'), 90);
eq('parse 90', parseDuration('90'), 90);
eq('parse 2m', parseDuration('2m'), 120);
eq('parse 1m15s', parseDuration('1m15s'), 75);
eq('clock over an hour', formatClock(3725), '1:02:05');

// ---- engine with a fake clock ----
let now = 0;
const clock = () => now;
function run(structure: any, cues = {}) {
  const eng = new TimerEngine(expand(structure), cues, clock);
  const log: string[] = [];
  eng.on((e: EngineEvent) => {
    if (e.type === 'step') log.push(`step:${e.step.name}${e.caughtUp ? '(caught-up)' : ''}`);
    else if (e.type === 'cue') log.push(`cue:${e.cue}${e.value ? ':' + e.value : ''}${e.next ? ':' + e.next.name : ''}`);
    else log.push(e.type);
  });
  return { eng, log };
}
function advance(eng: TimerEngine, ms: number, stepMs = 250) {
  const end = now + ms;
  while (now < end) { now = Math.min(end, now + stepMs); eng.update(now); }
}

now = 0;
{
  const { eng, log } = run([{ type: 'work', name: 'Work', duration: 20 }, { type: 'rest', name: 'Rest', duration: 10 }]);
  eng.start();
  advance(eng, 30000);
  eq('Cues fire in order across two intervals', log, [
    'step:Work', 'cue:halfway', 'cue:nextUp:Rest', 'cue:countdown:3', 'cue:countdown:2', 'cue:countdown:1',
    'step:Rest', 'cue:countdown:3', 'cue:countdown:2', 'cue:countdown:1', 'done',
  ]);
}

now = 0;
{
  const { eng } = run([{ type: 'work', name: 'Work', duration: 60 }]);
  eng.start();
  advance(eng, 10000);
  eng.pause();
  now += 50000; // paused for 50s
  eng.update(now);
  eng.resume();
  advance(eng, 1000);
  eq('Pause holds time (49s left after 10s + pause + 1s)', Math.round(eng.msLeft() / 1000), 49);
}

now = 0;
{
  // Phone locked: the page gets no updates for 95 seconds.
  const { eng, log } = run([
    { type: 'work', name: 'A', duration: 30 },
    { type: 'rest', name: 'B', duration: 30 },
    { type: 'work', name: 'C', duration: 60 },
  ]);
  eng.start();
  advance(eng, 5000);
  now += 90000; // asleep
  eng.update(now);
  eq('After sleeping it lands on the right interval', eng.current?.name, 'C');
  eq('…with the right time left (25s)', Math.round(eng.msLeft() / 1000), 25);
  eq('…elapsed is exact (95s)', Math.round(eng.elapsed()), 95);
  eq('…and stale cues are not replayed', log.filter((l) => l.startsWith('cue')).length, 0);
  eq('…only the landing interval is announced', log.slice(-1)[0], 'step:C(caught-up)');
}

now = 0;
{
  const { eng, log } = run([{ type: 'work', name: 'Short', duration: 10 }]);
  eng.start();
  advance(eng, 10000);
  eq('No halfway on short intervals with countdown on', log.includes('cue:halfway'), false);
}

now = 0;
{
  const { eng } = run([{ type: 'work', name: 'A', duration: 30 }, { type: 'work', name: 'B', duration: 30 }]);
  eng.start();
  advance(eng, 10000);
  eng.skip();
  eq('Skip moves to next interval', eng.current?.name, 'B');
  eng.back();
  eq('Back near the start goes to previous', eng.current?.name, 'A');
  advance(eng, 10000);
  eng.back();
  eq('Back mid-interval restarts it', [eng.current?.name, Math.round(eng.msLeft() / 1000)], ['A', 30]);
}

console.log(failed ? `\n${failed} failed` : '\nAll timer tests passed');
process.exit(failed ? 1 : 0);
