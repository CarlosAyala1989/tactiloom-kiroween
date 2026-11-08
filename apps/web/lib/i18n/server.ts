import 'server-only';
import { cookies, headers } from 'next/headers';
import { isLocale, LOCALE_COOKIE, LOCALE_INTL_TAGS, negotiateLocale, type Locale } from './config';
import { formatters, type Formatters } from './format';
import { DICTIONARIES, type Dictionary } from './index';

/** Cookie preference first, then Accept-Language, then Spanish. */
export async function getLocale(): Promise<Locale> {
  const preferred = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(preferred)) return preferred;
  return negotiateLocale((await headers()).get('accept-language'));
}

export async function getServerI18n(): Promise<Formatters & { locale: Locale; t: Dictionary; intlTag: string }> {
  const locale = await getLocale();
  return { ...formatters(locale), locale, t: DICTIONARIES[locale], intlTag: LOCALE_INTL_TAGS[locale] };
}

/** Same rule for route handlers that only have the raw Request. */
export function localeFromRequest(request: Request): Locale {
  const cookieHeader = request.headers.get('cookie') ?? '';
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === LOCALE_COOKIE) {
      const value = rest.join('=');
      if (isLocale(value)) return value;
    }
  }
  return negotiateLocale(request.headers.get('accept-language'));
}
