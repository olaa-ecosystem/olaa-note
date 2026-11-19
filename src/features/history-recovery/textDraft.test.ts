import { clearTextDraft, loadTextDraft, saveTextDraft } from './textDraft';

describe('text draft recovery', () => {
  it('stores the latest typing and clears it once saved', () => {
    saveTextDraft({ pageId: 'p', itemId: null, x: 10, y: 20, html: '<p>đang gõ</p>', at: 1 });
    expect(loadTextDraft()).toMatchObject({ pageId: 'p', html: '<p>đang gõ</p>', x: 10 });
    clearTextDraft();
    expect(loadTextDraft()).toBeNull();
  });
});
