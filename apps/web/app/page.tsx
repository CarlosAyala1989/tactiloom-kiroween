import type { CardKind } from '@tactiloom/contracts';
import Link from 'next/link';
import type { Dictionary } from '@/lib/i18n';
import { getServerI18n } from '@/lib/i18n/server';

const DEMO_ROW: readonly { kind: CardKind; color: string }[] = [
  { kind: 'START', color: '#2f9e44' },
  { kind: 'INPUT_FILE', color: '#1971c2' },
  { kind: 'EXTRACT_TEXT', color: '#0c8599' },
  { kind: 'VALIDATE_FIELDS', color: '#6741d9' },
  { kind: 'CONDITION', color: '#e67700' },
  { kind: 'CREATE_REPORT', color: '#c2255c' },
  { kind: 'SAVE_REPORT', color: '#5c940d' },
  { kind: 'END', color: '#495057' },
];

/** Concept illustration only (static SVG); the real demo is in the Studio, Gallery and Simulator. */
function ConceptBoard({ t }: { t: Dictionary }) {
  return (
    <svg viewBox="0 0 860 300" className="h-auto w-full" role="img" aria-label={t.pages.home.conceptLabel}>
      <rect x="0" y="0" width="860" height="300" rx="18" fill="#f5efe6" />
      {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4, 5, 6, 7].map((c) => <rect key={`${r}-${c}`} x={30 + c * 100} y={20 + r * 66} width="96" height="62" rx="6" fill="none" stroke="#c9bfae" />))}
      {DEMO_ROW.map((card, i) => (
        <g key={card.kind} transform={`translate(${36 + i * 100} 26)`}>
          <rect width="84" height="50" rx="6" fill="#fff" stroke={card.color} strokeWidth="2.5" />
          <rect width="84" height="14" rx="5" fill={card.color} />
          <text x="42" y="11" fontSize="9" fill="#fff" textAnchor="middle" fontWeight="700">
            {t.catalog.short[card.kind]}
          </text>
          <rect x="30" y="18" width="24" height="24" fill="#111" />
          <path d="M60 30 h14 l-4 -4 M74 30 l-4 4" stroke={card.color} strokeWidth="2.5" fill="none" />
        </g>
      ))}
      <g transform="translate(436 92)">
        <rect width="84" height="50" rx="6" fill="#fff" stroke="#f08c00" strokeWidth="2.5" />
        <rect width="84" height="14" rx="5" fill="#f08c00" />
        <text x="42" y="11" fontSize="9" fill="#fff" textAnchor="middle" fontWeight="700">
          {t.catalog.short.REQUEST_REVIEW}
        </text>
        <rect x="30" y="18" width="24" height="24" fill="#111" />
      </g>
      <g transform="translate(436 158)">
        <rect width="84" height="50" rx="6" fill="#fff" stroke="#495057" strokeWidth="2.5" />
        <rect width="84" height="14" rx="5" fill="#495057" />
        <text x="42" y="11" fontSize="9" fill="#fff" textAnchor="middle" fontWeight="700">
          {t.catalog.short.END}
        </text>
        <rect x="30" y="18" width="24" height="24" fill="#111" />
      </g>
      <text x="530" y="120" fontSize="12" fill="#e67700" fontWeight="700">
        {t.pages.home.conceptFalseTurn(t.branch.FALSE)}
      </text>
      <text x="430" y="290" fontSize="12" fill="#6b5d4b" textAnchor="middle">
        {t.pages.home.conceptCaption}
      </text>
    </svg>
  );
}

export default async function HomePage() {
  const { t } = await getServerI18n();
  const home = t.pages.home;
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 pt-6 lg:grid-cols-2">
        <div className="space-y-5">
          <p className="chip text-amber-strong">Kiroween 2026 · Frankenstein</p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">{t.tagline}</h1>
          <p className="max-w-xl text-lg text-muted">{home.intro}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/gallery" className="btn btn-primary">
              {home.tryDemo}
            </Link>
            <Link href="/how-it-works" className="btn">
              {home.howItWorks}
            </Link>
            <Link href="/kit" className="btn">
              {home.printKit}
            </Link>
          </div>
        </div>
        <div className="panel p-3">
          <ConceptBoard t={t} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label={home.stepsLabel}>
        {home.steps.map(({ title, text }) => (
          <div key={title} className="panel p-5">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>

      <section className="panel space-y-3 p-6">
        <h2 className="text-xl font-bold">{home.realTitle}</h2>
        <ul className="grid gap-2 text-sm md:grid-cols-2">
          {home.real.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-xs text-muted">{home.priorArt}</p>
      </section>
    </div>
  );
}
