import type { Element, Root, RootContent } from 'hast';

const element = (tagName: string, properties: Element['properties'], children: Element['children']): Element => ({ type: 'element', tagName, properties, children });

// 在高亮之后包装已有 pre/code，保留 Shiki token 与样式。
export default function codeBlocks() {
  return (tree: Root) => {
    function visit(parent: Root | Element) {
      parent.children = parent.children.map((node: RootContent) => {
        if (node.type !== 'element') return node;
        if (node.tagName !== 'pre') {
          visit(node);
          return node;
        }
        const code = node.children.find((child): child is Element => child.type === 'element' && child.tagName === 'code');
        if (!code) return node;
        const classes = Array.isArray(code.properties.className) ? code.properties.className.map(String) : [];
        const language = String(node.properties.dataLanguage ?? classes.find(value => value.startsWith('language-'))?.slice(9) ?? 'Code');
        const names: Record<string, string> = { ts: 'TypeScript', typescript: 'TypeScript', js: 'JavaScript', javascript: 'JavaScript', py: 'Python', python: 'Python', rust: 'Rust', sh: 'Shell', bash: 'Shell', text: 'Text' };
        const label = names[language.toLowerCase()] ?? language;
        return element('div', { className: ['code-frame'] }, [
          element('div', { className: ['code-toolbar'], lang: 'en' }, [
            element('span', {}, [{ type: 'text', value: label }]),
            element('button', { type: 'button', className: ['copy-code'], ariaLabel: `Copy ${label} code`, hidden: true }, [{ type: 'text', value: 'Copy' }])
          ]),
          node,
          element('span', { className: ['sr-only'], role: 'status', ariaLive: 'polite' }, [])
        ]);
      });
    }
    visit(tree);
  };
}