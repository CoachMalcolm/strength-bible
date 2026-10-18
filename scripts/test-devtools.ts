// Tests for tester tools (test athletes). Run: node --experimental-strip-types scripts/test-devtools.ts
class MemStorage {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
}
(globalThis as any).localStorage = new MemStorage();
const ls = (globalThis as any).localStorage as MemStorage;

const dt = await import('../src/lib/devtools.ts');
let failed = 0;
function eq(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  if (!ok) failed++;
}
const site = {
  leveled: [
    { path: '/concepts/progressive-overload', slug: 'progressive-overload', title: 'PO', levels: 4, section: 'Concept' },
    { path: '/concepts/scaling', slug: 'scaling', title: 'Scaling', levels: 4, section: 'Concept' },
    { path: '/lifts/back-squat', slug: 'back-squat', title: 'Squat', levels: 3, section: 'Lift' },
  ],
  glossary: [{ slug: 'rpe', status: 'draft' }, { slug: 'rir', status: 'draft' }, { slug: 'deload', status: 'final' }],
  stories: ['milo', 'two-farmers', 'floor-wiper'],
  logs: ['training-log-wendler-531'],
};

// The person's real progress before turning tools on
ls.setItem('bible:mastery', JSON.stringify({ 'progressive-overload': 1 }));
ls.setItem('bible:timers', '[{"timerId":"T1"}]');
dt.enable();
eq('Turning on keeps real progress live', JSON.parse(ls.getItem('bible:mastery')!), { 'progressive-overload': 1 });

const adv = dt.createProfile('Adv', dt.buildPreset('advanced', site), 'advanced');
dt.switchTo(adv.id);
eq('Advanced athlete: every level passed', JSON.parse(ls.getItem('bible:mastery')!), { 'progressive-overload': 4, scaling: 4, 'back-squat': 3 });
eq('Advanced athlete: every word known', Object.values(JSON.parse(ls.getItem('bible:terms')!)).map((t: any) => t.status), ['known', 'known', 'known']);
eq("Advanced athlete doesn't see the real person's timers", ls.getItem('bible:timers'), null);

dt.setMastery('scaling', 2);
const copy = dt.duplicateActive('Before Wendler');
dt.switchTo(copy.id);
eq('Saved copy keeps the change', JSON.parse(ls.getItem('bible:mastery')!).scaling, 2);

const fresh = dt.createProfile('New', dt.buildPreset('new', site), 'new');
dt.switchTo(fresh.id);
eq('Brand new athlete has nothing saved', ls.getItem('bible:mastery'), null);
ls.setItem('bible:mastery', JSON.stringify({ scaling: 1 })); // plays through as a real athlete
dt.switchTo(adv.id);
dt.switchTo(fresh.id);
eq('Progress made while playing is remembered after switching away and back', JSON.parse(ls.getItem('bible:mastery')!), { scaling: 1 });

eq('Reset wipes a test athlete', [dt.resetActive(), ls.getItem('bible:mastery')], [true, null]);
dt.switchTo(dt.REAL_ID);
eq('Real progress cannot be reset from the tools', dt.resetActive(), false);

dt.switchTo(adv.id);
dt.disable();
eq('Turning off brings real progress back', [JSON.parse(ls.getItem('bible:mastery')!), ls.getItem('bible:timers')], [{ 'progressive-overload': 1 }, '[{"timerId":"T1"}]']);
eq('Test athletes are kept for next time', dt.listProfiles().length, 4);
dt.deleteProfile(copy.id);
eq('Delete removes the athlete and its data', [dt.listProfiles().length, ls.getItem(`bibledev:data:${copy.id}`)], [3, null]);

const mid = dt.buildPreset('midway', site);
const midStories = JSON.parse(mid['bible:stories']);
eq('Halfway athlete has stories due for a revisit (7+ weeks old)', midStories.filter((s: any) => Date.now() - Date.parse(s.date) > 42 * 864e5).length, 2);
eq('Halfway athlete has journal entries on the Wendler log', JSON.parse(mid['bible:journal']).every((e: any) => e.templateSlug === 'training-log-wendler-531'), true);

eq('Source file for a concept page', dt.sourceFor('/strength-bible/concepts/scaling/', '/strength-bible'), 'src/content/concepts/scaling.md');
eq('Source file for a guide page', dt.sourceFor('/strength-bible/guide/safety', '/strength-bible'), 'src/content/front-matter/safety.md');

console.log(failed ? `\n${failed} failed` : '\nAll tester-tools tests passed');
process.exit(failed ? 1 : 0);
