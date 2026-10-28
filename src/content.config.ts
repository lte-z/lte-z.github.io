import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { strictFile } from './lib/strict-file-loader';
import { contentId, projectSchema, blogSchema } from './lib/content-schema';

export const collections = {
  projects: defineCollection({
    loader: strictFile('src/data/projects.yaml'),
    schema: projectSchema
  }),
  blog: defineCollection({
    loader: glob({
      base: './src/content/blog',
      pattern: '*/index.md',
      generateId: ({ entry }) => contentId.parse(entry.replaceAll('\\', '/').replace(/\/index\.md$/, ''))
    }),
    schema: blogSchema
  })
};