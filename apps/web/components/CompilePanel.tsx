'use client';

import type { BoardState, CardKind } from '@tactiloom/contracts';
import { getCardCatalog } from '@tactiloom/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type CompileView } from '@/lib/client/api';
import { demoDocumentName } from '@/lib/demo-documents';
import { useI18n } from '@/lib/i18n/provider';
import { describeSteps } from '@/lib/i18n/steps';
import { DiagnosticsList } from './DiagnosticsList';
import { DocumentSelect } from './DocumentSelect';
import { ErrorBox, HashLabel } from './ui';
import { StepList, WorkflowDiagram } from './WorkflowDiagram';

export type BoardSource = { captureId: string } | { boardState: BoardState };

const instancesByMarker = (kind: CardKind) => new Map(getCardCatalog().cards.filter((card) => card.kind === kind).map((card) => [card.markerId, card.cardInstanceId]));
const INPUT_INSTANCE_BY_MARKER = instancesByMarker('INPUT_FILE');
const REPORT_INSTANCE_BY_MARKER = instancesByMarker('CREATE_REPORT');
/** Workspaces created before the per-language demo documents only have the Spanish one. */
const FALLBACK_DEMO_DOCUMENT = demoDocumentName('valid', 'es');

/** Card instances of one kind present on the board (from the closed catalog), sorted for a stable params key. */
function instancesOnBoard(markerIds: readonly number[], byMarker: ReadonlyMap<number, string>): string[] {
  return [...new Set(markerIds.map((id) => byMarker.get(id)).filter((id): id is string => id !== undefined))].sort();
}

/** The cause is kept (not its text) so the message follows the UI language. */
type Failure = { readonly cause: unknown; readonly fallback: 'failed' | 'saveFailed' };

/** Compiles the current board (server-side) and lets the user save an immutable version. */
export function CompilePanel({ source, markerIds, onCompiled }: { source: BoardSource; markerIds: readonly number[]; onCompiled?: (view: CompileView | null) => void }) {
  const router = useRouter();
  const { t, locale, intlTag, errorText } = useI18n();
  const words = t.workflow.compile;
  const [view, setView] = useState<CompileView | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const preselected = useRef(false);

  useEffect(() => {
    if (preselected.current) return;
    preselected.current = true;
    const wanted = demoDocumentName('valid', locale);
    api
      .documents()
      .then(({ documents }) => {
        const demos = documents.filter((doc) => doc.isDemo);
        const demo = demos.find((doc) => doc.originalName === wanted) ?? demos.find((doc) => doc.originalName === FALLBACK_DEMO_DOCUMENT);
        if (demo) setDocumentId((current) => current ?? demo.id);
      })
      .catch(() => undefined)
      .finally(() => setDocsLoaded(true));
  }, [locale]);

  // INPUT_FILE instances present on the board (from the closed catalog), so the first compile already carries the document.
  const inputNodeIds = useMemo(() => instancesOnBoard(markerIds, INPUT_INSTANCE_BY_MARKER), [markerIds]);
  // CREATE_REPORT writes the report in the UI language. Spanish omits the param: canonical params, unchanged contentHash.
  const reportNodeIds = useMemo(() => instancesOnBoard(markerIds, REPORT_INSTANCE_BY_MARKER), [markerIds]);
  const params = useMemo(() => {
    const entries: Record<string, Record<string, unknown>> = {};
    for (const id of inputNodeIds) entries[id] = { uploadedFileId: documentId };
    if (locale !== 'es') for (const id of reportNodeIds) entries[id] = { language: locale };
    return entries;
  }, [inputNodeIds, reportNodeIds, documentId, locale]);
  const sourceKey = JSON.stringify(source);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    if (!docsLoaded) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      setBusy(true);
      api
        .compile({ ...source, params } as Parameters<typeof api.compile>[0])
        .then((result) => {
          if (cancelled) return;
          setView(result);
          setFailure(null);
          onCompiled?.(result);
        })
        .catch((cause: unknown) => !cancelled && setFailure({ cause, fallback: 'failed' }))
        .finally(() => !cancelled && setBusy(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by serialised source/params
  }, [sourceKey, paramsKey, docsLoaded]);

  const save = async () => {
    setSaving(true);
    setFailure(null);
    try {
      const created = await api.createVersion({ ...source, params } as Parameters<typeof api.createVersion>[0]);
      router.push(`/versions/${created.versionId}`);
    } catch (cause) {
      setFailure({ cause, fallback: 'saveFailed' });
      setSaving(false);
    }
  };

  // Steps are rendered from the IR in the UI language; the server's Spanish steps are the fallback.
  const steps = useMemo(() => (view?.ir ? describeSteps(view.ir, t, intlTag) : (view?.steps ?? [])), [view, t, intlTag]);
  const error = failure ? errorText(failure.cause, words[failure.fallback]) : null;
  const errorNodeIds = new Set((view?.diagnostics ?? []).filter((d) => d.severity === 'error').flatMap((d) => d.nodeIds ?? []));
  return (
    <div className="space-y-4" aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-2">
        {view && (
          <span className={`chip ${view.valid ? 'text-ok' : 'text-err'}`} data-testid="compile-status">
            {view.valid ? words.valid : words.invalid}
          </span>
        )}
        {view?.ir && <HashLabel value={view.ir.contentHash} label="contentHash" />}
        {busy && <span className="text-xs text-muted">{words.compiling}</span>}
      </div>
      <ErrorBox error={error} />
      {view && view.graph.nodes.length > 0 && (
        <>
          <WorkflowDiagram nodes={view.graph.nodes} edges={view.graph.edges} errorNodeIds={errorNodeIds} height={300} />
          <StepList steps={steps} />
        </>
      )}
      {view && <DiagnosticsList diagnostics={view.diagnostics} emptyText={words.noProblems} />}
      {inputNodeIds.length > 0 && <DocumentSelect value={documentId} onChange={setDocumentId} />}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={save} disabled={!view || saving} data-testid="save-version">
          {saving ? words.saving : words.saveAndOpen(t.actions.saveVersion)}
        </button>
        <p className="text-xs text-muted">{words.saveNote}</p>
      </div>
    </div>
  );
}
