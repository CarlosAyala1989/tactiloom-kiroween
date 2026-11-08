'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SessionGate } from '@/components/SessionProvider';
import { ErrorBox, ModeBadge, Section, StatusPill } from '@/components/ui';
import { api } from '@/lib/client/api';
import { useI18n } from '@/lib/i18n/provider';

type History = Awaited<ReturnType<typeof api.history>>;

function HistoryView() {
  const { t, date, bytes, errorText } = useI18n();
  const page = t.pages.history;
  const [history, setHistory] = useState<History | null>(null);
  // The cause is kept (not its text) so the message follows the UI language.
  const [failure, setFailure] = useState<{ cause: unknown } | null>(null);
  useEffect(() => {
    api
      .history()
      .then(setHistory)
      .catch((cause: unknown) => setFailure({ cause }));
  }, []);
  if (failure) return <ErrorBox error={errorText(failure.cause, page.loadError)} />;
  if (!history) return <p className="text-muted">{page.loading}</p>;
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <p className="text-sm text-muted">{page.expires(date(history.workspace.expiresAt))}</p>
      </header>

      <Section title={page.runs(history.runs.length)} id="runs">
        <ul className="space-y-2 text-sm" data-testid="history-runs">
          {history.runs.map((run) => (
            <li key={run.id} className="flex flex-wrap items-center gap-2 border-t border-ink-700 pt-2">
              <Link href={`/runs/${run.id}`} className="mono underline">
                {run.id.slice(-10)}
              </Link>
              <StatusPill status={run.status} />
              <ModeBadge mode={run.sourceMode} />
              {run.outcome?.decision && <span>{page.branch(run.outcome.decision.result ? t.branch.TRUE : t.branch.FALSE)}</span>}
              {run.errorCode && <code className="mono text-err">{run.errorCode}</code>}
              <span className="text-xs text-muted">{date(run.createdAt)}</span>
            </li>
          ))}
          {history.runs.length === 0 && <li className="text-muted">{page.noRuns}</li>}
        </ul>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={page.artifacts(history.artifacts.length)} id="artifacts">
          <ul className="space-y-1 text-sm">
            {history.artifacts.map((artifact) => (
              <li key={artifact.id} className="flex flex-wrap items-center gap-2">
                <a className="underline" href={`/api/artifacts/${artifact.id}/download`} download>
                  {artifact.safeName}
                </a>
                <span className="text-xs text-muted">
                  {bytes(artifact.size)} · {artifact.sha256.slice(0, 12)}…
                </span>
              </li>
            ))}
            {history.artifacts.length === 0 && <li className="text-muted">{page.noArtifacts}</li>}
          </ul>
        </Section>
        <Section title={page.reviews(history.reviewTasks.length)} id="reviews">
          <ul className="space-y-1 text-sm">
            {history.reviewTasks.map((task) => (
              <li key={task.id}>
                <strong>{task.status}</strong> · {task.label} · {page.reviewFields(task.missingFields.join(', ') || '—', task.invalidFields.join(', ') || '—')}
              </li>
            ))}
            {history.reviewTasks.length === 0 && <li className="text-muted">{page.noReviews}</li>}
          </ul>
        </Section>
        <Section title={page.versions(history.versions.length)} id="versions">
          <ul className="space-y-1 text-sm">
            {history.versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center gap-2">
                <Link className="underline" href={`/versions/${version.id}`}>
                  v{version.versionNumber}
                </Link>
                <span className={version.valid ? 'text-ok' : 'text-err'}>{version.valid ? t.valid : t.invalid}</span>
                <span className="mono text-xs text-muted">{version.contentHash?.slice(7, 19) ?? '—'}</span>
                <ModeBadge mode={version.sourceMode} />
                <span className="text-xs text-muted">{date(version.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title={page.captures(history.captures.length)} id="captures">
          <ul className="space-y-1 text-sm">
            {history.captures.map((capture) => (
              <li key={capture.id} className="flex flex-wrap items-center gap-2">
                <ModeBadge mode={capture.sourceMode} />
                <span>{page.cards(capture.cardsDetected)}</span>
                <span className={capture.calibrated ? 'text-ok' : 'text-err'}>{capture.calibrated ? page.calibrated : page.notCalibrated}</span>
                {capture.errorCodes.length > 0 && <code className="mono text-xs text-err">{capture.errorCodes.join(', ')}</code>}
                <span className="text-xs text-muted">{date(capture.capturedAt)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">{page.photosNote}</p>
        </Section>
        <Section title={page.documents(history.documents.length)} id="documents">
          <ul className="space-y-1 text-sm">
            {history.documents.map((doc) => (
              <li key={doc.id}>
                {doc.isDemo && <span className="chip mr-1">{t.demo}</span>}
                {doc.originalName} · {bytes(doc.bytes)} · <span className="mono text-xs text-muted">{doc.sha256.slice(0, 12)}…</span>
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
