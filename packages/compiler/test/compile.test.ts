import { canonicalHash, getCardCatalog, indexCatalog, irHashPayload, type CardCatalog } from '@tactiloom/contracts';
import { describe, expect, it } from 'vitest';
import { compile, describeIrEs, diffBoards, diffIr, LINEAR_LAYOUT, OFFICIAL_TWO_BRANCH_LAYOUT } from '../src/index';
import { errorCodes, replace, state, without, withCard } from './helpers';

const OFFICIAL = OFFICIAL_TWO_BRANCH_LAYOUT;

describe('official two-branch example (§4.3)', () => {
  const result = compile(state(OFFICIAL), { 'input-11': { uploadedFileId: 'demo_valid_pdf' } });

  it('compiles to a valid IR with 10 nodes and 9 canonical edges', () => {
    expect(result.valid).toBe(true);
    expect(errorCodes(result.diagnostics)).toEqual([]);
    const ir = result.ir!;
    expect(ir.irVersion).toBe('tactiloom-ir/1');
    expect(ir.startNodeId).toBe('start-10');
    expect(ir.nodes.map((n) => n.id)).toEqual([
      'start-10', 'input-11', 'extract-12', 'validate-13', 'condition-14', 'report-15', 'save-16', 'end-17', 'review-18', 'end-19',
    ]);
    expect(ir.edges).toEqual([
      { from: 'condition-14', port: 'FALSE', to: 'review-18' },
      { from: 'condition-14', port: 'TRUE', to: 'report-15' },
      { from: 'extract-12', port: 'NEXT', to: 'validate-13' },
      { from: 'input-11', port: 'NEXT', to: 'extract-12' },
      { from: 'report-15', port: 'NEXT', to: 'save-16' },
      { from: 'review-18', port: 'NEXT', to: 'end-19' },
      { from: 'save-16', port: 'NEXT', to: 'end-17' },
      { from: 'start-10', port: 'NEXT', to: 'input-11' },
      { from: 'validate-13', port: 'NEXT', to: 'condition-14' },
    ]);
  });

  it('fills canonical default parameters', () => {
    const params = Object.fromEntries(result.ir!.nodes.map((n) => [n.id, n.params]));
    expect(params['input-11']).toEqual({ uploadedFileId: 'demo_valid_pdf' });
    expect(params['extract-12']).toEqual({ language: 'es' });
    expect(params['validate-13']).toEqual({ requiredFields: ['name', 'email', 'workshop'] });
    expect(params['condition-14']).toEqual({ predicate: 'allRequiredPresent' });
    expect(params['report-15']).toEqual({ template: 'workshop-summary-v1', format: 'both' });
    expect(params['save-16']).toEqual({ baseName: 'workshop-report' });
    expect(params['review-18']).toEqual({ label: 'Revisión manual' });
  });

  it('computes contentHash from the canonical payload (snapshot detects semantic drift)', () => {
    const ir = result.ir!;
    expect(ir.contentHash).toBe(canonicalHash(irHashPayload(ir)));
    expect(ir.contentHash).toMatchSnapshot();
  });

  it('produces a topological order that starts at START', () => {
    expect(result.ir!.topologicalOrder[0]).toBe('start-10');
    expect(new Set(result.ir!.topologicalOrder).size).toBe(10);
  });

  it('describes the program as text (TRUE branch first)', () => {
    const text = describeIrEs(result.ir!).map((step) => `${step.depth}:${step.nodeId}`);
    expect(text).toEqual([
      '0:start-10', '0:input-11', '0:extract-12', '0:validate-13', '0:condition-14', '1:report-15', '1:save-16', '1:end-17', '1:review-18', '1:end-19',
    ]);
  });

  it('keeps the same program hash in simulator and image modes', () => {
    const image = compile(state(OFFICIAL, { sourceMode: 'image' }), { 'input-11': { uploadedFileId: 'demo_valid_pdf' } });
    expect(image.ir!.contentHash).toBe(result.ir!.contentHash);
    expect(image.ir!.sourceMode).toBe('image');
  });

  it('warns (not errors) when no input document is selected yet', () => {
    const noInput = compile(state(OFFICIAL));
    expect(noInput.valid).toBe(true);
    expect(noInput.diagnostics.map((d) => d.code)).toContain('INPUT_NOT_SELECTED');
  });
});

describe('second valid flow (linear)', () => {
  it('compiles START → … → CREATE_REPORT → SAVE_REPORT → END', () => {
    const result = compile(state(LINEAR_LAYOUT));
    expect(result.valid).toBe(true);
    expect(result.ir!.edges).toHaveLength(6);
  });
});

describe('diagnostics', () => {
  it('MISSING_START / MISSING_END', () => {
    expect(errorCodes(compile(state(without(OFFICIAL, 10))).diagnostics)).toContain('MISSING_START');
    const noEnds = without(without(OFFICIAL, 17), 19);
    expect(errorCodes(compile(state(noEnds)).diagnostics)).toContain('MISSING_END');
  });

  it('MULTIPLE_STARTS', () => {
    const result = compile(state(withCard(OFFICIAL, [20, 3, 0, 'E'])));
    expect(errorCodes(result.diagnostics)).toContain('MULTIPLE_STARTS');
    expect(result.ir).toBeNull();
  });

  it('DANGLING_OUTPUT + NONTERMINATING_PATH when an END is missing', () => {
    const result = compile(state(without(OFFICIAL, 19)));
    expect(errorCodes(result.diagnostics)).toEqual(['DANGLING_OUTPUT', 'NONTERMINATING_PATH']);
    const dangling = result.diagnostics.find((d) => d.code === 'DANGLING_OUTPUT')!;
    expect(dangling.markerIds).toEqual([18]);
    expect(dangling.cells).toEqual([{ row: 1, col: 4 }, { row: 2, col: 4 }]);
    expect(dangling.message).toContain('(2,4)');
    expect(dangling.suggestion).toBeTruthy();
  });

  it('DANGLING_OUTPUT when pointing outside the board', () => {
    const result = compile(state(replace(OFFICIAL, 10, 0, 0, 'N')));
    expect(errorCodes(result.diagnostics)).toContain('DANGLING_OUTPUT');
    const dangling = result.diagnostics.find((d) => d.code === 'DANGLING_OUTPUT' && d.markerIds?.[0] === 10);
    expect(dangling?.message).toContain('fuera del tablero');
    expect(dangling?.cells).toEqual([{ row: 0, col: 0 }]);
  });

  it('INCOMPATIBLE_PORTS when the receiver faces another way (with rotation hint)', () => {
    const result = compile(state(replace(OFFICIAL, 12, 0, 2, 'S')));
    const incompatible = result.diagnostics.find((d) => d.code === 'INCOMPATIBLE_PORTS')!;
    expect(incompatible.markerIds).toEqual([11, 12]);
    expect(incompatible.suggestion).toContain('#12');
    expect(incompatible.suggestion).toContain('este');
  });

  it('INCOMPATIBLE_PORTS when the receiver has no input (START)', () => {
    const layout = [[11, 0, 0, 'E'], [10, 0, 1, 'E']] as const;
    expect(errorCodes(compile(state(layout)).diagnostics)).toContain('INCOMPATIBLE_PORTS');
  });

  it('UNREACHABLE_NODE for a card that is not chained', () => {
    const result = compile(state(withCard(OFFICIAL, [30, 3, 7, 'E'])));
    const unreachable = result.diagnostics.filter((d) => d.code === 'UNREACHABLE_NODE');
    expect(unreachable.map((d) => d.markerIds)).toEqual([[30]]);
  });

  it('CARD_COLLISION and DUPLICATE_INSTANCE', () => {
    expect(errorCodes(compile(state(withCard(OFFICIAL, [30, 0, 7, 'E']))).diagnostics)).toContain('CARD_COLLISION');
    const duplicate = compile(state(withCard(OFFICIAL, [17, 3, 0, 'E'])));
    expect(errorCodes(duplicate.diagnostics)).toEqual(['DUPLICATE_INSTANCE']);
    expect(duplicate.diagnostics[0]?.cells).toEqual([{ row: 0, col: 7 }, { row: 3, col: 0 }]);
  });

  it('UNKNOWN_CARD for fiducial ids, unregistered ids and out-of-grid cells', () => {
    expect(errorCodes(compile(state(withCard(OFFICIAL, [2, 3, 0, 'E']))).diagnostics)).toContain('UNKNOWN_CARD');
    expect(errorCodes(compile(state(withCard(OFFICIAL, [85, 3, 0, 'E']))).diagnostics)).toContain('UNKNOWN_CARD');
    expect(errorCodes(compile(state(withCard(OFFICIAL, [30, 5, 9, 'E']))).diagnostics)).toContain('CARD_NOT_IN_CELL');
  });

  it('CYCLE_UNSUPPORTED for four CONDITIONs turning right in a square', () => {
    // C1(1,1)E → FALSE S → C2(2,1)S → FALSE W → C3(2,0)W → FALSE N → C4(1,0)N → FALSE E → C1
    const catalog: CardCatalog = {
      ...getCardCatalog(),
      cards: [
        ...getCardCatalog().cards,
        { markerId: 40, kind: 'CONDITION', cardInstanceId: 'condition-40', set: 'test', enabled: true },
        { markerId: 41, kind: 'CONDITION', cardInstanceId: 'condition-41', set: 'test', enabled: true },
      ],
    };
    const layout = [[14, 1, 1, 'E'], [24, 2, 1, 'S'], [40, 2, 0, 'W'], [41, 1, 0, 'N']] as const;
    const result = compile(state(layout), {}, { catalog: indexCatalog(catalog) });
    const cycle = result.diagnostics.find((d) => d.code === 'CYCLE_UNSUPPORTED');
    expect(cycle?.markerIds?.slice().sort()).toEqual([14, 24, 40, 41]);
    expect(result.ir).toBeNull();
  });

  it('MISSING_REQUIRED_DATA on the path (definite assignment)', () => {
    // START → INPUT_FILE → VALIDATE_FIELDS (needs ExtractedText) → REQUEST_REVIEW → END
    const layout = [[10, 0, 0, 'E'], [11, 0, 1, 'E'], [13, 0, 2, 'E'], [18, 0, 3, 'E'], [17, 0, 4, 'E']] as const;
    const result = compile(state(layout));
    expect(errorCodes(result.diagnostics)).toEqual(['MISSING_REQUIRED_DATA']);
    const missing = result.diagnostics.find((d) => d.code === 'MISSING_REQUIRED_DATA')!;
    expect(missing.markerIds).toEqual([13]);
    expect(missing.suggestion).toContain('EXTRAER TEXTO');
  });

  it('MISSING_REQUIRED_DATA for CREATE_REPORT without validation even if control edges are fine', () => {
    const layout = [[10, 0, 0, 'E'], [11, 0, 1, 'E'], [12, 0, 2, 'E'], [15, 0, 3, 'E'], [16, 0, 4, 'E'], [17, 0, 5, 'E']] as const;
    const result = compile(state(layout));
    expect(result.diagnostics.find((d) => d.code === 'MISSING_REQUIRED_DATA')?.markerIds).toEqual([15]);
  });

  it('INVALID_PARAMETER for unsafe parameter values', () => {
    const result = compile(state(OFFICIAL), { 'save-16': { baseName: '../../etc/passwd' }, 'condition-14': { predicate: 'eval(1)' } });
    const invalid = result.diagnostics.filter((d) => d.code === 'INVALID_PARAMETER');
    expect(invalid.map((d) => d.markerIds?.[0]).sort()).toEqual([14, 16]);
    expect(result.ir).toBeNull();
  });

  it('UNUSED_PARAMETER is informational', () => {
    const result = compile(state(OFFICIAL), { 'review-32': { label: 'X' } });
    expect(result.valid).toBe(true);
    expect(result.diagnostics.find((d) => d.code === 'UNUSED_PARAMETER')?.severity).toBe('info');
  });

  it('propagates vision errors and blocks uncalibrated image boards', () => {
    const visionError = {
      code: 'AMBIGUOUS_POSITION' as const,
      severity: 'error' as const,
      stage: 'vision' as const,
      message: 'La tarjeta #15 está entre casillas',
      markerIds: [15],
    };
    const result = compile(state(without(OFFICIAL, 15), { sourceMode: 'image', diagnostics: [visionError] }));
    expect(errorCodes(result.diagnostics)).toContain('AMBIGUOUS_POSITION');
    const uncalibrated = compile(state([], { sourceMode: 'image', board: { templateId: 'board-v1', columns: 8, rows: 4, calibrated: false } }));
    expect(errorCodes(uncalibrated.diagnostics)).toContain('BOARD_NOT_CALIBRATED');
  });

  it('INVALID_BOARD_STATE for malformed input and BOARD_DIMENSIONS_MISMATCH', () => {
    expect(errorCodes(compile({ cards: 'nope' }).diagnostics)).toEqual(['INVALID_BOARD_STATE']);
    const wrong = compile(state(OFFICIAL, { board: { templateId: 'board-v1', columns: 6, rows: 4, calibrated: true } }));
    expect(errorCodes(wrong.diagnostics)).toContain('BOARD_DIMENSIONS_MISMATCH');
  });

  it('TOO_MANY_NODES beyond maxNodes', () => {
    expect(errorCodes(compile(state(OFFICIAL), {}, { maxNodes: 5 }).diagnostics)).toContain('TOO_MANY_NODES');
  });

  it('ignores client-provided type/instance and trusts the closed catalog', () => {
    const tampered = state(OFFICIAL);
    tampered.cards[0] = { ...tampered.cards[0]!, type: 'SAVE_REPORT', cardInstanceId: 'save-99' };
    const result = compile(tampered);
    expect(result.ir!.nodes[0]).toMatchObject({ id: 'start-10', kind: 'START' });
  });
});

describe('diffs', () => {
  it('reports moved and rotated cards between scans', () => {
    const before = OFFICIAL.map(([markerId, row, col, orientation]) => ({ markerId, row, col, orientation }));
    const after = replace(OFFICIAL, 15, 1, 5, 'S').map(([markerId, row, col, orientation]) => ({ markerId, row, col, orientation }));
    const diff = diffBoards(before, after);
    expect(diff.moved).toEqual([{ markerId: 15, from: { row: 0, col: 5 }, to: { row: 1, col: 5 } }]);
    expect(diff.rotated).toEqual([{ markerId: 15, from: 'E', to: 'S' }]);
    expect(diff.unchanged).toBe(9);
  });

  it('reports parameter changes between programs', () => {
    const a = compile(state(OFFICIAL)).ir;
    const b = compile(state(OFFICIAL), { 'validate-13': { requiredFields: ['name'] } }).ir;
    const diff = diffIr(a, b);
    expect(diff.sameProgram).toBe(false);
    expect(diff.paramsChanged.map((p) => p.nodeId)).toEqual(['validate-13']);
    expect(diffIr(a, a).sameProgram).toBe(true);
  });
});
