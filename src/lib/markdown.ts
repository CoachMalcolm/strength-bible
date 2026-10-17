/**
 * Renders Markdown written inside content frontmatter (level bodies,
 * re-teach explanations) to HTML at build time, using the same Markdown
 * engine Astro uses for regular .md pages (tables, bold, lists, etc.).
 * Glossary terms are highlighted automatically (see lib/glossary.ts).
 */
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { getGlossaryMatcher, rehypeGlossary } from './glossary';

let processor: Promise<Awaited<ReturnType<typeof createMarkdownProcessor>>> | null = null;

function getProcessor() {
  if (!processor) {
    processor = (async () => {
      const matcher = await getGlossaryMatcher();
      return createMarkdownProcessor({
        gfm: true,
        smartypants: true,
        rehypePlugins: [[rehypeGlossary, { matcher }]],
      });
    })();
  }
  return processor;
}

export async function renderMarkdown(source: string | undefined | null): Promise<string> {
  if (!source) return '';
  const p = await getProcessor();
  const result = await p.render(String(source));
  return result.code;
}
