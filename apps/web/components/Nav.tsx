'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { es } from '@/lib/i18n/es';
import { SystemStatus } from './SystemStatus';
import { useSession } from './SessionProvider';

const LINKS = [
  { href: '/studio', label: es.nav.studio },
  { href: '/simulator', label: es.nav.simulator },
  { href: '/gallery', label: es.nav.gallery },
  { href: '/history', label: es.nav.history },
  { href: '/kit', label: es.nav.kit },
  { href: '/how-it-works', label: es.nav.howItWorks },
  { href: '/help', label: es.nav.help },
];

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

export function Nav() {
  const pathname = usePathname();
  const session = useSession();
  const hours = session.hoursLeft;
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900/90 backdrop-blur">
      <nav aria-label="Principal" className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <Logo />
          <span className="text-lg">{es.appName}</span>
        </Link>
        <ul className="flex flex-wrap items-center gap-1 text-sm">
          {LINKS.map((link) => {
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
          {hours !== null && <span title="La demo es temporal: los datos se borran al expirar">Workspace demo · expira en ~{hours} h</span>}
          <SystemStatus />
        </div>
      </nav>
    </header>
  );
}
