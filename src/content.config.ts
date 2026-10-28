import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { strictFile } from './lib/strict-file-loader';

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a stable lowercase slug');
const text = z.string().trim().min(1);
const url = z.url({ protocol: /^https$/ });
const repo = (hostname: string) => url.refine(value => {
  const parsed = new URL(value);
  return parsed.hostname === hostname && parsed.pathname.split('/').filter(Boolean).length >= 2;
}, `Use a ${hostname} repository URL`);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a quoted YYYY-MM-DD date').refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');

export const collections = {
  projects: defineCollection({
    loader: strictFile('src/data/projects.yaml'),
    schema: z.object({
      id,
      title: text,
      description: text,
      order: z.number().int(),
      logo: z.string().regex(/^\/assets\/projects\/[a-zA-Z0-9/_-]+\.(svg|png|webp|jpg|jpeg)$/).optional(),
      tone: z.enum(['lavender', 'rose', 'sage', 'sand']).default('lavender'),
      languages: z.array(text).default([]).refine(values => new Set(values).size === values.length, 'Duplicate language'),
      github: repo('github.com').optional(),
      gitee: repo('gitee.com').optional(),
      sourceStatus: z.enum(['private', 'unavailable']).optional(),
      links: z.array(z.object({ label: text, url })).default([])
    }).refine(value => !(value.sourceStatus && (value.github || value.gitee)), 'Source status cannot accompany a public repository')
  }),
  blog: defineCollection({
    loader: glob({
      base: './src/content/blog',
      pattern: '*/index.md',
      generateId: ({ entry }) => id.parse(entry.replaceAll('\\', '/').replace(/\/index\.md$/, ''))
    }),
    schema: z.object({ title: text, pubDate: date, order: z.number().int().default(0), lang: z.enum(['en', 'zh-CN', 'ja']), description: text.optional(), draft: z.boolean().default(false) })
  })
};