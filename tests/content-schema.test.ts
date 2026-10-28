import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectSchema, blogSchema } from '../src/lib/content-schema.ts';

const project = { id: 'example', title: 'Example', description: 'Example project.', order: 1 };
const github = { url: 'https://github.com/example/project' };
const gitee = { url: 'https://gitee.com/example/project' };

test('projects normalize omitted and empty link arrays without requiring metadata', () => {
  const parsed = projectSchema.parse(project);
  assert.deepEqual(parsed.github, []);
  assert.deepEqual(parsed.gitee, []);
  assert.deepEqual(parsed.links, []);
  assert.deepEqual(parsed.languages, []);
  assert.equal(parsed.logoLayout, 'inset');
  assert.deepEqual(projectSchema.parse({ ...project, github: [], gitee: [], links: [] }), parsed);
});

test('repository labels default for missing, null and blank values and trim custom text', () => {
  for (const [field, repository, fallback] of [['github', github, 'GitHub'], ['gitee', gitee, 'Gitee']] as const) {
    for (const label of [undefined, null, '', '   ']) {
      const parsed = projectSchema.parse({ ...project, [field]: [{ ...repository, label }] });
      assert.equal(parsed[field][0].label, fallback);
    }
    assert.equal(projectSchema.parse({ ...project, [field]: [{ ...repository, label: ' Server ' }] })[field][0].label, 'Server');
    assert.equal(projectSchema.safeParse({ ...project, [field]: [{ ...repository, label: 42 }] }).success, false);
  }
});

test('multiple repositories preserve their order and both platforms can coexist', () => {
  const parsed = projectSchema.parse({
    ...project,
    gitee: [{ ...gitee, label: 'MediaServer' }, { url: 'https://gitee.com/example/server', label: 'Server' }],
    github: [{ ...github, label: 'Simulator' }]
  });
  assert.deepEqual(parsed.gitee.map(link => link.label), ['MediaServer', 'Server']);
  assert.equal(parsed.github[0].label, 'Simulator');
});

test('repository fields reject legacy strings and invalid platform URLs', () => {
  for (const [field, valid, other] of [['github', github.url, gitee.url], ['gitee', gitee.url, github.url]] as const) {
    assert.equal(projectSchema.safeParse({ ...project, [field]: valid }).success, false);
    for (const url of [other, valid.replace('https:', 'http:'), 'not a URL', `https://${field}.com/example`]) {
      assert.equal(projectSchema.safeParse({ ...project, [field]: [{ url }] }).success, false, `${field}: ${url}`);
    }
  }
});

test('private and unavailable sources reject repository links but allow empty arrays and ordinary links', () => {
  for (const sourceStatus of ['private', 'unavailable'] as const) {
    for (const repositories of [{ github: [github] }, { gitee: [gitee] }, { github: [github], gitee: [gitee] }]) {
      const result = projectSchema.safeParse({ ...project, sourceStatus, ...repositories });
      assert.equal(result.success, false);
      if (!result.success) assert.ok(result.error.issues.some(issue => issue.path[0] === 'sourceStatus'));
    }
    const parsed = projectSchema.parse({ ...project, sourceStatus, github: [], gitee: [], links: [{ label: 'Demo video', url: 'https://example.com/demo' }] });
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