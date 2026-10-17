/**
 * Glossary highlighting core — plain JavaScript with no Astro imports, so it
 * runs both inside pages (lib/glossary.ts) and in astro.config.mjs (for
 * programs, stories, journal and guide pages rendered by Astro's Markdown).
 *
 *  - Only the FIRST appearance of each term per rendered block is highlighted.
 *  - Longest spelling wins ("estimated 1RM" before "1RM").
 *  - Spellings with 2+ capital letters (RPE, 1RM, mTOR) are case-sensitive.
 *  - Never inside links, code, headings, buttons, or tables' header cells.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SKIP_TAGS = new Set(['a', 'code', 'pre', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th', 'script', 'style']);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isCaseSensitive = (alias) => (alias.match(/[A-Z]/g) ?? []).length >= 2;

/** entries: [{ slug, term, aliases, highlight }] */
export function buildMatcher(entries) {
  const aliases = [];
  for (const e of entries) {
    if (e.highlight === false) continue;
    const spellings = new Set(e.aliases && e.aliases.length ? e.aliases : [e.term]);
    for (const a of spellings) {
      const alias = String(a || '').trim();
      if (alias) aliases.push({ slug: e.slug, alias, caseSensitive: isCaseSensitive(alias) });
    }
  }
  if (!aliases.length) return null;
  aliases.sort((a, b) => b.alias.length - a.alias.length);
  const lookup = new Map();
  for (const a of aliases) {
    const k = a.alias.toLowerCase();
    if (!lookup.has(k)) lookup.set(k, []);
    lookup.get(k).push(a);
  }
  const regex = new RegExp(`(?<![A-Za-z0-9])(${aliases.map((a) => escapeRegex(a.alias)).join('|')})(?![A-Za-z0-9])`, 'gi');
  return { regex, lookup };
}

function resolve(matcher, text) {
  const c = matcher.lookup.get(text.toLowerCase());
  if (!c) return null;
  for (const x of c) if (!x.caseSensitive || x.alias === text) return x.slug;
  return null;
}

function splitText(value, matcher, used) {
  const out = [];
  let last = 0;
  let changed = false;
  matcher.regex.lastIndex = 0;
  let m;
  while ((m = matcher.regex.exec(value)) !== null) {
    const text = m[1];
    const slug = resolve(matcher, text);
    if (!slug || used.has(slug)) continue;
    used.add(slug);
    if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
    out.push({
      type: 'element',
      tagName: 'button',
      properties: { type: 'button', className: ['gloss-term'], dataGloss: slug },
      children: [{ type: 'text', value: text }],
    });
    last = m.index + text.length;
    changed = true;
  }
  if (!changed) return null;
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

function walk(node, matcher, used) {
  if (!node.children) return;
  const next = [];
  for (const child of node.children) {
    if (child.type === 'text') {
      const parts = splitText(child.value, matcher, used);
      if (parts) next.push(...parts); else next.push(child);
    } else {
      if (!(child.type === 'element' && SKIP_TAGS.has(child.tagName))) walk(child, matcher, used);
      next.push(child);
    }
  }
  node.children = next;
}

/** rehype plugin. `matcher` may be a matcher or a function returning one (read lazily). */
export function rehypeGlossary(options = {}) {
  return (tree) => {
    const matcher = typeof options.matcher === 'function' ? options.matcher() : options.matcher;
    if (!matcher) return;
    walk(tree, matcher, new Set());
  };
}

// ---- Reading glossary files directly (for astro.config.mjs) ----

function parseFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
  if (!m) return {};
  const out = {};
  let listKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(raw);
    if (item && listKey) { out[listKey].push(unquote(item[1])); continue; }
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(raw);
    if (!kv) continue;
    listKey = null;
    if (kv[2] === '') { out[kv[1]] = []; listKey = kv[1]; }
    else out[kv[1]] = unquote(kv[2]);
  }
  return out;
}

function unquote(v) {
  const s = v.trim();
  if (s.startsWith('"')) { try { return JSON.parse(s); } catch { return s.slice(1, -1); } }
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  if (s === 'false') return false;
  if (s === 'true') return true;
  return s;
}

let fileMatcher;
export function matcherFromFiles(dir = 'src/content/glossary') {
  if (fileMatcher !== undefined) return fileMatcher;
  if (!existsSync(dir)) return (fileMatcher = null);
  const entries = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const fm = parseFrontmatter(readFileSync(join(dir, f), 'utf8'));
    return { slug: f.replace(/\.md$/, ''), term: fm.term, aliases: Array.isArray(fm.aliases) ? fm.aliases : [], highlight: fm.highlight };
  });
  return (fileMatcher = buildMatcher(entries));
}
