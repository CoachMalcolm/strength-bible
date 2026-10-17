/**
 * Timer data model.
 *
 * Same shape as The Program's timers, so a timer built in either app works
 * in both:
 *   { timerId, timerName, structure: [Interval | Circuit], ttsCues, ... }
 */

export type IntervalType = 'work' | 'rest' | 'prep' | 'mobility' | 'lift' | 'cooldown';

export interface Interval {
  type: IntervalType;
  name: string;
  duration: number; // seconds
  color?: string;
  ttsEnabled?: boolean; // default true
  halfwayEnabled?: boolean; // default true
}

export interface Circuit {
  type: 'circuit';
  name: string;
  rounds: number;
  intervals: Interval[];
  afterEach?: Interval; // rest between rounds
  afterCircuit?: Interval; // rest after the last round
  ttsEnabled?: boolean;
}

export type Block = Interval | Circuit;

export interface TimerCues {
  countdown3s?: boolean; // "3, 2, 1" before each interval ends
  nextUp?: boolean; // "Next up: ..." ~5s before the end
  voice?: boolean; // spoken cues on/off
  beeps?: boolean; // beeps on/off
  vibrate?: boolean; // vibration on/off
}

export interface Timer {
  timerId: string;
  timerName: string;
  timerType?: string;
  structure: Block[];
  ttsTitle?: string;
  ttsCues?: TimerCues;
  notes?: string;
  updatedAt?: string;
}

/** One step of the flattened, ready-to-play timer. */
export interface Step extends Interval {
  index: number;
  roundNumber?: number;
  totalRoundCount?: number;
  blockName?: string;
}

export const INTERVAL_TYPES: { value: IntervalType; label: string }[] = [
  { value: 'work', label: 'Work' },
  { value: 'rest', label: 'Rest' },
  { value: 'prep', label: 'Get ready' },
  { value: 'lift', label: 'Lift' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'cooldown', label: 'Cool down' },
];

const TYPE_COLORS: Record<string, string> = {
  work: '#b8f52c',
  rest: '#ff3b30',
  prep: '#c0c0c0',
  mobility: '#ff2cd9',
  lift: '#00e5ff',
  cooldown: '#ff9f1c',
  circuit: '#2e6cf6',
};

export const SWATCHES = [
  '#b8f52c', '#ff3b30', '#c0c0c0', '#ff2cd9', '#00e5ff', '#ff9f1c',
  '#2e6cf6', '#9b59b6', '#f1c40f', '#e67e22', '#1abc9c', '#34495e',
];

export const DEFAULT_CUES: Required<TimerCues> = {
  countdown3s: true,
  nextUp: true,
  voice: true,
  beeps: true,
  vibrate: true,
};

export function colorFor(iv: { type: string; color?: string }): string {
  return iv.color || TYPE_COLORS[iv.type] || TYPE_COLORS.work;
}

export function cuesFor(t: Timer): Required<TimerCues> {
  const raw = typeof t.ttsCues === 'string' ? safeJson(t.ttsCues, {}) : t.ttsCues || {};
  return { ...DEFAULT_CUES, ...raw };
}

export function toSeconds(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function safeJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s); } catch { return fallback; }
}

/** Accepts structure as an array or as a JSON string (The Program stores strings). */
export function parseStructure(raw: unknown): Block[] {
  if (Array.isArray(raw)) return raw as Block[];
  if (typeof raw === 'string') return safeJson<Block[]>(raw || '[]', []);
  return [];
}

/** Flatten circuits into a plain list of steps. */
export function expand(structure: Block[] | string): Step[] {
  const flat: (Interval & Partial<Step>)[] = [];
  for (const block of parseStructure(structure)) {
    if (block.type === 'circuit') {
      const c = block as Circuit;
      const rounds = Math.max(1, Math.round(Number(c.rounds)) || 1);
      const muted = c.ttsEnabled === false;
      for (let r = 1; r <= rounds; r++) {
        for (const inner of c.intervals || []) {
          flat.push({ ...inner, roundNumber: r, totalRoundCount: rounds, blockName: c.name, ...(muted ? { ttsEnabled: false } : {}) });
        }
        if (c.afterEach && toSeconds(c.afterEach.duration) && r < rounds) {
          flat.push({ ...c.afterEach, blockName: c.name, ...(muted ? { ttsEnabled: false } : {}) });
        }
      }
      if (c.afterCircuit && toSeconds(c.afterCircuit.duration)) {
        flat.push({ ...c.afterCircuit, blockName: c.name, ...(muted ? { ttsEnabled: false } : {}) });
      }
    } else {
      flat.push({ ...(block as Interval) });
    }
  }
  return flat
    .map((iv) => ({ ...iv, duration: toSeconds(iv.duration) }))
    .filter((iv) => iv.duration > 0)
    .map((iv, index) => ({ ...iv, index }) as Step);
}

export function totalSeconds(structure: Block[] | string): number {
  return expand(structure).reduce((sum, s) => sum + s.duration, 0);
}

export function blockSeconds(block: Block): number {
  return totalSeconds([block]);
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return (h ? h + ':' : '') + mm + ':' + String(r).padStart(2, '0');
}

/** Parse "1:30", "90", "1m30s", "2m" into seconds. */
export function parseDuration(text: string): number {
  const t = String(text).trim().toLowerCase();
  if (!t) return 0;
  if (/^\d+(:\d{1,2}){1,2}$/.test(t)) {
    return t.split(':').map(Number).reduce((acc, n) => acc * 60 + n, 0);
  }
  const m = t.match(/^(?:(\d+)\s*m(?:in)?)?\s*(?:(\d+)\s*s(?:ec)?)?$/);
  if (m && (m[1] || m[2])) return (Number(m[1] || 0) * 60) + Number(m[2] || 0);
  return toSeconds(t);
}

export function newId(): string {
  return 'T' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

export function blankTimer(): Timer {
  return {
    timerId: newId(),
    timerName: '',
    structure: [{ type: 'prep', name: 'Get ready', duration: 10 }],
    ttsCues: { ...DEFAULT_CUES },
  };
}

/** Ready-made timers people can start from. */
export function presets(): Timer[] {
  const p = (id: string, name: string, structure: Block[], notes = ''): Timer => ({
    timerId: id, timerName: name, structure, notes, ttsCues: { ...DEFAULT_CUES },
  });
  return [
    p('PRESET-TABATA', 'Tabata (4 min)', [
      { type: 'prep', name: 'Get ready', duration: 10 },
      { type: 'circuit', name: 'Tabata', rounds: 8, intervals: [
        { type: 'work', name: 'Work', duration: 20 },
        { type: 'rest', name: 'Rest', duration: 10, halfwayEnabled: false },
      ] },
    ], '20 seconds all-out, 10 seconds rest, 8 rounds.'),
    p('PRESET-EMOM10', 'EMOM — 10 minutes', [
      { type: 'prep', name: 'Get ready', duration: 10 },
      { type: 'circuit', name: 'EMOM', rounds: 10, intervals: [{ type: 'work', name: 'Every minute', duration: 60 }] },
    ], 'Start your reps at the top of every minute. Rest for whatever is left.'),
    p('PRESET-3030', '30/30 × 10', [
      { type: 'prep', name: 'Get ready', duration: 10 },
      { type: 'circuit', name: 'Intervals', rounds: 10, intervals: [
        { type: 'work', name: 'Hard', duration: 30 },
        { type: 'rest', name: 'Easy', duration: 30 },
      ] },
      { type: 'cooldown', name: 'Cool down', duration: 120 },
    ], 'Classic conditioning intervals.'),
    p('PRESET-STRENGTH-REST', 'Strength rest — 5 sets', [
      { type: 'circuit', name: 'Sets', rounds: 5, intervals: [
        { type: 'lift', name: 'Lift', duration: 45 },
      ], afterEach: { type: 'rest', name: 'Rest', duration: 180 } },
    ], '45 seconds to complete the set, 3 minutes rest. Adjust to your program.'),
  ];
}
