/**
 * Timer engine — pure logic, no DOM.
 *
 * Time is measured against a real clock (deadlines), never by counting ticks,
 * so the timer stays accurate when the phone locks or the tab is in the
 * background. When the page wakes up, the engine catches up: it skips over
 * any intervals that finished while asleep and lands in the right place,
 * without replaying stale cues.
 */
import type { Step, TimerCues } from './model';

export type CueName = 'halfway' | 'countdown' | 'nextUp';

export type EngineEvent =
  | { type: 'step'; step: Step; index: number; caughtUp: boolean }
  | { type: 'cue'; cue: CueName; step: Step; value?: number; next?: Step }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'done' };

export type Status = 'idle' | 'running' | 'paused' | 'done';

export interface EngineSnapshot { index: number; status: Status; endAt: number; pausedLeft: number }

const SHORT_INTERVAL = 12; // seconds; halfway is skipped on short intervals when counting down

export class TimerEngine {
  readonly steps: Step[];
  readonly total: number;
  status: Status = 'idle';
  index = 0;
  private endAt = 0; // clock ms when the current step ends
  private pausedLeft = 0; // ms left when paused
  private lastSecs = Infinity; // whole seconds left at the previous update
  private fired = new Set<string>();
  private listeners: ((e: EngineEvent) => void)[] = [];
  private cues: Required<Pick<TimerCues, 'countdown3s' | 'nextUp'>>;

  private clock: () => number;

  constructor(steps: Step[], cues: TimerCues = {}, clock: () => number = () => Date.now()) {
    this.clock = clock;
    this.steps = steps;
    this.total = steps.reduce((s, x) => s + x.duration, 0);
    this.cues = { countdown3s: cues.countdown3s !== false, nextUp: cues.nextUp !== false };
  }

  /** Everything needed to pick the timer up again on another page. Times are wall-clock ms. */
  snapshot(): EngineSnapshot {
    return { index: this.index, status: this.status, endAt: this.endAt, pausedLeft: this.pausedLeft };
  }

  /**
   * Continue a timer from a snapshot (e.g. after moving to another page).
   * If intervals finished in the meantime, the next update() catches up.
   */
  restore(s: EngineSnapshot) {
    if (!this.steps.length) return;
    this.index = Math.min(Math.max(0, s.index | 0), this.steps.length - 1);
    this.status = s.status === 'paused' || s.status === 'done' ? s.status : 'running';
    this.endAt = Number(s.endAt) || this.clock() + this.steps[this.index].duration * 1000;
    this.pausedLeft = Number(s.pausedLeft) || 0;
    this.fired.clear();
    // Only cues still ahead of us can fire.
    this.lastSecs = Math.ceil(this.msLeft() / 1000);
  }

  on(fn: (e: EngineEvent) => void) { this.listeners.push(fn); }
  private emit(e: EngineEvent) { for (const fn of this.listeners) fn(e); }

  get current(): Step | undefined { return this.steps[this.index]; }
  get next(): Step | undefined { return this.steps[this.index + 1]; }

  /** Milliseconds left in the current step. */
  msLeft(now = this.clock()): number {
    if (this.status === 'paused') return this.pausedLeft;
    if (this.status === 'done') return 0;
    if (this.status === 'idle') return (this.current?.duration ?? 0) * 1000;
    return Math.max(0, this.endAt - now);
  }

  /** Seconds elapsed in the whole timer. */
  elapsed(now = this.clock()): number {
    if (this.status === 'done') return this.total;
    const before = this.steps.slice(0, this.index).reduce((s, x) => s + x.duration, 0);
    const cur = this.current ? this.current.duration - this.msLeft(now) / 1000 : 0;
    return before + Math.max(0, cur);
  }

  remaining(now = this.clock()): number {
    return Math.max(0, this.total - this.elapsed(now));
  }

  start() {
    if (!this.steps.length) { this.finish(); return; }
    this.status = 'running';
    this.enter(0, this.clock(), false);
  }

  pause() {
    if (this.status !== 'running') return;
    this.pausedLeft = this.msLeft();
    this.status = 'paused';
    this.emit({ type: 'pause' });
  }

  resume() {
    if (this.status !== 'paused') return;
    this.endAt = this.clock() + this.pausedLeft;
    this.status = 'running';
    this.emit({ type: 'resume' });
  }

  toggle() {
    if (this.status === 'running') this.pause();
    else if (this.status === 'paused') this.resume();
  }

  /** Jump to a step and start it from the top (keeps paused/running state). */
  jumpTo(i: number) {
    if (i < 0 || i >= this.steps.length || this.status === 'idle' || this.status === 'done') return;
    const wasPaused = this.status === 'paused';
    this.status = 'running';
    this.enter(i, this.clock(), false);
    if (wasPaused) { this.pausedLeft = this.steps[i].duration * 1000; this.status = 'paused'; }
  }

  skip() { if (this.index + 1 < this.steps.length) this.jumpTo(this.index + 1); else this.finish(); }

  /** Back: restart this interval, or go to the previous one if we're near its start. */
  back() {
    const cur = this.current;
    if (!cur) return;
    const into = cur.duration - this.msLeft() / 1000;
    this.jumpTo(into < 3 && this.index > 0 ? this.index - 1 : this.index);
  }

  restart() {
    this.status = 'running';
    this.enter(0, this.clock(), false);
  }

  /** Call often (e.g. 4×/second and whenever the page becomes visible). */
  update(now = this.clock()) {
    if (this.status !== 'running') return;
    let caughtUp = false;
    while (now >= this.endAt) {
      const nextIndex = this.index + 1;
      if (nextIndex >= this.steps.length) { this.finish(); return; }
      // Carry the overshoot forward so total time stays exact.
      const overshoot = now - this.endAt;
      const startAt = this.endAt;
      caughtUp = caughtUp || overshoot > 1500;
      this.enter(nextIndex, startAt, caughtUp, now);
    }
    this.checkCues(now);
  }

  private enter(i: number, startAt: number, caughtUp: boolean, now = startAt) {
    this.index = i;
    const step = this.steps[i];
    this.endAt = startAt + step.duration * 1000;
    this.fired.clear();
    this.lastSecs = Math.ceil(Math.max(0, this.endAt - now) / 1000);
    // While catching up through several finished steps, only announce the one we land on.
    if (now < this.endAt) this.emit({ type: 'step', step, index: i, caughtUp });
  }

  private crossed(threshold: number, secs: number): boolean {
    // True when we just passed a whole-second mark, and not by a big jump
    // (a big jump means we were asleep; stale cues are skipped).
    return this.lastSecs > threshold && secs <= threshold && this.lastSecs - secs <= 2;
  }

  private checkCues(now: number) {
    const step = this.current;
    if (!step) return;
    const secs = Math.ceil(Math.max(0, this.endAt - now) / 1000);
    const isShort = step.duration <= SHORT_INTERVAL;
    const next = this.next;

    const half = Math.floor(step.duration / 2);
    if (step.halfwayEnabled !== false && !(isShort && this.cues.countdown3s) && half > 0 &&
        !this.fired.has('half') && this.crossed(half, secs)) {
      this.fired.add('half');
      this.emit({ type: 'cue', cue: 'halfway', step });
    }

    if (next && this.cues.nextUp && next.ttsEnabled !== false) {
      const at = isShort ? 5 : this.cues.countdown3s ? 4 : 5;
      if (step.duration > at + 1 && !this.fired.has('next') && this.crossed(at, secs)) {
        this.fired.add('next');
        this.emit({ type: 'cue', cue: 'nextUp', step, next });
      }
    }

    if (this.cues.countdown3s) {
      for (const n of [3, 2, 1]) {
        if (step.duration > n && !this.fired.has('cd' + n) && this.crossed(n, secs)) {
          this.fired.add('cd' + n);
          this.emit({ type: 'cue', cue: 'countdown', step, value: n });
        }
      }
    }

    this.lastSecs = secs;
  }

  private finish() {
    this.status = 'done';
    this.index = Math.max(0, this.steps.length - 1);
    this.emit({ type: 'done' });
  }
}
