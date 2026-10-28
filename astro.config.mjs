import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import remarkCjkFriendly from 'remark-cjk-friendly/parseOnly';
import remarkCjkFriendlyStrikethrough from 'remark-cjk-friendly-gfm-strikethrough/parseOnly';
import rehypeKatex from 'rehype-katex';
import codeBlocks from './src/lib/rehype-code-blocks.ts';
import articleLinks from './src/lib/rehype-article-links.ts';
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
      smartypants: false,
      remarkPlugins: [remarkCjkFriendly, remarkCjkFriendlyStrikethrough, remarkMath],
      rehypePlugins: [[rehypeKatex, { trust: false, throwOnError: true }], codeBlocks, articleLinks]
    }),
    shikiConfig: { themes: codeThemes, defaultColor: 'light' }
  }
});