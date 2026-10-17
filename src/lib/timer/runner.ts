/**
 * Runner: one running timer, shared by the full-screen player, the mini
 * bubble on other pages, and the pop-out window.
 *
 * It owns the engine, plays the cues (voice / beeps / vibration), and saves
 * the running session so the timer keeps going when you move between pages.
 * Session key: `bible:timer-session`.
 */
import { expand, cuesFor, type Timer, type Step } from './model';
import { TimerEngine, type EngineEvent, type EngineSnapshot } from './engine';
import { sounds, speak, stopSpeaking, vibrate, keepAwake, preferDucking } from './feedback';

const SESSION_KEY = 'bible:timer-session';
const OPTS_KEY = 'bible:timer-options';

export interface AlertOptions { voice: boolean; beeps: boolean; vibrate: boolean }

export interface Session {
  v: 1;
  timer: Timer;
  snap: EngineSnapshot;
  mode: 'full' | 'mini';
  pos?: { x: number; y: number };
  returnTo?: string;
  savedAt: number;
}

export function readOptions(timer?: Timer): AlertOptions {
  const cues = timer ? cuesFor(timer) : { voice: true, beeps: true, vibrate: true };
  let saved: Partial<AlertOptions> = {};
  try { saved = JSON.parse(localStorage.getItem(OPTS_KEY) || '{}'); } catch {}
  return {
    voice: saved.voice ?? cues.voice,
    beeps: saved.beeps ?? cues.beeps,
    vibrate: saved.vibrate ?? cues.vibrate,
  };
}

export function writeOptions(o: AlertOptions) {
  try { localStorage.setItem(OPTS_KEY, JSON.stringify(o)); } catch {}
}

export function readSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!s || s.v !== 1 || !s.timer || !s.snap) return null;
    // Ignore sessions that would have finished long ago (e.g. left over from yesterday).
    if (Date.now() - s.savedAt > 6 * 3600 * 1000) { clearSession(); return null; }
    return s;
  } catch { return null; }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
  window.dispatchEvent(new CustomEvent('bible:timer-session'));
}

type Listener = (r: Runner, e?: EngineEvent) => void;

export class Runner {
  readonly timer: Timer;
  readonly steps: Step[];
  readonly engine: TimerEngine;
  mode: Session['mode'] = 'full';
  pos?: Session['pos'];
  returnTo?: string;
  private listeners: Listener[] = [];
  private handle: number | undefined;
  private lastSaved = 0;
  private stopped = false;

  constructor(timer: Timer) {
    this.timer = timer;
    this.steps = expand(timer.structure);
    this.engine = new TimerEngine(this.steps, cuesFor(timer));
    this.engine.on((e) => this.onEvent(e));
  }

  /** Pick up the saved session, if there is one. */
  static resume(): Runner | null {
    const s = readSession();
    if (!s) return null;
    const r = new Runner(s.timer);
    if (!r.steps.length) return null;
    r.mode = s.mode;
    r.pos = s.pos;
    r.returnTo = s.returnTo;
    r.engine.restore(s.snap);
    r.loop();
    return r;
  }

  get options() { return readOptions(this.timer); }

  on(fn: Listener) { this.listeners.push(fn); }
  private notify(e?: EngineEvent) { for (const fn of this.listeners) fn(this, e); }

  start() {
    preferDucking();
    if (this.options.voice && this.timer.ttsTitle) speak(this.timer.ttsTitle);
    this.engine.start();
    this.loop();
    this.save(true);
  }

  private loop() {
    clearInterval(this.handle);
    if (this.engine.status === 'running' || this.engine.status === 'paused') keepAwake(true);
    this.handle = window.setInterval(() => this.tick(), 200);
    this.tick();
  }

  /** Advance the clock and repaint. Safe to call any time (e.g. when the page wakes). */
  tick() {
    this.engine.update();
    this.notify();
    if (Date.now() - this.lastSaved > 1000) this.save();
  }

  toggle() { this.engine.toggle(); this.save(true); this.notify(); }
  skip() { this.engine.skip(); this.save(true); this.notify(); }
  back() { this.engine.back(); this.save(true); this.notify(); }
  jumpTo(i: number) { this.engine.jumpTo(i); this.save(true); this.notify(); }

  setMode(mode: Session['mode'], extra: Partial<Pick<Session, 'pos' | 'returnTo'>> = {}) {
    this.mode = mode;
    if (extra.pos) this.pos = extra.pos;
    if (extra.returnTo !== undefined) this.returnTo = extra.returnTo;
    this.save(true);
  }

  /** Stop for good (exit or finished). */
  stop() {
    this.stopped = true;
    clearInterval(this.handle);
    keepAwake(false);
    stopSpeaking();
    clearSession();
  }

  /** Stop ticking on this page without ending the session (the next page picks it up). */
  detach() {
    this.save(true);
    clearInterval(this.handle);
  }

  save(force = false) {
    if (this.stopped || this.engine.status === 'done' || this.engine.status === 'idle') return;
    if (!force && Date.now() - this.lastSaved < 1000) return;
    this.lastSaved = Date.now();
    const s: Session = {
      v: 1, timer: this.timer, snap: this.engine.snapshot(), mode: this.mode,
      pos: this.pos, returnTo: this.returnTo, savedAt: Date.now(),
    };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
  }

  private say(step: Step | undefined, text: string) {
    if (this.options.voice && step?.ttsEnabled !== false) speak(text);
  }

  private onEvent(e: EngineEvent) {
    const o = this.options;
    switch (e.type) {
      case 'step': {
        if (e.caughtUp) { if (o.beeps) sounds.tick(); break; }
        if (o.beeps) sounds.go();
        if (o.vibrate) vibrate(250);
        const s = e.step;
        const round = s.totalRoundCount && s.totalRoundCount > 1 ? `, round ${s.roundNumber} of ${s.totalRoundCount}` : '';
        this.say(s, `${s.name}${round}`);
        break;
      }
      case 'cue':
        if (e.cue === 'countdown') {
          if (o.beeps) sounds.tick();
          if (o.vibrate) vibrate(60);
          if (!o.beeps) this.say(e.step, String(e.value));
        } else if (e.cue === 'halfway') {
          if (o.beeps) sounds.halfway();
          this.say(e.step, 'Halfway');
        } else if (e.cue === 'nextUp' && e.next) {
          this.say(e.next, `Next up: ${e.next.name}`);
        }
        break;
      case 'pause':
        if (o.voice) speak('Paused');
        break;
      case 'resume':
        if (o.voice) speak('Go');
        break;
      case 'done':
        clearInterval(this.handle);
        keepAwake(false);
        clearSession();
        if (o.beeps) sounds.done();
        if (o.vibrate) vibrate([300, 120, 300, 120, 500]);
        if (o.voice) speak('Timer complete. Nice work.');
        break;
    }
    this.notify(e);
  }
}
