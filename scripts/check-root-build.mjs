// After `CF_PAGES=1 npm run build`: the site must work from the root of its own
// address (Cloudflare), with no links left pointing at /strength-bible/ and no
// broken "//page" links.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const files = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : n.endsWith('.html') && files.push(p); } })(DIST);
let bad = [];
const exists = (u) => {
  const p = u.split('#')[0].split('?')[0];
  const f = join(DIST, p);
  return (existsSync(f) && statSync(f).isFile()) || existsSync(join(DIST, p, 'index.html'));
};
for (const f of files) {
  const html = readFileSync(f, 'utf8');
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (u.startsWith('//')) bad.push(`${relative(DIST, f)}: protocol-relative link ${u}`);
    else if (u.startsWith('/strength-bible')) bad.push(`${relative(DIST, f)}: old path ${u}`);
    else if (u.startsWith('/') && !exists(u)) bad.push(`${relative(DIST, f)}: missing ${u}`);
  }
}
const home = readFileSync(join(DIST, 'index.html'), 'utf8');
if (!home.includes('href="/concepts')) bad.push('home: concept links not at root');
const uniq = [...new Set(bad)];
for (const b of uniq.slice(0, 20)) console.log('FAIL ' + b);
console.log(`${files.length} pages checked for the Cloudflare address. ${uniq.length} problems.`);
if (process.env.GITHUB_ACTIONS) console.log(`::${uniq.length ? 'error' : 'notice'}::Root-address build: ${files.length} pages, ${uniq.length} problems${uniq.length ? ' — ' + uniq.slice(0, 3).join(' | ') : ''}`);
process.exit(uniq.length ? 1 : 0);
