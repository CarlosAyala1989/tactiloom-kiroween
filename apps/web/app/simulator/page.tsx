'use client';

import { LINEAR_LAYOUT, OFFICIAL_TWO_BRANCH_LAYOUT, type LayoutEntry } from '@ritualos/compiler';
import { BOARD_PROTOCOL_VERSION, getCardCatalog, rotateClockwise, type BoardState, type CardKind, type Orientation } from '@ritualos/contracts';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { BoardGrid, CardTile, type BoardCardView } from '@/components/BoardGrid';
import { CompilePanel } from '@/components/CompilePanel';
import { SessionGate } from '@/components/SessionProvider';
import { Section } from '@/components/ui';
import { es } from '@/lib/i18n/es';

const CATALOG = getCardCatalog().cards.filter((card) => card.enabled);
const KIND_OF = new Map(CATALOG.map((card) => [card.markerId, card.kind]));

function fromLayout(layout: readonly LayoutEntry[]): BoardCardView[] {
  return layout.map(([markerId, row, col, orientation]) => ({ markerId, row, col, orientation, kind: KIND_OF.get(markerId) as CardKind }));
}

const DELTA: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
/** Consequences of an earlier problem: listed in diagnostics but not highlighted on the board. */
const CONSEQUENCE_CODES = new Set(['UNREACHABLE_NODE', 'NONTERMINATING_PATH']);

function Simulator() {
  const [cards, setCards] = useState<BoardCardView[]>(() => fromLayout(OFFICIAL_TWO_BRANCH_LAYOUT));
  const [selected, setSelected] = useState<{ from: 'palette' | 'board'; markerId: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [errorCells, setErrorCells] = useState<Set<string>>(new Set());

  const onBoard = new Set(cards.map((card) => card.markerId));
  const palette = CATALOG.filter((card) => !onBoard.has(card.markerId));
  const occupied = (row: number, col: number) => cards.find((card) => card.row === row && card.col === col);

  const boardState: BoardState = useMemo(
    () => ({
      protocolVersion: BOARD_PROTOCOL_VERSION,
      sourceMode: 'simulator',
      board: { templateId: 'board-v1', columns: 8, rows: 4, calibrated: true },
      cards: cards.map(({ markerId, row, col, orientation }) => ({ markerId, row, col, orientation, quality: null })),
      diagnostics: [],
    }),
    [cards],
  );

  const announce = (text: string) => setAnnouncement(text);

  const place = (markerId: number, row: number, col: number) => {
    const target = occupied(row, col);
    if (target && target.markerId !== markerId) {
      announce(`La casilla (${row},${col}) ya tiene la tarjeta #${target.markerId}.`);
      return;
    }
    setCards((current) => {
      const existing = current.find((card) => card.markerId === markerId);
      if (existing) return current.map((card) => (card.markerId === markerId ? { ...card, row, col } : card));
      return [...current, { markerId, row, col, orientation: 'E' as Orientation, kind: KIND_OF.get(markerId) as CardKind }];
    });
    setSelected({ from: 'board', markerId });
    announce(`Tarjeta #${markerId} colocada en (${row},${col}).`);
  };

  const rotate = (markerId: number) => {
    setCards((current) => current.map((card) => (card.markerId === markerId ? { ...card, orientation: rotateClockwise(card.orientation) } : card)));
    const card = cards.find((c) => c.markerId === markerId);
    if (card) announce(`Tarjeta #${markerId} ahora apunta al ${es.orientation[rotateClockwise(card.orientation)]}.`);
  };

  const remove = (markerId: number) => {
    setCards((current) => current.filter((card) => card.markerId !== markerId));
    setSelected(null);
    announce(`Tarjeta #${markerId} retirada del tablero.`);
  };

  const onCellActivate = (row: number, col: number, card: BoardCardView | undefined) => {
    if (card) {
      setSelected({ from: 'board', markerId: card.markerId });
      announce(`Seleccionada #${card.markerId}. R gira, Supr quita, flechas mueven.`);
      return;
    }
    if (selected) place(selected.markerId, row, col);
  };

  const onCellKeyDown = (row: number, col: number, card: BoardCardView | undefined, event: KeyboardEvent<HTMLButtonElement>) => {
    if (!card) return;
    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      rotate(card.markerId);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      remove(card.markerId);
    } else if (DELTA[event.key] && event.shiftKey) {
      event.preventDefault();
      const [dr, dc] = DELTA[event.key] as [number, number];
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < 4 && nc >= 0 && nc < 8 && !occupied(nr, nc)) place(card.markerId, nr, nc);
    }
  };

  const selectedCard = selected ? cards.find((card) => card.markerId === selected.markerId) : undefined;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p role="note" className="inline-block rounded-lg border border-warn/60 bg-warn/10 px-3 py-1.5 text-sm font-semibold text-warn">
          {es.modes.simulator}
        </p>
        <h1 className="text-3xl font-bold">Simulador del tablero</h1>
        <p className="max-w-3xl text-muted">
          Coloca tarjetas virtuales sobre la misma cuadrícula 8×4. Este modo construye el estado del tablero digitalmente (no hay detección por cámara), pero usa <strong>el mismo compilador y el mismo worker</strong> que las fotos.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Section
          title="Tablero virtual"
          id="board"
          actions={
            <>
              <button type="button" className="btn" onClick={() => setCards(fromLayout(OFFICIAL_TWO_BRANCH_LAYOUT))}>
                Ejemplo oficial (2 ramas)
              </button>
              <button type="button" className="btn" onClick={() => setCards(fromLayout(LINEAR_LAYOUT))}>
                Flujo lineal
              </button>
              <button type="button" className="btn" onClick={() => setCards([])}>
                {es.actions.clear}
              </button>
            </>
          }
        >
          <BoardGrid
            cards={cards}
            caption="Tablero virtual de 8 columnas por 4 filas"
            interactive
            errorCells={errorCells}
            selectedMarkerId={selected?.from === 'board' ? selected.markerId : null}
            onCellActivate={onCellActivate}
            onCellKeyDown={onCellKeyDown}
            onDropCard={place}
          />
          <p className="mt-2 text-xs text-muted">
            Ratón: elige una tarjeta de la paleta y pulsa una casilla, o arrástrala. Teclado: Tab hasta una casilla con tarjeta · <kbd>R</kbd> gira · <kbd>Supr</kbd> quita · <kbd>Mayús</kbd>+flechas mueve.
          </p>
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
          {selectedCard && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span>
                Seleccionada: <strong>#{selectedCard.markerId}</strong> {es.kinds[selectedCard.kind]} en ({selectedCard.row},{selectedCard.col}), apunta al {es.orientation[selectedCard.orientation]}
              </span>
              <button type="button" className="btn" onClick={() => rotate(selectedCard.markerId)}>
                {es.actions.rotate}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => remove(selectedCard.markerId)}>
                {es.actions.remove}
              </button>
            </div>
          )}
        </Section>

        <Section title="Paleta de tarjetas" id="palette">
          <p className="mb-2 text-xs text-muted">Tarjetas del catálogo cards-v1 que no están en el tablero.</p>
          <ul className="grid grid-cols-3 gap-2">
            {palette.map((card) => (
              <li key={card.markerId}>
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/x-ritualos-marker', String(card.markerId))}
                  aria-pressed={selected?.from === 'palette' && selected.markerId === card.markerId}
                  aria-label={`Elegir tarjeta #${card.markerId} ${es.kinds[card.kind]}`}
                  onClick={() => {
                    setSelected({ from: 'palette', markerId: card.markerId });
                    announce(`Elegida #${card.markerId}. Ahora pulsa una casilla vacía.`);
                  }}
                  className={`block h-20 w-full rounded-lg border p-0.5 ${selected?.markerId === card.markerId ? 'border-amber-strong ring-2 ring-amber-strong' : 'border-ink-700'}`}
                >
                  <CardTile card={{ markerId: card.markerId, kind: card.kind, orientation: 'E' }} />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Compilación en vivo" id="compile">
        <CompilePanel
          source={{ boardState }}
          markerIds={cards.map((card) => card.markerId)}
          onCompiled={(view) =>
            setErrorCells(
              new Set(
                (view?.diagnostics ?? [])
                  .filter((d) => d.severity === 'error' && !CONSEQUENCE_CODES.has(d.code))
                  .flatMap((d) => (d.cells ?? []).map((c) => `${c.row},${c.col}`)),
              ),
            )
          }
        />
      </Section>
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <SessionGate>
      <Simulator />
    </SessionGate>
  );
}
