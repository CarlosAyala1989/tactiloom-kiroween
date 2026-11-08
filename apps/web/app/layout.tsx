import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@xyflow/react/dist/style.css';
import './globals.css';
import { Nav } from '@/components/Nav';
import { SessionProvider } from '@/components/SessionProvider';
import { I18nProvider } from '@/lib/i18n/provider';
import { getServerI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: { default: 'Tactiloom — Build workflows with your hands', template: '%s · Tactiloom' },
    description: t.metaDescription,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, t } = await getServerI18n();
  return (
    <html lang={locale}>
      <body className="min-h-screen font-sans antialiased">
        <I18nProvider initialLocale={locale}>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 btn btn-primary">
            {t.skipToContent}
          </a>
          <SessionProvider>
            <Nav />
            <main id="main" className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
              {children}
            </main>
            <footer className="mx-auto max-w-7xl px-6 pb-10 text-xs text-muted">{t.footer}</footer>
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
