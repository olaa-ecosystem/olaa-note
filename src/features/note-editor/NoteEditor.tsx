import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import type { TextNote } from '../../types/note';
import { useStore } from '../../app/context';
import type { SaveStatus } from '../../stores/libraryStore';
import { navigate } from '../../hooks/useHashRoute';
import { Icon, type IconName } from '../../components/Icon';
import { SaveIndicator } from '../../components/SaveIndicator';
import { TagEditor } from '../../components/TagEditor';
import { sanitizeHtml } from '../../utils/sanitize';

interface Props {
  doc: TextNote;
  saveStatus: SaveStatus;
}

type Command = {
  icon: IconName;
  label: string;
  run: (editor: HTMLElement) => void;
};

function exec(cmd: string, value?: string) {
  // execCommand is deprecated but remains the only cross-browser way to drive
  // contenteditable formatting without a full editor framework.
  document.execCommand(cmd, false, value);
}

function closestInEditor(editor: HTMLElement, selector: string): HTMLElement | null {
  const sel = window.getSelection();
  let node: Node | null = sel?.anchorNode ?? null;
  while (node && node !== editor) {
    if (node instanceof HTMLElement && node.matches(selector)) return node;
    node = node.parentNode;
  }
  return null;
}

function toggleBlock(editor: HTMLElement, tag: 'h1' | 'h2' | 'blockquote') {
  const inside = closestInEditor(editor, tag);
  exec('formatBlock', inside ? 'p' : tag);
}

function toggleChecklist(editor: HTMLElement) {
  const list = closestInEditor(editor, 'ul');
  if (list?.hasAttribute('data-checklist')) {
    exec('insertUnorderedList'); // turns list back into paragraphs
    return;
  }
  if (!list) exec('insertUnorderedList');
  const ul = closestInEditor(editor, 'ul');
  if (!ul) return;
  ul.setAttribute('data-checklist', '');
  ul.querySelectorAll(':scope > li').forEach((li) => {
    if (!li.hasAttribute('data-checked')) li.setAttribute('data-checked', 'false');
  });
}

const COMMANDS: Command[] = [
  { icon: 'bold', label: 'Đậm (Ctrl+B)', run: () => exec('bold') },
  { icon: 'italic', label: 'Nghiêng (Ctrl+I)', run: () => exec('italic') },
  { icon: 'underline', label: 'Gạch chân (Ctrl+U)', run: () => exec('underline') },
  { icon: 'strike', label: 'Gạch ngang', run: () => exec('strikeThrough') },
  { icon: 'mark', label: 'Tô sáng', run: () => exec('hiliteColor', '#ffe58a') },
  { icon: 'list', label: 'Danh sách dấu chấm', run: () => exec('insertUnorderedList') },
  { icon: 'olist', label: 'Danh sách đánh số', run: () => exec('insertOrderedList') },
  { icon: 'check', label: 'Danh sách việc cần làm', run: toggleChecklist },
  { icon: 'quote', label: 'Trích dẫn', run: (ed) => toggleBlock(ed, 'blockquote') },
  { icon: 'clear', label: 'Xoá định dạng', run: () => exec('removeFormat') },
];

export function NoteEditor({ doc, saveStatus }: Props) {
  const store = useStore();
  const editorRef = useRef<HTMLDivElement>(null);

  // Uncontrolled editor: seed once, then the DOM is the source of truth while editing.
  useEffect(() => {
    const el = editorRef.current;
    if (el) {
      el.innerHTML = sanitizeHtml(doc.html);
      if (!doc.html) el.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    const el = editorRef.current;
    if (!el) return;
    // Items created by pressing Enter inherit the checked state; normalise new empty ones.
    el.querySelectorAll('ul[data-checklist] > li:not([data-checked])').forEach((li) =>
      li.setAttribute('data-checked', 'false'),
    );
    const caretItem = closestInEditor(el, 'ul[data-checklist] > li');
    if (caretItem && !caretItem.textContent?.trim()) caretItem.setAttribute('data-checked', 'false');
    const html = el.innerHTML;
    const plainText = el.innerText.replace(/\n{3,}/g, '\n\n').trim();
    store.update<TextNote>(doc.id, (d) => (d.html === html ? d : { ...d, html, plainText }));
  };

  const onEditorClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const li = (e.target as HTMLElement).closest('ul[data-checklist] > li');
    if (!(li instanceof HTMLElement)) return;
    const rect = li.getBoundingClientRect();
    if (e.clientX - rect.left > 26) return; // only the checkbox gutter toggles
    li.setAttribute('data-checked', li.getAttribute('data-checked') === 'true' ? 'false' : 'true');
    sync();
  };

  return (
    <div className="editor-shell note-editor">
      <header className="editor-topbar">
        <button className="icon-btn" aria-label="Về thư viện" onClick={() => navigate({ name: 'library' })}>
          <Icon name="back" />
        </button>
        <input
          className="title-input"
          value={doc.title}
          placeholder="Tiêu đề"
          aria-label="Tiêu đề ghi chú"
          onChange={(e) => store.update<TextNote>(doc.id, (d) => ({ ...d, title: e.target.value }))}
        />
        <SaveIndicator status={saveStatus} />
        <button
          className={`icon-btn${doc.pinned ? ' is-on' : ''}`}
          aria-label={doc.pinned ? 'Bỏ ghim' : 'Ghim'}
          aria-pressed={doc.pinned}
          onClick={() => store.update(doc.id, (d) => ({ ...d, pinned: !d.pinned }), false)}
        >
          <Icon name="pin" />
        </button>
        <button
          className="icon-btn"
          aria-label="Chuyển vào thùng rác"
          onClick={() => {
            store.trash(doc.id);
            navigate({ name: 'library' });
          }}
        >
          <Icon name="trash" />
        </button>
      </header>

      <div className="format-toolbar" role="toolbar" aria-label="Định dạng văn bản">
        <button
          className="tool-btn text"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editorRef.current && toggleBlock(editorRef.current, 'h1')}
          title="Tiêu đề lớn"
        >
          H1
        </button>
        <button
          className="tool-btn text"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editorRef.current && toggleBlock(editorRef.current, 'h2')}
          title="Tiêu đề phụ"
        >
          H2
        </button>
        <span className="divider" />
        {COMMANDS.map((c) => (
          <button
            key={c.icon}
            className="tool-btn"
            title={c.label}
            aria-label={c.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!editorRef.current) return;
              editorRef.current.focus();
              c.run(editorRef.current);
              sync();
            }}
          >
            <Icon name={c.icon} size={18} />
          </button>
        ))}
      </div>

      <div className="note-scroll">
        <article className="note-paper">
          <div
            ref={editorRef}
            className="rich-text"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline
            aria-label="Nội dung ghi chú"
            data-placeholder="Bắt đầu viết…"
            onInput={sync}
            onClick={onEditorClick}
            onPaste={(e) => {
              const html = e.clipboardData.getData('text/html');
              if (!html) return; // plain-text paste is safe by default
              e.preventDefault();
              exec('insertHTML', sanitizeHtml(html));
              sync();
            }}
          />
          <TagEditor tags={doc.tags} onChange={(tags) => store.update(doc.id, (d) => ({ ...d, tags }))} />
        </article>
      </div>
    </div>
  );
}
