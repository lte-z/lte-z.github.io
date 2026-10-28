import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;
export type Project = CollectionEntry<'projects'>;

export function selectPosts(entries: Post[], includeDrafts = false): Post[] {
  return entries.filter(post => includeDrafts || !post.data.draft).sort((a, b) =>
    b.data.pubDate.localeCompare(a.data.pubDate) ||
    (b.data.order ?? 0) - (a.data.order ?? 0) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

export function groupPostsByYear(posts: Post[]): Array<{ year: string; posts: Post[] }> {
  const years = new Map<string, Post[]>();
  for (const post of posts) {
    const year = post.data.pubDate.slice(0, 4);
    if (!years.has(year)) years.set(year, []);
    years.get(year)!.push(post);
  }
  return [...years].map(([year, posts]) => ({ year, posts }));
}

export function getPostNeighbors(posts: Post[], id: string) {
  const index = posts.findIndex(post => post.id === id);
  if (index < 0) throw new Error(`Unknown article: ${id}`);
  return { newer: posts[index - 1], older: posts[index + 1] };
}

export function postURL(post: Pick<Post, 'id'>) {
  return `/blog/${encodeURIComponent(post.id)}/`;
}

export function formatArchiveDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00.000Z`));
}

export function sortProjects(entries: Project[]): Project[] {
  const orders = new Map<number, string>();
  for (const entry of entries) {
    const previous = orders.get(entry.data.order);
    if (previous !== undefined) throw new Error(`Duplicate project order ${entry.data.order}: ${previous}, ${entry.id}`);
    orders.set(entry.data.order, entry.id);
  }
  return [...entries].sort((a, b) => b.data.order - a.data.order);
}