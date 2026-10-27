// Rewrites every content file the way a form-based editor (Pages CMS) might
// save it, so we can check the site still builds the same.
//
// What it does to each file's frontmatter:
//   - re-writes the YAML from scratch (different quoting, line breaks, key order kept)
//   - adds empty boxes the editor may leave behind (order: null, sources: [], etc.)
//   - saves CFU answer pickers as text ("1" instead of 1)
//
// Usage: node scripts/content-roundtrip.mjs   (changes files in place: run on a throwaway copy or CI)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

const root = 'src/content';
const empties = { order: null, sources: [], videos: [], related_concepts: [], icon: '' };
let n = 0;

function stringifyPickers(v, key = '') {
  if (Array.isArray(v)) return v.map((x) => stringifyPickers(x));
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = stringifyPickers(x, k);
    // An editor shows every field in a level's check, filled or not.
    if ('question' in out) {
      out.retry ??= '';
      out.retry_options ??= [];
      out.retry_correct_index ??= null;
    }
    return out;
  }
  if (/correct_index$/.test(key) && typeof v === 'number') return String(v);
  return v;
}

for (const dir of readdirSync(root, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const f of readdirSync(join(root, dir.name))) {
    if (!f.endsWith('.md')) continue;
    const p = join(root, dir.name, f);
    const m = readFileSync(p, 'utf8').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) continue;
    let data = stringifyPickers(YAML.parse(m[1]));
    if (dir.name !== 'stories' && dir.name !== 'glossary') {
      for (const [k, v] of Object.entries(empties)) if (!(k in data)) data[k] = v;
      if (data.icon === '') delete data.icon; // icon is always filled in today
    }
    writeFileSync(p, `---\n${YAML.stringify(data, { lineWidth: 0 })}---\n${m[2]}`);
    n++;
  }
}
console.log(`Rewrote ${n} content files the way the editor might.`);
