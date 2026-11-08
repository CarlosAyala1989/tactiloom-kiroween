'use client';

import { cardSvg } from '@tactiloom/board-kit/browser';
import { getCardCatalog } from '@tactiloom/contracts';
import { useEffect, useState } from 'react';
import { ErrorBox, formatBytes, Section } from '@/components/ui';
import { api, ApiError } from '@/lib/client/api';

type Kit = Awaited<ReturnType<typeof api.kit>>;
const PREVIEW = getCardCatalog().cards.filter((card) => card.set === 'A');

export default function KitPage() {
  const [kit, setKit] = useState<Kit | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .kit()
      .then(setKit)
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : 'No se pudo cargar el kit.'));
  }, []);
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Kit imprimible</h1>
        <p className="max-w-3xl text-muted">PDF y SVG generados por <code className="mono">pnpm board:generate</code> con marcadores ArUco reales (bits exportados de OpenCV). Una prueba automática rasteriza estos PDF y recupera todos los IDs con OpenCV.</p>
      </header>
      <ErrorBox error={error} />
      {kit && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Descargas" id="downloads" actions={<a className="btn btn-primary" href={kit.zipUrl}>Descargar todo (ZIP)</a>}>
            <ul className="space-y-2 text-sm">
              {kit.files
                .filter((file) => /\.(pdf|svg|md)$/.test(file.path))
                .map((file) => (
                  <li key={file.path} className="flex flex-wrap items-center gap-2">
                    <a className="underline" href={file.url}>
                      {file.path}
                    </a>
                    <span className="text-xs text-muted">
                      {file.description} · {formatBytes(file.bytes)}
                    </span>
                  </li>
                ))}
            </ul>
          </Section>
          <Section title="Instrucciones" id="instructions">
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {kit.instructionsEs.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted">
              Manual completo: <a className="underline" href="/api/board/kit/download?file=ASSEMBLY.md">ASSEMBLY.md</a> · versión del kit {kit.kitVersion}
            </p>
          </Section>
        </div>
      )}
      <Section title="Juego A (ejemplo oficial #10–#19)" id="cards">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PREVIEW.map((card) => (
            <li key={card.markerId} className="rounded-lg bg-white p-1">
              {/* SVG generated locally from the closed catalog (no user input). */}
              <div role="img" aria-label={`Tarjeta ${card.kind} #${card.markerId}`} dangerouslySetInnerHTML={{ __html: cardSvg(card).replace(/width="[^"]+mm" height="[^"]+mm"/, 'width="100%"') }} />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
