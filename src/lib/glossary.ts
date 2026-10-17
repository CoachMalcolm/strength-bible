/**
 * Living glossary for pages that render Markdown themselves (level bodies,
 * re-teach text via lib/markdown.ts). The highlighting logic lives in
 * glossary-core.mjs so astro.config.mjs can use the same rules for programs,
 * stories, journal and guide pages.
 */
import { getCollection } from 'astro:content';
import { buildMatcher, rehypeGlossary } from './glossary-core.mjs';

export { rehypeGlossary };

export type GlossaryTerm = { slug: string; term: string; short: string; category?: string };

let cachedMatcher: Promise<any> | null = null;

export function getGlossaryMatcher(): Promise<any> {
  if (!cachedMatcher) {
    cachedMatcher = (async () => {
      const entries = await getCollection('glossary');
      return buildMatcher(entries.map((e) => ({ slug: e.slug, term: e.data.term, aliases: e.data.aliases, highlight: e.data.highlight })));
    })();
  }
  return cachedMatcher;
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
