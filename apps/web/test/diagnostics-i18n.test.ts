import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { boardStateFromLayout, compile, LINEAR_LAYOUT, OFFICIAL_TWO_BRANCH_LAYOUT, type LayoutEntry } from '@tactiloom/compiler';
import { DiagnosticSchema, getCardCatalog, type Diagnostic, type Locale, type Orientation } from '@tactiloom/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { localizeDiagnostic } from '../lib/i18n/render-diagnostic';

const OTHER_LOCALES = ['en', 'it', 'fr'] as const satisfies readonly Locale[];
const ORIENTATIONS: readonly Orientation[] = ['N', 'E', 'S', 'W'];
const CARD_IDS = getCardCatalog()
  .cards.filter((card) => card.enabled)
  .map((card) => card.markerId);

/** "#15" and "(0,5)": where a message points to. The UX rule requires them in every language. */
const anchors = (text: string | undefined | null): string[] => [...new Set(text?.match(/#\d+|\(\d+,\d+\)/g) ?? [])].sort();

/**
 * A localized diagnostic must say the same "where" as the canonical Spanish text (card ids, cells),
 * offer a fix whenever Spanish does, and never leak template artefacts.
 */
function expectFaithful(diagnostic: Diagnostic, locale: Locale): void {
  const label = `${locale} ${diagnostic.code} ${JSON.stringify(diagnostic.params)}`;
  const text = localizeDiagnostic(diagnostic, locale);
  expect(text.fallback, label).toBe(false);
  expect(text.message.trim(), label).not.toBe('');
  expect(text.message, label).not.toBe(diagnostic.message);
  expect(anchors(text.message), label).toEqual(anchors(diagnostic.message));
  expect(Boolean(text.suggestion), label).toBe(Boolean(diagnostic.suggestion));
  expect(anchors(text.suggestion), label).toEqual(anchors(diagnostic.suggestion));
  // Raw technical details (Zod issues) are quoted verbatim and may legitimately say "received undefined".
  const quoted = [diagnostic.params?.issues, diagnostic.params?.detail].filter((value): value is string => typeof value === 'string');
  for (const part of [text.title, text.message, text.suggestion ?? '']) {
    const own = quoted.reduce((rest, raw) => rest.replace(raw, ''), part);
    expect(own, label).not.toMatch(/undefined|NaN|\[object |\$\{/);
  }
}

type Mutation =
  | { readonly type: 'remove'; readonly index: number }
  | { readonly type: 'move'; readonly index: number; readonly row: number; readonly col: number }
  | { readonly type: 'rotate'; readonly index: number; readonly orientation: Orientation }
  | { readonly type: 'add'; readonly markerId: number; readonly row: number; readonly col: number; readonly orientation: Orientation };

const orientationArb = fc.constantFrom(...ORIENTATIONS);
const mutationArb: fc.Arbitrary<Mutation> = fc.oneof(
  fc.record({ type: fc.constant('remove' as const), index: fc.nat() }),
  fc.record({ type: fc.constant('move' as const), index: fc.nat(), row: fc.integer({ min: 0, max: 3 }), col: fc.integer({ min: 0, max: 7 }) }),
  fc.record({ type: fc.constant('rotate' as const), index: fc.nat(), orientation: orientationArb }),
  // Unknown ids (99, 3), duplicates of placed cards and cells outside the 8×4 grid are all allowed.
  fc.record({
    type: fc.constant('add' as const),
    markerId: fc.constantFrom(...CARD_IDS, 99, 3),
    row: fc.integer({ min: 0, max: 4 }),
    col: fc.integer({ min: 0, max: 8 }),
    orientation: orientationArb,
  }),
);

function apply(layout: readonly LayoutEntry[], mutation: Mutation): LayoutEntry[] {
  if (mutation.type === 'add') return [...layout, [mutation.markerId, mutation.row, mutation.col, mutation.orientation]];
  if (layout.length === 0) return [];
  const index = mutation.index % layout.length;
  const [markerId, row, col, orientation] = layout[index] as LayoutEntry;
  const next = [...layout];
  if (mutation.type === 'remove') next.splice(index, 1);
  else if (mutation.type === 'move') next[index] = [markerId, mutation.row, mutation.col, orientation];
  else next[index] = [markerId, row, col, mutation.orientation];
  return next;
}

const paramsArb = fc.constantFrom<Record<string, unknown>>(
  {},
  { 'save-16': { baseName: '../x' } },
  { 'review-99': {} },
  { 'report-15': { language: 'de' } },
  { 'validate-13': { requiredFields: ['name', 'name'] } },
  { nope: 1 },
);

describe('compiler diagnostics in English, Italian and French', () => {
  it('render every diagnostic of randomly mutated boards with the same cards and cells (fast-check)', () => {
    let rendered = 0;
    const codes = new Set<string>();
    fc.assert(
      fc.property(fc.constantFrom(OFFICIAL_TWO_BRANCH_LAYOUT, LINEAR_LAYOUT), fc.array(mutationArb, { minLength: 1, maxLength: 4 }), paramsArb, (base, mutations, params) => {
        const layout = mutations.reduce(apply, [...base]);
        for (const diagnostic of compile(boardStateFromLayout(layout), params).diagnostics) {
          codes.add(diagnostic.code);
          for (const locale of OTHER_LOCALES) expectFaithful(diagnostic, locale);
          rendered += 1;
        }
      }),
      { numRuns: 400, seed: 20261108 },
    );
    expect(rendered).toBeGreaterThan(500);
    expect(codes.size).toBeGreaterThan(12);
  });

  it('render board-level diagnostics (contract, dimensions, calibration, node limit)', () => {
    const state = boardStateFromLayout(OFFICIAL_TWO_BRANCH_LAYOUT);
    const cases: Diagnostic[] = [
      ...compile({ nope: true }).diagnostics,
      ...compile({ ...state, board: { ...state.board, columns: 7 } }).diagnostics,
      ...compile({ ...boardStateFromLayout(OFFICIAL_TWO_BRANCH_LAYOUT, 'image'), board: { ...state.board, calibrated: false } }).diagnostics,
      ...compile(state, {}, { maxNodes: 3 }).diagnostics,
      ...compile(boardStateFromLayout([[10, 0, 0, 'E']])).diagnostics,
    ];
    const codes = new Set(cases.map((d) => d.code));
    for (const code of ['INVALID_BOARD_STATE', 'BOARD_DIMENSIONS_MISMATCH', 'BOARD_NOT_CALIBRATED', 'TOO_MANY_NODES', 'MISSING_END']) expect(codes).toContain(code);
    for (const diagnostic of cases) for (const locale of OTHER_LOCALES) expectFaithful(diagnostic, locale);
  });

  it('localize a known case word for word', () => {
    const dangling = compile(boardStateFromLayout(OFFICIAL_TWO_BRANCH_LAYOUT.filter(([id]) => id !== 19))).diagnostics.find((d) => d.code === 'DANGLING_OUTPUT');
    if (!dangling) throw new Error('expected DANGLING_OUTPUT');
    expect(localizeDiagnostic(dangling, 'en')).toEqual({
      title: 'Output without a receiving card',
      message: 'The output of #18 REQUEST REVIEW at (1,4) points south (down), but cell (2,4) is empty.',
      suggestion: 'Place the next card at (2,4) with its arrow pointing south (down), or rotate #18 REQUEST REVIEW.',
      fallback: false,
    });
    expect(localizeDiagnostic(dangling, 'fr').message).toBe('La sortie de #18 DEMANDER UNE RÉVISION en (1,4) pointe vers le sud (bas), mais la case (2,4) est vide.');
    expect(localizeDiagnostic(dangling, 'it').message).toBe('L’uscita di #18 RICHIEDI REVISIONE in (1,4) punta verso sud (in basso), ma la casella (2,4) è vuota.');
  });
});

describe('vision diagnostics in English, Italian and French', () => {
  /** Real detector output on the committed fixtures (kept current by services/vision/tests/test_i18n.py). */
  const samples = (
    JSON.parse(readFileSync(fileURLToPath(new URL('../../../tests/fixtures/vision-diagnostic-samples.json', import.meta.url)), 'utf8')) as {
      diagnostics: (Diagnostic & { board: string })[];
    }
  ).diagnostics.map(({ board: _board, ...diagnostic }) => DiagnosticSchema.parse(diagnostic));

  /** Shapes the detector emits but the fixtures do not trigger (messages written as detector.py does). */
  const vision = (code: Diagnostic['code'], message: string, params: Diagnostic['params'], extra: Partial<Diagnostic> = {}): Diagnostic => ({
    code,
    severity: 'error',
    stage: 'vision',
    message,
    params,
    ...extra,
  });
  const handBuilt: Diagnostic[] = [
    vision('DUPLICATE_FIDUCIAL', 'Hay más de un marcador de esquina con el mismo ID: 0, 2.', { fiducials: [0, 2] }, { markerIds: [0, 2], suggestion: 'Usa un único tablero impreso en la foto.' }),
    vision('TOO_MANY_MARKERS', 'Se detectaron 140 marcadores (máximo 120). La imagen no se procesa.', { count: 140, max: 120 }, { suggestion: 'Fotografía solo un tablero Tactiloom.' }),
    ...(['mirrored', 'nonconvex', 'small', 'failed', 'degenerate'] as const).map((reason) =>
      vision('HOMOGRAPHY_DEGENERATE', `No se pudo calibrar el tablero: ${reason}`, { reason }, { suggestion: 'Fotografía el tablero completo, plano y desde un ángulo más frontal.' }),
    ),
    vision('HOMOGRAPHY_DEGENERATE', 'No se pudo calibrar el tablero: Error de reproyección de 6.2 mm (máximo 4.0 mm).', { reason: 'reprojection', rmsMm: 6.2, maxMm: 4 }, {
      suggestion: 'Fotografía el tablero completo, plano y desde un ángulo más frontal.',
    }),
    vision('CARD_NOT_IN_CELL', 'La tarjeta #16 (SAVE_REPORT) está fuera de la cuadrícula.', { markerId: 16, kind: 'SAVE_REPORT' }, {
      markerIds: [16],
      cells: [{ row: 0, col: 7 }],
      suggestion: 'Colócala completamente dentro de una casilla del tablero.',
    }),
    vision(
      'MARKER_SIZE_MISMATCH',
      'El marcador #12 mide 15.6 mm; se esperaban 22 mm. ¿Mezclaste tarjetas reducidas y tablero A3?',
      { variant: 'size', markerId: 12, sideMm: 15.6, expectedMm: 22 },
      { severity: 'warning', markerIds: [12], cells: [{ row: 0, col: 2 }], suggestion: 'Imprime tablero y tarjetas a la misma escala.' },
    ),
    vision('MARKER_SIZE_MISMATCH', 'Se descartó una detección no cuadrada del marcador #13 (probable falso positivo).', { variant: 'sliverBoard', markerId: 13 }, { severity: 'info', markerIds: [13] }),
  ];

  it('covers the codes found in the real fixtures', () => {
    expect(new Set(samples.map((d) => d.code))).toEqual(new Set(['MARKER_SIZE_MISMATCH', 'AMBIGUOUS_POSITION', 'BOARD_FIDUCIAL_MISSING', 'AMBIGUOUS_ORIENTATION', 'UNKNOWN_CARD', 'NO_MARKERS_FOUND']));
  });

  it.each(OTHER_LOCALES)('%s renders every real and hand-built vision diagnostic', (locale) => {
    for (const diagnostic of [...samples, ...handBuilt]) expectFaithful(diagnostic, locale);
  });

  it('names the hidden corner in each language (E2E asserts the Spanish one)', () => {
    const corner = samples.find((d) => d.code === 'BOARD_FIDUCIAL_MISSING');
    if (!corner) throw new Error('expected BOARD_FIDUCIAL_MISSING');
    expect(localizeDiagnostic(corner, 'es').message).toContain('inferior derecha');
    expect(localizeDiagnostic(corner, 'en').message).toContain('2 (bottom right)');
    expect(localizeDiagnostic(corner, 'it').message).toContain('2 (in basso a destra)');
    expect(localizeDiagnostic(corner, 'fr').message).toContain('2 (en bas à droite)');
  });
});

describe('fallbacks', () => {
  const stored: Diagnostic = { code: 'UNKNOWN_CARD', severity: 'error', stage: 'vision', message: 'El marcador #77 no pertenece al catálogo cards-v1.', markerIds: [77] };

  it('Spanish always shows the canonical text', () => {
    expect(localizeDiagnostic(stored, 'es')).toEqual({ title: 'Tarjeta desconocida', message: stored.message, suggestion: null, fallback: false });
  });

  it('diagnostics stored before params existed show the Spanish original, flagged', () => {
    for (const locale of OTHER_LOCALES) {
      expect(localizeDiagnostic(stored, locale)).toMatchObject({ message: stored.message, fallback: true });
      expect(localizeDiagnostic({ ...stored, params: { markerId: 'x' } }, locale).fallback).toBe(true);
    }
  });
});
