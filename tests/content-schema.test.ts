import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectSchema, blogSchema } from '../src/lib/content-schema.ts';

const project = { id: 'example', title: 'Example', description: 'Example project.', order: 1 };
const github = { github: 'https://github.com/example/project' };
const gitee = { gitee: 'https://gitee.com/example/project' };

test('projects normalize omitted and empty link arrays without requiring metadata', () => {
  const parsed = projectSchema.parse(project);
  assert.deepEqual(parsed.repositories, []);
  assert.deepEqual(parsed.links, []);
  assert.deepEqual(parsed.languages, []);
  assert.equal(parsed.logoLayout, 'inset');
  assert.deepEqual(projectSchema.parse({ ...project, repositories: [], links: [] }), parsed);
});

test('repository labels default for missing, null and blank values and trim custom text', () => {
  for (const [field, url, fallback] of [['github', github.github, 'GitHub'], ['gitee', gitee.gitee, 'Gitee']] as const) {
    for (const label of [undefined, null, '', '   ']) {
      const parsed = projectSchema.parse({ ...project, repositories: [{ [field]: url, label }] });
      assert.deepEqual(parsed.repositories[0], { platform: field, url, label: fallback });
    }
    assert.equal(projectSchema.parse({ ...project, repositories: [{ [field]: url, label: ' Server ' }] }).repositories[0].label, 'Server');
    assert.equal(projectSchema.safeParse({ ...project, repositories: [{ [field]: url, label: 42 }] }).success, false);
  }
});

test('repository order follows the array even when platforms are interleaved or reversed', () => {
  const repositories = [{ ...github, label: 'Primary' }, { ...gitee, label: 'Mirror' }, { github: 'https://github.com/example/secondary' }];
  const parsed = projectSchema.parse({ ...project, repositories });
  assert.deepEqual(parsed.repositories.map(({ platform, label }) => [platform, label]), [
    ['github', 'Primary'], ['gitee', 'Mirror'], ['github', 'GitHub']
  ]);
  assert.deepEqual(projectSchema.parse({ ...project, repositories: [...repositories].reverse() }).repositories, [...parsed.repositories].reverse());
});

test('repositories reject invalid platform URLs', () => {
  for (const [field, valid, other] of [['github', github.github, gitee.gitee], ['gitee', gitee.gitee, github.github]] as const) {
    for (const url of [other, valid.replace('https:', 'http:'), 'not a URL', `https://${field}.com/example`]) {
      assert.equal(projectSchema.safeParse({ ...project, repositories: [{ [field]: url }] }).success, false, `${field}: ${url}`);
    }
  }
});

test('each repository requires exactly one platform field and rejects unsupported shapes', () => {
  for (const repositories of [github, github.github, [github.github], [{}], [{ ...github, ...gitee }], [{ github: { url: github.github } }], [{ url: github.github }], [{ platform: 'github', url: github.github }]]) {
    assert.equal(projectSchema.safeParse({ ...project, repositories }).success, false);
  }
});

test('legacy top-level repository fields fail instead of silently losing links', () => {
  for (const legacy of [{ github: github.github }, { github: [{ url: github.github }] }, { github: [] }, { gitee: [{ url: gitee.gitee }] }, { gitee: [] }]) {
    const result = projectSchema.safeParse({ ...project, ...legacy });
    assert.equal(result.success, false);
    if (!result.success) assert.ok(result.error.issues.some(issue => issue.code === 'unrecognized_keys'));
  }
});

test('private and unavailable sources reject repository links but allow empty arrays and ordinary links', () => {
  for (const sourceStatus of ['private', 'unavailable'] as const) {
    for (const repositories of [[github], [gitee], [github, gitee]]) {
      const result = projectSchema.safeParse({ ...project, sourceStatus, repositories });
      assert.equal(result.success, false);
      if (!result.success) assert.ok(result.error.issues.some(issue => issue.path[0] === 'sourceStatus'));
    }
    const parsed = projectSchema.parse({ ...project, sourceStatus, repositories: [], links: [{ label: 'Demo video', url: 'https://example.com/demo' }] });
    assert.equal(parsed.sourceStatus, sourceStatus);
    assert.equal(parsed.links[0].label, 'Demo video');
  }
  assert.equal(projectSchema.safeParse({ ...project, sourceStatus: ['private', 'unavailable'] }).success, false);
});

test('ordinary links retain required labels and HTTPS addresses', () => {
  for (const links of [[{ url: 'https://example.com' }], [{ label: ' ', url: 'https://example.com' }], [{ label: 'Demo', url: 'http://example.com' }]]) {
    assert.equal(projectSchema.safeParse({ ...project, links }).success, false);
  }
  assert.equal(projectSchema.parse({ ...project, links: [{ label: ' Launch post ', url: 'https://example.com/post' }] }).links[0].label, 'Launch post');
});

test('full logo layout requires a valid local image while inset can use the default mark', () => {
  assert.equal(projectSchema.parse({ ...project, logoLayout: 'inset' }).logo, undefined);
  assert.equal(projectSchema.safeParse({ ...project, logoLayout: 'full' }).success, false);
  assert.equal(projectSchema.parse({ ...project, logoLayout: 'full', logo: '/assets/projects/example.png' }).logoLayout, 'full');
  assert.equal(projectSchema.safeParse({ ...project, logoLayout: 'cover', logo: '/assets/projects/example.png' }).success, false);
  assert.equal(projectSchema.safeParse({ ...project, logo: 'C:/example.png' }).success, false);
});

test('blog schema retains real date, language and draft validation', () => {
  assert.deepEqual(blogSchema.parse({ title: ' First blog ', pubDate: '2024-02-29', lang: 'zh-CN' }), {
    title: 'First blog', pubDate: '2024-02-29', lang: 'zh-CN', order: 0, draft: false
  });
  assert.equal(blogSchema.safeParse({ title: 'Blog', pubDate: '2025-02-29', lang: 'en' }).success, false);
  assert.equal(blogSchema.safeParse({ title: 'Blog', pubDate: '2026-10-28', lang: 'fr' }).success, false);
});