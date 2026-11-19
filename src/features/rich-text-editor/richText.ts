/**
 * Formatting for text boxes (REQ-03-011; Ecosystem PRD v1.0 §8.2): bold, italic, heading,
 * bulleted / numbered / check lists, quote, code and links.
 *
 * Everything stored is passed through `sanitizeHtml`. It keeps only the tags below and only
 * these attributes: `data-checklist` on lists, `data-checked` on list items, and `href` on
 * links when it is http(s) or mailto. Pasted or imported HTML can never run script or load
 * anything.
 */

const ALLOWED = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'H2',
  'UL',
  'OL',
  'LI',
  'P',
  'BR',
  'DIV',
  'BLOCKQUOTE',
  'PRE',
  'CODE',
  'A',
]);
const RENAME: Record<string, string> = { STRONG: 'B', EM: 'I', DIV: 'P' };
const SAFE_URL = /^(https?:\/\/|mailto:)/i;

export function safeHref(raw: string | null | undefined): string | null {
  const href = (raw ?? '').trim();
  if (!href) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(href) ? href : `https://${href}`;
  return SAFE_URL.test(withScheme) ? withScheme : null;
}

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const out = document.implementation.createHTMLDocument('');
  const walk = (node: Node, parent: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        parent.appendChild(out.createTextNode(child.textContent ?? ''));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE') return;
        if (tag === 'SPAN') {
          // Browsers sometimes format with styled spans instead of <b>/<i>.
          const weight = el.style.fontWeight;
          let target: Node = parent;
          if (weight === 'bold' || weight === 'bolder' || Number(weight) >= 700) {
            target = target.appendChild(out.createElement('b'));
          }
          if (el.style.fontStyle === 'italic') target = target.appendChild(out.createElement('i'));
          walk(child, target);
        } else if (tag === 'A') {
          const href = safeHref(el.getAttribute('href'));
          if (!href) {
            walk(child, parent);
            return;
          }
          const a = out.createElement('a');
          a.setAttribute('href', href);
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
          parent.appendChild(a);
          walk(child, a);
        } else if (ALLOWED.has(tag)) {
          const copy = out.createElement((RENAME[tag] ?? tag).toLowerCase());
          if (tag === 'UL' && el.hasAttribute('data-checklist'))
            copy.setAttribute('data-checklist', '');
          if (tag === 'LI' && el.getAttribute('data-checked') === 'true') {
            copy.setAttribute('data-checked', 'true');
          }
          parent.appendChild(copy);
          walk(child, copy);
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

/** Plain text of a text box, for search. */
export function plainText(html: string): string {
  const body = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
  body.querySelectorAll('br, p, li, h2, blockquote, pre').forEach((el) => el.append(' '));
  return (body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** A run of text with one style, for drawing text boxes onto a canvas in exports. */
export interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  code?: boolean;
  link?: boolean;
}

export interface Block {
  kind: 'p' | 'h2' | 'li' | 'quote' | 'code';
  /** "• ", "1. ", "☐ " or "☑ " for list items. */
  marker: string;
  runs: Run[];
}

/** Flatten sanitised HTML into paragraphs, headings, list items, quotes and code of styled runs. */
export function toBlocks(html: string): Block[] {
  const body = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
  const blocks: Block[] = [];
  let current: Block | null = null;
  let container: 'quote' | 'code' | null = null;

  const start = (kind: Block['kind'], marker = '') => {
    current = { kind: container && kind === 'p' ? container : kind, marker, runs: [] };
    blocks.push(current);
    return current;
  };
  type Style = Pick<Run, 'bold' | 'italic' | 'code' | 'link'>;
  type ListCtx = { n: number; ordered: boolean; checklist: boolean };
  const visit = (node: Node, style: Style, list?: ListCtx) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.textContent ?? '';
      if (!raw) return;
      if (container === 'code' || style.code) {
        // Keep line breaks inside code as separate lines.
        raw.split('\n').forEach((line, i) => {
          if (i > 0) start('code');
          if (line) (current ?? start('code')).runs.push({ text: line, ...style, code: true });
        });
        return;
      }
      (current ?? start('p')).runs.push({ text: raw, ...style });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName;
    const next: Style = {
      bold: style.bold || tag === 'B' || tag === 'H2',
      italic: style.italic || tag === 'I' || tag === 'BLOCKQUOTE',
      code: style.code || tag === 'CODE' || tag === 'PRE',
      link: style.link || tag === 'A',
    };
    if (tag === 'BR') {
      start('p');
      return;
    }
    if (tag === 'BLOCKQUOTE' || tag === 'PRE') {
      const outer = container;
      container = tag === 'PRE' ? 'code' : 'quote';
      current = null;
      el.childNodes.forEach((c) => visit(c, next, list));
      container = outer;
      current = null;
      return;
    }
    if (tag === 'P' || tag === 'H2') {
      start(tag === 'H2' ? 'h2' : 'p');
      el.childNodes.forEach((c) => visit(c, next, list));
      current = null;
      return;
    }
    if (tag === 'UL' || tag === 'OL') {
      const ctx: ListCtx = {
        n: 0,
        ordered: tag === 'OL',
        checklist: el.hasAttribute('data-checklist'),
      };
      el.childNodes.forEach((c) => visit(c, next, ctx));
      current = null;
      return;
    }
    if (tag === 'LI') {
      const n = list ? ++list.n : 1;
      const marker = list?.checklist
        ? el.getAttribute('data-checked') === 'true'
          ? '☑ '
          : '☐ '
        : list?.ordered
          ? `${n}. `
          : '• ';
      start('li', marker);
      el.childNodes.forEach((c) => visit(c, next, list));
      current = null;
      return;
    }
    el.childNodes.forEach((c) => visit(c, next, list));
  };
  body.childNodes.forEach((c) => visit(c, { bold: false, italic: false }));
  return blocks.filter((b) => b.runs.some((r) => r.text.trim() !== ''));
}

/** Turn the list around the caret into a checklist (or back), inside a contentEditable root. */
export function toggleChecklistAtSelection(root: HTMLElement): void {
  const caretList = (): HTMLUListElement | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    if (node === root) node = root.childNodes[sel.getRangeAt(0).startOffset] ?? root.lastChild;
    const el =
      node && (node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement);
    const list = el?.closest('ul') ?? null;
    return list && root.contains(list) ? list : null;
  };
  const existing = caretList();
  if (existing) {
    if (existing.hasAttribute('data-checklist')) existing.removeAttribute('data-checklist');
    else existing.setAttribute('data-checklist', '');
    return;
  }
  const before = new Set(root.querySelectorAll('ul'));
  document.execCommand('insertUnorderedList');
  const created = [...root.querySelectorAll('ul')].find((ul) => !before.has(ul)) ?? caretList();
  created?.setAttribute('data-checklist', '');
}
