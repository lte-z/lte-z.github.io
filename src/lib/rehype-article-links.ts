import type { Element, Root } from 'hast';

// 保留正文阅读位置；页内锚点和脚注仍在当前页跳转。
export default function articleLinks() {
  return (tree: Root) => {
    function visit(parent: Root | Element) {
      for (const node of parent.children) {
        if (node.type !== 'element') continue;
        if (node.tagName === 'a' && typeof node.properties.href === 'string') {
          const href = node.properties.href.trim();
          if (href && !href.startsWith('#')) {
            let destination: URL | undefined;
            try { destination = new URL(href, 'https://markdown.invalid/'); } catch {}
            if (destination?.protocol === 'https:' || destination?.protocol === 'http:') {
              node.properties.target = '_blank';
              const rel = node.properties.rel;
              const tokens = Array.isArray(rel) ? rel.map(String) : String(rel ?? '').split(/\s+/).filter(Boolean);
              node.properties.rel = [...new Set([...tokens, 'noopener', 'noreferrer'])];
            }
          }
        }
        visit(node);
      }
    }
    visit(tree);
  };
}