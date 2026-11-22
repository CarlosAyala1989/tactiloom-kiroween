import { CARD_KIND_SPECS, CARD_PRINTED_TITLES, type CardKind } from '@tactiloom/contracts';
import Image from 'next/image';
import Link from 'next/link';
import { ModeBadge } from '@/components/ui';
import { textOn } from '@/lib/client/contrast';
import { getServerI18n } from '@/lib/i18n/server';
import boardPhoto from './_assets/board-example.webp';

/**
 * Gallery scenario analysed by the primary action. The hero photo is that same image resized to a
 * 1200 px WebP (from assets/examples/boards/valid-board-perspective.png) to keep the page light.
 */
const EXAMPLE_SCENARIO = 'valid-board-perspective';

/** The demo workflow of the product brief: the cards of the example photo, in reading order. */
const MAIN_PATH: readonly CardKind[] = ['START', 'INPUT_FILE', 'EXTRACT_TEXT', 'VALIDATE_FIELDS', 'CONDITION'];
const BRANCHES: readonly { port: 'TRUE' | 'FALSE'; kinds: readonly CardKind[]; tone: string }[] = [
  { port: 'TRUE', kinds: ['CREATE_REPORT', 'SAVE_REPORT', 'END'], tone: 'text-ok' },
  { port: 'FALSE', kinds: ['REQUEST_REVIEW', 'END'], tone: 'text-branch-false' },
];

/** Where each source mode starts; the labels are the shared mode names. */
const START_ROUTES = [
  { mode: 'physical', href: '/studio' },
  { mode: 'image', href: '/gallery' },
  { mode: 'simulator', href: '/simulator' },
] as const;

/** Text column + content column, shared by every section so they line up. */
const COLUMNS = 'grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]';

function FlowArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-muted">
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Cards in order, coloured like the header of each printed card. */
function CardSequence({ kinds, titles, label }: { kinds: readonly CardKind[]; titles: Readonly<Record<CardKind, string>>; label?: string }) {
  return (
    <ol aria-label={label} className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
      {kinds.map((kind, index) => {
        const color = CARD_KIND_SPECS[kind].color;
        return (
          <li key={`${kind}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && <FlowArrow />}
            <span className="whitespace-nowrap rounded-md px-2 py-1 text-xs font-bold tracking-wide" style={{ background: color, color: textOn(color) }}>
              {titles[kind]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function HomePage() {
  const { t, locale } = await getServerI18n();
  const home = t.pages.home;
  const titles = CARD_PRINTED_TITLES[locale];
  return (
    <div className="space-y-14">
      <section className={`${COLUMNS} items-center pt-4`}>
        <div className="space-y-6">
          <h1 className="text-balance text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl">{t.tagline}</h1>
          <p className="max-w-xl text-pretty text-lg text-muted">{home.lede}</p>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href={`/studio?scenario=${EXAMPLE_SCENARIO}`} className="btn btn-primary" data-testid="home-try-example">
                {home.tryExample}
              </Link>
              <Link href="/kit" className="btn">
                {home.printKit}
              </Link>
              <Link href="/how-it-works" className="text-sm font-semibold underline underline-offset-4 hover:text-amber-strong">
                {home.howItWorks}
              </Link>
            </div>
            <p className="text-sm text-muted">{home.noHardware}</p>
          </div>
        </div>
        <figure className="space-y-2">
          <Image src={boardPhoto} alt={home.photoAlt} unoptimized preload className="h-auto w-full rounded-xl border border-ink-700" />
          <figcaption className="text-xs text-muted">{home.photoCaption}</figcaption>
        </figure>
      </section>

      <section aria-labelledby="home-example" className={`${COLUMNS} border-t border-ink-700 pt-10`}>
        <div className="space-y-3">
          <h2 id="home-example" className="text-balance text-2xl font-bold">
            {home.exampleTitle}
          </h2>
          <p className="max-w-xl text-pretty text-muted">{home.exampleText}</p>
        </div>
        <div className="space-y-3">
          <CardSequence kinds={MAIN_PATH} titles={titles} label={home.flowLabel} />
          <ul aria-label={home.branchesLabel} className="space-y-2">
            {BRANCHES.map(({ port, kinds, tone }) => (
              <li key={port} data-branch={port} className="flex items-start gap-2.5">
                <span className={`chip w-12 shrink-0 justify-center ${tone}`}>{t.branch[port]}</span>
                <CardSequence kinds={kinds} titles={titles} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="home-start" className={`${COLUMNS} border-t border-ink-700 pt-10`}>
        <div className="space-y-3">
          <h2 id="home-start" className="text-2xl font-bold">
            {home.startTitle}
          </h2>
          <p className="max-w-xl text-sm text-muted">
            {home.judges.before}
            <Link href="/help" className="underline underline-offset-4 hover:text-paper">
              {home.judges.link}
            </Link>
            {home.judges.after}
          </p>
        </div>
        <ul className="divide-y divide-ink-700">
          {START_ROUTES.map(({ mode, href }) => (
            <li key={mode} className="grid gap-2 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-8">
              <div className="space-y-1.5">
                <ModeBadge mode={mode} />
                <p className="text-sm">{home.start[mode].text}</p>
              </div>
              <Link href={href} className="text-sm font-semibold text-amber-strong underline underline-offset-4 hover:text-paper">
                {home.start[mode].link}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
