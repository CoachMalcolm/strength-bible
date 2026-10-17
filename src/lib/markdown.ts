/**
 * Renders Markdown written inside content frontmatter (level bodies,
 * re-teach explanations) to HTML at build time, using the same Markdown
 * engine Astro uses for regular .md pages (tables, bold, lists, etc.).
 */
import { createMarkdownProcessor } from '@astrojs/markdown-remark';

let processor: Awaited<ReturnType<typeof createMarkdownProcessor>> | null = null;

export async function renderMarkdown(source: string | undefined | null): Promise<string> {
  if (!source) return '';
  if (!processor) processor = await createMarkdownProcessor({ gfm: true, smartypants: true });
  const result = await processor.render(String(source));
  return result.code;
}
