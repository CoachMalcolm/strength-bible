// Sanity checks on the built site (dist/). Run after `npm run build`.
// Prints what it finds and exits non-zero if something important is missing.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
let failures = 0;

function page(path) {
  const file = join(DIST, path, 'index.html');
  if (!existsSync(file)) return null;
  return readFileSync(file, 'utf8');
}
function count(html, re) {
  return (html.match(re) || []).length;
}
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) failures++;
}
function allPages(dir = DIST) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...allPages(p));
    else if (name === 'index.html') out.push(p);
  }
  return out;
}

const po = page('concepts/progressive-overload');
check('Progressive Overload page built', !!po);
if (po) {
  check('Level text renders tables', count(po, /<table/g) > 0, `${count(po, /<table/g)} table(s)`);
  check('Level text renders bold', /<strong>[^<]*<\/strong>|<strong><button/.test(po));
  check('No raw ** left in level text', !/\*\*[A-Za-z]/.test(po.replace(/<script[\s\S]*?<\/script>/g, '')));
  const terms = [...po.matchAll(/data-gloss="([^"]+)"/g)].map((m) => m[1]);
  check('Glossary terms highlighted on the page', terms.length > 0, `${terms.length}: ${[...new Set(terms)].join(', ')}`);
  check('Glossary card included', po.includes('id="gloss-card"'));
}

const squat = page('lifts/back-squat');
check('Back Squat re-teach rendered', !!squat && squat.includes('data-stage="retry"'));

const index = page('glossary');
check('Glossary index built', !!index, index ? `${count(index, /class="gloss-row"/g)} terms listed` : '');

const glossDir = join(DIST, 'glossary');
const termPages = existsSync(glossDir) ? readdirSync(glossDir).filter((n) => statSync(join(glossDir, n)).isDirectory()) : [];
check('Glossary term pages built', termPages.length > 0, `${termPages.length} pages`);
const rpe = page('glossary/rpe');
if (rpe) {
  const appears = count(rpe, /Where you'll see it|Where you&#39;ll see it/g) > 0;
  check('Term page lists where it appears', appears);
}

// Every highlighted term must point at a real glossary page.
const pages = allPages();
const linked = new Set();
for (const f of pages) for (const m of readFileSync(f, 'utf8').matchAll(/data-gloss="([^"]+)"/g)) linked.add(m[1]);
const missing = [...linked].filter((s) => !termPages.includes(s));
check('Every highlighted term has a page', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${linked.size} distinct terms highlighted site-wide`);

// No highlight should land inside a link or heading.
let nested = 0;
for (const f of pages) {
  const html = readFileSync(f, 'utf8');
  nested += count(html, /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*class="gloss-term"/g);
  nested += count(html, /<h[1-6]\b[^>]*>(?:(?!<\/h[1-6]>)[\s\S])*class="gloss-term"/g);
}
check('No highlights inside links or headings', nested === 0, `${nested} found`);

console.log(`\n${pages.length} pages built. ${failures ? failures + ' check(s) failed.' : 'All checks passed.'}`);
process.exit(failures ? 1 : 0);
