'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useState } from 'react';
import { isLocale, LOCALE_NATIVE_NAMES, LOCALES } from '@/lib/i18n/config';
import { useI18n } from '@/lib/i18n/provider';
import { SystemStatus } from './SystemStatus';
import { useSession } from './SessionProvider';

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="6" fill="#27211a" stroke="#f0a43c" strokeWidth="1.5" />
      <rect x="5" y="9" width="5" height="10" rx="1.2" fill="#2f9e44" />
      <rect x="11.5" y="9" width="5" height="10" rx="1.2" fill="#e67700" />
      <rect x="18" y="9" width="5" height="10" rx="1.2" fill="#495057" />
      <path d="M8 22 H21" stroke="#f0a43c" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Language picker: each language is named in itself; the choice is kept in a cookie. */
function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const id = useId();
  const [announcement, setAnnouncement] = useState('');
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className="sr-only">
        {t.language.label}
      </label>
      <span aria-hidden="true" className="text-muted">
        🌐
      </span>
      <select
        id={id}
        data-testid="language-switcher"
        className="rounded-md border border-ink-600 bg-ink-850 px-1.5 py-1 text-xs text-paper"
        value={locale}
        onChange={(event) => {
          const next = event.target.value;
          if (!isLocale(next)) return;
          setLocale(next);
          setAnnouncement(t.language.changed(LOCALE_NATIVE_NAMES[next]));
        }}
      >
        {LOCALES.map((value) => (
          <option key={value} value={value} lang={value}>
            {LOCALE_NATIVE_NAMES[value]}
          </option>
        ))}
      </select>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  const session = useSession();
  const { t } = useI18n();
  const hours = session.hoursLeft;
  const links = [
    { href: '/studio', label: t.nav.studio },
    { href: '/simulator', label: t.nav.simulator },
    { href: '/gallery', label: t.nav.gallery },
    { href: '/history', label: t.nav.history },
    { href: '/kit', label: t.nav.kit },
    { href: '/how-it-works', label: t.nav.howItWorks },
    { href: '/help', label: t.nav.help },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900/90 backdrop-blur">
      <nav aria-label={t.nav.label} className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <Logo />
          <span className="text-lg">{t.appName}</span>
        </Link>
        <ul className="flex flex-wrap items-center gap-1 text-sm">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-md px-2.5 py-1.5 ${active ? 'bg-ink-700 text-paper' : 'text-muted hover:text-paper'}`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted">
          {hours !== null && <span title={t.nav.demoExpiresTitle}>{t.nav.demoExpires(hours)}</span>}
          <SystemStatus />
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  );
}
