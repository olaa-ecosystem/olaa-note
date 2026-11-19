import { isBlank, sanitizeHtml, toBlocks } from './richText';

describe('sanitizeHtml', () => {
  it('keeps basic formatting and strips everything else', () => {
    const dirty =
      '<p onclick="x()">Xin <strong>chào</strong> <a href="javascript:x">link</a></p><script>alert(1)</script><img src=x onerror=alert(1)>';
    expect(sanitizeHtml(dirty)).toBe('<p>Xin <b>chào</b> link</p>');
    expect(sanitizeHtml('<ul><li>a</li></ul><h2 style="color:red">T</h2>')).toBe(
      '<ul><li>a</li></ul><h2>T</h2>',
    );
  });

  it('turns styled spans from the browser into b and i', () => {
    expect(
      sanitizeHtml(
        'A <span style="font-weight: 700;">b</span> <span style="font-style: italic">c</span>',
      ),
    ).toBe('A <b>b</b> <i>c</i>');
    expect(sanitizeHtml('<span style="font-weight: normal">plain</span>')).toBe('plain');
  });

  it('detects blank boxes', () => {
    expect(isBlank('<p> </p><br>')).toBe(true);
    expect(isBlank('<p>a</p>')).toBe(false);
  });
});

describe('toBlocks', () => {
  it('flattens headings, paragraphs and lists into styled runs', () => {
    const blocks = toBlocks(
      '<h2>Bài 1</h2><p>Học <b>từ</b> <i>mới</i></p><ol><li>một</li><li>hai</li></ol>',
    );
    expect(blocks.map((b) => [b.kind, b.marker])).toEqual([
      ['h2', ''],
      ['p', ''],
      ['li', '1. '],
      ['li', '2. '],
    ]);
    expect(blocks[0]?.runs[0]).toEqual({ text: 'Bài 1', bold: true, italic: false });
    expect(blocks[1]?.runs.map((r) => [r.text, r.bold, r.italic])).toEqual([
      ['Học ', false, false],
      ['từ', true, false],
      [' ', false, false],
      ['mới', false, true],
    ]);
  });
});
