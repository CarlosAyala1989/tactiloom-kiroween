'use client';

import { useId, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE_S, THEME_PREFERENCES, themeAttribute, type ThemePreference } from '@/lib/theme';

const ICON = {
  viewBox: '0 0 16 16',
  className: 'h-3.5 w-3.5',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const ICONS: Record<ThemePreference, ReactNode> = {
  system: (
    <svg {...ICON}>
      <rect x="1.75" y="2.5" width="12.5" height="8.5" rx="1.25" />
      <path d="M5.5 14h5M8 11v3" />
    </svg>
  ),
  light: (
    <svg {...ICON}>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
    </svg>
  ),
  dark: (
    <svg {...ICON}>
      <path d="M13.5 9.6A5.75 5.75 0 0 1 6.4 2.5a5.75 5.75 0 1 0 7.1 7.1Z" />
    </svg>
  ),
};

/** Applies the choice to <html data-theme> at once and keeps it in a cookie for the server render. */
function applyTheme(next: ThemePreference): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_S}; SameSite=Lax${secure}`;
  const attribute = themeAttribute(next);
  if (attribute) document.documentElement.dataset.theme = attribute;
  else delete document.documentElement.dataset.theme;
}

/** Light, dark or the operating system's theme, as native radios (arrow keys move the choice). */
export function ThemeSwitcher({ initialTheme }: { initialTheme: ThemePreference }) {
  const { t } = useI18n();
  const name = useId();
  const [theme, setTheme] = useState(initialTheme);
  const choose = (next: ThemePreference) => {
    applyTheme(next);
    setTheme(next);
  };
  return (
    <fieldset className="flex items-center gap-0.5 rounded-md border border-ink-600 bg-ink-850 p-0.5" data-testid="theme-switcher">
      <legend className="sr-only">{t.theme.label}</legend>
      {THEME_PREFERENCES.map((value) => (
        <label
          key={value}
          title={t.theme[value]}
          className="relative grid h-6 w-7 cursor-pointer place-items-center rounded text-muted hover:text-paper has-[:checked]:bg-ink-700 has-[:checked]:text-paper has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-amber-strong"
        >
          {/* The real radio covers the whole option (transparent), so pointer, keyboard and assistive tech all use it. */}
          <input
            type="radio"
            name={name}
            value={value}
            checked={theme === value}
            onChange={() => choose(value)}
            className="absolute inset-0 m-0 cursor-pointer appearance-none rounded opacity-0"
          />
          <span className="sr-only">{t.theme[value]}</span>
          {ICONS[value]}
        </label>
      ))}
    </fieldset>
  );
}
