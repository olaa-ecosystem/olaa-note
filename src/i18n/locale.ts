/**
 * Interface language: Vietnamese (default) or English. Text is written in place as
 * `tr('tiếng Việt', 'English')`, so both versions sit side by side and none can go missing.
 * The app remounts when the language changes, so every screen picks it up.
 */
import { useSyncExternalStore } from 'react';

export type Locale = 'vi' | 'en';

const KEY = 'olaa-takenote/locale';
const listeners = new Set<() => void>();

function read(): Locale {
  try {
    return window.localStorage.getItem(KEY) === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
}

let current: Locale = typeof window === 'undefined' ? 'vi' : read();
if (typeof document !== 'undefined') document.documentElement.lang = current;

export function getLocale(): Locale {
  return current;
}

export function setLocale(next: Locale): void {
  if (next === current) return;
  current = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    // Not remembered when storage is blocked; the choice still applies now.
  }
  document.documentElement.lang = next;
  listeners.forEach((l) => l());
}

export function useLocale(): Locale {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getLocale,
    getLocale,
  );
}

/** The text in the interface language. */
export function tr(vi: string, en: string): string {
  return current === 'en' ? en : vi;
}

/** Number formatting for the interface language. */
export function formatNumber(n: number): string {
  return n.toLocaleString(current === 'en' ? 'en-US' : 'vi-VN');
}

/** A [Vietnamese, English] pair from content, in the interface language. */
export function pick(pair: readonly [string, string]): string {
  return current === 'en' ? pair[1] || pair[0] : pair[0];
}
