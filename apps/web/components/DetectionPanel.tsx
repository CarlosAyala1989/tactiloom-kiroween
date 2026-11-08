'use client';

import type { DetectionResult } from '@tactiloom/contracts';
import { useI18n } from '@/lib/i18n/provider';
import { DiagnosticsList } from './DiagnosticsList';
import { ModeBadge } from './ui';

/** Shows exactly what OpenCV read from the pixels: overlay, cards, rejected markers, diagnostics. */
export function DetectionPanel({ detection }: { detection: DetectionResult }) {
  const { t, number } = useI18n();
  const words = t.studio.detection;
  /** Rounds like the pre-i18n `toFixed` (2.05 → "2.0" in Spanish) and prints the decimal separator of the UI language. */
  const fixed = (value: number, digits: number) => number(Number(value.toFixed(digits)), digits);
  const errors = detection.diagnostics.filter((d) => d.severity === 'error').length;
  const reprojectionErrorMm = detection.board.reprojectionErrorMm;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ModeBadge mode={detection.sourceMode} />
        <span className={`chip ${detection.board.calibrated ? 'text-ok' : 'text-err'}`}>
          {detection.board.calibrated ? words.calibrated(reprojectionErrorMm === null ? '—' : fixed(reprojectionErrorMm, 2)) : words.uncalibrated}
        </span>
        <span className="chip">{words.cardsRecognized(detection.cards.length)}</span>
        <span className={`chip ${errors ? 'text-err' : 'text-ok'}`}>{words.readErrors(errors)}</span>
        <span className="chip">{words.corners(detection.board.fiducialsFound.join(', ') || t.none)}</span>
        <span className="chip mono" title={words.latencyTitle}>
          {Math.round(detection.metrics.totalMs)} ms
        </span>
      </div>
      {detection.overlay && (
        // eslint-disable-next-line @next/next/no-img-element -- data URL produced by the vision service
        <img
          src={`data:${detection.overlay.mime};base64,${detection.overlay.dataBase64}`}
          width={detection.overlay.width}
          height={detection.overlay.height}
          alt={words.overlayAlt(detection.cards.length, detection.board.calibrated)}
          className="h-auto w-full rounded-xl border border-ink-700"
        />
      )}
      <p className="text-xs text-muted">{words.overlayNote}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left font-semibold">{words.tableCaption}</caption>
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 pr-3">{words.columns.marker}</th>
              <th className="py-1 pr-3">{words.columns.kind}</th>
              <th className="py-1 pr-3">{words.columns.cell}</th>
              <th className="py-1 pr-3">{words.columns.orientation}</th>
              <th className="py-1 pr-3">{words.columns.deviation}</th>
              <th className="py-1 pr-3" title={words.columns.qualityTitle}>
                {words.columns.quality}
              </th>
            </tr>
          </thead>
          <tbody>
            {detection.cards.map((card) => (
              <tr key={`${card.markerId}-${card.row}-${card.col}`} className="border-t border-ink-700">
                <td className="mono py-1 pr-3">#{card.markerId}</td>
                <td className="py-1 pr-3">{t.catalog.kinds[card.type]}</td>
                <td className="mono py-1 pr-3">
                  ({card.row},{card.col})
                </td>
                <td className="py-1 pr-3">{t.orientation[card.orientation]}</td>
                <td className="mono py-1 pr-3">{fixed(card.angleDeviationDeg, 1)}°</td>
                <td className="mono py-1 pr-3">{card.quality === null ? '—' : fixed(card.quality, 2)}</td>
              </tr>
            ))}
            {detection.cards.length === 0 && (
              <tr>
                <td colSpan={6} className="py-2 text-muted">
                  {words.noCards}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-muted">{words.qualityNote}</p>
      </div>
      {detection.rejectedMarkers.length > 0 && (
        <div className="text-sm">
          <p className="font-semibold">{words.rejectedTitle}</p>
          <ul className="mt-1 list-disc pl-5 text-muted">
            {detection.rejectedMarkers.map((marker, index) => (
              <li key={`${marker.markerId}-${index}`}>
                #{marker.markerId}: <code className="mono">{marker.reason}</code>
                {marker.candidateCells.length > 0 && words.candidateCells(marker.candidateCells.map((c) => `(${c.row},${c.col})`))}
              </li>
            ))}
          </ul>
        </div>
      )}
      <DiagnosticsList diagnostics={detection.diagnostics} emptyText={words.noProblems} />
    </div>
  );
}
