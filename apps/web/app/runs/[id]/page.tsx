'use client';

import { FIELD_IDS, TERMINAL_RUN_STATUSES, type ExecutionPlan, type RunStatus } from '@ritualos/contracts';
import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { SessionGate } from '@/components/SessionProvider';
import { ErrorBox, formatBytes, formatDate, HashLabel, ModeBadge, Section, StatusPill } from '@/components/ui';
import { WorkflowDiagram, type NodeRunState } from '@/components/WorkflowDiagram';
import { api, ApiError, type RunDetail, type RunEvent } from '@/lib/client/api';
import { es } from '@/lib/i18n/es';

const FLOW: RunStatus[] = ['DRAFT', 'COMPILED', 'AWAITING_APPROVAL', 'QUEUED', 'RUNNING', 'SUCCEEDED'];

function Timeline({ status }: { status: RunStatus }) {
  const index = FLOW.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs" aria-label="Estados de la ejecución">
      {FLOW.map((step, i) => (
        <li key={step} className={`rounded px-2 py-1 ${i < index ? 'bg-ink-700 text-paper' : i === index ? 'bg-amber text-ink-950 font-bold' : 'text-muted'}`} aria-current={i === index ? 'step' : undefined}>
          {step}
        </li>
      ))}
      {(status === 'FAILED' || status === 'CANCELLED') && <li className="rounded bg-err/20 px-2 py-1 font-bold text-err">{status}</li>}
    </ol>
  );
}

function nodeStates(events: RunEvent[], phase: 'PREVIEW' | 'EXECUTE', ids: string[]): Record<string, NodeRunState> {
  const states: Record<string, NodeRunState> = {};
  const relevant = events.filter((event) => event.phase === phase);
  const lastAttempt = Math.max(0, ...relevant.map((event) => event.attempt));
  for (const event of relevant.filter((e) => e.attempt === lastAttempt)) {
    states[event.nodeId] =
      event.status === 'PREDICTED' ? 'predicted' : event.status === 'STARTED' ? 'running' : event.status === 'SUCCEEDED' ? 'succeeded' : event.status === 'FAILED' ? 'failed' : 'skipped';
  }
  if (phase === 'EXECUTE' && relevant.length > 0) for (const id of ids) states[id] ??= 'skipped';
  return states;
}

function PlanReview({ plan }: { plan: ExecutionPlan }) {
  return (
    <div className="space-y-4 text-sm">
      {plan.input ? (
        <div>
          <p className="font-semibold">Entrada</p>
          <p>
            {plan.input.originalName} · {plan.input.mime} · {formatBytes(plan.input.bytes)} · sha256 <span className="mono text-xs">{plan.input.sha256.slice(0, 16)}…</span>
          </p>
        </div>
      ) : (
        <p>Este programa no lee ningún documento.</p>
      )}
      <div>
        <p className="font-semibold">Pasos que se ejecutarán (en este orden)</p>
        <ol className="mt-1 list-decimal pl-6">
          {plan.path.map((step) => (
            <li key={step.nodeId}>
              {es.kinds[step.kind]} <span className="mono text-xs text-muted">{step.nodeId}</span>
            </li>
          ))}
        </ol>
      </div>
      {plan.decision && (
        <p>
          <span className="font-semibold">Decisión prevista:</span> CONDICIÓN «todos los campos obligatorios presentes» = <strong>{plan.decision.result ? 'SÍ (rama TRUE)' : 'NO (rama FALSE)'}</strong>
        </p>
      )}
      {plan.validation && (
        <table className="w-full text-left">
          <caption className="text-left font-semibold">Campos extraídos (dato ficticio)</caption>
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1">Campo</th>
              <th className="py-1">Valor</th>
              <th className="py-1">Estado</th>
            </tr>
          </thead>
          <tbody>
            {FIELD_IDS.map((field) => (
              <tr key={field} className="border-t border-ink-700">
                <td className="py-1">{es.fields[field]}</td>
                <td className="py-1">{plan.validation?.fields[field] ?? '—'}</td>
                <td className="py-1">
                  {plan.validation?.missingFields.includes(field) ? <span className="text-err">falta</span> : plan.validation?.invalidFields.includes(field) ? <span className="text-err">formato inválido</span> : <span className="text-ok">ok</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div>
        <p className="font-semibold">Efectos permitidos (y nada más)</p>
        {plan.effects.length === 0 ? (
          <p className="text-muted">Ninguno: el programa no escribe archivos ni crea tareas.</p>
        ) : (
          <ul className="mt-1 list-disc pl-6">
            {plan.effects.map((effect) => (
              <li key={`${effect.nodeId}-${effect.target}`}>
                {effect.descriptionEs} <span className="mono text-xs text-muted">{effect.target}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-muted">Sin red saliente, sin correos, sin comandos del sistema. Todo ocurre dentro del sandbox de tu workspace.</p>
      </div>
      {plan.reportPreview && (
        <details>
          <summary className="cursor-pointer font-semibold">Vista previa del reporte (dry-run, no guardado)</summary>
          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-950 p-3 text-xs">{plan.reportPreview}</pre>
        </details>
      )}
    </div>
  );
}

function RunPage({ id }: { id: string }) {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .run(id)
      .then((value) => {
        setRun(value);
        setError(null);
      })
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : 'No se pudo cargar la ejecución.'));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const terminal = run ? (TERMINAL_RUN_STATUSES as readonly string[]).includes(run.status) : false;
  const waiting = run?.status === 'AWAITING_APPROVAL';
  useEffect(() => {
    if (!run || terminal || waiting) return;
    const timer = setInterval(load, 1500);
    return () => clearInterval(timer);
  }, [run, terminal, waiting, load]);

  if (error && !run) return <ErrorBox error={error} />;
  if (!run) return <p className="text-muted">Cargando ejecución…</p>;

  const ir = run.version.ir;
  const nodes = (ir?.nodes ?? []).map((node) => ({ id: node.id, markerId: node.markerId, kind: node.kind, row: node.layout.row, col: node.layout.col }));
  const phase = run.events.some((event) => event.phase === 'EXECUTE') ? 'EXECUTE' : 'PREVIEW';
  const states = nodeStates(run.events, phase, nodes.map((n) => n.id));

  const approve = async () => {
    if (!run.plan || !run.planHash) return;
    setBusy(true);
    setError(null);
    try {
      await api.approve({ previewRunId: run.id, contentHash: run.contentHash, planHash: run.planHash, confirm: true });
      load();
    } catch (cause) {
      setError(cause instanceof ApiError ? `${cause.message} (${cause.code})` : 'No se pudo aprobar.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await api.cancel(run.id);
      load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudo cancelar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-muted">
          <Link className="underline" href={`/versions/${run.version.id}`}>
            ← Workflow Studio (v{run.version.versionNumber})
          </Link>
        </p>
        <h1 className="text-3xl font-bold">{waiting ? 'Review & Run' : 'Execution Monitor'}</h1>
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <StatusPill status={run.status} />
          <ModeBadge mode={run.sourceMode} />
          <span className="text-xs text-muted">Programa</span>
          <HashLabel value={run.contentHash} label="contentHash" />
          {run.planHash && (
            <>
              <span className="text-xs text-muted">Plan</span>
              <HashLabel value={run.planHash} label="planHash" />
            </>
          )}
        </div>
        <Timeline status={run.status} />
      </header>
      {!run.worker.alive && !terminal && <p role="status" className="rounded-lg border border-warn/60 bg-warn/10 px-3 py-2 text-sm text-warn">{es.system.workerDown}</p>}
      <ErrorBox error={error} />

      {(run.status === 'DRAFT' || run.status === 'COMPILED') && (
        <Section title="Generando vista previa (dry-run)" id="previewing">
          <p className="text-sm text-muted">El worker verifica el hash de la IR y simula el flujo sobre tu documento sin escribir archivos ni crear tareas.</p>
        </Section>
      )}

      {waiting && run.plan && (
        <Section title="Revisa antes de ejecutar" id="review">
          <PlanReview plan={run.plan} />
          <div className="mt-5 space-y-3 rounded-lg border border-amber/50 bg-amber/5 p-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} data-testid="confirm-checkbox" />
              <span>
                He revisado la entrada, los pasos y los efectos. Autorizo ejecutar exactamente este programa (<span className="mono">{run.contentHash.slice(7, 19)}</span>) con este plan (<span className="mono">{run.planHash?.slice(7, 19)}</span>).
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" disabled={!confirmed || busy} onClick={approve} data-testid="approve-run">
                {es.actions.approve}
              </button>
              <button type="button" className="btn" disabled={busy} onClick={cancel}>
                {es.actions.cancel}
              </button>
            </div>
            {run.approvalExpiresAt && <p className="text-xs text-muted">La vista previa caduca el {formatDate(run.approvalExpiresAt)}; después habrá que repetirla.</p>}
          </div>
        </Section>
      )}

      {nodes.length > 0 && (
        <Section title={phase === 'EXECUTE' ? 'Nodos ejecutados' : 'Nodos previstos (dry-run)'} id="nodes" actions={!terminal && !waiting ? <button type="button" className="btn btn-danger" onClick={cancel} disabled={busy}>{es.actions.cancel}</button> : undefined}>
          <WorkflowDiagram nodes={nodes} edges={ir?.edges ?? []} states={states} height={320} />
          <ol className="mt-3 space-y-1 text-sm" aria-label="Línea de tiempo de eventos">
            {run.events.map((event) => (
              <li key={`${event.phase}-${event.attempt}-${event.seq}`} className="flex flex-wrap gap-2">
                <span className="mono text-xs text-muted">
                  {event.phase === 'PREVIEW' ? 'dry-run' : `ejecución (intento ${event.attempt})`} #{event.seq}
                </span>
                <span className="font-semibold">{event.nodeId}</span>
                <span className={event.status === 'FAILED' ? 'text-err' : event.status === 'SUCCEEDED' ? 'text-ok' : 'text-muted'}>{event.status}</span>
                {event.durationMs !== null && <span className="text-xs text-muted">{event.durationMs} ms</span>}
                {event.errorCode && <code className="mono text-xs text-err">{event.errorCode}</code>}
                {event.output && <span className="mono text-xs text-muted">{JSON.stringify(event.output).slice(0, 140)}</span>}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {run.status === 'SUCCEEDED' && (
        <Section title="Resultado" id="result">
          <div className="space-y-3 text-sm">
            {run.outcome?.decision && <p>Rama elegida: <strong>{run.outcome.decision.result ? 'SÍ → reporte' : 'NO → revisión'}</strong></p>}
            <p>{run.outcome?.planMatched ? '✓ La ejecución siguió exactamente el plan aprobado.' : '⚠ La ejecución no coincide con el plan aprobado.'}</p>
            {run.artifacts.length > 0 && (
              <ul className="space-y-1" data-testid="artifacts">
                {run.artifacts.map((artifact) => (
                  <li key={artifact.id} className="flex flex-wrap items-center gap-2">
                    <a className="btn btn-primary" href={`/api/artifacts/${artifact.id}/download`} download data-testid={`download-${artifact.type}`}>
                      {es.actions.download} {artifact.safeName}
                    </a>
                    <span className="text-xs text-muted">
                      {formatBytes(artifact.size)} · sha256 <span className="mono">{artifact.sha256.slice(0, 16)}…</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {run.reviewTasks.length > 0 && (
              <ul className="space-y-1" data-testid="review-tasks">
                {run.reviewTasks.map((task) => (
                  <li key={task.id} className="rounded-lg border border-warn/50 p-2">
                    Tarea de revisión <strong>{task.status}</strong> · «{task.label}» · faltan: {task.missingFields.join(', ') || '—'} · inválidos: {task.invalidFields.join(', ') || '—'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}

      {(run.status === 'FAILED' || run.status === 'CANCELLED') && (
        <Section title={run.status === 'FAILED' ? 'La ejecución falló' : 'Ejecución cancelada'} id="failure">
          <p className="text-sm">
            <code className="mono text-err">{run.errorCode ?? run.status}</code> — {run.errorMessage ?? 'Sin detalles.'}
          </p>
          <p className="mt-2 text-xs text-muted">Nada se marcó como completado: si un nodo falla, el estado es FAILED con su causa.</p>
        </Section>
      )}
    </div>
  );
}

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <SessionGate>
      <RunPage id={id} />
    </SessionGate>
  );
}
