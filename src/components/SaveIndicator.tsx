import type { SaveStatus } from '../stores/libraryStore';

const LABELS: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Đang lưu…',
  saved: 'Đã lưu trên máy',
  error: 'Lỗi khi lưu',
};

export function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <span className={`save-indicator is-${status}`} role="status" aria-live="polite">
      {LABELS[status]}
    </span>
  );
}
