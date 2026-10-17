/**
 * Saved timers (this browser only) and share links.
 * Storage key: `bible:timers` → Timer[]
 */
import type { Timer } from './model';
import { parseStructure, presets } from './model';

const KEY = 'bible:timers';

export function listTimers(): Timer[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.map(normalize) : [];
  } catch {
    return [];
  }
}

function writeAll(timers: Timer[]) {
  try { localStorage.setItem(KEY, JSON.stringify(timers)); } catch { /* storage full or blocked */ }
}

export function getTimer(id: string): Timer | null {
  return listTimers().find((t) => t.timerId === id) || presets().find((t) => t.timerId === id) || null;
}

export function isPreset(id: string): boolean {
  return presets().some((t) => t.timerId === id);
}

export function saveTimer(timer: Timer): void {
  const all = listTimers();
  const t = { ...normalize(timer), updatedAt: new Date().toISOString() };
  const i = all.findIndex((x) => x.timerId === t.timerId);
  if (i >= 0) all[i] = t; else all.unshift(t);
  writeAll(all);
}

export function deleteTimer(id: string): void {
  writeAll(listTimers().filter((t) => t.timerId !== id));
}

/** Accepts timers from The Program too (structure / cues stored as JSON strings). */
export function normalize(t: any): Timer {
  const cues = typeof t.ttsCues === 'string' ? safeParse(t.ttsCues) : t.ttsCues;
  return {
    timerId: String(t.timerId || ''),
    timerName: String(t.timerName || 'Untitled timer'),
    timerType: t.timerType || undefined,
    structure: parseStructure(t.structure),
    ttsTitle: t.ttsTitle || undefined,
    ttsCues: cues || undefined,
    notes: t.notes || undefined,
    updatedAt: t.updatedAt || undefined,
  };
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return undefined; }
}

// ---- Share links: the whole timer travels in the link itself ----

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeShare(t: Timer): string {
  const { updatedAt, ...rest } = normalize(t);
  return toBase64Url(JSON.stringify(rest));
}

export function decodeShare(code: string): Timer | null {
  try {
    const t = normalize(JSON.parse(fromBase64Url(code)));
    return t.structure.length ? t : null;
  } catch {
    return null;
  }
}
