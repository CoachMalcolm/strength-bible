import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { rehypeGlossary, matcherFromFiles } from './src/lib/glossary-core.mjs';

export default defineConfig({
  site: 'https://coachmalcolm.github.io',
  base: '/strength-bible',
  integrations: [tailwind()],
  markdown: {
    // Highlight glossary terms in programs, stories, journal and guide pages.
    rehypePlugins: [[rehypeGlossary, { matcher: () => matcherFromFiles() }]],
  },
});
