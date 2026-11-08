'use client';

import type { Diagnostic } from '@tactiloom/contracts';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/client/api';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_S, LOCALE_INTL_TAGS, type Locale } from './config';
import { formatters, type Formatters } from './format';
import { DICTIONARIES, type Dictionary } from './index';
import { localizeDiagnostic, type LocalizedDiagnostic } from './render-diagnostic';

export interface I18n extends Formatters {
  readonly locale: Locale;
  readonly t: Dictionary;
  /** BCP 47 tag for Intl APIs (es-PE, en-US, it-IT, fr-FR). */
  readonly intlTag: string;
  /** Persists the choice (cookie), updates the page immediately and refreshes server components. */
  setLocale(locale: Locale): void;
  /** Text for an error thrown by the API client: Spanish shows the server message, others a text per code. */
  errorText(cause: unknown, fallback: string): string;
  diagnostic(diagnostic: Diagnostic): LocalizedDiagnostic;
}

function makeI18n(locale: Locale, setLocale: (locale: Locale) => void): I18n {
  const t = DICTIONARIES[locale];
  return {
    ...formatters(locale),
    locale,
    t,
    intlTag: LOCALE_INTL_TAGS[locale],
    setLocale,
    errorText(cause, fallback) {
      if (!(cause instanceof ApiError)) return fallback;
      if (cause.code === 'NETWORK') return t.errors.network;
      if (locale === 'es') return cause.message;
      return t.errors.api[cause.code] ?? `${t.errors.unexpected} (${cause.code})`;
    },
    diagnostic: (diagnostic) => localizeDiagnostic(diagnostic, locale),
  };
}

const I18nContext = createContext<I18n>(makeI18n(DEFAULT_LOCALE, () => undefined));

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const router = useRouter();
  // Optimistic choice: applied at once on the client; the refreshed server render (cookie) confirms it.
  const [chosen, setChosen] = useState<Locale | null>(null);
  const locale = chosen ?? initialLocale;

  const setLocale = useCallback(
    (next: Locale) => {
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_S}; SameSite=Lax${secure}`;
      document.documentElement.lang = next;
      setChosen(next);
      router.refresh();
    },
    [router],
  );

  const value = useMemo(() => makeI18n(locale, setLocale), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
