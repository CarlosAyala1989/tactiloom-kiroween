'use client';

import { canonicalStringify } from '@ritualos/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useMemo, useState } from 'react';
import { DiagnosticsList } from '@/components/DiagnosticsList';
import { ParamsPanel } from '@/components/ParamsPanel';
import { SessionGate } from '@/components/SessionProvider';
import { ErrorBox, formatDate, HashLabel, ModeBadge, Section } from '@/components/ui';
import { StepList, WorkflowDiagram } from '@/components/WorkflowDiagram';
import { api, ApiError, type VersionDetail } from '@/lib/client/api';
import { es } from '@/lib/i18n/es';

function DiffBox({ diff }: { diff: NonNullable<VersionDetail['diff']> }) {
  const board = diff.board;
  const physical = board.added.length + board.removed.length + board.moved.length + board.rotated.length;
  return (
    <div className="space-y-1 text-sm">
      <p className="font-semibold">
        Cambios respecto a la versión anterior{' '}
        <Link className="text-xs underline" href={`/versions/${diff.previousVersionId}`}>
          (ver anterior)
        </Link>
      </p>
      <p>{diff.ir.sameProgram ? '= Mismo programa (mismo contentHash).' : '≠ Programa distinto (otro contentHash).'}</p>
      {physical > 0 && (
        <ul className="list-disc pl-5 text-muted">
          {board.added.map((c) => (
            <li key={`a${c.markerId}`}>
              + #{c.markerId} en ({c.row},{c.col})
            </li>
          ))}
          {board.removed.map((c) => (
            <li key={`r${c.markerId}`}>− #{c.markerId}</li>
          ))}
          {board.moved.map((c) => (
            <li key={`m${c.markerId}`}>
              ↦ #{c.markerId}: ({c.from.row},{c.from.col}) → ({c.to.row},{c.to.col})
            </li>
          ))}
          {board.rotated.map((c) => (
            <li key={`o${c.markerId}`}>
              ↻ #{c.markerId}: {c.from} → {c.to}
            </li>
          ))}
        </ul>
      )}
      {diff.ir.paramsChanged.length > 0 && <p className="text-muted">Parámetros cambiados: {diff.ir.paramsChanged.map((p) => p.nodeId).join(', ')}</p>}
      {(diff.ir.edgesAdded.length > 0 || diff.ir.edgesRemoved.length > 0) && (
        <p className="text-muted">
          Conexiones: +{diff.ir.edgesAdded.length} / −{diff.ir.edgesRemoved.length}
        </p>
      )}
    </div>
  );
}

function WorkflowStudio({ id }: { id: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<VersionDetail | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, unknown>>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .version(id)
      .then((value) => {
        setDetail(value);
        setDraft(structuredClone(value.view.normalizedParams));
      })
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : 'No se pudo cargar la versión.'));
  }, [id]);

  const dirty = useMemo(() => detail !== null && canonicalStringify(draft) !== canonicalStringify(detail.view.normalizedParams), [draft, detail]);
  if (error && !detail) return <ErrorBox error={error} />;
  if (!detail) return <p className="text-muted">Cargando versión…</p>;

  const nodes = detail.view.graph.nodes;
  const inputs = nodes.filter((node) => node.kind === 'INPUT_FILE');
  const missingInput = inputs.some((node) => !detail.view.normalizedParams[node.id]?.uploadedFileId);
  const errorNodeIds = new Set(detail.view.diagnostics.filter((d) => d.severity === 'error').flatMap((d) => d.nodeIds ?? []));

  const saveParams = async () => {
    setBusy(true);
    setError(null);
    try {
      const source = detail.boardCaptureId ? { captureId: detail.boardCaptureId } : { boardState: detail.boardState };
      const created = await api.createVersion({ ...source, params: draft, workflowId: detail.workflow.id });
      router.push(`/versions/${created.versionId}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudieron guardar los parámetros.');
      setBusy(false);
    }
  };

  const review = async () => {
    setBusy(true);
    setError(null);
    try {
      const { runId } = await api.preview(detail.id);
      router.push(`/runs/${runId}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudo iniciar la vista previa.');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted">Workflow Studio</p>
          <h1 className="text-3xl font-bold">
            {detail.workflow.name} · v{detail.versionNumber}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ModeBadge mode={detail.sourceMode} />
            <span className={`chip ${detail.valid ? 'text-ok' : 'text-err'}`} data-testid="version-valid">
              {detail.valid ? '✓ válido' : '✕ inválido'}
            </span>
            <HashLabel value={detail.contentHash} label="contentHash" />
            <span className="text-xs text-muted">
              {detail.compilerVersion} · {formatDate(detail.createdAt)}
            </span>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {detail.valid && !dirty && (
            <button type="button" className="btn btn-primary" onClick={review} disabled={busy || missingInput} data-testid="start-review">
              {es.actions.review}
            </button>
          )}
        </div>
      </header>
      {missingInput && detail.valid && <p className="text-sm text-warn">Elige el documento de entrada en los parámetros y guarda la nueva versión antes de revisar.</p>}
      {!detail.valid && <p className="text-sm text-err">Este programa no compila: no existe botón de ejecución. Corrige el tablero (en el Studio o el Simulador) y guarda otra versión.</p>}
      <ErrorBox error={error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Section title="Diagrama derivado de la IR" id="diagram">
            <WorkflowDiagram nodes={nodes} edges={detail.view.graph.edges} errorNodeIds={errorNodeIds} selectedId={selectedId} onSelect={setSelectedId} height={380} />
            <StepList steps={detail.view.steps} />
          </Section>
          <Section title="Diagnósticos" id="diagnostics">
            <DiagnosticsList diagnostics={detail.view.diagnostics} emptyText="Programa válido: sin errores ni avisos." />
          </Section>
        </div>
        <div className="space-y-6">
          <Section
            title="Parámetros"
            id="params"
            actions={
              dirty ? (
                <button type="button" className="btn btn-primary" onClick={saveParams} disabled={busy} data-testid="save-params">
                  Guardar como nueva versión
                </button>
              ) : undefined
            }
          >
            <p className="mb-3 text-xs text-muted">Cambiar un parámetro crea otra versión con otro hash: cualquier aprobación anterior queda invalidada.</p>
            <ParamsPanel nodes={nodes} params={draft} selectedId={selectedId} onSelect={setSelectedId} onChange={(nodeId, key, value) => setDraft((current) => ({ ...current, [nodeId]: { ...current[nodeId], [key]: value } }))} />
          </Section>
          <Section title="Versiones" id="versions">
            {detail.diff && (
              <div className="mb-3 rounded-lg border border-ink-700 p-3">
                <DiffBox diff={detail.diff} />
              </div>
            )}
            <ol className="space-y-1 text-sm">
              {detail.versions.map((version) => (
                <li key={version.id} className="flex flex-wrap items-center gap-2">
                  <Link href={`/versions/${version.id}`} className={`underline ${version.id === detail.id ? 'font-bold' : ''}`}>
                    v{version.versionNumber}
                  </Link>
                  <span className={version.valid ? 'text-ok' : 'text-err'}>{version.valid ? 'válida' : 'inválida'}</span>
                  <span className="mono text-xs text-muted">{version.contentHash?.slice(7, 19) ?? '—'}</span>
                  <ModeBadge mode={version.sourceMode} />
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </div>
  );
}

export default function VersionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <SessionGate>
      <WorkflowStudio id={id} />
    </SessionGate>
  );
}
