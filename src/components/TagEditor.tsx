import { useState } from 'react';
import { normalizeTag } from '../utils/documents';
import { Icon } from './Icon';

export function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const t = normalizeTag(draft);
    setDraft('');
    if (t && !tags.includes(t)) onChange([...tags, t]);
  };

  return (
    <div className="tag-editor">
      <Icon name="tag" size={16} />
      {tags.map((t) => (
        <span key={t} className="chip">
          #{t}
          <button type="button" aria-label={`Bỏ thẻ ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}>
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder="Thêm thẻ…"
        aria-label="Thêm thẻ"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={add}
      />
    </div>
  );
}
