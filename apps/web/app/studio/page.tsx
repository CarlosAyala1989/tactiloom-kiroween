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
import { es } from '@/lib/i18n/es';

type Tab = 'camera' | 'image';
const LAST_CAPTURE_KEY = 'tactiloom:last-capture-cards';

function BoardDiffSummary({ diff }: { diff: BoardDiff }) {
  const changes = diff.added.length + diff.removed.length + diff.moved.length + diff.rotated.length;
  if (changes === 0) return <p className="text-sm text-muted">Sin cambios físicos respecto a la captura anterior ({diff.unchanged} tarjetas iguales).</p>;
  return (
    <div className="text-sm" aria-live="polite">
      <p className="font-semibold">Cambios desde la captura anterior</p>
      <ul className="mt-1 list-disc pl-5">
        {diff.added.map((c) => (
          <li key={`a${c.markerId}`}>
            + #{c.markerId} añadida en ({c.row},{c.col})
          </li>
        ))}
        {diff.removed.map((c) => (
          <li key={`r${c.markerId}`}>
            − #{c.markerId} retirada de ({c.row},{c.col})
          </li>
        ))}
        {diff.moved.map((c) => (
          <li key={`m${c.markerId}`}>
            ↦ #{c.markerId} movida de ({c.from.row},{c.from.col}) a ({c.to.row},{c.to.col})
          </li>
        ))}
        {diff.rotated.map((c) => (
          <li key={`o${c.markerId}`}>
            ↻ #{c.markerId} girada de {es.orientation[c.from as 'N']} a {es.orientation[c.to as 'N']}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Studio() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('image');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError(cause instanceof ApiError ? `${cause.message} (${cause.code})` : 'No se pudo analizar la imagen.');
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
        <h1 className="text-3xl font-bold">Board Studio</h1>
        <p className="max-w-3xl text-muted">
          Fotografía el tablero impreso o sube una imagen. El servidor detecta los marcadores ArUco desde los píxeles con OpenCV, calibra la perspectiva con las 4 esquinas y asigna cada tarjeta a su casilla y orientación. ¿Sin hardware? Usa el{' '}
          <Link className="underline" href="/simulator">
            simulador digital
          </Link>{' '}
          o la{' '}
          <Link className="underline" href="/gallery">
            galería
          </Link>
          .
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Fuente del tablero" className="flex flex-wrap gap-2">
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
              {value === 'camera' ? es.modes.physical : es.modes.image}
            </button>
          ))}
        </div>
        <Link href="/simulator" className="btn">
          {es.modes.simulator}
        </Link>
      </div>

      <div id="source-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
      <Section title={tab === 'camera' ? 'Captura con cámara' : 'Imagen del tablero'} id="source">
        {tab === 'camera' ? (
          <CameraCapture busy={busy} onCapture={(blob) => sendFile(blob, 'physical')} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="board-file" className="block text-sm font-semibold">
                Subir foto (JPG, PNG o WEBP, máx. 12 MB)
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
              <p className="text-xs text-muted">La imagen se procesa con exactamente el mismo algoritmo que la cámara; no se guarda.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="scenario" className="block text-sm font-semibold">
                o analiza un ejemplo de la galería (imagen sintética)
              </label>
              <div className="flex gap-2">
                <select id="scenario" className="field" value={scenarioId} onChange={(event) => setScenarioId(event.target.value)}>
                  <option value="">— elegir escenario —</option>
                  {scenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.titleEs}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn-primary" disabled={!scenarioId || busy} onClick={() => analyzeScenario(scenarioId)} data-testid="analyze-scenario">
                  {busy ? 'Analizando…' : es.actions.analyze}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="mt-3">
          <ErrorBox error={error} />
        </div>
      </Section>
      </div>

      {result && (
        <>
          <Section title="Lectura del tablero (OpenCV)" id="detection" actions={<ModeBadge mode={result.detection.sourceMode} />}>
            <DetectionPanel detection={result.detection} />
            {diff && (
              <div className="mt-4 rounded-lg border border-ink-700 p-3">
                <BoardDiffSummary diff={diff} />
              </div>
            )}
          </Section>
          <Section title="Programa compilado" id="compile">
            <CompilePanel key={result.captureId} source={{ captureId: result.captureId }} markerIds={result.boardState.cards.map((card) => card.markerId)} />
          </Section>
        </>
      )}
    </div>
  );
}

export default function StudioPage() {
  return (
    <SessionGate>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Studio />
      </Suspense>
    </SessionGate>
  );
}
