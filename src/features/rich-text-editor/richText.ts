/**
 * Basic formatting for text boxes (REQ-03-011): bold, italic, heading, lists.
 * Everything stored is passed through `sanitizeHtml`, which keeps only these tags and no
 * attributes, so pasted or imported HTML can never run script or load anything.
 */

const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'H2', 'UL', 'OL', 'LI', 'P', 'BR', 'DIV']);
const RENAME: Record<string, string> = { STRONG: 'B', EM: 'I', DIV: 'P' };

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const out = document.implementation.createHTMLDocument('');
  const walk = (node: Node, parent: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        parent.appendChild(out.createTextNode(child.textContent ?? ''));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = (child as Element).tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE') return;
        if (tag === 'SPAN') {
          // Browsers sometimes format with styled spans instead of <b>/<i>.
          const style = (child as HTMLElement).style;
          const weight = style.fontWeight;
          let target: Node = parent;
          if (weight === 'bold' || weight === 'bolder' || Number(weight) >= 700) {
            target = target.appendChild(out.createElement('b'));
          }
          if (style.fontStyle === 'italic') target = target.appendChild(out.createElement('i'));
          walk(child, target);
        } else if (ALLOWED.has(tag)) {
          const el = out.createElement((RENAME[tag] ?? tag).toLowerCase());
          parent.appendChild(el);
          walk(child, el);
        } else {
          walk(child, parent);
        }
      }
    });
  };
  const container = out.createElement('div');
  walk(doc.body, container);
  return container.innerHTML;
}

export function isBlank(html: string): boolean {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() === '';
}

/** A run of text with one style, for drawing text boxes onto a canvas in exports. */
export interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
}

export interface Block {
  kind: 'p' | 'h2' | 'li';
  /** "• " or "1. " for list items. */
  marker: string;
  runs: Run[];
}

/** Flatten sanitised HTML into paragraphs, headings and list items of styled runs. */
export function toBlocks(html: string): Block[] {
  const body = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
  const blocks: Block[] = [];
  let current: Block | null = null;

  const start = (kind: Block['kind'], marker = '') => {
    current = { kind, marker, runs: [] };
    blocks.push(current);
    return current;
  };
  const visit = (
    node: Node,
    style: { bold: boolean; italic: boolean },
    listIndex?: { n: number; ordered: boolean },
  ) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (!text) return;
      (current ?? start('p')).runs.push({ text, ...style });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = (node as Element).tagName;
    const next = {
      bold: style.bold || tag === 'B' || tag === 'H2',
      italic: style.italic || tag === 'I',
    };
    if (tag === 'BR') {
      start(current?.kind === 'h2' ? 'p' : 'p');
      return;
    }
    if (tag === 'P' || tag === 'H2') {
      start(tag === 'H2' ? 'h2' : 'p');
      node.childNodes.forEach((c) => visit(c, next, listIndex));
      current = null;
      return;
    }
    if (tag === 'UL' || tag === 'OL') {
      const counter = { n: 0, ordered: tag === 'OL' };
      node.childNodes.forEach((c) => visit(c, next, counter));
      current = null;
      return;
    }
    if (tag === 'LI') {
      const n = listIndex ? ++listIndex.n : 1;
      start('li', listIndex?.ordered ? `${n}. ` : '• ');
      node.childNodes.forEach((c) => visit(c, next, listIndex));
      current = null;
      return;
    }
    node.childNodes.forEach((c) => visit(c, next, listIndex));
  };
  body.childNodes.forEach((c) => visit(c, { bold: false, italic: false }));
  return blocks.filter((b) => b.runs.some((r) => r.text.trim() !== ''));
}
