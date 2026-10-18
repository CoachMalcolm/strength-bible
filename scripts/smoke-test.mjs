// Browser smoke test: clicks through the site like a person would.
// Expects the built site served at SMOKE_URL (default http://localhost:4321/strength-bible).
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL || 'http://localhost:4321/strength-bible';
let failures = 0;
function check(label, ok, detail = '') {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`;
  console.log(line);
  if (process.env.GITHUB_ACTIONS) console.log(`::${ok ? 'notice' : 'error'}::${line}`);
  if (!ok) failures++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
page.on('dialog', (d) => d.accept());

try {
  // ---- Timer library ----
  await page.goto(`${BASE}/timer`);
  const presetCount = await page.locator('#presetTimers > li').count();
  check('Timer library shows presets', presetCount === 4, `${presetCount} presets`);

  // ---- Build a timer ----
  await page.goto(`${BASE}/timer/edit`);
  await page.fill('#tName', 'Smoke Test Timer');
  await page.click('#addInterval');
  await page.fill('#ivName', 'Sprint');
  await page.fill('#ivDuration', '0:08');
  await page.click('#ivForm button[type=submit]');
  await page.click('#addCircuit');
  await page.fill('#cName', 'Rounds');
  await page.fill('#cRounds', '2');
  await page.click('#cForm button[type=submit]');
  const total = await page.textContent('#totalTime');
  // 10 prep + 8 sprint + 2 × (30 work + 15 rest) = 108s = 1:48
  check('Builder adds interval + circuit with the right total', total === '1:48', `total ${total}`);
  await page.click('#save');
  await page.waitForURL(/\/timer\/?$/);
  const saved = await page.locator('#myTimers > li').filter({ hasText: 'Smoke Test Timer' }).count();
  check('Saved timer appears in the library', saved === 1);

  // ---- Run it ----
  await page.locator('#myTimers > li', { hasText: 'Smoke Test Timer' }).getByText('Start', { exact: true }).click();
  await page.waitForURL(/timer\/run/);
  await page.click('#startBtn');
  await sleep(300);
  const name1 = await page.textContent('#stepName');
  check('Player starts on the first interval', name1 === 'Get ready', name1);
  const c1 = await page.textContent('#clock');
  await sleep(2200);
  const c2 = await page.textContent('#clock');
  check('Clock counts down', c1 !== c2, `${c1} → ${c2}`);
  await page.click('#pauseBtn');
  const p1 = await page.textContent('#clock');
  await sleep(1600);
  const p2 = await page.textContent('#clock');
  check('Pause freezes the clock', p1 === p2, `${p1} = ${p2}`);
  await page.click('#pauseBtn');
  await page.click('#skipBtn');
  await sleep(300);
  const name2 = await page.textContent('#stepName');
  check('Skip moves to the next interval', name2 === 'Sprint', name2);
  await page.click('#lockBtn');
  const locked = await page.isVisible('#lockOverlay');
  await page.click('#skipBtn', { force: true, timeout: 1000 }).catch(() => {});
  const name3 = await page.textContent('#stepName');
  check('Lock blocks the controls', locked && name3 === 'Sprint', `locked=${locked}, step=${name3}`);
  const box = await page.locator('#unlockBtn').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await sleep(1200);
  await page.mouse.up();
  check('Hold to unlock works', !(await page.isVisible('#lockOverlay')));
  const listCount = await page.locator('#runList li').count();
  await page.locator('#runList li').last().click();
  await sleep(300);
  const lastName = await page.textContent('#stepName');
  check('Tapping an interval jumps to it', listCount === 6 && lastName === 'Rest', `${listCount} steps, now on ${lastName}`);
  await page.click('#exitBtn');
  await page.waitForURL(/\/timer\/?$/);
  check('Stop ends the timer (no mini bubble left behind)', !(await page.isVisible('#miniTimer')));

  // ---- Mini timer ----
  await page.locator('#presetTimers > li', { hasText: 'EMOM' }).getByText('Start', { exact: true }).click();
  await page.waitForURL(/timer\/run/);
  await page.click('#startBtn');
  await sleep(1200);
  await page.click('#miniBtn');
  await page.waitForURL(/\/timer\/?$/);
  const miniShown = await page.isVisible('#miniTimer');
  const m1 = await page.textContent('#miniClock');
  await sleep(2200);
  const m2 = await page.textContent('#miniClock');
  check('Mini shrinks the timer and it keeps running', miniShown && m1 !== m2, `${m1} → ${m2}`);
  const before = await page.locator('#miniTimer').boundingBox();
  await page.mouse.move(before.x + 40, before.y + 20);
  await page.mouse.down();
  await page.mouse.move(80, 200, { steps: 8 });
  await page.mouse.up();
  const after = await page.locator('#miniTimer').boundingBox();
  check('Mini timer can be dragged', Math.abs(after.x - before.x) > 50 && Math.abs(after.y - before.y) > 50,
    `(${Math.round(before.x)},${Math.round(before.y)}) → (${Math.round(after.x)},${Math.round(after.y)})`);
  await page.goto(`${BASE}/concepts`);
  await sleep(500);
  const moved = await page.locator('#miniTimer').boundingBox();
  const m3 = await page.textContent('#miniClock');
  check('Mini follows you to other pages, same spot, still counting',
    !!moved && Math.abs(moved.x - after.x) < 4 && Math.abs(moved.y - after.y) < 4 && m3 !== m2, `${m3} at (${Math.round(moved?.x)},${Math.round(moved?.y)})`);
  await page.click('#miniToggle');
  await sleep(1200);
  const pz1 = await page.textContent('#miniClock');
  await sleep(1300);
  const pz2 = await page.textContent('#miniClock');
  check('Pause from the mini timer', pz1 === pz2 && (await page.getAttribute('#miniTimer', 'class')).includes('is-paused'), `${pz1} = ${pz2}`);
  const miniName = (await page.textContent('#miniName')) || '';
  await page.click('#miniExpand');
  await page.waitForURL(/resume=1/);
  await sleep(300);
  const fullName = await page.textContent('#stepName');
  const fullClock = await page.textContent('#clock');
  check('Expand returns to the full timer at the same spot', !!fullName && miniName.startsWith(fullName) && fullClock === pz2, `${fullName} ${fullClock} (mini: ${miniName} ${pz2})`);
  await page.click('#pauseBtn');
  await page.click('#miniBtn');
  await page.waitForURL(/\/concepts\/?$/);
  check('Mini returns you to the page you were on', true);
  await page.click('#miniStop');
  await sleep(200);
  await page.reload();
  check('Stop from the mini timer ends it everywhere', !(await page.isVisible('#miniTimer')));

  // ---- Share link ----
  const shared = { timerId: 'SHARED1', timerName: 'Shared Timer ✓', structure: [{ type: 'work', name: 'Go', duration: 20 }] };
  const code = Buffer.from(JSON.stringify(shared), 'utf8').toString('base64url');
  await page.goto(`${BASE}/timer/run#t=${code}`);
  const sharedTitle = await page.textContent('#startTitle');
  check('Share link opens the timer', sharedTitle === 'Shared Timer ✓', sharedTitle);
  await page.click('#saveSharedBtn');
  await page.goto(`${BASE}/timer`);
  check('Shared timer can be saved', (await page.locator('#myTimers > li', { hasText: 'Shared Timer' }).count()) === 1);

  // ---- Glossary ----
  await page.goto(`${BASE}/concepts/progressive-overload`);
  const term = page.locator('.gloss-term').first();
  const termText = await term.textContent();
  await term.click();
  const cardVisible = await page.isVisible('#gloss-card');
  const cardTerm = await page.textContent('#gloss-card-term');
  check('Tapping a glossary term opens its card', cardVisible && !!cardTerm, `${termText} → ${cardTerm}`);
  await page.click('.gloss-status[data-status="known"]');
  await page.reload();
  const status = await page.locator('.gloss-term').first().getAttribute('data-status');
  check('“I know this” is remembered', status === 'known', status);

  // ---- CFU ----
  const wrong = page.locator('#level-1 .cfu-stage[data-stage="first"] .cfu-option[data-correct="false"]').first();
  await wrong.click();
  const result = await page.textContent('#level-1 .cfu-result');
  const greenShown = await page.locator('#level-1 .cfu-option.bg-green-100').count();
  check('Wrong CFU answer re-teaches without revealing', /Not quite/.test(result || '') && greenShown === 0, result);

  // ---- Start here + journal ----
  await page.goto(`${BASE}/`);
  await page.locator('a[href$="/guide/how-to-use"]').first().click();
  await page.waitForURL(/guide\/how-to-use/);
  const guideTitle = await page.textContent('h1');
  check('Start here opens the How to Use guide', /How to Use/.test(guideTitle || ''), guideTitle);
  await page.goto(`${BASE}/journal/training-log-wendler-531`);
  const dateVal = await page.inputValue('.journal-form input[name="date"]');
  check('Journal date defaults to today', /^\d{4}-\d{2}-\d{2}$/.test(dateVal), dateVal);
  await page.fill('.journal-form input[name="lift"]', 'Back Squat <b>x</b>');
  await page.fill('.journal-form input[name="weight"]', '225');
  await page.fill('.journal-form input[name="reps"]', '5');
  await page.fill('.journal-form input[name="rpe"]', '8');
  await page.click('.save-entry-btn');
  await page.waitForTimeout(200);
  const entryText = await page.textContent('.entries-content');
  const injected = await page.locator('.entries-content b').count();
  check('Journal entry saves and shows (text is escaped)', /Back Squat <b>x<\/b>/.test(entryText || '') && injected === 0, (entryText || '').trim().slice(0, 80));
  const reflection = await page.textContent('.reflection-content');
  check('Reflection panel updates right after saving', !/No entries yet|Log some sessions/.test(reflection || ''), (reflection || '').trim().slice(0, 80));
  await page.reload();
  check('Journal entry survives a reload', /Back Squat/.test((await page.textContent('.entries-content')) || ''));
  await page.goto(`${BASE}/concepts/progressive-overload`);
  const firstCellWidth = await page.evaluate(() => {
    const c = document.querySelector('.md-body td');
    if (!c) return 999;
    const r = document.createRange(); r.selectNodeContents(c);
    return r.getClientRects().length; // more than 1 line box = the word was broken across lines
  });
  check('Table words are not broken mid-word', firstCellWidth <= 1, `${firstCellWidth} line(s) in first cell`);
  for (const path of ['/journal/story-tracker', '/journal/mastery-tracker', '/programs/wendler-531', '/network']) {
    await page.goto(`${BASE}${path}`);
    await page.waitForTimeout(300);
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    check(`${path} fits a phone screen`, w <= 392, `${w}px`);
  }

  // ---- Tester tools ----
  await page.goto(`${BASE}/concepts/progressive-overload?tools=on`);
  await page.waitForTimeout(300);
  check('Private link turns on tester tools (and is removed from the address)', (await page.isVisible('#dtPanel')) && !page.url().includes('tools='));
  const visibleLevels = async () => page.locator('.level-section .level-content:not(.hidden)').count();
  const realLevels = await visibleLevels();
  await page.click('#dtNew');
  await page.fill('#dtNewName', 'Smoke advanced');
  await page.click('#dtPresets button[data-preset="advanced"]');
  await page.waitForLoadState('load');
  await page.waitForTimeout(300);
  const advLevels = await visibleLevels();
  const pill = (await page.textContent('#dtPillText')) || (await page.textContent('#dtPanel .dt-profiles [aria-current="true"]')) || '';
  check('Advanced test athlete sees every level', advLevels === 4 && realLevels < 4, `real ${realLevels}, advanced ${advLevels}`);
  if (!(await page.isVisible('#dtPanel'))) await page.click('#dtPill');
  await page.locator('#dtProfiles button', { hasText: 'My real progress' }).click();
  await page.waitForLoadState('load');
  await page.waitForTimeout(300);
  check('Switching back restores real progress', (await visibleLevels()) === realLevels, `${await visibleLevels()} levels`);
  if (!(await page.isVisible('#dtPanel'))) await page.click('#dtPill');
  await page.locator('#dtPage button', { hasText: 'Pass next level' }).click();
  await page.waitForLoadState('load');
  await page.waitForTimeout(300);
  check('"Pass next level" opens one more level', (await visibleLevels()) === realLevels + 1, `${await visibleLevels()} levels`);
  if (!(await page.isVisible('#dtPanel'))) await page.click('#dtPill');
  await page.click('.dt-seg button[data-role="developer"]');
  await page.check('#dtAnswers');
  const marked = await page.evaluate(() => document.documentElement.classList.contains('dt-answers') &&
    getComputedStyle(document.querySelector('.cfu-option[data-correct="true"]')).outlineStyle === 'dashed');
  check('Developer view marks CFU answers', marked);
  const src = await page.textContent('#dtSource code');
  check('Developer view shows the page\'s source file', src === 'src/content/concepts/progressive-overload.md', src);
  await page.click('.dt-seg button[data-role="user"]');
  check('User view hides the panel, leaving only the small button', !(await page.isVisible('#dtPanel')) && (await page.isVisible('#dtPill')));
  await page.click('#dtPill');
  await page.click('#dtOff');
  await page.waitForLoadState('load');
  await page.waitForTimeout(300);
  check('Turning tools off hides them', !(await page.isVisible('#devtools')));

  check('No JavaScript errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  check('Smoke test ran to the end', false, String(e).slice(0, 300));
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll smoke checks passed');
process.exit(failures ? 1 : 0);
