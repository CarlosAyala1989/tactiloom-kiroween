import type { BoardTemplate, CardCatalogEntry, CardKind } from '@tactiloom/contracts';

/** What every language of ASSEMBLY.md is generated from. */
export interface ManualContext {
  readonly entries: readonly CardCatalogEntry[];
  readonly template: BoardTemplate;
  /** Titles printed on the cards, in the language of the manual. */
  readonly titles: Readonly<Record<CardKind, string>>;
  /** CONDITION branch labels printed on the cards, in the language of the manual. */
  readonly branch: { readonly TRUE: string; readonly FALSE: string };
}

/** Official two-branch example (the demo fixture): marker, cell (row,col) and orientation. */
const DEMO_EXAMPLE: readonly { markerId: number; kind: CardKind; cell: string; orientation: 'E' | 'S'; note?: 'branches' | 'rotated' }[] = [
  { markerId: 10, kind: 'START', cell: '0,0', orientation: 'E' },
  { markerId: 11, kind: 'INPUT_FILE', cell: '0,1', orientation: 'E' },
  { markerId: 12, kind: 'EXTRACT_TEXT', cell: '0,2', orientation: 'E' },
  { markerId: 13, kind: 'VALIDATE_FIELDS', cell: '0,3', orientation: 'E' },
  { markerId: 14, kind: 'CONDITION', cell: '0,4', orientation: 'E', note: 'branches' },
  { markerId: 15, kind: 'CREATE_REPORT', cell: '0,5', orientation: 'E' },
  { markerId: 16, kind: 'SAVE_REPORT', cell: '0,6', orientation: 'E' },
  { markerId: 17, kind: 'END', cell: '0,7', orientation: 'E' },
  { markerId: 18, kind: 'REQUEST_REVIEW', cell: '1,4', orientation: 'S', note: 'rotated' },
  { markerId: 19, kind: 'END', cell: '2,4', orientation: 'S', note: 'rotated' },
];

/** Rows of the example table; `notes` explain the CONDITION outputs and the rotated cards. */
export function exampleRows(context: ManualContext, notes: { readonly branches: string; readonly rotated: string }): string {
  return DEMO_EXAMPLE.map(({ markerId, kind, cell, orientation, note }) => {
    const detail = note === undefined ? '' : ` (${notes[note]})`;
    return `| ${context.titles[kind]} #${markerId} | ${cell} | ${orientation}${detail} |`;
  }).join('\n');
}

/** Rows of the printed catalogue table (marker, kind, printed title, instance, set). */
export function catalogRows(context: ManualContext): string {
  return context.entries
    .map((entry) => `| #${entry.markerId} | ${entry.kind} | ${context.titles[entry.kind]} | \`${entry.cardInstanceId}\` | ${entry.set} |`)
    .join('\n');
}
