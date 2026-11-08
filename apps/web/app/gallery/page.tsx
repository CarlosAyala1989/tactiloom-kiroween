'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ErrorBox } from '@/components/ui';
import { api, ApiError, type ScenarioView } from '@/lib/client/api';

export default function GalleryPage() {
  const [scenarios, setScenarios] = useState<ScenarioView[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .scenarios()
      .then((value) => {
        setScenarios(value.scenarios);
        setNote(value.note);
      })
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : 'No se pudo cargar la galería.'));
  }, []);
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Galería de demostración</h1>
        <p className="max-w-3xl text-muted">{note || 'Imágenes de tableros para probar RitualOS sin cámara ni impresora.'}</p>
        <p className="inline-block rounded-lg border border-info/50 bg-info/10 px-3 py-1.5 text-sm text-info">
          Procedencia: sintéticas — renderizadas desde los PDF reales del kit y «fotografiadas» por software. No son capturas físicas.
        </p>
      </header>
      <ErrorBox error={error} />
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((scenario) => (
          <li key={scenario.id} className="panel flex flex-col overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- static demo image served by the API */}
            <img src={scenario.imageUrl} alt={`Tablero de ejemplo: ${scenario.titleEs}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h2 className="font-bold">{scenario.titleEs}</h2>
              <p className="text-sm text-muted">{scenario.descriptionEs}</p>
              <p className="text-xs">
                Esperado:{' '}
                {scenario.expected.compileValid ? (
                  <span className="text-ok">compila ({scenario.expected.cards} tarjetas)</span>
                ) : (
                  <span className="text-err">no compila · {[...scenario.expected.visionErrors, ...scenario.expected.compileErrors].filter((v, i, a) => a.indexOf(v) === i).join(', ')}</span>
                )}
              </p>
              <Link href={`/studio?scenario=${scenario.id}`} className="btn btn-primary mt-auto self-start" data-testid={`analyze-${scenario.id}`}>
                Analizar con OpenCV
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
