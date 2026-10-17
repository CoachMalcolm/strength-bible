/**
 * Living glossary: build-time term highlighting.
 *
 * A rehype plugin (runs on the HTML produced from Markdown) that finds
 * glossary terms in text and wraps them in a tappable button:
 *   <button type="button" class="gloss-term" data-gloss="rpe">RPE</button>
 *
 * Rules:
 *  - Only the FIRST appearance of each term per rendered block is highlighted,
 *    so pages stay readable.
 *  - Longest spelling wins ("estimated 1RM" before "1RM").
 *  - Spellings with 2+ capital letters (RPE, 1RM, mTOR) are case-sensitive;
 *    everything else matches regardless of case.
 *  - Never highlights inside links, code, headings, or buttons.
 */
import { getCollection } from 'astro:content';

export type GlossaryTerm = { slug: string; term: string; short: string; category?: string };

type Matcher = { regex: RegExp; lookup: Map<string, { slug: string; alias: string; caseSensitive: boolean }[]> };

const SKIP_TAGS = new Set(['a', 'code', 'pre', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'script', 'style']);

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isCaseSensitive(alias: string) {
  return (alias.match(/[A-Z]/g) ?? []).length >= 2;
}

let cachedMatcher: Promise<Matcher | null> | null = null;

export function getGlossaryMatcher(): Promise<Matcher | null> {
  if (!cachedMatcher) {
    cachedMatcher = (async () => {
      const entries = await getCollection('glossary');
      const aliases: { slug: string; alias: string; caseSensitive: boolean }[] = [];
      for (const e of entries) {
        if (e.data.highlight === false) continue;
        const spellings = new Set([...(e.data.aliases ?? [])]);
        if (spellings.size === 0) spellings.add(e.data.term);
        for (const alias of spellings) {
          if (alias.trim()) aliases.push({ slug: e.slug, alias: alias.trim(), caseSensitive: isCaseSensitive(alias) });
        }
      }
      if (aliases.length === 0) return null;
      aliases.sort((a, b) => b.alias.length - a.alias.length);
      const lookup = new Map<string, { slug: string; alias: string; caseSensitive: boolean }[]>();
      for (const a of aliases) {
        const key = a.alias.toLowerCase();
        if (!lookup.has(key)) lookup.set(key, []);
        lookup.get(key)!.push(a);
      }
      const pattern = aliases.map((a) => escapeRegex(a.alias)).join('|');
      const regex = new RegExp(`(?<![A-Za-z0-9])(${pattern})(?![A-Za-z0-9])`, 'gi');
      return { regex, lookup };
    })();
  }
  return cachedMatcher;
}

/** Which glossary slug (if any) a matched piece of text belongs to. */
function resolveMatch(matcher: Matcher, text: string): string | null {
  const candidates = matcher.lookup.get(text.toLowerCase());
  if (!candidates) return null;
  for (const c of candidates) {
    if (!c.caseSensitive || c.alias === text) return c.slug;
  }
  return null;
}

function splitText(value: string, matcher: Matcher, used: Set<string>): any[] | null {
  const out: any[] = [];
  let last = 0;
  let changed = false;
  matcher.regex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = matcher.regex.exec(value)) !== null) {
    const text = m[1];
    const slug = resolveMatch(matcher, text);
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

function walk(node: any, matcher: Matcher, used: Set<string>) {
  if (!node.children) return;
  const next: any[] = [];
  for (const child of node.children) {
    if (child.type === 'text') {
      const parts = splitText(child.value, matcher, used);
      if (parts) next.push(...parts);
      else next.push(child);
    } else {
      if (!(child.type === 'element' && SKIP_TAGS.has(child.tagName))) walk(child, matcher, used);
      next.push(child);
    }
  }
  node.children = next;
}

/** rehype plugin factory. Pass the matcher from getGlossaryMatcher(). */
export function rehypeGlossary(options: { matcher: Matcher | null }) {
  return (tree: any) => {
    if (!options?.matcher) return;
    walk(tree, options.matcher, new Set());
  };
}

/** Compact data for the pop-up card, embedded once per page. */
export async function getGlossaryCardData(): Promise<Record<string, GlossaryTerm>> {
  const entries = await getCollection('glossary');
  const data: Record<string, GlossaryTerm> = {};
  for (const e of entries) {
    data[e.slug] = { slug: e.slug, term: e.data.term, short: e.data.short, category: e.data.category };
  }
  return data;
}
