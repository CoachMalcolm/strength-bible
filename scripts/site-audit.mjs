// Full-site audit at phone size. Run after `npm run build` with the site
// served at AUDIT_URL (default http://localhost:4321/strength-bible).
// Writes audit/report.md, audit/report.json and audit/screens/*.jpg.
import { chromium } from 'playwright';
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const BASE = process.env.AUDIT_URL || 'http://localhost:4321/strength-bible';
const BASE_PATH = '/strength-bible';
const DIST = 'dist';
mkdirSync('audit/screens', { recursive: true });

function allPages(dir = DIST) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...allPages(p));
    else if (name === 'index.html') out.push(p);
  }
  return out;
}
const pageFiles = allPages();
const paths = pageFiles.map((f) => '/' + relative(DIST, f).replace(/index\.html$/, '')).sort();

function existsInDist(urlPath) {
  let p = urlPath.split('#')[0].split('?')[0];
  if (!p.startsWith(BASE_PATH)) return true; // external or other site
  p = p.slice(BASE_PATH.length) || '/';
  const f = join(DIST, p);
  if (existsSync(f) && statSync(f).isFile()) return true;
  return existsSync(join(DIST, p, 'index.html'));
}

// ---- Static link check ----
const broken = [];
for (const f of pageFiles) {
  const html = readFileSync(f, 'utf8');
  const page = '/' + relative(DIST, f).replace(/index\.html$/, '');
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|#|data:|javascript:)/.test(u)) continue;
    if (!u.startsWith('/')) { broken.push({ page, link: u, why: 'relative link' }); continue; }
    if (!existsInDist(u)) broken.push({ page, link: u, why: 'no such page' });
  }
}

// ---- Browser pass ----
const SHOTS = [
  '/', '/guide/how-to-use/', '/concepts/', '/concepts/progressive-overload/', '/concepts/measurable-repeatable/', '/concepts/football/',
  '/programs/', '/programs/wendler-531/', '/journal/', '/journal/mastery-tracker/', '/journal/story-tracker/',
  '/journal/training-log-wendler-531/', '/network/', '/stories/', '/stories/the-floor-wiper/', '/glossary/', '/timer/', '/mastery/', '/lifts/back-squat/',
];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const results = [];
for (const p of paths) {
  const page = await ctx.newPage();
  const errors = [];
  const failed = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(BASE.split('/strength-bible')[0])) failed.push(`${r.status()} ${r.url()}`); });
  let status = 0;
  try {
    const res = await page.goto(BASE + p.replace(/^\//, '/'), { waitUntil: 'networkidle', timeout: 20000 });
    status = res ? res.status() : 0;
    await page.waitForTimeout(250);
  } catch (e) { errors.push('load: ' + String(e).slice(0, 120)); }
  const info = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const lines = text.split('\n');
    const raw = lines.filter((l) => /\*\*[^*]+\*\*|^#{1,4}\s|^\|.*\|$|^\s*[-*]\s\[ \]|\]\(http/.test(l.trim())).slice(0, 5);
    const placeholders = lines.filter((l) => /\b(TODO|TBD|placeholder|lorem ipsum|coming soon)\b/i.test(l)).slice(0, 5);
    const wide = [...document.querySelectorAll('body *')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.right > 392 && r.width > 0 && getComputedStyle(el).position !== 'fixed'; })
      .filter((el) => !el.closest('nav, .overflow-x-auto, table, .md-body table, svg, canvas, [data-allow-wide]'))
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''} (${Math.round(el.getBoundingClientRect().right)}px)`);
    return {
      title: document.title,
      overflow: Math.max(document.documentElement.scrollWidth, window.innerWidth) > 392,
      scrollWidth: document.documentElement.scrollWidth,
      raw, placeholders, wide,
      words: text.split(/\s+/).length,
    };
  }).catch(() => ({ title: '', overflow: false, raw: [], placeholders: [], wide: [], words: 0 }));
  if (SHOTS.includes(p)) {
    const name = p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '__');
    await page.screenshot({ path: `audit/screens/${name}.jpg`, type: 'jpeg', quality: 55, fullPage: true }).catch(() => {});
  }
  results.push({ path: p, status, errors, failed, ...info });
  await page.close();
}
await browser.close();

// ---- Report ----
const issues = results.filter((r) => r.status >= 400 || r.errors.length || r.failed.length || r.overflow || r.raw.length);
const md = [];
md.push(`# Site audit\n\n${results.length} pages checked at 390px wide. ${issues.length} with issues. ${broken.length} broken links.\n`);
md.push('## Broken links\n');
if (!broken.length) md.push('None.\n');
const byLink = {};
for (const b of broken) (byLink[`${b.link} (${b.why})`] ||= []).push(b.page);
for (const [k, v] of Object.entries(byLink)) md.push(`- \`${k}\` on ${v.length} page(s): ${v.slice(0, 6).join(', ')}${v.length > 6 ? ' …' : ''}`);
md.push('\n## Pages with issues\n');
for (const r of issues) {
  md.push(`### ${r.path}  (${r.status})`);
  if (r.errors.length) md.push(`- Script errors: ${r.errors.slice(0, 3).map((e) => '`' + e.slice(0, 160) + '`').join('; ')}`);
  if (r.failed.length) md.push(`- Failed requests: ${r.failed.slice(0, 5).join(', ')}`);
  if (r.overflow) md.push(`- Wider than the phone screen (${r.scrollWidth}px): ${r.wide.join(', ')}`);
  if (r.raw.length) md.push(`- Raw formatting visible: ${r.raw.map((l) => '`' + l.slice(0, 100) + '`').join(' | ')}`);
  md.push('');
}
md.push('## Placeholder text\n');
for (const r of results.filter((x) => x.placeholders.length)) md.push(`- ${r.path}: ${r.placeholders.map((l) => '`' + l.slice(0, 100) + '`').join(' | ')}`);
md.push('\n## All pages\n');
for (const r of results) md.push(`- ${r.path} — ${r.status} — ${r.words} words — ${r.title}`);
writeFileSync('audit/report.md', md.join('\n'));
writeFileSync('audit/report.json', JSON.stringify({ results, broken }, null, 1));
console.log(`${results.length} pages, ${issues.length} with issues, ${broken.length} broken links`);
