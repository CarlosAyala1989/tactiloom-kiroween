import { adjacent, getCardCatalog, rotateClockwise, type CardKind, type Orientation } from '@tactiloom/contracts';
import fc from 'fast-check';
import type { LayoutEntry } from '../src/index';

type StepKind = 'CREATE_REPORT' | 'REQUEST_REVIEW' | 'SAVE_REPORT';

export interface Tail {
  readonly steps: readonly StepKind[];
  readonly terminal: { readonly t: 'end' } | { readonly t: 'cond'; readonly yes: Tail; readonly no: Tail };
}

const tailArb: fc.Arbitrary<Tail> = fc.letrec<{ tail: Tail; terminal: Tail['terminal'] }>((tie) => ({
  tail: fc.record({
    steps: fc.array(fc.constantFrom<StepKind>('CREATE_REPORT', 'REQUEST_REVIEW', 'SAVE_REPORT'), { maxLength: 2 }),
    terminal: tie('terminal'),
  }),
  terminal: fc.oneof(
    { maxDepth: 2, depthIdentifier: 'tail' },
    { arbitrary: fc.constant({ t: 'end' as const }), weight: 1 },
    { arbitrary: fc.record({ t: fc.constant('cond' as const), yes: tie('tail'), no: tie('tail') }), weight: 2 },
  ),
})).tail;

const ORIENTATIONS: readonly Orientation[] = ['N', 'E', 'S', 'W'];
const PLACEMENTS = ORIENTATIONS.flatMap((dir) =>
  Array.from({ length: 32 }, (_, i) => ({ row: Math.floor(i / 8), col: i % 8, dir })),
);

/** Places a typed program on the 8×4 grid; returns null when it does not fit or runs out of cards. */
export function layoutProgram(tail: Tail, startRow: number, startCol: number, startDir: Orientation): LayoutEntry[] | null {
  const pool = new Map<CardKind, number[]>();
  for (const card of getCardCatalog().cards) {
    if (!card.enabled) continue;
    pool.set(card.kind, [...(pool.get(card.kind) ?? []), card.markerId]);
  }
  const occupied = new Set<string>();
  const cards: LayoutEntry[] = [];
  const place = (kind: CardKind, row: number, col: number, dir: Orientation): boolean => {
    if (row < 0 || col < 0 || row >= 4 || col >= 8 || occupied.has(`${row},${col}`)) return false;
    const available = pool.get(kind) ?? [];
    const markerId = available.shift();
    if (markerId === undefined) return false;
    occupied.add(`${row},${col}`);
    cards.push([markerId, row, col, dir]);
    return true;
  };
  const layTail = (t: Tail, start: { row: number; col: number }, dir: Orientation, hasReport: boolean): boolean => {
    let position = start;
    let report = hasReport;
    for (const raw of t.steps) {
      const kind: StepKind = raw === 'SAVE_REPORT' && !report ? 'CREATE_REPORT' : raw;
      if (kind === 'CREATE_REPORT') report = true;
      if (!place(kind, position.row, position.col, dir)) return false;
      position = adjacent(position, dir);
    }
    if (t.terminal.t === 'end') return place('END', position.row, position.col, dir);
    if (!place('CONDITION', position.row, position.col, dir)) return false;
    const right = rotateClockwise(dir);
    return layTail(t.terminal.yes, adjacent(position, dir), dir, report) && layTail(t.terminal.no, adjacent(position, right), right, report);
  };
  let position = { row: startRow, col: startCol };
  for (const kind of ['START', 'INPUT_FILE', 'EXTRACT_TEXT', 'VALIDATE_FIELDS'] as const) {
    if (!place(kind, position.row, position.col, startDir)) return null;
    position = adjacent(position, startDir);
  }
  return layTail(tail, position, startDir, false) ? cards : null;
}

/**
 * Arbitrary of valid layouts (by construction) for the Tactiloom Board Grammar v1.
 * For each generated program every board placement is tried and one feasible placement is
 * picked, so branching programs are not filtered away (see generators-coverage.test.ts).
 */
export const validLayoutArb: fc.Arbitrary<LayoutEntry[]> = fc
  .record({ tail: tailArb, pick: fc.nat() })
  .map(({ tail, pick }) => {
    const feasible = PLACEMENTS.map(({ row, col, dir }) => layoutProgram(tail, row, col, dir)).filter(
      (layout): layout is LayoutEntry[] => layout !== null,
    );
    return feasible.length > 0 ? (feasible[pick % feasible.length] as LayoutEntry[]) : null;
  })
  .filter((layout): layout is LayoutEntry[] => layout !== null);

export type Mutation =
  | { readonly t: 'remove'; readonly index: number }
  | { readonly t: 'rotate'; readonly index: number; readonly turns: 1 | 2 | 3 }
  | { readonly t: 'move'; readonly index: number; readonly row: number; readonly col: number }
  | { readonly t: 'add'; readonly markerId: number; readonly row: number; readonly col: number; readonly dir: Orientation };

export const mutationArb: fc.Arbitrary<Mutation> = fc.oneof(
  fc.record({ t: fc.constant('remove' as const), index: fc.nat() }),
  fc.record({ t: fc.constant('rotate' as const), index: fc.nat(), turns: fc.constantFrom(1 as const, 2 as const, 3 as const) }),
  fc.record({ t: fc.constant('move' as const), index: fc.nat(), row: fc.integer({ min: 0, max: 3 }), col: fc.integer({ min: 0, max: 7 }) }),
  fc.record({
    t: fc.constant('add' as const),
    markerId: fc.oneof(fc.integer({ min: 0, max: 99 }), fc.constantFrom(...getCardCatalog().cards.map((c) => c.markerId))),
    row: fc.integer({ min: 0, max: 3 }),
    col: fc.integer({ min: 0, max: 7 }),
    dir: fc.constantFrom(...ORIENTATIONS),
  }),
);

export function applyMutation(layout: readonly LayoutEntry[], mutation: Mutation): LayoutEntry[] {
  const cards = [...layout];
  if (mutation.t === 'add') return [...cards, [mutation.markerId, mutation.row, mutation.col, mutation.dir]];
  if (cards.length === 0) return cards;
  const index = mutation.index % cards.length;
  const [markerId, row, col, dir] = cards[index] as LayoutEntry;
  if (mutation.t === 'remove') cards.splice(index, 1);
  if (mutation.t === 'rotate') {
    let next = dir;
    for (let i = 0; i < mutation.turns; i += 1) next = rotateClockwise(next);
    cards[index] = [markerId, row, col, next];
  }
  if (mutation.t === 'move') cards[index] = [markerId, mutation.row, mutation.col, dir];
  return cards;
}
