/** Colour theme preference: follow the operating system (default) or pin the light or dark theme. */
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** Preference cookie (not a secret: the header switcher writes it and the server renders it). */
export const THEME_COOKIE = 'tactiloom_theme';
export const THEME_COOKIE_MAX_AGE_S = 365 * 24 * 3600;

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

/** Value of `<html data-theme>`; absent while the operating system decides (see globals.css). */
export function themeAttribute(preference: ThemePreference): 'light' | 'dark' | undefined {
  return preference === 'system' ? undefined : preference;
}
