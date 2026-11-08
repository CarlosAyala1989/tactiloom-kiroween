'use client';

import { LINEAR_LAYOUT, OFFICIAL_TWO_BRANCH_LAYOUT, type LayoutEntry } from '@tactiloom/compiler';
import { BOARD_PROTOCOL_VERSION, getCardCatalog, rotateClockwise, type BoardState, type CardKind, type Orientation } from '@tactiloom/contracts';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { BoardGrid, CardTile, type BoardCardView } from '@/components/BoardGrid';
import { CompilePanel } from '@/components/CompilePanel';
import { SessionGate } from '@/components/SessionProvider';
import { Section } from '@/components/ui';
import { useI18n } from '@/lib/i18n/provider';

const CATALOG = getCardCatalog().cards.filter((card) => card.enabled);
const KIND_OF = new Map(CATALOG.map((card) => [card.markerId, card.kind]));

function fromLayout(layout: readonly LayoutEntry[]): BoardCardView[] {
  return layout.map(([markerId, row, col, orientation]) => ({ markerId, row, col, orientation, kind: KIND_OF.get(markerId) as CardKind }));
}

const DELTA: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
/** Consequences of an earlier problem: listed in diagnostics but not highlighted on the board. */
const CONSEQUENCE_CODES = new Set(['UNREACHABLE_NODE', 'NONTERMINATING_PATH']);

function Simulator() {
  const { t } = useI18n();
  const words = t.studio.simulator;
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
      announce(words.announce.occupied(row, col, target.markerId));
      return;
    }
    setCards((current) => {
      const existing = current.find((card) => card.markerId === markerId);
      if (existing) return current.map((card) => (card.markerId === markerId ? { ...card, row, col } : card));
      return [...current, { markerId, row, col, orientation: 'E' as Orientation, kind: KIND_OF.get(markerId) as CardKind }];
    });
    setSelected({ from: 'board', markerId });
    announce(words.announce.placed(markerId, row, col));
  };

  const rotate = (markerId: number) => {
    setCards((current) => current.map((card) => (card.markerId === markerId ? { ...card, orientation: rotateClockwise(card.orientation) } : card)));
    const card = cards.find((c) => c.markerId === markerId);
    if (card) announce(words.announce.rotated(markerId, rotateClockwise(card.orientation)));
  };

  const remove = (markerId: number) => {
    setCards((current) => current.filter((card) => card.markerId !== markerId));
    setSelected(null);
    announce(words.announce.removed(markerId));
  };

  const onCellActivate = (row: number, col: number, card: BoardCardView | undefined) => {
    if (card) {
      setSelected({ from: 'board', markerId: card.markerId });
      announce(words.announce.selected(card.markerId));
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
          {t.modes.simulator}
        </p>
        <h1 className="text-3xl font-bold">{words.title}</h1>
        <p className="max-w-3xl text-muted">
          {words.intro.before}
          <strong>{words.intro.strong}</strong>
          {words.intro.after}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Section
          title={words.boardTitle}
          id="board"
          actions={
            <>
              <button type="button" className="btn" onClick={() => setCards(fromLayout(OFFICIAL_TWO_BRANCH_LAYOUT))}>
                {words.officialExample}
              </button>
              <button type="button" className="btn" onClick={() => setCards(fromLayout(LINEAR_LAYOUT))}>
                {words.linearExample}
              </button>
              <button type="button" className="btn" onClick={() => setCards([])}>
                {t.actions.clear}
              </button>
            </>
          }
        >
          <BoardGrid
            cards={cards}
            caption={words.boardCaption}
            interactive
            errorCells={errorCells}
            selectedMarkerId={selected?.from === 'board' ? selected.markerId : null}
            onCellActivate={onCellActivate}
            onCellKeyDown={onCellKeyDown}
            onDropCard={place}
          />
          <p className="mt-2 text-xs text-muted">
            {words.hint.intro}
            <kbd>{words.keys.rotate}</kbd>
            {words.hint.rotate}
            <kbd>{words.keys.remove}</kbd>
            {words.hint.remove}
            <kbd>{words.keys.move}</kbd>
            {words.hint.move}
          </p>
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
          {selectedCard && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span>
                {words.selected.label} <strong>#{selectedCard.markerId}</strong>{' '}
                {words.selected.details(t.catalog.kinds[selectedCard.kind], selectedCard.row, selectedCard.col, selectedCard.orientation)}
              </span>
              <button type="button" className="btn" onClick={() => rotate(selectedCard.markerId)}>
                {t.actions.rotate}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => remove(selectedCard.markerId)}>
                {t.actions.remove}
              </button>
            </div>
          )}
        </Section>

        <Section title={words.paletteTitle} id="palette">
          <p className="mb-2 text-xs text-muted">{words.paletteNote}</p>
          <ul className="grid grid-cols-3 gap-2">
            {palette.map((card) => (
              <li key={card.markerId}>
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/x-tactiloom-marker', String(card.markerId))}
                  aria-pressed={selected?.from === 'palette' && selected.markerId === card.markerId}
                  aria-label={words.pickCard(card.markerId, t.catalog.kinds[card.kind])}
                  onClick={() => {
                    setSelected({ from: 'palette', markerId: card.markerId });
                    announce(words.announce.picked(card.markerId));
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

      <Section title={words.compileTitle} id="compile">
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
