import { useEffect, useRef, useState } from 'react';
import type { PaperStyle } from '../../types/note';
import { COVER_COLORS } from '../../utils/documents';

const PAPERS: { value: PaperStyle; label: string }[] = [
  { value: 'lined', label: 'Kẻ dòng' },
  { value: 'grid', label: 'Ô vuông' },
  { value: 'dotted', label: 'Chấm' },
  { value: 'blank', label: 'Trơn' },
];

interface Props {
  onCancel: () => void;
  onCreate: (input: { title: string; cover: string; paper: PaperStyle }) => void;
}

export function NewNotebookDialog({ onCancel, onCreate }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState('');
  const [cover, setCover] = useState(COVER_COLORS[0]);
  const [paper, setPaper] = useState<PaperStyle>('lined');

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog ref={ref} className="dialog" onClose={onCancel} aria-labelledby="nnb-title">
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({ title: title.trim() || 'Sổ tay mới', cover, paper });
        }}
      >
        <h2 id="nnb-title">Sổ tay mới</h2>
        <div className="nnb-preview">
          <div className="cover" style={{ background: cover }}>
            <span>{title || 'Sổ tay mới'}</span>
          </div>
          <div className={`paper-sample paper-${paper}`} />
        </div>
        <label className="field">
          <span>Tên sổ tay</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Toán 12, Họp dự án…" />
        </label>
        <fieldset className="field">
          <legend>Màu bìa</legend>
          <div className="swatches">
            {COVER_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`swatch${c === cover ? ' is-active' : ''}`}
                style={{ background: c }}
                aria-label={`Màu ${c}`}
                aria-pressed={c === cover}
                onClick={() => setCover(c)}
              />
            ))}
          </div>
        </fieldset>
        <fieldset className="field">
          <legend>Mẫu giấy</legend>
          <div className="segmented">
            {PAPERS.map((p) => (
              <button
                type="button"
                key={p.value}
                className={p.value === paper ? 'is-active' : ''}
                aria-pressed={p.value === paper}
                onClick={() => setPaper(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            Huỷ
          </button>
          <button type="submit" className="btn primary">
            Tạo sổ tay
          </button>
        </div>
      </form>
    </dialog>
  );
}

export { PAPERS };
