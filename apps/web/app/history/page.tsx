'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SessionGate } from '@/components/SessionProvider';
import { ErrorBox, formatBytes, formatDate, ModeBadge, Section, StatusPill } from '@/components/ui';
import { api, ApiError } from '@/lib/client/api';

type History = Awaited<ReturnType<typeof api.history>>;

function HistoryView() {
  const [history, setHistory] = useState<History | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .history()
      .then(setHistory)
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : 'No se pudo cargar el historial.'));
  }, []);
  if (error) return <ErrorBox error={error} />;
  if (!history) return <p className="text-muted">Cargando historial…</p>;
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Historial</h1>
        <p className="text-sm text-muted">Workspace de demostración · se elimina automáticamente el {formatDate(history.workspace.expiresAt)}.</p>
      </header>

      <Section title={`Ejecuciones (${history.runs.length})`} id="runs">
        <ul className="space-y-2 text-sm" data-testid="history-runs">
          {history.runs.map((run) => (
            <li key={run.id} className="flex flex-wrap items-center gap-2 border-t border-ink-700 pt-2">
              <Link href={`/runs/${run.id}`} className="mono underline">
                {run.id.slice(-10)}
              </Link>
              <StatusPill status={run.status} />
              <ModeBadge mode={run.sourceMode} />
              {run.outcome?.decision && <span>rama {run.outcome.decision.result ? 'SÍ' : 'NO'}</span>}
              {run.errorCode && <code className="mono text-err">{run.errorCode}</code>}
              <span className="text-xs text-muted">{formatDate(run.createdAt)}</span>
            </li>
          ))}
          {history.runs.length === 0 && <li className="text-muted">Aún no hay ejecuciones.</li>}
        </ul>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={`Reportes generados (${history.artifacts.length})`} id="artifacts">
          <ul className="space-y-1 text-sm">
            {history.artifacts.map((artifact) => (
              <li key={artifact.id} className="flex flex-wrap items-center gap-2">
                <a className="underline" href={`/api/artifacts/${artifact.id}/download`} download>
                  {artifact.safeName}
                </a>
                <span className="text-xs text-muted">
                  {formatBytes(artifact.size)} · {artifact.sha256.slice(0, 12)}…
                </span>
              </li>
            ))}
            {history.artifacts.length === 0 && <li className="text-muted">Sin reportes todavía.</li>}
          </ul>
        </Section>
        <Section title={`Tareas de revisión (${history.reviewTasks.length})`} id="reviews">
          <ul className="space-y-1 text-sm">
            {history.reviewTasks.map((task) => (
              <li key={task.id}>
                <strong>{task.status}</strong> · {task.label} · faltan {task.missingFields.join(', ') || '—'} · inválidos {task.invalidFields.join(', ') || '—'}
              </li>
            ))}
            {history.reviewTasks.length === 0 && <li className="text-muted">Sin tareas de revisión.</li>}
          </ul>
        </Section>
        <Section title={`Versiones compiladas (${history.versions.length})`} id="versions">
          <ul className="space-y-1 text-sm">
            {history.versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center gap-2">
                <Link className="underline" href={`/versions/${version.id}`}>
                  v{version.versionNumber}
                </Link>
                <span className={version.valid ? 'text-ok' : 'text-err'}>{version.valid ? 'válida' : 'inválida'}</span>
                <span className="mono text-xs text-muted">{version.contentHash?.slice(7, 19) ?? '—'}</span>
                <ModeBadge mode={version.sourceMode} />
                <span className="text-xs text-muted">{formatDate(version.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title={`Capturas analizadas (${history.captures.length})`} id="captures">
          <ul className="space-y-1 text-sm">
            {history.captures.map((capture) => (
              <li key={capture.id} className="flex flex-wrap items-center gap-2">
                <ModeBadge mode={capture.sourceMode} />
                <span>{capture.cardsDetected} tarjetas</span>
                <span className={capture.calibrated ? 'text-ok' : 'text-err'}>{capture.calibrated ? 'calibrado' : 'sin calibrar'}</span>
                {capture.errorCodes.length > 0 && <code className="mono text-xs text-err">{capture.errorCodes.join(', ')}</code>}
                <span className="text-xs text-muted">{formatDate(capture.capturedAt)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Las fotos no se conservan; solo el resultado de la detección y el sha256 de la imagen.</p>
        </Section>
        <Section title={`Documentos (${history.documents.length})`} id="documents">
          <ul className="space-y-1 text-sm">
            {history.documents.map((doc) => (
              <li key={doc.id}>
                {doc.isDemo && <span className="chip mr-1">demo</span>}
                {doc.originalName} · {formatBytes(doc.bytes)} · <span className="mono text-xs text-muted">{doc.sha256.slice(0, 12)}…</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <SessionGate>
      <HistoryView />
    </SessionGate>
  );
}
