import { CARD_KIND_SPECS, rotateClockwise, type DataFact, type WorkflowIR } from '@ritualos/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compile, verifyIr, type LayoutEntry } from '../src/index';
import { applyMutation, mutationArb, validLayoutArb } from './generators';
import { state } from './helpers';

const RUNS = { numRuns: 300 };

function assertInvariants(ir: WorkflowIR, layout: readonly LayoutEntry[]): void {
  const ids = new Set(ir.nodes.map((n) => n.id));
  // Identity conservation: one node per physical card, none invented, none lost.
  expect(ir.nodes).toHaveLength(layout.length);
  expect(ids.size).toBe(layout.length);
  expect(new Set(ir.nodes.map((n) => n.markerId))).toEqual(new Set(layout.map(([id]) => id)));
  // Acyclicity: topologicalOrder is a permutation respecting every edge.
  const position = new Map(ir.topologicalOrder.map((id, i) => [id, i]));
  expect(position.size).toBe(ir.nodes.length);
  for (const edge of ir.edges) expect(position.get(edge.from)! < position.get(edge.to)!).toBe(true);
  // Connectivity: everything reachable from START.
  const reached = new Set([ir.startNodeId]);
  const queue = [ir.startNodeId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of ir.edges.filter((e) => e.from === current)) {
      if (!reached.has(edge.to)) {
        reached.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  expect(reached.size).toBe(ir.nodes.length);
  // Valid endings and branch integrity.
  for (const node of ir.nodes) {
    const out = ir.edges.filter((e) => e.from === node.id);
    expect(out.map((e) => e.port).sort()).toEqual(CARD_KIND_SPECS[node.kind].outputs.map((o) => o.port).sort());
    if (out.length === 0) expect(node.kind).toBe('END');
    if (node.kind === 'CONDITION') {
      const yes = out.find((e) => e.port === 'TRUE')!;
      const no = out.find((e) => e.port === 'FALSE')!;
      expect(yes.to).not.toBe(no.to);
    }
  }
  // Type safety on every path (DFS carrying produced facts).
  const nodes = new Map(ir.nodes.map((n) => [n.id, n]));
  const walk = (id: string, facts: ReadonlySet<DataFact>): void => {
    const node = nodes.get(id)!;
    for (const required of node.dataRequirements.requires) expect(facts.has(required)).toBe(true);
    const next = new Set([...facts, ...node.dataRequirements.produces]);
    for (const edge of ir.edges.filter((e) => e.from === id)) walk(edge.to, next);
  };
  walk(ir.startNodeId, new Set());
  // The runner-side verifier accepts every IR the compiler produces.
  expect(verifyIr(ir).ok).toBe(true);
}

describe('compiler properties (fast-check)', () => {
  it('every generated legal layout compiles and satisfies all IR invariants', () => {
    fc.assert(
      fc.property(validLayoutArb, (layout) => {
        const result = compile(state(layout));
        expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        assertInvariants(result.ir!, layout);
      }),
      RUNS,
    );
  });

  it('order invariance: permuting the detected cards does not change the IR', () => {
    fc.assert(
      fc.property(validLayoutArb, fc.infiniteStream(fc.nat()), (layout, randoms) => {
        const shuffled = [...layout];
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
          const j = (randoms.next().value as number) % (i + 1);
          [shuffled[i], shuffled[j]] = [shuffled[j] as LayoutEntry, shuffled[i] as LayoutEntry];
        }
        expect(compile(state(shuffled)).ir).toEqual(compile(state(layout)).ir);
      }),
      RUNS,
    );
  });

  it('idempotence: compiling twice yields the same IR, hash and diagnostics', () => {
    fc.assert(
      fc.property(fc.oneof(validLayoutArb, validLayoutArb.chain((l) => mutationArb.map((m) => applyMutation(l, m)))), (layout) => {
        const a = compile(state(layout));
        const b = compile(state(layout));
        expect(b).toEqual(a);
      }),
      RUNS,
    );
  });

  it('change detection: rotating any card makes the board invalid or changes the hash', () => {
    fc.assert(
      fc.property(validLayoutArb, fc.nat(), fc.constantFrom(1, 2, 3), (layout, pick, turns) => {
        const base = compile(state(layout)).ir!;
        const index = pick % layout.length;
        const [markerId, row, col, dir] = layout[index]!;
        let rotated = dir;
        for (let i = 0; i < turns; i += 1) rotated = rotateClockwise(rotated);
        const mutated = layout.map((entry, i) => (i === index ? ([markerId, row, col, rotated] as const) : entry));
        const result = compile(state(mutated));
        expect(result.valid === false || result.ir!.contentHash !== base.contentHash).toBe(true);
      }),
      RUNS,
    );
  });

  it('change detection: a semantic parameter change changes the hash', () => {
    fc.assert(
      fc.property(validLayoutArb, fc.subarray(['name', 'email', 'workshop'] as const, { minLength: 1 }), (layout, fields) => {
        const validateId = compile(state(layout)).ir!.nodes.find((n) => n.kind === 'VALIDATE_FIELDS')!.id;
        const base = compile(state(layout), { [validateId]: { requiredFields: ['name', 'email', 'workshop'] } }).ir!;
        const changed = compile(state(layout), { [validateId]: { requiredFields: [...fields] } }).ir!;
        expect(changed.contentHash === base.contentHash).toBe(fields.length === 3);
      }),
      RUNS,
    );
  });

  it('translation invariance: shifting a whole valid flow keeps the program hash', () => {
    fc.assert(
      fc.property(validLayoutArb, fc.integer({ min: -3, max: 3 }), fc.integer({ min: -7, max: 7 }), (layout, dr, dc) => {
        const shifted = layout.map(([id, r, c, o]) => [id, r + dr, c + dc, o] as const);
        fc.pre(shifted.every(([, r, c]) => r >= 0 && r < 4 && c >= 0 && c < 8));
        expect(compile(state(shifted)).ir!.contentHash).toBe(compile(state(layout)).ir!.contentHash);
      }),
      RUNS,
    );
  });

  it('no execution of invalid graphs: any mutation yields either a fully valid IR or no IR at all', () => {
    fc.assert(
      fc.property(validLayoutArb, fc.array(mutationArb, { minLength: 1, maxLength: 3 }), (layout, mutations) => {
        const mutated = mutations.reduce(applyMutation, layout);
        const result = compile(state(mutated));
        if (result.valid) {
          const unique = new Map(mutated.map((entry) => [entry[0], entry]));
          assertInvariants(result.ir!, [...unique.values()]);
        } else {
          expect(result.ir).toBeNull();
          expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
          for (const diagnostic of result.diagnostics) expect(diagnostic.message.length).toBeGreaterThan(10);
        }
      }),
      RUNS,
    );
  });

  it('tampering: altering any IR field after compilation is caught by verifyIr', () => {
    fc.assert(
      fc.property(validLayoutArb, fc.constantFrom('param', 'edge', 'kind', 'hash'), (layout, what) => {
        const ir = structuredClone(compile(state(layout)).ir!);
        if (what === 'param') (ir.nodes.find((n) => n.kind === 'VALIDATE_FIELDS')!.params as { requiredFields: string[] }).requiredFields = ['name'];
        if (what === 'edge') ir.edges = ir.edges.slice(1);
        if (what === 'kind') ir.nodes[0] = { ...ir.nodes[0]!, kind: 'SAVE_REPORT' };
        if (what === 'hash') ir.contentHash = `sha256:${'0'.repeat(64)}`;
        expect(verifyIr(ir).ok).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
