import { z } from 'astro/zod';

export const contentId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a stable lowercase slug');
const text = z.string().trim().min(1);
const url = z.url({ protocol: /^https$/ });
const repo = (hostname: string) => url.refine(value => {
  try {
    const parsed = new URL(value);
    return parsed.hostname === hostname && parsed.pathname.split('/').filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}, `Use a ${hostname} repository URL`);
const repositories = (hostname: string, label: string) => z.array(z.object({
  url: repo(hostname),
  label: z.string().trim().nullish().transform(value => value || label)
})).default([]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a quoted YYYY-MM-DD date').refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');

export const projectSchema = z.object({
  id: contentId,
  title: text,
  description: text,
  order: z.number().int(),
  logo: z.string().regex(/^\/assets\/projects\/[a-zA-Z0-9/_-]+\.(svg|png|webp|jpg|jpeg)$/).optional(),
  logoLayout: z.enum(['inset', 'full']).default('inset'),
  tone: z.enum(['lavender', 'rose', 'sage', 'sand']).default('lavender'),
  languages: z.array(text).default([]).refine(values => new Set(values).size === values.length, 'Duplicate language'),
  github: repositories('github.com', 'GitHub'),
  gitee: repositories('gitee.com', 'Gitee'),
  sourceStatus: z.enum(['private', 'unavailable']).optional(),
  links: z.array(z.object({ label: text, url })).default([])
}).refine(value => !value.sourceStatus || (!value.github.length && !value.gitee.length), {
  message: 'Source status cannot accompany repository links', path: ['sourceStatus']
}).refine(value => value.logoLayout !== 'full' || Boolean(value.logo), {
  message: 'Full logo layout requires an image', path: ['logoLayout']
});

export const blogSchema = z.object({
  title: text, pubDate: date, order: z.number().int().default(0), lang: z.enum(['en', 'zh-CN', 'ja']),
  description: text.optional(), draft: z.boolean().default(false)
});