import type { Metadata } from 'next';
import Link from 'next/link';
import { demoDocumentName } from '@/lib/demo-documents';
import { getServerI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t.pages.help.metaTitle };
}

export default async function HelpPage() {
  const { t, locale } = await getServerI18n();
  const help = t.pages.help;
  const tour = help.tour;
  const scenarioTitle = (id: string) => t.scenarios.items[id]?.title ?? id;
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{help.title}</h1>
        <p className="max-w-3xl text-muted">{help.intro}</p>
      </header>

      <section className="panel space-y-3 p-6">
        <h2 className="text-xl font-bold">{help.tourTitle}</h2>
        <ol className="list-decimal space-y-2 pl-6 text-sm">
          <li>
            {tour.gallery.before}
            <Link className="underline" href="/gallery">
              {tour.gallery.link}
            </Link>
            {tour.gallery.middle(t.actions.analyze)}
            <em>{scenarioTitle('valid-board-perspective')}</em>
            {tour.gallery.after}
          </li>
          <li>{tour.overlay}</li>
          <li>
            {tour.compiled.before(t.studio.page.compileTitle)}
            <code className="mono">{demoDocumentName('valid', locale)}</code>
            {tour.compiled.after}
          </li>
          <li>{tour.save(t.workflow.compile.saveAndOpen(t.actions.saveVersion), t.actions.review)}</li>
          <li>{tour.approve(t.actions.approve)}</li>
          <li>
            {tour.invalid.before}
            <code className="mono">{demoDocumentName('invalid', locale)}</code>
            {tour.invalid.after(t.branch.FALSE)}
          </li>
          <li>
            {tour.broken.before}
            <em>{scenarioTitle('invalid-board-ambiguous')}</em>
            {tour.broken.or}
            <em>{scenarioTitle('invalid-board-missing-end')}</em>
            {tour.broken.after}
          </li>
          <li>
            {tour.simulator.before}
            <Link className="underline" href="/simulator">
              {tour.simulator.link}
            </Link>
            {tour.simulator.after}
          </li>
          <li>
            {tour.history.before}
            <Link className="underline" href="/history">
              {tour.history.link}
            </Link>
            {tour.history.after}
          </li>
          <li>{tour.language}</li>
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel space-y-2 p-6 text-sm">
          <h2 className="text-lg font-bold">{help.real.title}</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {help.real.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="panel space-y-2 p-6 text-sm">
          <h2 className="text-lg font-bold">{help.security.title}</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {help.security.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li>
              {help.security.api.before}
              <a className="underline" href="/api/openapi">
                /api/openapi
              </a>
              {help.security.api.middle}
              <a className="underline" href="/api/health">
                /api/health
              </a>
              {help.security.api.after}
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
