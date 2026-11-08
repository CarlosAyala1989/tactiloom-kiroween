import { z } from 'zod';

/** Cardinal orientations in board space (x → right/East, y → down/South). */
export const ORIENTATIONS = ['N', 'E', 'S', 'W'] as const;
export type Orientation = (typeof ORIENTATIONS)[number];
export const OrientationSchema = z.enum(ORIENTATIONS);

const ORDER_CLOCKWISE: readonly Orientation[] = ['N', 'E', 'S', 'W'];

/** R(F): 90° clockwise turn of F. */
export function rotateClockwise(orientation: Orientation): Orientation {
  const index = ORDER_CLOCKWISE.indexOf(orientation);
  return ORDER_CLOCKWISE[(index + 1) % 4] as Orientation;
}

/** B(F): opposite direction of F. */
export function opposite(orientation: Orientation): Orientation {
  const index = ORDER_CLOCKWISE.indexOf(orientation);
  return ORDER_CLOCKWISE[(index + 2) % 4] as Orientation;
}

export const DIRECTION_DELTA: Readonly<Record<Orientation, { dRow: number; dCol: number }>> = {
  N: { dRow: -1, dCol: 0 },
  E: { dRow: 0, dCol: 1 },
  S: { dRow: 1, dCol: 0 },
  W: { dRow: 0, dCol: -1 },
};

export const CellSchema = z.object({
  row: z.number().int().min(0).max(63),
  col: z.number().int().min(0).max(63),
});
export type Cell = z.infer<typeof CellSchema>;

export function adjacent(cell: Cell, direction: Orientation): { row: number; col: number } {
  const delta = DIRECTION_DELTA[direction];
  return { row: cell.row + delta.dRow, col: cell.col + delta.dCol };
}

export function cellKey(cell: { row: number; col: number }): string {
  return `${cell.row},${cell.col}`;
}

export const ORIENTATION_LABEL_ES: Readonly<Record<Orientation, string>> = {
  N: 'norte (arriba)',
  E: 'este (derecha)',
  S: 'sur (abajo)',
  W: 'oeste (izquierda)',
};
