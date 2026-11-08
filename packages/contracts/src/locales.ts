import { z } from 'zod';

/** Languages supported by the UI, the printable kit, reports and the vision overlay. */
export const LOCALES = ['es', 'en', 'it', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const LocaleSchema = z.enum(LOCALES);
export const DEFAULT_LOCALE: Locale = 'es';

/** Each language named in itself (used by the language switcher). */
export const LOCALE_NATIVE_NAMES: Readonly<Record<Locale, string>> = {
  es: 'Español',
  en: 'English',
  it: 'Italiano',
  fr: 'Français',
};

/** BCP 47 tags for Intl (dates, numbers, lists). */
export const LOCALE_INTL_TAGS: Readonly<Record<Locale, string>> = {
  es: 'es-PE',
  en: 'en-US',
  it: 'it-IT',
  fr: 'fr-FR',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the best supported locale from an Accept-Language header (RFC 9110 weights).
 * Unknown or malformed headers fall back to DEFAULT_LOCALE.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .slice(0, 512)
    .split(',')
    .map((part, index) => {
      const [tag = '', ...attributes] = part.trim().split(';');
      const qAttribute = attributes.map((attribute) => attribute.trim()).find((attribute) => attribute.startsWith('q='));
      const q = qAttribute ? Number(qAttribute.slice(2)) : 1;
      return { language: tag.trim().toLowerCase().split('-')[0] ?? '', q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return ranked.map((entry) => entry.language).find(isLocale) ?? DEFAULT_LOCALE;
}
