import { useEffect, useRef } from 'react';

/** A small modal for destructive actions (REQ-03-001: deleting asks first). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div
      className="modal-backdrop"
      onPointerDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="modal card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="form-actions">
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn btn--ghost" ref={cancelRef} onClick={onCancel}>
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
}
