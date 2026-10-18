import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { rehypeGlossary, matcherFromFiles } from './src/lib/glossary-core.mjs';

// Two homes during the move:
//  - GitHub Pages: https://coachmalcolm.github.io/strength-bible/  (base /strength-bible)
//  - Cloudflare Pages: served from the root of its own address     (base /)
// Cloudflare sets CF_PAGES=1 and CF_PAGES_URL during its builds.
const onCloudflare = process.env.CF_PAGES === '1';

export default defineConfig({
  site: onCloudflare ? (process.env.SITE_URL || process.env.CF_PAGES_URL || 'https://strength-bible.pages.dev') : 'https://coachmalcolm.github.io',
  base: onCloudflare ? '/' : '/strength-bible',
  integrations: [tailwind()],
  markdown: {
    // Highlight glossary terms in programs, stories, journal and guide pages.
    rehypePlugins: [[rehypeGlossary, { matcher: () => matcherFromFiles() }]],
  },
});
