'use client';

import { CARD_KIND_SPECS, type CardKind, type Orientation } from '@tactiloom/contracts';
import type { DragEvent, KeyboardEvent } from 'react';
import { textOn } from '@/lib/client/contrast';
import type { Dictionary } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/provider';

export interface BoardCardView {
  readonly markerId: number;
  readonly kind: CardKind;
  readonly row: number;
  readonly col: number;
  readonly orientation: Orientation;
}

const ROTATION: Record<Orientation, number> = { E: 0, S: 90, W: 180, N: 270 };

function Arrow({ degrees, color, label }: { degrees: number; color: string; label?: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-7 w-7" style={{ transform: `rotate(${degrees}deg)` }} aria-hidden="true">
      <path d="M6 17 H25 V10 L36 20 L25 30 V23 H6 Z" fill={color} />
      {label && (
        <text x="6" y="14" fontSize="8" fill={color} fontWeight="700">
          {label}
        </text>
      )}
    </svg>
  );
}

export function CardTile({ card, compact = false }: { card: Pick<BoardCardView, 'markerId' | 'kind' | 'orientation'>; compact?: boolean }) {
  const { t } = useI18n();
  const spec = CARD_KIND_SPECS[card.kind];
  return (
    <span className="flex h-full w-full flex-col items-center justify-between rounded-md border-2 bg-ink-950/80 p-1" style={{ borderColor: spec.color }}>
      <span className="w-full truncate rounded-sm px-1 text-center text-[0.62rem] font-bold leading-4" style={{ background: spec.color, color: textOn(spec.color) }}>
        {t.catalog.short[card.kind]}
      </span>
      {!compact && (
        <span className="flex items-center gap-0.5">
          <Arrow degrees={ROTATION[card.orientation]} color={spec.color} />
          {card.kind === 'CONDITION' && <Arrow degrees={ROTATION[card.orientation] + 90} color="#bcae9a" />}
        </span>
      )}
      <span className="mono text-[0.65rem] text-muted">#{card.markerId}</span>
    </span>
  );
}

/** Accessible name of a board cell in the UI language of `t`. */
export function describeCell(t: Dictionary, row: number, col: number, card: BoardCardView | undefined): string {
  const words = t.studio.board;
  if (!card) return words.emptyCell(row, col);
  const extra = card.kind === 'CONDITION' ? words.conditionHint : '';
  return `${words.cardCell(row, col, card.markerId, t.catalog.kinds[card.kind], card.orientation)}${extra}`;
}

interface BoardGridProps {
  readonly cards: readonly BoardCardView[];
  readonly caption: string;
  readonly errorCells?: ReadonlySet<string>;
  readonly selectedMarkerId?: number | null;
  readonly onCellActivate?: (row: number, col: number, card: BoardCardView | undefined) => void;
  readonly onCellKeyDown?: (row: number, col: number, card: BoardCardView | undefined, event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly onDropCard?: (markerId: number, row: number, col: number) => void;
  readonly interactive?: boolean;
}

/** 8×4 board as a keyboard-accessible grid of buttons (the same grammar as the printed board). */
export function BoardGrid({ cards, caption, errorCells, selectedMarkerId, onCellActivate, onCellKeyDown, onDropCard, interactive = false }: BoardGridProps) {
  const { t } = useI18n();
  const words = t.studio.board;
  const byCell = new Map<string, BoardCardView>();
  for (const card of cards) if (!byCell.has(`${card.row},${card.col}`)) byCell.set(`${card.row},${card.col}`, card);
  const rows = [0, 1, 2, 3];
  const cols = [0, 1, 2, 3, 4, 5, 6, 7];
  const onDragStart = (event: DragEvent, markerId: number) => {
    event.dataTransfer.setData('text/x-tactiloom-marker', String(markerId));
    event.dataTransfer.effectAllowed = 'move';
  };
  return (
    <figure className="w-full overflow-x-auto">
      <figcaption className="sr-only">{caption}</figcaption>
      <div role="grid" aria-label={caption} className="grid min-w-[640px] gap-1.5 rounded-xl border border-ink-700 bg-[#f2ece2]/5 p-2" style={{ gridTemplateColumns: '1.5rem repeat(8, minmax(0, 1fr))' }}>
        <div aria-hidden="true" />
        {cols.map((col) => (
          <div key={`h${col}`} aria-hidden="true" className="text-center text-[0.65rem] text-muted">
            {words.colHeader(col)}
          </div>
        ))}
        {rows.map((row) => (
          <div key={`r${row}`} role="row" className="contents">
            <div aria-hidden="true" className="flex items-center text-[0.65rem] text-muted">
              {words.rowHeader(row)}
            </div>
            {cols.map((col) => {
              const key = `${row},${col}`;
              const card = byCell.get(key);
              const hasError = errorCells?.has(key) ?? false;
              const selected = card !== undefined && card.markerId === selectedMarkerId;
              return (
                <div key={key} role="gridcell" className="aspect-[47/57]">
                  <button
                    type="button"
                    data-cell={key}
                    aria-label={describeCell(t, row, col, card) + (hasError ? words.withError : '')}
                    aria-pressed={interactive ? selected : undefined}
                    disabled={!interactive}
                    onClick={() => onCellActivate?.(row, col, card)}
                    onKeyDown={(event) => onCellKeyDown?.(row, col, card, event)}
                    draggable={interactive && card !== undefined}
                    onDragStart={card ? (event) => onDragStart(event, card.markerId) : undefined}
                    onDragOver={interactive ? (event) => event.preventDefault() : undefined}
                    onDrop={
                      interactive
                        ? (event) => {
                            event.preventDefault();
                            const marker = Number(event.dataTransfer.getData('text/x-tactiloom-marker'));
                            if (Number.isFinite(marker) && marker > 0) onDropCard?.(marker, row, col);
                          }
                        : undefined
                    }
                    className={`relative h-full w-full rounded-lg border p-1 text-left transition-colors disabled:cursor-default ${
                      hasError ? 'border-err bg-err/15' : 'border-ink-600 bg-ink-850'
                    } ${selected ? 'ring-2 ring-amber-strong' : ''} ${interactive ? 'hover:border-amber/70' : ''}`}
                  >
                    {card ? <CardTile card={card} /> : <span className="absolute left-1 top-0.5 text-[0.6rem] text-muted">{key}</span>}
                    {hasError && (
                      <span className="absolute right-1 top-0.5 text-[0.65rem] font-bold text-err" aria-hidden="true">
                        ✕
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </figure>
  );
}
