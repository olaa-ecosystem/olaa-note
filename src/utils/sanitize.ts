/**
 * Allow-list HTML sanitiser for rich-text note bodies (browser only — uses DOMParser).
 * Applied to pasted content and to every note body before it is rendered, so imported
 * backups cannot inject scripts or event handlers.
 */
const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'P', 'DIV', 'BR', 'SPAN',
  'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'HR', 'A', 'IMG',
  'INPUT', 'LABEL', 'MARK', 'FONT',
]);

const ALLOWED_ATTRS: Record<string, string[]> = {
  A: ['href'],
  IMG: ['src', 'alt'],
  INPUT: ['type', 'checked', 'data-checked'],
  LI: ['data-checked'],
  UL: ['data-checklist'],
  FONT: ['color'],
  MARK: [],
};

function safeUrl(value: string, allowData: boolean): boolean {
  const v = value.trim().toLowerCase();
  if (v.startsWith('https:') || v.startsWith('http:') || v.startsWith('mailto:')) return true;
  return allowData && /^data:image\/(png|jpe?g|gif|webp);/.test(v);
}

function clean(node: Node, doc: Document): void {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      if (!ALLOWED_TAGS.has(el.tagName)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE'].includes(el.tagName)) {
          el.remove();
          continue;
        }
        // Unwrap unknown element, keep its children.
        clean(el, doc);
        el.replaceWith(...el.childNodes);
        continue;
      }
      const allowed = ALLOWED_ATTRS[el.tagName] ?? [];
      for (const attr of [...el.attributes]) {
        if (!allowed.includes(attr.name)) el.removeAttribute(attr.name);
      }
      if (el.tagName === 'A') {
        const href = el.getAttribute('href') ?? '';
        if (!safeUrl(href, false)) el.removeAttribute('href');
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
      if (el.tagName === 'IMG' && !safeUrl(el.getAttribute('src') ?? '', true)) {
        el.remove();
        continue;
      }
      if (el.tagName === 'INPUT' && el.getAttribute('type') !== 'checkbox') {
        el.remove();
        continue;
      }
      clean(el, doc);
    } else if (child.nodeType !== Node.TEXT_NODE) {
      child.remove();
    }
  }
}

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  clean(doc.body, doc);
  return doc.body.innerHTML;
}
