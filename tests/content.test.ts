import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectPosts, groupPostsByYear, getPostNeighbors, formatArchiveDate, sortProjects } from '../src/lib/content.ts';

const entry = (id: string, date: string, draft=false, order=0, lang='en') => ({ id, data: { title: id, pubDate: date, lang, draft, order } }) as any;

test('publication order, draft filter, stable same-date order and unchanged input', () => {
  const input=[entry('b','2026-10-27'),entry('a','2026-10-27'),entry('old','2024-01-01'),entry('draft','2026-10-28',true)];
  assert.deepEqual(selectPosts(input).map(x=>x.id),['a','b','old']);
  assert.equal(input[0].id,'b');
  assert.equal(selectPosts(input,true)[0].id,'draft');
  assert.deepEqual(selectPosts([]),[]);
});
test('year grouping and newest/oldest/single neighbors', () => {
  const posts=selectPosts([entry('a','2026-01-01'),entry('b','2025-01-01'),entry('c','2024-01-01')]);
  assert.deepEqual(groupPostsByYear(posts).map(x=>x.year),['2026','2025','2024']);
  assert.equal(getPostNeighbors(posts,'a').newer,undefined);
  assert.equal(getPostNeighbors(posts,'a').older?.id,'b');
  assert.equal(getPostNeighbors(posts,'c').newer?.id,'b');
  assert.equal(getPostNeighbors(posts,'c').older,undefined);
  assert.deepEqual(getPostNeighbors([posts[0]],'a'),{newer:undefined,older:undefined});
  assert.throws(()=>getPostNeighbors(posts,'missing'),/Unknown article/);
});
test('same-day order is descending, defaults to zero and breaks ties by slug', () => {
  const fallback = entry('default', '2026-10-28');
  delete fallback.data.order;
  const input = [entry('low', '2026-10-28', false, -1), fallback, entry('b', '2026-10-28', false, 10), entry('a', '2026-10-28', false, 10)];
  assert.deepEqual(selectPosts(input).map(post => post.id), ['a', 'b', 'default', 'low']);
  assert.equal(input[0].id, 'low');
  assert.deepEqual(selectPosts([entry('older', '2026-10-27', false, 999), entry('newer', '2026-10-28', false, -999)]).map(post => post.id), ['newer', 'older']);
});
test('three language versions remain independent posts with consistent neighbors', () => {
  const posts = selectPosts([
    entry('first-blog-en', '2026-10-28', false, 20, 'en'),
    entry('first-blog-ja', '2026-10-28', false, 10, 'ja'),
    entry('first-blog-zh-cn', '2026-10-28', false, 30, 'zh-CN'),
    entry('draft', '2026-10-28', true, 100)
  ]);
  assert.deepEqual(posts.map(post => post.id), ['first-blog-zh-cn', 'first-blog-en', 'first-blog-ja']);
  assert.equal(groupPostsByYear(posts)[0].posts.length, 3);
  assert.equal(getPostNeighbors(posts, 'first-blog-en').newer?.id, 'first-blog-zh-cn');
  assert.equal(getPostNeighbors(posts, 'first-blog-en').older?.id, 'first-blog-ja');
});
test('date labels stay on the same day across host timezones', () => {
  const previous=process.env.TZ;
  try { for (const tz of ['UTC','Asia/Shanghai','America/Los_Angeles']) { process.env.TZ=tz; assert.equal(formatArchiveDate('2024-02-29'),'Feb 29'); } }
  finally { if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous; }
});
test('project order is descending and duplicates fail', () => {
  const projects=[{id:'a',data:{order:1}},{id:'b',data:{order:9}}] as any;
  assert.deepEqual(sortProjects(projects).map(x=>x.id),['b','a']);
  assert.throws(()=>sortProjects([{id:'a',data:{order:1}},{id:'b',data:{order:1}}] as any),/Duplicate project order/);
  assert.deepEqual(sortProjects([]),[]);
});