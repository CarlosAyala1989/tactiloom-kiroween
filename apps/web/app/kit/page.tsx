'use client';

import { cardSvg } from '@tactiloom/board-kit/browser';
import { getCardCatalog } from '@tactiloom/contracts';
import { useEffect, useState } from 'react';
import { ErrorBox, Section } from '@/components/ui';
import { api } from '@/lib/client/api';
import { useI18n } from '@/lib/i18n/provider';

/** GET /api/board/kit answers in the language of the request (the locale cookie set by the switcher). */
type Kit = Awaited<ReturnType<typeof api.kit>>;
const PREVIEW = getCardCatalog().cards.filter((card) => card.set === 'A');

export default function KitPage() {
  const { locale, t, bytes, errorText } = useI18n();
  const [kit, setKit] = useState<Kit | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Refetch when the language changes; a late answer for the previous language is ignored.
    let current = true;
    api
      .kit()
      .then((value) => {
        if (!current) return;
        setKit(value);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (current) setError(errorText(cause, t.kit.loadFailed));
      });
    return () => {
      current = false;
    };
  }, [locale, errorText, t.kit.loadFailed]);
  const manual = kit?.files.find((file) => file.path === 'ASSEMBLY.md');
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{t.kit.title}</h1>
        <p className="max-w-3xl text-muted">
          {t.kit.intro.beforeCommand}
          {' '}
          <code className="mono">pnpm board:generate</code>
          {' '}
          {t.kit.intro.afterCommand}
        </p>
      </header>
      <ErrorBox error={error} />
      {kit && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section
            title={t.kit.downloads.title}
            id="downloads"
            actions={
              <a className="btn btn-primary" href={kit.zipUrl}>
                {t.kit.downloads.all}
              </a>
            }
          >
            <ul className="space-y-2 text-sm">
              {kit.files
                .filter((file) => /\.(pdf|svg|md)$/.test(file.path))
                .map((file) => (
                  <li key={file.path} className="flex flex-wrap items-center gap-2">
                    <a className="underline" href={file.url}>
                      {file.path}
                    </a>
                    <span className="text-xs text-muted">
                      {file.description} · {bytes(file.bytes)}
                    </span>
                  </li>
                ))}
            </ul>
          </Section>
          <Section title={t.kit.instructions.title} id="instructions">
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {kit.instructions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted">
              {manual && (
                <>
                  {t.kit.instructions.manual}
                  {' '}
                  <a className="underline" href={manual.url}>
                    ASSEMBLY.md
                  </a>
                  {' · '}
                </>
              )}
              {t.kit.instructions.kitVersion(kit.kitVersion)}
            </p>
          </Section>
        </div>
      )}
      <Section title={t.kit.preview.title} id="cards">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PREVIEW.map((card) => (
            <li key={card.markerId} className="rounded-lg bg-white p-1">
              {/* SVG generated locally from the closed catalog and the kit texts (no user input). */}
              <div
                role="img"
                aria-label={t.kit.preview.card(card.kind, card.markerId)}
                dangerouslySetInnerHTML={{ __html: cardSvg(card, locale).replace(/width="[^"]+mm" height="[^"]+mm"/, 'width="100%"') }}
              />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
