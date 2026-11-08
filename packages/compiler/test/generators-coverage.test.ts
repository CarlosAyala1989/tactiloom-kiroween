import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compile } from '../src/index';
import { applyMutation, mutationArb, validLayoutArb } from './generators';
import { state } from './helpers';

/** Guards against vacuous property tests: the generators must reach interesting shapes. */
describe('generator coverage', () => {
  it('produces branching programs of various sizes, orientations and all card kinds', () => {
    const samples = fc.sample(validLayoutArb, { numRuns: 400, seed: 42 });
    const sizes = new Set(samples.map((layout) => layout.length));
    const withCondition = samples.filter((layout) => compile(state(layout)).ir!.nodes.some((n) => n.kind === 'CONDITION'));
    const nested = samples.filter((layout) => compile(state(layout)).ir!.nodes.filter((n) => n.kind === 'CONDITION').length >= 2);
    const orientations = new Set(samples.flatMap((layout) => layout.map(([, , , o]) => o)));
    const kinds = new Set(samples.flatMap((layout) => compile(state(layout)).ir!.nodes.map((n) => n.kind)));
    console.info(
      `[generator] sizes=${[...sizes].sort((a, b) => a - b).join(',')} conditional=${withCondition.length}/400 nested=${nested.length}/400 kinds=${kinds.size}`,
    );
    expect(sizes.size).toBeGreaterThanOrEqual(5);
    expect(withCondition.length).toBeGreaterThan(80);
    expect(nested.length).toBeGreaterThan(5);
    expect(orientations.size).toBe(4);
    expect(kinds.size).toBe(9);
  });

  it('mutations produce both valid and invalid boards with many distinct error codes', () => {
    const samples = fc.sample(
      validLayoutArb.chain((layout) => fc.array(mutationArb, { minLength: 1, maxLength: 3 }).map((ms) => ms.reduce(applyMutation, layout))),
      { numRuns: 600, seed: 7 },
    );
    const results = samples.map((layout) => compile(state(layout)));
    const codes = new Set(results.flatMap((r) => r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)));
    const valid = results.filter((r) => r.valid).length;
    console.info(`[mutations] valid=${valid}/600 errorCodes=${[...codes].sort().join(',')}`);
    expect(valid).toBeGreaterThanOrEqual(1);
    expect(valid).toBeLessThan(590);
    for (const code of ['DANGLING_OUTPUT', 'INCOMPATIBLE_PORTS', 'UNREACHABLE_NODE', 'UNKNOWN_CARD', 'CARD_COLLISION', 'NONTERMINATING_PATH']) {
      expect(codes).toContain(code);
    }
  });
});
