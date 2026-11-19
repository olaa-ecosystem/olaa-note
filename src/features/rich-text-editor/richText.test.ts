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

describe('PRD v1.0 blocks', () => {
  it('keeps checklists, quotes, code and safe links only', () => {
    const html =
      '<ul data-checklist onclick="x"><li data-checked="true" class="a">xong</li><li data-checked="nope">chưa</li></ul>' +
      '<blockquote style="x">trích</blockquote><pre>let a = 1;</pre>' +
      '<a href="https://olaa.vn" onclick="x">ok</a> <a href="javascript:alert(1)">xấu</a> <a href="data:text/html,x">data</a>';
    expect(sanitizeHtml(html)).toBe(
      '<ul data-checklist=""><li data-checked="true">xong</li><li>chưa</li></ul>' +
        '<blockquote>trích</blockquote><pre>let a = 1;</pre>' +
        '<a href="https://olaa.vn" target="_blank" rel="noopener noreferrer">ok</a> xấu data',
    );
  });

  it('turns them into export blocks with markers and styles', () => {
    const blocks = toBlocks(
      '<ul data-checklist=""><li data-checked="true">a</li><li>b</li></ul><blockquote>q</blockquote><pre>x\ny</pre><p><a href="https://x.y">l</a></p>',
    );
    expect(blocks.map((b) => [b.kind, b.marker, b.runs.map((r) => r.text).join('')])).toEqual([
      ['li', '☑ ', 'a'],
      ['li', '☐ ', 'b'],
      ['quote', '', 'q'],
      ['code', '', 'x'],
      ['code', '', 'y'],
      ['p', '', 'l'],
    ]);
    expect(blocks[5]?.runs[0]?.link).toBe(true);
    expect(blocks[3]?.runs[0]?.code).toBe(true);
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
    expect(blocks[0]?.runs[0]).toMatchObject({ text: 'Bài 1', bold: true, italic: false });
    expect(blocks[1]?.runs.map((r) => [r.text, r.bold, r.italic])).toEqual([
      ['Học ', false, false],
      ['từ', true, false],
      [' ', false, false],
      ['mới', false, true],
    ]);
  });
});
