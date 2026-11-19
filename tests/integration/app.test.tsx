import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import { db } from '../../src/services/db';
import { noteStore, PAGE_SAVE_DELAY_MS } from '../../src/stores/noteStore';

async function settle() {
  await act(async () => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  noteStore.resetForTests();
  window.location.hash = '';
});

describe('library', () => {
  it('creates a notebook and opens its first page', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/chưa có sổ tay nào/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /sổ tay mới/i }));
    await user.type(screen.getByLabelText(/tên sổ/i), 'Tiếng Anh');
    await user.click(screen.getByRole('button', { name: 'Ô vuông' }));
    await user.click(screen.getByRole('button', { name: /tạo sổ tay/i }));
    await settle();

    expect(screen.getByRole('textbox', { name: /tên sổ tay/i })).toHaveValue('Tiếng Anh');
    expect(screen.getByText('Trang 1/1')).toBeInTheDocument();
    const nb = Object.values(noteStore.getState().notebooks)[0]!;
    expect(noteStore.getState().pages[nb.pageIds[0]!]?.template).toBe('grid');
  });

  it('moves a notebook to the trash after confirming, and restores it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /sổ tay mới/i }));
    await user.type(screen.getByLabelText(/tên sổ/i), 'Hoá');
    await user.click(screen.getByRole('button', { name: /tạo sổ tay/i }));
    window.location.hash = '#/';
    await settle();

    await user.click(screen.getByRole('button', { name: /xoá hoá/i }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: /chuyển vào thùng rác/i,
      }),
    );
    expect(screen.queryByRole('link', { name: /hoá/i })).toBeNull();

    await user.click(screen.getByRole('link', { name: /thùng rác \(1\)/i }));
    await settle();
    await user.click(screen.getByRole('button', { name: /khôi phục/i }));
    expect(Object.values(noteStore.getState().notebooks)[0]?.deletedAt).toBeNull();
  });
});

describe('notebook editor', () => {
  async function openNew(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(screen.getByRole('button', { name: /sổ tay mới/i }));
    await user.click(screen.getByRole('button', { name: /tạo sổ tay/i }));
    await settle();
    const nb = Object.values(noteStore.getState().notebooks)[0]!;
    return { nb, pageId: nb.pageIds[0]! };
  }

  it('adds a formatted-free text box with the text tool, then undoes and redoes it', async () => {
    const user = userEvent.setup();
    const { pageId } = await openNew(user);

    await user.click(screen.getByRole('button', { name: 'Chữ' }));
    const paper = screen.getByTestId('page-editor').querySelector('.paper__bg')!;
    await user.pointer({ keys: '[MouseLeft]', target: paper });
    const box = await screen.findByRole('textbox', { name: /khung chữ/i });
    await user.type(box, 'Từ mới: apple');
    await user.click(screen.getByRole('button', { name: 'Chọn' }));

    const items = noteStore.getState().pages[pageId]!.items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'text' });
    expect((items[0] as { html: string }).html).toContain('Từ mới: apple');

    await user.click(screen.getByRole('button', { name: 'Hoàn tác' }));
    expect(noteStore.getState().pages[pageId]!.items).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Làm lại' }));
    expect(noteStore.getState().pages[pageId]!.items).toHaveLength(1);
  });

  it('adds, navigates and deletes pages; the last page cannot be deleted', async () => {
    const user = userEvent.setup();
    const { nb } = await openNew(user);
    expect(screen.getByRole('button', { name: 'Xoá trang' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /trang mới/i }));
    await settle();
    expect(screen.getByText('Trang 2/2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xoá trang' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xoá trang' }),
    );
    await settle();
    expect(noteStore.getState().notebooks[nb.id]?.pageIds).toHaveLength(1);
    expect(screen.getByText('Trang 1/1')).toBeInTheDocument();
  });

  it('saves pages to IndexedDB shortly after an edit', async () => {
    const user = userEvent.setup();
    const { pageId } = await openNew(user);
    noteStore.editItems(pageId, (items) => [
      ...items,
      { id: 't1', kind: 'text', x: 10, y: 10, width: 200, html: '<p>hi</p>' },
    ]);
    await act(async () => {
      await new Promise((r) => setTimeout(r, PAGE_SAVE_DELAY_MS + 100));
    });
    const saved = (await db.allPages()).find((p) => p.id === pageId);
    expect(saved?.items).toHaveLength(1);
  });
});

describe('PRD v1.0: tags, search and save state', () => {
  it('tags a page, finds it by tag and by typed text, and shows the save state', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /sổ tay mới/i }));
    await user.type(screen.getByLabelText(/tên sổ/i), 'Tiếng Anh');
    await user.click(screen.getByRole('button', { name: /tạo sổ tay/i }));
    await settle();

    const nb = Object.values(noteStore.getState().notebooks)[0]!;
    noteStore.editItems(nb.pageIds[0]!, (items) => [
      ...items,
      { id: 't1', kind: 'text', x: 10, y: 10, width: 200, html: '<p>apple: quả táo</p>' },
    ]);

    await user.type(screen.getByLabelText(/thêm thẻ cho trang/i), 'Từ vựng{Enter}');
    expect(screen.getByRole('link', { name: '#Từ vựng' })).toBeInTheDocument();
    await act(async () => {
      await new Promise((r) => setTimeout(r, PAGE_SAVE_DELAY_MS + 100));
    });
    expect(screen.getByText('Đã lưu trên máy')).toBeInTheDocument();

    window.location.hash = '#/';
    await settle();
    await user.type(screen.getByRole('searchbox'), 'qua tao{Enter}');
    await settle();
    expect(screen.getByRole('heading', { name: 'Tìm kiếm' })).toBeInTheDocument();
    expect(screen.getByText('quả táo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /#Từ vựng/ }));
    await settle();
    expect(screen.getByText('1 kết quả', { exact: false })).toBeInTheDocument();
  });
});
