/**
 * Tester tools: roles and switchable test athletes.
 *
 * Every piece of athlete progress on the site lives in localStorage under keys
 * starting with `bible:` (mastery, glossary terms, stories, journal, timers…).
 * A "test athlete" is a saved copy of all of those keys. Switching athletes
 * saves the live keys into the current athlete, clears them, loads the next
 * athlete's copy, and reloads the page — so every feature works unchanged.
 *
 * Tool settings live under `bibledev:` so they are never swapped.
 * This hides the tools from normal visitors; it is NOT security.
 */

const LIVE_PREFIX = 'bible:';
const K = {
  settings: 'bibledev:settings',
  profiles: 'bibledev:profiles',
  data: (id: string) => `bibledev:data:${id}`,
};
export const REAL_ID = 'me';

export type Role = 'user' | 'tester' | 'developer';
export interface Settings { enabled: boolean; role: Role; active: string; showAnswers: boolean; showDrafts: boolean; open: boolean }
export interface Profile { id: string; name: string; createdAt: string; preset?: string }
type Snapshot = Record<string, string>;

export interface SiteData {
  leveled: { path: string; slug: string; title: string; levels: number; section: string }[];
  glossary: { slug: string; status: string }[];
  stories: string[];
  logs: string[];
}

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const DEFAULTS: Settings = { enabled: false, role: 'tester', active: REAL_ID, showAnswers: false, showDrafts: false, open: false };

export function getSettings(): Settings { return { ...DEFAULTS, ...read<Partial<Settings>>(K.settings, {}) }; }
export function setSettings(patch: Partial<Settings>) { write(K.settings, { ...getSettings(), ...patch }); }

export function listProfiles(): Profile[] {
  const list = read<Profile[]>(K.profiles, []);
  if (!list.find((p) => p.id === REAL_ID)) list.unshift({ id: REAL_ID, name: 'My real progress', createdAt: new Date().toISOString() });
  return list;
}
function saveProfiles(list: Profile[]) { write(K.profiles, list); }

/** Everything the site has saved for the current athlete. */
function captureLive(): Snapshot {
  const snap: Snapshot = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LIVE_PREFIX)) snap[k] = localStorage.getItem(k) ?? '';
  }
  return snap;
}
function clearLive() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LIVE_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
function loadLive(snap: Snapshot) {
  clearLive();
  for (const [k, v] of Object.entries(snap)) {
    if (k.startsWith(LIVE_PREFIX)) { try { localStorage.setItem(k, v); } catch {} }
  }
}

/** Store what's live now into the active athlete's copy. */
export function saveActive() {
  const s = getSettings();
  write(K.data(s.active), captureLive());
}

export function switchTo(id: string) {
  const s = getSettings();
  if (id === s.active) return;
  saveActive();
  loadLive(read<Snapshot>(K.data(id), {}));
  setSettings({ active: id });
}

export function enable() {
  const s = getSettings();
  if (s.enabled) return;
  // First time: what's live now is the person's real progress.
  if (!localStorage.getItem(K.data(REAL_ID))) write(K.data(REAL_ID), captureLive());
  saveProfiles(listProfiles());
  setSettings({ enabled: true, active: s.active || REAL_ID });
}

/** Turn the tools off and put the real progress back. */
export function disable() {
  switchTo(REAL_ID);
  setSettings({ enabled: false, open: false, showAnswers: false, showDrafts: false });
}

function newId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

export function createProfile(name: string, snap: Snapshot, preset?: string): Profile {
  const p: Profile = { id: newId(), name: name.trim() || 'Test athlete', createdAt: new Date().toISOString(), preset };
  saveProfiles([...listProfiles(), p]);
  write(K.data(p.id), snap);
  return p;
}

/** "Save a moment": copy the active athlete exactly as it is now. */
export function duplicateActive(name: string): Profile {
  saveActive();
  return createProfile(name, captureLive());
}

export function renameProfile(id: string, name: string) {
  saveProfiles(listProfiles().map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)));
}

export function deleteProfile(id: string) {
  if (id === REAL_ID) return;
  if (getSettings().active === id) switchTo(REAL_ID);
  saveProfiles(listProfiles().filter((p) => p.id !== id));
  try { localStorage.removeItem(K.data(id)); } catch {}
}

/** Wipe the active athlete back to brand new (the real-progress athlete can't be wiped). */
export function resetActive() {
  if (getSettings().active === REAL_ID) return false;
  clearLive();
  saveActive();
  return true;
}

// ---------------- Ready-made athletes ----------------

const day = 24 * 3600 * 1000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
const ymd = (msAgo: number) => iso(msAgo).slice(0, 10);

export const PRESETS: { id: string; name: string; blurb: string }[] = [
  { id: 'new', name: 'Brand new', blurb: 'Nothing done yet — what a first-time athlete sees.' },
  { id: 'midway', name: 'Halfway through', blurb: 'Some levels passed, some words known, a few journal entries, two stories due for a revisit.' },
  { id: 'advanced', name: 'Advanced', blurb: 'Every level passed, every word known, a full journal.' },
];

export function buildPreset(preset: string, site: SiteData): Snapshot {
  if (preset === 'new') return {};
  const all = preset === 'advanced';
  const mastery: Record<string, number> = {};
  site.leveled.forEach((c, i) => {
    if (all) mastery[c.slug] = c.levels;
    else if (c.slug === 'progressive-overload') mastery[c.slug] = Math.min(4, c.levels);
    else if (i % 2 === 0) mastery[c.slug] = Math.min(i % 4 === 0 ? 2 : 1, c.levels);
  });
  const terms: Record<string, { status: string; firstSeen: string; updated: string }> = {};
  site.glossary.forEach((g, i) => {
    const status = all ? 'known' : i % 3 === 0 ? 'known' : i % 3 === 1 ? 'learning' : '';
    if (status) terms[g.slug] = { status, firstSeen: iso(20 * day), updated: iso(3 * day) };
  });
  const stories = (all ? site.stories : site.stories.slice(0, 5)).map((id, i) => ({
    id, date: iso((i < 2 ? 50 : 10) * day), // first two opened 7+ weeks ago → "revisit"
  }));
  const log = site.logs.includes('training-log-wendler-531') ? 'training-log-wendler-531' : site.logs[0];
  const sessions = all ? 12 : 4;
  const lifts = ['Back Squat', 'Bench Press', 'Deadlift', 'Press'];
  const journal = Array.from({ length: sessions }, (_, i) => {
    const lift = lifts[i % 4];
    const base = { 'Back Squat': 225, 'Bench Press': 165, Deadlift: 275, Press: 105 }[lift]!;
    const weight = base + Math.floor(i / 4) * 10;
    const date = ymd((sessions - i) * 2 * day);
    return {
      id: `sample${i}`, templateSlug: log, date,
      data: { date, readiness: String(6 + (i % 4)), lift, weight: String(weight), sets: '3', reps: String([5, 3, 1][i % 3]), rpe: String(7 + (i % 3)), notes: i % 3 === 0 ? 'Felt strong. Bar speed good.' : '' },
    };
  });
  return {
    'bible:mastery': JSON.stringify(mastery),
    'bible:terms': JSON.stringify(terms),
    'bible:stories': JSON.stringify(stories),
    'bible:journal': JSON.stringify(journal),
  };
}

// ---------------- Page helpers ----------------

export function setMastery(slug: string, level: number) {
  const m = read<Record<string, number>>('bible:mastery', {});
  if (level <= 0) delete m[slug]; else m[slug] = level;
  write('bible:mastery', m);
}

export function clearTerms() { try { localStorage.removeItem('bible:terms'); } catch {} }

/** Where to edit the current page: content file (or code file) in the repo. */
export function sourceFor(pathname: string, base: string): string | null {
  const p = pathname.slice(base.length).replace(/^\/|\/$/g, '');
  const [section, slug] = p.split('/');
  const content: Record<string, string> = {
    concepts: 'concepts', lifts: 'lifts', bodyweight: 'bodyweight', mobility: 'mobility',
    programs: 'programs', stories: 'stories', glossary: 'glossary', guide: 'front-matter',
  };
  if (slug && content[section]) return `src/content/${content[section]}/${slug}.md`;
  if (section === 'journal' && slug && !['mastery-tracker', 'story-tracker'].includes(slug)) return `src/content/journal/${slug}.md`;
  if (!p) return 'src/pages/index.astro';
  if (section && !slug) return `src/pages/${section}/index.astro`;
  if (section && slug) return `src/pages/${section}/${slug}.astro`;
  return null;
}
