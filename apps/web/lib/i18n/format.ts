import { LOCALE_INTL_TAGS, type Locale } from '@tactiloom/contracts';

/** Locale-aware formatters shared by client and server components. */
export interface Formatters {
  /** Short date + time (dates come from the API as ISO strings). */
  date(value: string | Date | null | undefined): string;
  bytes(bytes: number): string;
  number(value: number, fractionDigits?: number): string;
  /** "a, b and c" in the current language. */
  list(items: readonly string[], type?: 'conjunction' | 'disjunction'): string;
}

export function formatters(locale: Locale): Formatters {
  const tag = LOCALE_INTL_TAGS[locale];
  const fixed = (value: number, digits: number) => new Intl.NumberFormat(tag, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  return {
    date(value) {
      if (!value) return '—';
      return new Date(value).toLocaleString(tag, { dateStyle: 'short', timeStyle: 'medium' });
    },
    bytes(bytes) {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${fixed(bytes / 1024, 1)} KB`;
      return `${fixed(bytes / 1024 / 1024, 2)} MB`;
    },
    number(value, fractionDigits = 0) {
      return fixed(value, fractionDigits);
    },
    list(items, type = 'conjunction') {
      return new Intl.ListFormat(tag, { style: 'long', type }).format(items);
    },
  };
}
