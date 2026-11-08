export { DEFAULT_LOCALE, isLocale, LOCALE_INTL_TAGS, LOCALE_NATIVE_NAMES, LOCALES, negotiateLocale, type Locale } from '@tactiloom/contracts';

/** Preference cookie (not a secret: readable by the page so the switcher can set it). */
export const LOCALE_COOKIE = 'tactiloom_locale';
export const LOCALE_COOKIE_MAX_AGE_S = 365 * 24 * 3600;
