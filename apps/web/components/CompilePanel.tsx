'use client';

import type { BoardState } from '@ritualos/contracts';
import { getCardCatalog } from '@ritualos/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, type CompileView } from '@/lib/client/api';
import { es } from '@/lib/i18n/es';
import { DiagnosticsList } from './DiagnosticsList';
import { DocumentSelect } from './DocumentSelect';
import { ErrorBox, HashLabel } from './ui';
import { StepList, WorkflowDiagram } from './WorkflowDiagram';

export type BoardSource = { captureId: string } | { boardState: BoardState };

const INPUT_INSTANCE_BY_MARKER = new Map(getCardCatalog().cards.filter((card) => card.kind === 'INPUT_FILE').map((card) => [card.markerId, card.cardInstanceId]));

/** Compiles the current board (server-side) and lets the user save an immutable version. */
export function CompilePanel({ source, markerIds, onCompiled }: { source: BoardSource; markerIds: readonly number[]; onCompiled?: (view: CompileView | null) => void }) {
  const router = useRouter();
  const [view, setView] = useState<CompileView | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const preselected = useRef(false);

  useEffect(() => {
    if (preselected.current) return;
    preselected.current = true;
    api
      .documents()
      .then(({ documents }) => {
        const demo = documents.find((doc) => doc.isDemo && doc.originalName === 'valid-application.pdf');
        if (demo) setDocumentId((current) => current ?? demo.id);
      })
      .catch(() => undefined)
      .finally(() => setDocsLoaded(true));
  }, []);

  // INPUT_FILE instances present on the board (from the closed catalog), so the first compile already carries the document.
  const inputNodeIds = useMemo(() => [...new Set(markerIds.map((id) => INPUT_INSTANCE_BY_MARKER.get(id)).filter((id): id is string => id !== undefined))].sort(), [markerIds]);
  const params = useMemo(() => {
    const entries: Record<string, Record<string, unknown>> = {};
    for (const id of inputNodeIds) entries[id] = { uploadedFileId: documentId };
    return entries;
  }, [inputNodeIds, documentId]);
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
          setError(null);
          onCompiled?.(result);
        })
        .catch((cause) => !cancelled && setError(cause instanceof ApiError ? cause.message : 'No se pudo compilar.'))
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
    setError(null);
    try {
      const created = await api.createVersion({ ...source, params } as Parameters<typeof api.createVersion>[0]);
      router.push(`/versions/${created.versionId}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudo guardar la versión.');
      setSaving(false);
    }
  };

  const errorNodeIds = new Set((view?.diagnostics ?? []).filter((d) => d.severity === 'error').flatMap((d) => d.nodeIds ?? []));
  return (
    <div className="space-y-4" aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-2">
        {view && (
          <span className={`chip ${view.valid ? 'text-ok' : 'text-err'}`} data-testid="compile-status">
            {view.valid ? '✓ Programa válido' : '✕ El tablero no compila'}
          </span>
        )}
        {view?.ir && <HashLabel value={view.ir.contentHash} label="contentHash" />}
        {busy && <span className="text-xs text-muted">compilando…</span>}
      </div>
      <ErrorBox error={error} />
      {view && view.graph.nodes.length > 0 && (
        <>
          <WorkflowDiagram nodes={view.graph.nodes} edges={view.graph.edges} errorNodeIds={errorNodeIds} height={300} />
          <StepList steps={view.steps} />
        </>
      )}
      {view && <DiagnosticsList diagnostics={view.diagnostics} emptyText="El compilador no encontró problemas." />}
      {inputNodeIds.length > 0 && <DocumentSelect value={documentId} onChange={setDocumentId} />}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={save} disabled={!view || saving} data-testid="save-version">
          {saving ? 'Guardando…' : `${es.actions.saveVersion} y abrir Workflow Studio`}
        </button>
        <p className="text-xs text-muted">Guardar no ejecuta nada. Las versiones inválidas también se guardan en el historial, pero no se pueden ejecutar.</p>
      </div>
    </div>
  );
}
