import { render, screen } from '@testing-library/react';
import { LocalePicker } from './LocalePicker';
import { getLocale, pick, setLocale, tr } from './locale';

describe('interface language', () => {
  afterEach(() => setLocale('vi'));

  it('defaults to Vietnamese', () => {
    expect(getLocale()).toBe('vi');
    expect(tr('Xin chào', 'Hello')).toBe('Xin chào');
    expect(pick(['Lý thuyết', 'Theory'])).toBe('Lý thuyết');
  });

  it('switches to English, remembers it and sets the page language', () => {
    setLocale('en');
    expect(tr('Xin chào', 'Hello')).toBe('Hello');
    expect(pick(['Chỉ tiếng Việt', ''])).toBe('Chỉ tiếng Việt');
    expect(localStorage.getItem('olaa-takenote/locale')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('shows the picker with the current choice selected', () => {
    render(<LocalePicker />);
    expect(screen.getByRole('radio', { name: 'Tiếng Việt' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radiogroup', { name: 'Ngôn ngữ giao diện' })).toBeInTheDocument();
  });
});
