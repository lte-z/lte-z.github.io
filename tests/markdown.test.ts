import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkCjkFriendly from 'remark-cjk-friendly/parseOnly';
import remarkCjkFriendlyStrikethrough from 'remark-cjk-friendly-gfm-strikethrough/parseOnly';
import config from '../astro.config.mjs';
import articleLinks from '../src/lib/rehype-article-links.ts';
import type { Root, Element } from 'hast';

const processor = await config.markdown.processor.createRenderer(config.markdown);
const options = config.markdown.processor.options;
const standard = await createMarkdownProcessor({
  ...config.markdown,
  ...options,
  remarkPlugins: options.remarkPlugins.filter(plugin => plugin !== remarkCjkFriendly && plugin !== remarkCjkFriendlyStrikethrough)
});
const render = async (markdown: string) => (await processor.render(markdown)).code;

test('Chinese bold handles punctuation beside text and at paragraph endings', async () => {
  for (const [markdown, expected] of [
    ['前文**加粗。**后文', '<p>前文<strong>加粗。</strong>后文</p>'],
    ['**重点！**后文', '<p><strong>重点！</strong>后文</p>']
  ]) {
    assert.notEqual((await standard.render(markdown)).code, expected);
    assert.equal(await render(markdown), expected);
  }
  assert.equal(await render('前文。**段末加粗。**'), '<p>前文。<strong>段末加粗。</strong></p>');
});

test('CJK emphasis handles opening and closing punctuation, Japanese, Korean and nesting', async () => {
  for (const [markdown, expected] of [
    ['前文**「重点」**后文。', '<p>前文<strong>「重点」</strong>后文。</p>'],
    ['**知らない。**でも続ける。', '<p><strong>知らない。</strong>でも続ける。</p>'],
    ['**몰라요.**하지만 계속해요.', '<p><strong>몰라요.</strong>하지만 계속해요.</p>'],
    ['*中文。*后文', '<p><em>中文。</em>后文</p>'],
    ['***中文。***后文', '<p><em><strong>中文。</strong></em>后文</p>']
  ]) assert.equal(await render(markdown), expected);
});

test('CJK GFM strikethrough uses the same punctuation boundaries', async () => {
  assert.equal(await render('~~旧内容。~~继续写。'), '<p><del>旧内容。</del>继续写。</p>');
  assert.equal(await render('~~古い。~~新しい。'), '<p><del>古い。</del>新しい。</p>');
});

test('emphasis can contain links and inline code next to CJK text', async () => {
  assert.equal(await render('**[链接](https://example.com/)**后文'), '<p><strong><a href="https://example.com/" target="_blank" rel="noopener noreferrer">链接</a></strong>后文</p>');
  assert.equal(await render('**`code`**后文'), '<p><strong><code>code</code></strong>后文</p>');
});

test('escapes, literal asterisks, inline code and fenced code remain literal', async () => {
  assert.equal(await render(String.raw`\*\*中文。\*\*后文`), '<p>**中文。**后文</p>');
  assert.equal(await render('`**中文。**`后文'), '<p><code>**中文。**</code>后文</p>');
  const html = await render('```text\n**中文。**\n*中文。*\n~~中文。~~\n```');
  assert.ok(html.includes('class="code-frame"'));
  assert.ok(html.includes('class="copy-code"'));
  assert.ok(html.includes('**中文。**'));
  assert.ok(html.includes('~~中文。~~'));
  assert.ok(!html.includes('<strong>') && !html.includes('<em>') && !html.includes('<del>'));
});

test('English emphasis, underscores, URLs, HTML and ordinary Markdown retain standard output', async () => {
  for (const markdown of [
    '**bold** and *italic* and ~~deleted~~.',
    '**English!**next',
    'foo_bar_baz and __bold__ and _italic_',
    '__中文。__后文',
    'https://example.com/a_b?q=a*b',
    '<span title="a*b">**literal HTML attribute**</span>',
    '# Heading\n\nParagraph with [a link](https://example.com/) and ![image](https://example.com/image.png).',
    '> Quote\n\n1. First\n2. Second\n\n- [x] Done\n- [ ] Pending',
    '| A | B |\n| --- | --- |\n| 1 | 2 |\n\nFootnote[^note].\n\n[^note]: Footnote body.'
  ]) assert.equal(await render(markdown), (await standard.render(markdown)).code, markdown);
});

test('math remains KaTeX output and asterisks inside formulas are protected', async () => {
  const html = await render('公式 $a*b$。\n\n$$\nx^2 + y^2 = 1\n$$');
  assert.ok(html.includes('class="katex"'));
  assert.ok(html.includes('class="katex-display"'));
  assert.ok(html.includes('<annotation encoding="application/x-tex">a*b</annotation>'));
  assert.ok(html.includes('x^2 + y^2 = 1'));
  assert.ok(!html.includes('<em>'));
});

test('syntax highlighting, code controls and heading metadata remain available', async () => {
  const result = await processor.render('## Section\n\n```ts\nconst value = 42;\n```');
  assert.deepEqual(result.metadata.headings.map(heading => ({ depth: heading.depth, slug: heading.slug })), [{ depth: 2, slug: 'section' }]);
  assert.ok(result.code.includes('class="code-frame"'));
  assert.ok(result.code.includes('data-language="ts"'));
  assert.ok(result.code.includes('Copy TypeScript code'));
  assert.ok(result.code.includes('<span'));
});

test('article web links open in a new tab while anchors, footnotes and special schemes stay local', async () => {
  const html = await render('[External](https://example.com/) [RSS](/rss.xml) [Relative](./other/) [Network](//example.com/other) [Anchor](#section) [Email](mailto:hello@example.com) [Call](tel:12345)\n\nText[^note].\n\n[^note]: Note body.');
  const anchors = html.match(/<a\b[^>]*>/g) ?? [];
  assert.equal(anchors.filter(a => a.includes('target="_blank"')).length, 4);
  for (const anchor of anchors) {
    const href = anchor.match(/href="([^"]+)"/)![1];
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) assert.ok(!anchor.includes('target='), anchor);
    else {
      assert.ok(anchor.includes('target="_blank"'), anchor);
      assert.ok(anchor.includes('rel="noopener noreferrer"'), anchor);
    }
  }
});

test('new-tab links retain existing relation tokens without duplicates', () => {
  const link: Element = { type: 'element', tagName: 'a', properties: { href: 'https://example.com/', rel: ['nofollow', 'noopener'] }, children: [] };
  const tree: Root = { type: 'root', children: [link] };
  articleLinks()(tree);
  assert.equal(link.properties.target, '_blank');
  assert.deepEqual(link.properties.rel, ['nofollow', 'noopener', 'noreferrer']);
});

test('authored punctuation is preserved without smart quote or dash substitutions', async () => {
  for (const markdown of [
    `I'm here! "Plain quotes", don't change -- or ...`,
    '“中文引号”，以及「日本語の引用」。'
  ]) {
    assert.equal(await render(markdown), `<p>${markdown}</p>`);
  }
});