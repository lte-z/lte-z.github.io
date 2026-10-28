import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { selectPosts, postURL } from '../lib/content';

export async function GET(context: APIContext) {
  return rss({
    title: 'Blog - lte_z',
    description: 'For the things that linger.',
    site: context.site!,
    items: selectPosts(await getCollection('blog')).map(post => ({
      title: post.data.title,
      pubDate: new Date(`${post.data.pubDate}T00:00:00.000Z`),
      description: post.data.description,
      link: postURL(post)
    }))
  });
}