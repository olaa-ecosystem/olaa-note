import { safeFileName } from './exportPdf';

describe('safeFileName', () => {
  it('keeps names readable in plain ASCII', () => {
    expect(safeFileName('Tiếng Anh — Unit 3')).toBe('Tieng Anh - Unit 3.pdf');
    expect(safeFileName('Đề cương: Hoá/Lý?')).toBe('De cuong Hoa Ly.pdf');
    expect(safeFileName('   ')).toBe('ghi-chu.pdf');
  });
});
