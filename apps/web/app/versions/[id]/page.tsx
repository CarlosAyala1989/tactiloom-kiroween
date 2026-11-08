'use client';

import { canonicalStringify } from '@tactiloom/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useMemo, useState } from 'react';
import { DiagnosticsList } from '@/components/DiagnosticsList';
import { ParamsPanel } from '@/components/ParamsPanel';
import { SessionGate } from '@/components/SessionProvider';
import { ErrorBox, HashLabel, ModeBadge, Section } from '@/components/ui';
import { StepList, WorkflowDiagram } from '@/components/WorkflowDiagram';
import { api, type VersionDetail } from '@/lib/client/api';
import { DICTIONARIES } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/provider';
import { describeSteps } from '@/lib/i18n/steps';

/** The cause is kept (not its text) so the message follows the UI language. */
type Failure = { readonly cause: unknown; readonly fallback: 'loadFailed' | 'saveParamsFailed' | 'previewFailed' };

const DEFAULT_WORKFLOW_NAME_ES = DICTIONARIES.es.workflow.version.defaultWorkflowName;

function DiffBox({ diff }: { diff: NonNullable<VersionDetail['diff']> }) {
  const { t } = useI18n();
  const words = t.workflow.version.diff;
  const board = diff.board;
  const physical = board.added.length + board.removed.length + board.moved.length + board.rotated.length;
  return (
    <div className="space-y-1 text-sm">
      <p className="font-semibold">
        {words.title}{' '}
        <Link className="text-xs underline" href={`/versions/${diff.previousVersionId}`}>
          {words.viewPrevious}
        </Link>
      </p>
      <p>{diff.ir.sameProgram ? words.sameProgram : words.otherProgram}</p>
      {physical > 0 && (
        <ul className="list-disc pl-5 text-muted">
          {board.added.map((c) => (
            <li key={`a${c.markerId}`}>{words.added(c.markerId, `(${c.row},${c.col})`)}</li>
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
      {diff.ir.paramsChanged.length > 0 && <p className="text-muted">{words.paramsChanged(diff.ir.paramsChanged.map((p) => p.nodeId).join(', '))}</p>}
      {(diff.ir.edgesAdded.length > 0 || diff.ir.edgesRemoved.length > 0) && <p className="text-muted">{words.connections(diff.ir.edgesAdded.length, diff.ir.edgesRemoved.length)}</p>}
    </div>
  );
}

function WorkflowStudio({ id }: { id: string }) {
  const router = useRouter();
  const { t, intlTag, date, errorText } = useI18n();
  const words = t.workflow.version;
  const [detail, setDetail] = useState<VersionDetail | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, unknown>>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .version(id)
      .then((value) => {
        setDetail(value);
        setDraft(structuredClone(value.view.normalizedParams));
      })
      .catch((cause: unknown) => setFailure({ cause, fallback: 'loadFailed' }));
  }, [id]);

  const dirty = useMemo(() => detail !== null && canonicalStringify(draft) !== canonicalStringify(detail.view.normalizedParams), [draft, detail]);
  const error = failure ? errorText(failure.cause, words[failure.fallback]) : null;
  if (error && !detail) return <ErrorBox error={error} />;
  if (!detail) return <p className="text-muted">{words.loading}</p>;

  const nodes = detail.view.graph.nodes;
  const inputs = nodes.filter((node) => node.kind === 'INPUT_FILE');
  const missingInput = inputs.some((node) => !detail.view.normalizedParams[node.id]?.uploadedFileId);
  const errorNodeIds = new Set(detail.view.diagnostics.filter((d) => d.severity === 'error').flatMap((d) => d.nodeIds ?? []));
  // Steps in the UI language from the IR; the server's Spanish steps are the fallback.
  const steps = detail.view.ir ? describeSteps(detail.view.ir, t, intlTag) : detail.view.steps;
  // The server's default name is Spanish data: show it translated while the workflow keeps it.
  const workflowName = detail.workflow.name === DEFAULT_WORKFLOW_NAME_ES ? words.defaultWorkflowName : detail.workflow.name;

  const saveParams = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const source = detail.boardCaptureId ? { captureId: detail.boardCaptureId } : { boardState: detail.boardState };
      const created = await api.createVersion({ ...source, params: draft, workflowId: detail.workflow.id });
      router.push(`/versions/${created.versionId}`);
    } catch (cause) {
      setFailure({ cause, fallback: 'saveParamsFailed' });
      setBusy(false);
    }
  };

  const review = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const { runId } = await api.preview(detail.id);
      router.push(`/runs/${runId}`);
    } catch (cause) {
      setFailure({ cause, fallback: 'previewFailed' });
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted">{words.eyebrow}</p>
          <h1 className="text-3xl font-bold">
            {workflowName} · v{detail.versionNumber}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ModeBadge mode={detail.sourceMode} />
            <span className={`chip ${detail.valid ? 'text-ok' : 'text-err'}`} data-testid="version-valid">
              {detail.valid ? words.valid : words.invalid}
            </span>
            <HashLabel value={detail.contentHash} label="contentHash" />
            <span className="text-xs text-muted">
              {detail.compilerVersion} · {date(detail.createdAt)}
            </span>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {detail.valid && !dirty && (
            <button type="button" className="btn btn-primary" onClick={review} disabled={busy || missingInput} data-testid="start-review">
              {t.actions.review}
            </button>
          )}
        </div>
      </header>
      {missingInput && detail.valid && <p className="text-sm text-warn">{words.missingInput}</p>}
      {!detail.valid && <p className="text-sm text-err">{words.notCompiling}</p>}
      <ErrorBox error={error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Section title={words.diagramTitle} id="diagram">
            <WorkflowDiagram nodes={nodes} edges={detail.view.graph.edges} errorNodeIds={errorNodeIds} selectedId={selectedId} onSelect={setSelectedId} height={380} />
            <StepList steps={steps} />
          </Section>
          <Section title={words.diagnosticsTitle} id="diagnostics">
            <DiagnosticsList diagnostics={detail.view.diagnostics} emptyText={words.noIssues} />
          </Section>
        </div>
        <div className="space-y-6">
          <Section
            title={words.paramsTitle}
            id="params"
            actions={
              dirty ? (
                <button type="button" className="btn btn-primary" onClick={saveParams} disabled={busy} data-testid="save-params">
                  {words.saveAsNew}
                </button>
              ) : undefined
            }
          >
            <p className="mb-3 text-xs text-muted">{words.paramsNote}</p>
            <ParamsPanel nodes={nodes} params={draft} selectedId={selectedId} onSelect={setSelectedId} onChange={(nodeId, key, value) => setDraft((current) => ({ ...current, [nodeId]: { ...current[nodeId], [key]: value } }))} />
          </Section>
          <Section title={words.versionsTitle} id="versions">
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
                  <span className={version.valid ? 'text-ok' : 'text-err'}>{version.valid ? t.valid : t.invalid}</span>
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
