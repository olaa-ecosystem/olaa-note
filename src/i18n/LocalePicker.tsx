import { setLocale, tr, useLocale, type Locale } from './locale';

const OPTIONS: { id: Locale; label: string }[] = [
  { id: 'vi', label: 'Tiếng Việt' },
  { id: 'en', label: 'English' },
];

/** Interface language switch, shown in settings and on the welcome screen. */
export function LocalePicker() {
  const locale = useLocale();
  return (
    <div
      className="chip-row"
      role="radiogroup"
      aria-label={tr('Ngôn ngữ giao diện', 'App language')}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={locale === o.id}
          lang={o.id}
          className={`chip ${locale === o.id ? 'is-selected' : ''}`}
          onClick={() => setLocale(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
