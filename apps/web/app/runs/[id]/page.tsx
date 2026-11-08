'use client';

import { DEFAULT_LOCALE, DIAGNOSTIC_CODES, FIELD_IDS, isLocale, TERMINAL_RUN_STATUSES, type DiagnosticCode, type ExecutionPlan, type FieldId, type Locale, type PlannedEffect, type RunStatus } from '@tactiloom/contracts';
import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { SessionGate } from '@/components/SessionProvider';
import { ErrorBox, HashLabel, ModeBadge, Section, StatusPill } from '@/components/ui';
import { WorkflowDiagram, type NodeRunState } from '@/components/WorkflowDiagram';
import { api, ApiError, type RunDetail, type RunEvent } from '@/lib/client/api';
import { useI18n, type I18n } from '@/lib/i18n/provider';

const FLOW: RunStatus[] = ['DRAFT', 'COMPILED', 'AWAITING_APPROVAL', 'QUEUED', 'RUNNING', 'SUCCEEDED'];

const isDiagnosticCode = (value: string | null): value is DiagnosticCode => value !== null && (DIAGNOSTIC_CODES as readonly string[]).includes(value);
const isFieldId = (value: string): value is FieldId => (FIELD_IDS as readonly string[]).includes(value);
const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');

/** The cause is kept (not its text) so the message follows the UI language. */
type Failure = { readonly cause: unknown; readonly fallback: 'loadFailed' | 'approveFailed' | 'cancelFailed' };

/**
 * Field ids are contract values and stay visible in every language (`workshop`); other languages add
 * the field name when it differs from the id. Spanish keeps the raw list.
 */
function fieldList(ids: readonly string[], { locale, t, intlTag }: I18n): string {
  if (ids.length === 0) return '—';
  if (locale === 'es') return ids.join(', ');
  return ids
    .map((id) => {
      if (!isFieldId(id)) return id;
      const name = t.fields[id];
      return name.toLocaleLowerCase(intlTag) === id ? id : `${id} (${name})`;
    })
    .join(', ');
}

/** Canonical Spanish text that cannot be rendered in the UI language (no structured params): marked with its language. */
function SpanishOriginal({ text }: { text: string }) {
  const { locale, t } = useI18n();
  if (locale === 'es') return <>{text}</>;
  return (
    <>
      <span lang="es">{text}</span> <span className="text-xs text-muted">({t.diagnostics.ui.originalSpanish})</span>
    </>
  );
}

/** Localized from `kind` + `params`; Spanish (and effects stored without params) shows the canonical `descriptionEs`. */
function EffectText({ effect }: { effect: PlannedEffect }) {
  const i18n = useI18n();
  const words = i18n.t.workflow.run.effects;
  const params = effect.params;
  if (i18n.locale !== 'es' && params) {
    if (effect.kind === 'WRITE_ARTIFACT') {
      const { format, bytes, fileName } = params;
      const formatName = format === 'md' ? 'Markdown' : format === 'json' ? 'JSON' : null;
      if (formatName && typeof bytes === 'number' && typeof fileName === 'string') return <>{words.writeArtifact(formatName, i18n.number(bytes), fileName)}</>;
    } else {
      const { label, missing, invalid } = params;
      if (typeof label === 'string' && isStringList(missing) && isStringList(invalid)) return <>{words.reviewTask(label, fieldList(missing, i18n), fieldList(invalid, i18n))}</>;
    }
  }
  return <SpanishOriginal text={effect.descriptionEs} />;
}

/** Spanish shows the stored message; other languages explain the failure code, with the stored Spanish message as fallback. */
function FailureText({ run }: { run: RunDetail }) {
  const { locale, t } = useI18n();
  const words = t.workflow.run.failure;
  if (locale === 'es') return <>{run.errorMessage ?? words.noDetails}</>;
  const code = isDiagnosticCode(run.errorCode) ? run.errorCode : null;
  const title = code ? t.diagnostics.titles[code] : null;
  const explanation = code ? t.errors.runtime[code] : undefined;
  if (title && explanation) return <>{`${title}. ${explanation}`}</>;
  if (run.errorMessage) {
    return (
      <>
        {title ? `${title}. ` : ''}
        <SpanishOriginal text={run.errorMessage} />
      </>
    );
  }
  return <>{title ? `${title}.` : words.noDetails}</>;
}

function Timeline({ status }: { status: RunStatus }) {
  const { t } = useI18n();
  const index = FLOW.indexOf(status);
  // Machine states stay visible; the localized name is the tooltip and the accessible name.
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs" aria-label={t.workflow.run.timelineLabel}>
      {FLOW.map((step, i) => (
        <li
          key={step}
          className={`rounded px-2 py-1 ${i < index ? 'bg-ink-700 text-paper' : i === index ? 'bg-amber text-ink-950 font-bold' : 'text-muted'}`}
          aria-current={i === index ? 'step' : undefined}
          title={t.runStatusShort[step]}
          aria-label={`${t.runStatusShort[step]} (${step})`}
        >
          {step}
        </li>
      ))}
      {(status === 'FAILED' || status === 'CANCELLED') && (
        <li className="rounded bg-err/20 px-2 py-1 font-bold text-err" title={t.runStatusShort[status]} aria-label={`${t.runStatusShort[status]} (${status})`}>
          {status}
        </li>
      )}
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

function PlanReview({ plan, reportLanguage }: { plan: ExecutionPlan; reportLanguage: Locale }) {
  const { t, intlTag, bytes } = useI18n();
  const words = t.workflow.run.review;
  return (
    <div className="space-y-4 text-sm">
      {plan.input ? (
        <div>
          <p className="font-semibold">{words.input}</p>
          <p>
            {plan.input.originalName} · {plan.input.mime} · {bytes(plan.input.bytes)} · sha256 <span className="mono text-xs">{plan.input.sha256.slice(0, 16)}…</span>
          </p>
        </div>
      ) : (
        <p>{words.noInput}</p>
      )}
      <div>
        <p className="font-semibold">{words.steps}</p>
        <ol className="mt-1 list-decimal pl-6">
          {plan.path.map((step) => (
            <li key={step.nodeId}>
              {t.catalog.kinds[step.kind]} <span className="mono text-xs text-muted">{step.nodeId}</span>
            </li>
          ))}
        </ol>
      </div>
      {plan.decision && (
        <p>
          <span className="font-semibold">{words.decision}</span> {words.predicate(t.catalog.kinds.CONDITION.toLocaleUpperCase(intlTag))}{' '}
          <strong>{plan.decision.result ? words.decisionValue(t.branch.TRUE, 'TRUE') : words.decisionValue(t.branch.FALSE, 'FALSE')}</strong>
        </p>
      )}
      {plan.validation && (
        <table className="w-full text-left">
          <caption className="text-left font-semibold">{words.fieldsCaption}</caption>
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1">{words.fieldColumn}</th>
              <th className="py-1">{words.valueColumn}</th>
              <th className="py-1">{words.statusColumn}</th>
            </tr>
          </thead>
          <tbody>
            {FIELD_IDS.map((field) => (
              <tr key={field} className="border-t border-ink-700">
                <td className="py-1">{t.fields[field]}</td>
                <td className="py-1">{plan.validation?.fields[field] ?? '—'}</td>
                <td className="py-1">
                  {plan.validation?.missingFields.includes(field) ? (
                    <span className="text-err">{words.missing}</span>
                  ) : plan.validation?.invalidFields.includes(field) ? (
                    <span className="text-err">{words.badFormat}</span>
                  ) : (
                    <span className="text-ok">{words.ok}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div>
        <p className="font-semibold">{words.effectsTitle}</p>
        {plan.effects.length === 0 ? (
          <p className="text-muted">{words.noEffects}</p>
        ) : (
          <ul className="mt-1 list-disc pl-6">
            {plan.effects.map((effect) => (
              <li key={`${effect.nodeId}-${effect.target}`}>
                <EffectText effect={effect} /> <span className="mono text-xs text-muted">{effect.target}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-muted">{words.sandboxNote}</p>
      </div>
      {plan.reportPreview && (
        <details>
          <summary className="cursor-pointer font-semibold">{words.reportPreview}</summary>
          <pre lang={reportLanguage} className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-950 p-3 text-xs">{plan.reportPreview}</pre>
        </details>
      )}
    </div>
  );
}

function RunPage({ id }: { id: string }) {
  const i18n = useI18n();
  const { t, date, bytes, errorText } = i18n;
  const words = t.workflow.run;
  const [run, setRun] = useState<RunDetail | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .run(id)
      .then((value) => {
        setRun(value);
        setFailure(null);
      })
      .catch((cause: unknown) => setFailure({ cause, fallback: 'loadFailed' }));
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

  let error: string | null = null;
  if (failure) {
    error = errorText(failure.cause, words[failure.fallback]);
    // Approval rejections also name their code (APPROVAL_EXPIRED, APPROVAL_INVALIDATED…).
    if (failure.fallback === 'approveFailed' && failure.cause instanceof ApiError && !error.endsWith(`(${failure.cause.code})`)) error = `${error} (${failure.cause.code})`;
  }
  if (error && !run) return <ErrorBox error={error} />;
  if (!run) return <p className="text-muted">{words.loading}</p>;

  const ir = run.version.ir;
  const nodes = (ir?.nodes ?? []).map((node) => ({ id: node.id, markerId: node.markerId, kind: node.kind, row: node.layout.row, col: node.layout.col }));
  const phase = run.events.some((event) => event.phase === 'EXECUTE') ? 'EXECUTE' : 'PREVIEW';
  const states = nodeStates(run.events, phase, nodes.map((n) => n.id));
  // The report preview is written in the language of its CREATE_REPORT card (absent = Spanish).
  const reportLanguageParam = ir?.nodes.find((node) => node.kind === 'CREATE_REPORT' && (run.plan?.path ?? []).some((step) => step.nodeId === node.id))?.params.language;
  const reportLanguage: Locale = isLocale(reportLanguageParam) ? reportLanguageParam : DEFAULT_LOCALE;

  const approve = async () => {
    if (!run.plan || !run.planHash) return;
    setBusy(true);
    setFailure(null);
    try {
      await api.approve({ previewRunId: run.id, contentHash: run.contentHash, planHash: run.planHash, confirm: true });
      load();
    } catch (cause) {
      setFailure({ cause, fallback: 'approveFailed' });
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
      setFailure({ cause, fallback: 'cancelFailed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-muted">
          <Link className="underline" href={`/versions/${run.version.id}`}>
            {words.back(run.version.versionNumber)}
          </Link>
        </p>
        <h1 className="text-3xl font-bold">{waiting ? words.reviewTitle : words.monitorTitle}</h1>
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <StatusPill status={run.status} />
          <ModeBadge mode={run.sourceMode} />
          <span className="text-xs text-muted">{words.programLabel}</span>
          <HashLabel value={run.contentHash} label="contentHash" />
          {run.planHash && (
            <>
              <span className="text-xs text-muted">{words.planLabel}</span>
              <HashLabel value={run.planHash} label="planHash" />
            </>
          )}
        </div>
        <Timeline status={run.status} />
      </header>
      {!run.worker.alive && !terminal && <p role="status" className="rounded-lg border border-warn/60 bg-warn/10 px-3 py-2 text-sm text-warn">{t.system.workerDown}</p>}
      <ErrorBox error={error} />

      {(run.status === 'DRAFT' || run.status === 'COMPILED') && (
        <Section title={words.previewingTitle} id="previewing">
          <p className="text-sm text-muted">{words.previewingNote}</p>
        </Section>
      )}

      {waiting && run.plan && (
        <Section title={words.review.title} id="review">
          <PlanReview plan={run.plan} reportLanguage={reportLanguage} />
          <div className="mt-5 space-y-3 rounded-lg border border-amber/50 bg-amber/5 p-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} data-testid="confirm-checkbox" />
              <span>
                {words.review.confirm(
                  <span key="program" className="mono">
                    {run.contentHash.slice(7, 19)}
                  </span>,
                  <span key="plan" className="mono">
                    {run.planHash?.slice(7, 19)}
                  </span>,
                )}
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" disabled={!confirmed || busy} onClick={approve} data-testid="approve-run">
                {t.actions.approve}
              </button>
              <button type="button" className="btn" disabled={busy} onClick={cancel}>
                {t.actions.cancel}
              </button>
            </div>
            {run.approvalExpiresAt && <p className="text-xs text-muted">{words.review.expires(date(run.approvalExpiresAt))}</p>}
          </div>
        </Section>
      )}

      {nodes.length > 0 && (
        <Section title={phase === 'EXECUTE' ? words.executedNodes : words.predictedNodes} id="nodes" actions={!terminal && !waiting ? <button type="button" className="btn btn-danger" onClick={cancel} disabled={busy}>{t.actions.cancel}</button> : undefined}>
          <WorkflowDiagram nodes={nodes} edges={ir?.edges ?? []} states={states} height={320} />
          <ol className="mt-3 space-y-1 text-sm" aria-label={words.eventsLabel}>
            {run.events.map((event) => (
              <li key={`${event.phase}-${event.attempt}-${event.seq}`} className="flex flex-wrap gap-2">
                <span className="mono text-xs text-muted">
                  {event.phase === 'PREVIEW' ? words.previewPhase : words.executePhase(event.attempt)} #{event.seq}
                </span>
                <span className="font-semibold">{event.nodeId}</span>
                <span className={event.status === 'FAILED' ? 'text-err' : event.status === 'SUCCEEDED' ? 'text-ok' : 'text-muted'} title={event.status}>
                  {t.nodeStatus[event.status]}
                </span>
                {event.durationMs !== null && <span className="text-xs text-muted">{event.durationMs} ms</span>}
                {event.errorCode && <code className="mono text-xs text-err">{event.errorCode}</code>}
                {event.output && <span className="mono text-xs text-muted">{JSON.stringify(event.output).slice(0, 140)}</span>}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {run.status === 'SUCCEEDED' && (
        <Section title={words.result.title} id="result">
          <div className="space-y-3 text-sm">
            {run.outcome?.decision && (
              <p>
                {words.result.chosenBranch} <strong>{run.outcome.decision.result ? words.result.toReport(t.branch.TRUE) : words.result.toReview(t.branch.FALSE)}</strong>
              </p>
            )}
            <p>{run.outcome?.planMatched ? words.result.planMatched : words.result.planMismatch}</p>
            {run.artifacts.length > 0 && (
              <ul className="space-y-1" data-testid="artifacts">
                {run.artifacts.map((artifact) => (
                  <li key={artifact.id} className="flex flex-wrap items-center gap-2">
                    <a className="btn btn-primary" href={`/api/artifacts/${artifact.id}/download`} download data-testid={`download-${artifact.type}`}>
                      {t.actions.download} {artifact.safeName}
                    </a>
                    <span className="text-xs text-muted">
                      {bytes(artifact.size)} · sha256 <span className="mono">{artifact.sha256.slice(0, 16)}…</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {run.reviewTasks.length > 0 && (
              <ul className="space-y-1" data-testid="review-tasks">
                {run.reviewTasks.map((task) => (
                  <li key={task.id} className="rounded-lg border border-warn/50 p-2">
                    {words.result.reviewTask(<strong key="status">{task.status}</strong>, task.label, fieldList(task.missingFields, i18n), fieldList(task.invalidFields, i18n))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}

      {(run.status === 'FAILED' || run.status === 'CANCELLED') && (
        <Section title={run.status === 'FAILED' ? words.failure.failedTitle : words.failure.cancelledTitle} id="failure">
          <p className="text-sm">
            <code className="mono text-err">{run.errorCode ?? run.status}</code> — <FailureText run={run} />
          </p>
          <p className="mt-2 text-xs text-muted">{words.failure.note}</p>
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
