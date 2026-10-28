import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import codeBlocks from './src/lib/rehype-code-blocks.ts';
import { codeThemes } from './src/lib/code-themes.ts';
import { unified } from '@astrojs/markdown-remark';

export default defineConfig({
  site: 'https://lte-z.github.io',
  output: 'static',
  trailingSlash: 'always',
  prerenderConflictBehavior: 'error',
  integrations: [sitemap({ filter: page => !page.endsWith('/404/') && !page.endsWith('/404.html') })],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { trust: false, throwOnError: true }], codeBlocks]
    }),
    shikiConfig: { themes: codeThemes, defaultColor: 'light' }
  }
});