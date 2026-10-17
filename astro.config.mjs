import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://coachmalcolm.github.io',
  base: '/strength-bible',
  integrations: [tailwind()],
});
