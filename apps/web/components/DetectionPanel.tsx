'use client';

import type { DetectionResult } from '@tactiloom/contracts';
import { es } from '@/lib/i18n/es';
import { DiagnosticsList } from './DiagnosticsList';
import { ModeBadge } from './ui';

/** Shows exactly what OpenCV read from the pixels: overlay, cards, rejected markers, diagnostics. */
export function DetectionPanel({ detection }: { detection: DetectionResult }) {
  const errors = detection.diagnostics.filter((d) => d.severity === 'error').length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ModeBadge mode={detection.sourceMode} />
        <span className={`chip ${detection.board.calibrated ? 'text-ok' : 'text-err'}`}>
          {detection.board.calibrated ? `Calibrado (error ${detection.board.reprojectionErrorMm?.toFixed(2)} mm)` : 'Sin calibrar'}
        </span>
        <span className="chip">{detection.cards.length} tarjetas reconocidas</span>
        <span className={`chip ${errors ? 'text-err' : 'text-ok'}`}>{errors} errores de lectura</span>
        <span className="chip">Esquinas: {detection.board.fiducialsFound.join(', ') || 'ninguna'}</span>
        <span className="chip mono" title="Latencia total del análisis en el servidor">
          {Math.round(detection.metrics.totalMs)} ms
        </span>
      </div>
      {detection.overlay && (
        // eslint-disable-next-line @next/next/no-img-element -- data URL produced by the vision service
        <img
          src={`data:${detection.overlay.mime};base64,${detection.overlay.dataBase64}`}
          width={detection.overlay.width}
          height={detection.overlay.height}
          alt={`Superposición de la detección: ${detection.cards.length} tarjetas, tablero ${detection.board.calibrated ? 'calibrado' : 'sin calibrar'}`}
          className="h-auto w-full rounded-xl border border-ink-700"
        />
      )}
      <p className="text-xs text-muted">
        La superposición se dibuja con la misma salida del detector (esquinas, cuadrícula proyectada, flechas de orientación). La foto no se guarda: solo su sha256 y el JSON de detección.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left font-semibold">Tarjetas leídas desde los píxeles</caption>
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 pr-3">Marcador</th>
              <th className="py-1 pr-3">Tipo</th>
              <th className="py-1 pr-3">Casilla</th>
              <th className="py-1 pr-3">Orientación</th>
              <th className="py-1 pr-3">Desviación</th>
              <th className="py-1 pr-3" title="Heurística geométrica (centrado, ángulo, tamaño); no es una probabilidad">
                Calidad*
              </th>
            </tr>
          </thead>
          <tbody>
            {detection.cards.map((card) => (
              <tr key={`${card.markerId}-${card.row}-${card.col}`} className="border-t border-ink-700">
                <td className="mono py-1 pr-3">#{card.markerId}</td>
                <td className="py-1 pr-3">{es.kinds[card.type]}</td>
                <td className="mono py-1 pr-3">
                  ({card.row},{card.col})
                </td>
                <td className="py-1 pr-3">{es.orientation[card.orientation]}</td>
                <td className="mono py-1 pr-3">{card.angleDeviationDeg.toFixed(1)}°</td>
                <td className="mono py-1 pr-3">{card.quality === null ? '—' : card.quality.toFixed(2)}</td>
              </tr>
            ))}
            {detection.cards.length === 0 && (
              <tr>
                <td colSpan={6} className="py-2 text-muted">
                  Ninguna tarjeta asignada a una casilla.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-muted">*Calidad = mínimo de centrado en la casilla, alineación angular y tamaño esperado. Heurística documentada, no probabilidad.</p>
      </div>
      {detection.rejectedMarkers.length > 0 && (
        <div className="text-sm">
          <p className="font-semibold">Marcadores no asignados</p>
          <ul className="mt-1 list-disc pl-5 text-muted">
            {detection.rejectedMarkers.map((marker, index) => (
              <li key={`${marker.markerId}-${index}`}>
                #{marker.markerId}: <code className="mono">{marker.reason}</code>
                {marker.candidateCells.length > 0 && ` · casillas candidatas ${marker.candidateCells.map((c) => `(${c.row},${c.col})`).join(' y ')}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      <DiagnosticsList diagnostics={detection.diagnostics} emptyText="Lectura del tablero sin problemas." />
    </div>
  );
}
