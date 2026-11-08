'use client';

import { DIAGNOSTIC_TITLES_ES, type Diagnostic } from '@tactiloom/contracts';
import { es } from '@/lib/i18n/es';

const ICON: Record<Diagnostic['severity'], string> = { error: '✕', warning: '!', info: 'i' };
const STYLE: Record<Diagnostic['severity'], string> = {
  error: 'border-err/60 bg-err/10',
  warning: 'border-warn/60 bg-warn/10',
  info: 'border-info/40 bg-info/5',
};
const SEVERITY_RANK: Record<Diagnostic['severity'], number> = { error: 0, warning: 1, info: 2 };

/** Root causes first (reading, placement, ports), consequences last (unreachable cards, open paths). */
const PRIORITY: Partial<Record<Diagnostic['code'], number>> = {
  NONTERMINATING_PATH: 8,
  UNREACHABLE_NODE: 9,
  MISSING_REQUIRED_DATA: 6,
  INVALID_PARAMETER: 6,
  DANGLING_OUTPUT: 5,
  INCOMPATIBLE_PORTS: 4,
  MULTIPLE_INPUTS: 4,
  CYCLE_UNSUPPORTED: 4,
  MISSING_START: 3,
  MULTIPLE_STARTS: 3,
  MISSING_END: 3,
};
const priority = (d: Diagnostic) => (d.stage === 'vision' ? 0 : (PRIORITY[d.code] ?? 2));

function DiagnosticBody({ diagnostic }: { diagnostic: Diagnostic }) {
  return (
    <>
      <p className="mt-1">{diagnostic.message}</p>
      {(diagnostic.markerIds?.length || diagnostic.cells?.length) && (
        <p className="mt-1 text-xs text-muted">
          {diagnostic.markerIds?.length ? `Tarjetas: ${diagnostic.markerIds.map((id) => `#${id}`).join(', ')}` : ''}
          {diagnostic.markerIds?.length && diagnostic.cells?.length ? ' · ' : ''}
          {diagnostic.cells?.length ? `Casillas (fila,col): ${diagnostic.cells.map((c) => `(${c.row},${c.col})`).join(', ')}` : ''}
        </p>
      )}
      {diagnostic.suggestion && <p className="mt-1 text-xs">→ {diagnostic.suggestion}</p>}
    </>
  );
}

function Header({ diagnostic, count }: { diagnostic: Diagnostic; count: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span aria-hidden="true" className="font-bold">
        {ICON[diagnostic.severity]}
      </span>
      <span className="font-semibold">{es.severity[diagnostic.severity]}:</span>
      <span>
        {DIAGNOSTIC_TITLES_ES[diagnostic.code] ?? diagnostic.code}
        {count > 1 ? ` (×${count})` : ''}
      </span>
      <code className="mono text-xs text-muted">{diagnostic.code}</code>
      <span className="text-xs text-muted">({diagnostic.stage === 'vision' ? 'visión' : diagnostic.stage === 'compiler' ? 'compilador' : 'ejecución'})</span>
    </div>
  );
}

/** Explains what happened, where (card #id, row/col) and how to fix it — never colour only. */
export function DiagnosticsList({ diagnostics, emptyText = 'Sin diagnósticos.' }: { diagnostics: readonly Diagnostic[]; emptyText?: string }) {
  if (diagnostics.length === 0) return <p className="text-sm text-ok">✓ {emptyText}</p>;
  const ordered = diagnostics
    .map((diagnostic, index) => ({ diagnostic, index }))
    .sort((a, b) => SEVERITY_RANK[a.diagnostic.severity] - SEVERITY_RANK[b.diagnostic.severity] || priority(a.diagnostic) - priority(b.diagnostic) || a.index - b.index)
    .map((entry) => entry.diagnostic);
  const groups: Diagnostic[][] = [];
  for (const diagnostic of ordered) {
    const last = groups.at(-1);
    if (last && last[0]?.code === diagnostic.code && last[0]?.severity === diagnostic.severity) last.push(diagnostic);
    else groups.push([diagnostic]);
  }
  return (
    <ul className="space-y-2" aria-label="Diagnósticos">
      {groups.map((group, index) => {
        const first = group[0] as Diagnostic;
        if (group.length < 3) {
          return group.map((diagnostic, inner) => (
            <li key={`${diagnostic.code}-${index}-${inner}`} className={`rounded-lg border px-3 py-2 text-sm ${STYLE[diagnostic.severity]}`} data-code={diagnostic.code}>
              <Header diagnostic={diagnostic} count={1} />
              <DiagnosticBody diagnostic={diagnostic} />
            </li>
          ));
        }
        const markers = [...new Set(group.flatMap((d) => d.markerIds ?? []))];
        return (
          <li key={`${first.code}-${index}`} className={`rounded-lg border px-3 py-2 text-sm ${STYLE[first.severity]}`} data-code={first.code}>
            <Header diagnostic={first} count={group.length} />
            <p className="mt-1">Afecta a {markers.length > 0 ? markers.map((id) => `#${id}`).join(', ') : `${group.length} elementos`}. Suele ser consecuencia de los errores anteriores.</p>
            {first.suggestion && <p className="mt-1 text-xs">→ {first.suggestion}</p>}
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-muted">Ver los {group.length} mensajes</summary>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                {group.map((diagnostic, inner) => (
                  <li key={inner}>{diagnostic.message}</li>
                ))}
              </ul>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
