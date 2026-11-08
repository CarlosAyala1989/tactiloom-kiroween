'use client';

import { diffBoards, type BoardDiff } from '@tactiloom/compiler';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { CameraCapture } from '@/components/CameraCapture';
import { CompilePanel } from '@/components/CompilePanel';
import { DetectionPanel } from '@/components/DetectionPanel';
import { SessionGate } from '@/components/SessionProvider';
import { ErrorBox, ModeBadge, Section } from '@/components/ui';
import { api, ApiError, type AnalyzeResponse, type ScenarioView } from '@/lib/client/api';
import { useI18n } from '@/lib/i18n/provider';

type Tab = 'camera' | 'image';
const LAST_CAPTURE_KEY = 'tactiloom:last-capture-cards';

/** API errors keep their code visible; in Spanish this is `${message} (${code})`, as before i18n. */
function withErrorCode(text: string, cause: unknown): string {
  return cause instanceof ApiError && !text.endsWith(`(${cause.code})`) ? `${text} (${cause.code})` : text;
}

function BoardDiffSummary({ diff }: { diff: BoardDiff }) {
  const { t } = useI18n();
  const words = t.studio.diff;
  const changes = diff.added.length + diff.removed.length + diff.moved.length + diff.rotated.length;
  if (changes === 0) return <p className="text-sm text-muted">{words.noChanges(diff.unchanged)}</p>;
  return (
    <div className="text-sm" aria-live="polite">
      <p className="font-semibold">{words.title}</p>
      <ul className="mt-1 list-disc pl-5">
        {diff.added.map((c) => (
          <li key={`a${c.markerId}`}>{words.added(c.markerId, c)}</li>
        ))}
        {diff.removed.map((c) => (
          <li key={`r${c.markerId}`}>{words.removed(c.markerId, c)}</li>
        ))}
        {diff.moved.map((c) => (
          <li key={`m${c.markerId}`}>{words.moved(c.markerId, c.from, c.to)}</li>
        ))}
        {diff.rotated.map((c) => (
          <li key={`o${c.markerId}`}>{words.rotated(c.markerId, c.from, c.to)}</li>
        ))}
      </ul>
    </div>
  );
}

function Studio() {
  const { t, errorText } = useI18n();
  const words = t.studio.page;
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('image');
  const [busy, setBusy] = useState(false);
  /** What was thrown (not its text), so the message follows the UI language. */
  const [error, setError] = useState<{ cause: unknown } | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [diff, setDiff] = useState<BoardDiff | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioView[]>([]);
  const [scenarioId, setScenarioId] = useState('');
  const autoRan = useRef(false);

  const analyze = useCallback(async (form: FormData) => {
    setBusy(true);
    setError(null);
    try {
      const response = await api.analyze(form);
      const previous = sessionStorage.getItem(LAST_CAPTURE_KEY);
      setDiff(previous ? diffBoards(JSON.parse(previous), response.boardState.cards) : null);
      sessionStorage.setItem(LAST_CAPTURE_KEY, JSON.stringify(response.boardState.cards));
      setResult(response);
    } catch (cause) {
      setError({ cause });
    } finally {
      setBusy(false);
    }
  }, []);

  const analyzeScenario = useCallback(
    (id: string) => {
      const form = new FormData();
      form.append('scenarioId', id);
      void analyze(form);
    },
    [analyze],
  );

  useEffect(() => {
    api
      .scenarios()
      .then((value) => setScenarios(value.scenarios))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const requested = searchParams.get('scenario');
    if (requested && !autoRan.current) {
      autoRan.current = true;
      setScenarioId(requested);
      analyzeScenario(requested);
    }
  }, [searchParams, analyzeScenario]);

  const sendFile = (file: File | Blob, sourceMode: 'image' | 'physical') => {
    const form = new FormData();
    form.append('image', file, 'board.jpg');
    form.append('sourceMode', sourceMode);
    void analyze(form);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{words.title}</h1>
        <p className="max-w-3xl text-muted">
          {words.intro.before}{' '}
          <Link className="underline" href="/simulator">
            {words.intro.simulator}
          </Link>{' '}
          {words.intro.or}{' '}
          <Link className="underline" href="/gallery">
            {words.intro.gallery}
          </Link>
          {words.intro.after}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label={words.sourceTabs} className="flex flex-wrap gap-2">
          {(['camera', 'image'] as const).map((value) => (
            <button
              key={value}
              id={`tab-${value}`}
              role="tab"
              type="button"
              aria-selected={tab === value}
              aria-controls="source-panel"
              className={`btn ${tab === value ? 'btn-primary' : ''}`}
              onClick={() => setTab(value)}
            >
              {value === 'camera' ? t.modes.physical : t.modes.image}
            </button>
          ))}
        </div>
        <Link href="/simulator" className="btn">
          {t.modes.simulator}
        </Link>
      </div>

      <div id="source-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
      <Section title={tab === 'camera' ? words.cameraTitle : words.imageTitle} id="source">
        {tab === 'camera' ? (
          <CameraCapture busy={busy} onCapture={(blob) => sendFile(blob, 'physical')} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="board-file" className="block text-sm font-semibold">
                {words.uploadLabel}
              </label>
              <input
                id="board-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="block text-sm"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) sendFile(file, 'image');
                  event.target.value = '';
                }}
              />
              <p className="text-xs text-muted">{words.uploadNote}</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="scenario" className="block text-sm font-semibold">
                {words.scenarioLabel}
              </label>
              <div className="flex gap-2">
                <select id="scenario" className="field" value={scenarioId} onChange={(event) => setScenarioId(event.target.value)}>
                  <option value="">{words.scenarioPlaceholder}</option>
                  {scenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {t.scenarios.items[scenario.id]?.title ?? scenario.titleEs}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn-primary" disabled={!scenarioId || busy} onClick={() => analyzeScenario(scenarioId)} data-testid="analyze-scenario">
                  {busy ? t.actions.analyzing : t.actions.analyze}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="mt-3">
          <ErrorBox error={error ? withErrorCode(errorText(error.cause, words.analyzeFailed), error.cause) : null} />
        </div>
      </Section>
      </div>

      {result && (
        <>
          <Section title={words.detectionTitle} id="detection" actions={<ModeBadge mode={result.detection.sourceMode} />}>
            <DetectionPanel detection={result.detection} />
            {diff && (
              <div className="mt-4 rounded-lg border border-ink-700 p-3">
                <BoardDiffSummary diff={diff} />
              </div>
            )}
          </Section>
          <Section title={words.compileTitle} id="compile">
            <CompilePanel key={result.captureId} source={{ captureId: result.captureId }} markerIds={result.boardState.cards.map((card) => card.markerId)} />
          </Section>
        </>
      )}
    </div>
  );
}

export default function StudioPage() {
  const { t } = useI18n();
  return (
    <SessionGate>
      <Suspense fallback={<p className="text-muted">{t.loading}</p>}>
        <Studio />
      </Suspense>
    </SessionGate>
  );
}
