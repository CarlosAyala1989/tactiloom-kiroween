import { BOARD_PROTOCOL_VERSION, type BoardState, type Orientation, type SourceMode } from '@ritualos/contracts';

export type LayoutEntry = readonly [markerId: number, row: number, col: number, orientation: Orientation];

/** Normative two-branch example of §4.3 (also rendered into assets/examples/boards/valid-board*.png). */
export const OFFICIAL_TWO_BRANCH_LAYOUT: readonly LayoutEntry[] = [
  [10, 0, 0, 'E'],
  [11, 0, 1, 'E'],
  [12, 0, 2, 'E'],
  [13, 0, 3, 'E'],
  [14, 0, 4, 'E'],
  [15, 0, 5, 'E'],
  [16, 0, 6, 'E'],
  [17, 0, 7, 'E'],
  [18, 1, 4, 'S'],
  [19, 2, 4, 'S'],
];

/** Alternative linear flow with set B (assets/examples/boards/valid-board-linear.png). */
export const LINEAR_LAYOUT: readonly LayoutEntry[] = [
  [20, 3, 0, 'E'],
  [21, 3, 1, 'E'],
  [22, 3, 2, 'E'],
  [23, 3, 3, 'E'],
  [25, 3, 4, 'E'],
  [26, 3, 5, 'E'],
  [27, 3, 6, 'E'],
];

export function boardStateFromLayout(layout: readonly LayoutEntry[], sourceMode: SourceMode = 'simulator'): BoardState {
  return {
    protocolVersion: BOARD_PROTOCOL_VERSION,
    sourceMode,
    board: { templateId: 'board-v1', columns: 8, rows: 4, calibrated: true },
    cards: layout.map(([markerId, row, col, orientation]) => ({ markerId, row, col, orientation, quality: null })),
    diagnostics: [],
  };
}
