import { CARD_KINDS, CARD_PRINTED_TITLES } from '@tactiloom/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t.pages.howItWorks.title };
}

export default async function HowItWorksPage() {
  const { t, locale } = await getServerI18n();
  const page = t.pages.howItWorks;
  const printedTitles = CARD_PRINTED_TITLES[locale];
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <p className="max-w-3xl text-muted">{page.intro}</p>
      </header>

      <ol className="grid gap-4 lg:grid-cols-3">
        <li className="panel space-y-2 p-5">
          <h2 className="text-lg font-bold">{page.print.title}</h2>
          <p className="text-sm text-muted">
            {page.print.kitBefore}
            <Link className="underline" href="/kit">
              {page.print.kitLink}
            </Link>
            {page.print.kitAfter}
          </p>
          <p className="text-sm text-muted">{page.print.noPrinter}</p>
        </li>
        <li className="panel space-y-2 p-5">
          <h2 className="text-lg font-bold">{page.place.title}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {page.place.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </li>
        <li className="panel space-y-2 p-5">
          <h2 className="text-lg font-bold">{page.scan.title}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {page.scan.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </li>
      </ol>

      <section className="panel space-y-3 p-6">
        <h2 className="text-xl font-bold">{page.cards.title}</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1">{page.cards.card}</th>
              <th className="py-1">{page.cards.needs}</th>
              <th className="py-1">{page.cards.produces}</th>
            </tr>
          </thead>
          <tbody>
            {CARD_KINDS.map((kind) => (
              <tr key={kind} className="border-t border-ink-700">
                <td className="py-1 font-semibold">{printedTitles[kind]}</td>
                <td className="py-1 text-muted">{page.cards.needsByKind[kind]}</td>
                <td className="py-1 text-muted">{page.cards.producesByKind[kind]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted">{page.cards.note}</p>
      </section>

      <section className="panel space-y-2 p-6">
        <h2 className="text-xl font-bold">{page.camera.title}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>{page.camera.secureContext(t.actions.enableCamera)}</li>
          <li>{page.camera.onePhoto}</li>
          <li>{page.camera.fallback}</li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/studio" className="btn btn-primary">
            {page.camera.toStudio}
          </Link>
          <Link href="/simulator" className="btn">
            {page.camera.toSimulator}
          </Link>
        </div>
      </section>
    </div>
  );
}
