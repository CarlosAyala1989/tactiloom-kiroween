import { MessageParamsSchema, type Diagnostic } from '@tactiloom/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compile, OFFICIAL_TWO_BRANCH_LAYOUT, verifyIr } from '../src/index';
import { applyMutation, mutationArb, validLayoutArb } from './generators';
import { replace, state, without, withCard } from './helpers';

/**
 * Localized clients render diagnostics from `code` + `params`. Every compiler diagnostic must carry
 * valid params that identify the cards involved (the Spanish `message` stays canonical).
 */
function assertParams(diagnostic: Diagnostic): void {
  expect(diagnostic.params, `${diagnostic.code} without params`).toBeDefined();
  expect(MessageParamsSchema.safeParse(diagnostic.params).success, diagnostic.code).toBe(true);
  const params = diagnostic.params ?? {};
  // Unknown markers have no catalog kind by definition; every other card reference carries one.
  if (typeof params.markerId === 'number' && diagnostic.code !== 'UNKNOWN_CARD') expect(typeof params.kind).toBe('string');
  if (typeof params.fromMarker === 'number') expect(typeof params.toMarker).toBe('number');
}

describe('structured diagnostic params', () => {
  it('are present on every diagnostic of hand-picked invalid boards', () => {
    const boards = [
      without(OFFICIAL_TWO_BRANCH_LAYOUT, 19),
      without(OFFICIAL_TWO_BRANCH_LAYOUT, 10),
      replace(OFFICIAL_TWO_BRANCH_LAYOUT, 12, 0, 2, 'S'),
      replace(OFFICIAL_TWO_BRANCH_LAYOUT, 10, 0, 0, 'N'),
      withCard(OFFICIAL_TWO_BRANCH_LAYOUT, [17, 3, 0, 'E']),
      withCard(OFFICIAL_TWO_BRANCH_LAYOUT, [30, 0, 7, 'E']),
      withCard(OFFICIAL_TWO_BRANCH_LAYOUT, [85, 3, 0, 'E']),
      withCard(OFFICIAL_TWO_BRANCH_LAYOUT, [20, 3, 0, 'E']),
      [[10, 0, 0, 'E'], [11, 0, 1, 'E'], [13, 0, 2, 'E'], [18, 0, 3, 'E'], [17, 0, 4, 'E']] as const,
    ];
    let count = 0;
    for (const layout of boards) {
      for (const diagnostic of compile(state(layout), { 'save-16': { baseName: '../x' }, 'review-99': {} }).diagnostics) {
        assertParams(diagnostic);
        count += 1;
      }
    }
    expect(count).toBeGreaterThan(15);
    for (const diagnostic of compile({ nope: true }).diagnostics) assertParams(diagnostic);
  });

  it('are present on every diagnostic of randomly mutated boards (fast-check)', () => {
    fc.assert(
      fc.property(validLayoutArb, fc.array(mutationArb, { minLength: 1, maxLength: 3 }), (layout, mutations) => {
        for (const diagnostic of compile(state(mutations.reduce(applyMutation, layout))).diagnostics) assertParams(diagnostic);
      }),
      { numRuns: 300 },
    );
  });

  it('describe DANGLING_OUTPUT geometrically (port, direction, target cell)', () => {
    const dangling = compile(state(without(OFFICIAL_TWO_BRANCH_LAYOUT, 19))).diagnostics.find((d) => d.code === 'DANGLING_OUTPUT');
    expect(dangling?.params).toEqual({ markerId: 18, kind: 'REQUEST_REVIEW', row: 1, col: 4, port: 'NEXT', direction: 'S', targetRow: 2, targetCol: 4 });
  });
});

describe('CREATE_REPORT language (i18n, backward compatible)', () => {
  const reportParams = (result: ReturnType<typeof compile>) => result.ir?.nodes.find((node) => node.id === 'report-15')?.params;

  it('is optional: programs without it keep the pre-i18n params; an explicit language is kept and verifies', () => {
    const base = compile(state(OFFICIAL_TWO_BRANCH_LAYOUT));
    expect(reportParams(base)).toEqual({ template: 'workshop-summary-v1', format: 'both' });
    expect(base.ir && verifyIr(base.ir, base.ir.contentHash).ok).toBe(true);
    for (const language of ['es', 'en', 'it', 'fr'] as const) {
      const localized = compile(state(OFFICIAL_TWO_BRANCH_LAYOUT), { 'report-15': { language } });
      expect(reportParams(localized)).toEqual({ template: 'workshop-summary-v1', format: 'both', language });
      expect(localized.ir && verifyIr(localized.ir, localized.ir.contentHash).ok).toBe(true);
      expect(localized.ir?.contentHash).not.toBe(base.ir?.contentHash);
    }
  });

  it('rejects unsupported languages as INVALID_PARAMETER with structured params', () => {
    const result = compile(state(OFFICIAL_TWO_BRANCH_LAYOUT), { 'report-15': { language: 'de' } });
    expect(result.ir).toBeNull();
    const diagnostic = result.diagnostics.find((d) => d.code === 'INVALID_PARAMETER');
    expect(diagnostic?.params).toMatchObject({ markerId: 15, kind: 'CREATE_REPORT' });
  });
});
