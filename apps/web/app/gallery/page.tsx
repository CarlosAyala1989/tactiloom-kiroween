'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ErrorBox } from '@/components/ui';
import { api, type ScenarioView } from '@/lib/client/api';
import { useI18n } from '@/lib/i18n/provider';

export default function GalleryPage() {
  const { t, errorText } = useI18n();
  const page = t.pages.gallery;
  const [scenarios, setScenarios] = useState<ScenarioView[]>([]);
  const [note, setNote] = useState('');
  // The cause is kept (not its text) so the message follows the UI language.
  const [failure, setFailure] = useState<{ cause: unknown } | null>(null);
  useEffect(() => {
    api
      .scenarios()
      .then((value) => {
        setScenarios(value.scenarios);
        setNote(value.note);
      })
      .catch((cause: unknown) => setFailure({ cause }));
  }, []);
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <p className="max-w-3xl text-muted">{note ? t.scenarios.note || note : page.intro}</p>
        <p className="inline-block rounded-lg border border-info/50 bg-info/10 px-3 py-1.5 text-sm text-info">{page.provenance}</p>
      </header>
      <ErrorBox error={failure ? errorText(failure.cause, page.loadError) : null} />
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((scenario) => {
          const text = t.scenarios.items[scenario.id];
          const title = text?.title ?? scenario.titleEs;
          const codes = [...scenario.expected.visionErrors, ...scenario.expected.compileErrors].filter((v, i, a) => a.indexOf(v) === i).join(', ');
          return (
            <li key={scenario.id} className="panel flex flex-col overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- static demo image served by the API */}
              <img src={scenario.imageUrl} alt={page.imageAlt(title)} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h2 className="font-bold">{title}</h2>
                <p className="text-sm text-muted">{text?.description ?? scenario.descriptionEs}</p>
                <p className="text-xs">
                  {page.expected}{' '}
                  {scenario.expected.compileValid ? (
                    <span className="text-ok">{page.compiles(scenario.expected.cards)}</span>
                  ) : (
                    <span className="text-err">{page.doesNotCompile(codes)}</span>
                  )}
                </p>
                <Link href={`/studio?scenario=${scenario.id}`} className="btn btn-primary mt-auto self-start" data-testid={`analyze-${scenario.id}`}>
                  {t.actions.analyze}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
