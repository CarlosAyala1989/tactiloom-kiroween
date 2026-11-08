import { CARD_KIND_SPECS, type CardKind, type DataFact, type Diagnostic, type IrEdge, type MessageParams } from '@tactiloom/contracts';
import { cardLabel, DATA_FACT_LABEL_ES, listEs, PRODUCER_OF } from './messages';

export interface GraphNodeInput {
  readonly id: string;
  readonly markerId: number;
  readonly kind: CardKind;
  readonly row?: number;
  readonly col?: number;
}

export interface GraphInput {
  readonly nodes: readonly GraphNodeInput[];
  readonly edges: readonly IrEdge[];
}

export interface GraphAnalysis {
  readonly diagnostics: Diagnostic[];
  readonly startNodeId: string | null;
  /** All node ids in a deterministic topological order, or null when the graph has cycles. */
  readonly topologicalOrder: string[] | null;
  readonly reachable: ReadonlySet<string>;
}

function diag(code: Diagnostic['code'], message: string, nodes: readonly GraphNodeInput[], suggestion?: string, params: MessageParams = {}): Diagnostic {
  const cells = nodes.filter((n) => n.row !== undefined && n.col !== undefined).map((n) => ({ row: n.row as number, col: n.col as number }));
  return {
    code,
    severity: 'error',
    stage: 'compiler',
    message,
    markerIds: nodes.map((n) => n.markerId),
    ...(cells.length > 0 ? { cells } : {}),
    nodeIds: nodes.map((n) => n.id),
    ...(suggestion ? { suggestion } : {}),
    params,
  };
}

/** Identity of one node as message params (markerId + kind, plus its cell when known). */
function nodeParams(node: GraphNodeInput): MessageParams {
  return node.row !== undefined && node.col !== undefined
    ? { markerId: node.markerId, kind: node.kind, row: node.row, col: node.col }
    : { markerId: node.markerId, kind: node.kind };
}

/** Tarjan's strongly connected components (iterative-safe for ≤ 64 nodes). */
function stronglyConnected(ids: readonly string[], successors: (id: string) => readonly string[]): string[][] {
  let index = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  const visit = (v: string): void => {
    indices.set(v, index);
    lowlink.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of successors(v)) {
      if (!indices.has(w)) {
        visit(w);
        lowlink.set(v, Math.min(lowlink.get(v) as number, lowlink.get(w) as number));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v) as number, indices.get(w) as number));
      }
    }
    if (lowlink.get(v) === indices.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop() as string;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      components.push(component);
    }
  };
  for (const id of ids) if (!indices.has(id)) visit(id);
  return components;
}

/**
 * Semantic analysis shared by the compiler and by the runner's IR verification:
 * cardinalities, port legality, cycles (rejected in v1), reachability, termination and
 * definite-assignment of data facts on every path.
 */
export function analyzeGraph(input: GraphInput): GraphAnalysis {
  const diagnostics: Diagnostic[] = [];
  const rank = new Map(input.nodes.map((node, i) => [node.id, i]));
  const byId = new Map(input.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, IrEdge[]>(input.nodes.map((n) => [n.id, []]));
  const incoming = new Map<string, IrEdge[]>(input.nodes.map((n) => [n.id, []]));

  for (const edge of input.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) {
      diagnostics.push({
        code: 'IR_INVALID',
        severity: 'error',
        stage: 'compiler',
        message: `Arista ${edge.from} → ${edge.to} referencia nodos inexistentes.`,
        params: { variant: 'edgeRefs', from: edge.from, to: edge.to },
      });
      continue;
    }
    const declared = CARD_KIND_SPECS[from.kind].outputs.some((output) => output.port === edge.port);
    const duplicatePort = (outgoing.get(from.id) ?? []).some((existing) => existing.port === edge.port);
    if (!declared || duplicatePort) {
      diagnostics.push(
        diag(
          'IR_INVALID',
          `${cardLabel(from.markerId, from.kind)} no puede tener ${duplicatePort ? 'dos aristas' : 'una arista'} por el puerto ${edge.port}.`,
          [from],
          undefined,
          { variant: duplicatePort ? 'duplicatePort' : 'undeclaredPort', ...nodeParams(from), port: edge.port },
        ),
      );
      continue;
    }
    outgoing.get(from.id)?.push(edge);
    incoming.get(to.id)?.push(edge);
  }

  const starts = input.nodes.filter((n) => n.kind === 'START');
  const ends = input.nodes.filter((n) => n.kind === 'END');
  if (starts.length === 0) {
    diagnostics.push({
      code: 'MISSING_START',
      severity: 'error',
      stage: 'compiler',
      message: 'No hay ninguna tarjeta INICIO en el tablero.',
      suggestion: 'Coloca una tarjeta INICIO al comienzo del flujo.',
      params: {},
    });
  } else if (starts.length > 1) {
    diagnostics.push(
      diag('MULTIPLE_STARTS', `Hay ${starts.length} tarjetas INICIO; un flujo v1 tiene exactamente una.`, starts, 'Retira las tarjetas INICIO sobrantes.', {
        count: starts.length,
      }),
    );
  }
  if (ends.length === 0) {
    diagnostics.push({
      code: 'MISSING_END',
      severity: 'error',
      stage: 'compiler',
      message: 'No hay ninguna tarjeta FIN: todo camino debe terminar en FIN.',
      suggestion: 'Coloca una tarjeta FIN al final de cada rama.',
      params: {},
    });
  }

  for (const node of input.nodes) {
    const inputs = incoming.get(node.id) ?? [];
    if (!CARD_KIND_SPECS[node.kind].hasInput && inputs.length > 0) {
      diagnostics.push(diag('INCOMPATIBLE_PORTS', `${cardLabel(node.markerId, node.kind)} no admite entrada.`, [node], undefined, { variant: 'nodeNoInput', ...nodeParams(node) }));
    } else if (inputs.length > 1) {
      const sources = inputs.map((edge) => byId.get(edge.from)).filter((n): n is GraphNodeInput => n !== undefined);
      diagnostics.push(
        diag('MULTIPLE_INPUTS', `${cardLabel(node.markerId, node.kind)} recibe ${inputs.length} entradas; v1 solo admite una (no existe MERGE).`, [node, ...sources], undefined, {
          ...nodeParams(node),
          count: inputs.length,
        }),
      );
    }
    if (node.kind === 'CONDITION') {
      const out = outgoing.get(node.id) ?? [];
      const yes = out.find((e) => e.port === 'TRUE');
      const no = out.find((e) => e.port === 'FALSE');
      if (yes && no && yes.to === no.to) {
        diagnostics.push(
          diag('BRANCH_TARGETS_IDENTICAL', `Las ramas SÍ y NO de ${cardLabel(node.markerId, node.kind)} llegan a la misma tarjeta.`, [node], undefined, nodeParams(node)),
        );
      }
    }
  }

  const successors = (id: string): string[] => (outgoing.get(id) ?? []).map((edge) => edge.to);
  const components = stronglyConnected(
    input.nodes.map((n) => n.id),
    successors,
  );
  let hasCycle = false;
  for (const component of components) {
    const selfLoop = component.length === 1 && successors(component[0] as string).includes(component[0] as string);
    if (component.length > 1 || selfLoop) {
      hasCycle = true;
      const members = component
        .map((id) => byId.get(id) as GraphNodeInput)
        .sort((a, b) => (rank.get(a.id) as number) - (rank.get(b.id) as number));
      diagnostics.push(
        diag(
          'CYCLE_UNSUPPORTED',
          `Las tarjetas ${listEs(members.map((m) => cardLabel(m.markerId, m.kind)))} forman un ciclo; v1 no admite bucles.`,
          members,
          'Rompe el ciclo girando o retirando una de esas tarjetas.',
          { markers: members.map((m) => m.markerId), kinds: members.map((m) => m.kind) },
        ),
      );
    }
  }

  const startNodeId = starts.length === 1 ? (starts[0] as GraphNodeInput).id : null;
  const reachable = new Set<string>();
  const parent = new Map<string, string>();
  if (startNodeId) {
    const queue = [startNodeId];
    reachable.add(startNodeId);
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const next of successors(current)) {
        if (!reachable.has(next)) {
          reachable.add(next);
          parent.set(next, current);
          queue.push(next);
        }
      }
    }
    for (const node of input.nodes) {
      if (!reachable.has(node.id)) {
        diagnostics.push(
          diag(
            'UNREACHABLE_NODE',
            `${cardLabel(node.markerId, node.kind)}${node.row !== undefined ? ` en (${node.row},${node.col})` : ''} no está conectada con INICIO.`,
            [node],
            'Conéctala a la cadena: debe estar en la casilla vecina hacia la que apunta la tarjeta anterior y mirar en la misma dirección.',
            nodeParams(node),
          ),
        );
      }
    }
    for (const node of input.nodes) {
      if (!reachable.has(node.id) || node.kind === 'END') continue;
      const connected = (outgoing.get(node.id) ?? []).length;
      if (connected < CARD_KIND_SPECS[node.kind].outputs.length) {
        const chain: GraphNodeInput[] = [];
        let cursor: string | undefined = node.id;
        while (cursor !== undefined) {
          chain.unshift(byId.get(cursor) as GraphNodeInput);
          cursor = parent.get(cursor);
        }
        diagnostics.push(
          diag(
            'NONTERMINATING_PATH',
            `El camino ${chain.map((n) => cardLabel(n.markerId, n.kind)).join(' → ')} no termina en una tarjeta FIN.`,
            [node],
            'Completa la rama hasta una tarjeta FIN.',
            { markers: chain.map((n) => n.markerId), kinds: chain.map((n) => n.kind) },
          ),
        );
      }
    }
  }

  // Deterministic Kahn topological order (ties broken by normalised board order).
  let topologicalOrder: string[] | null = null;
  if (!hasCycle) {
    const indegree = new Map(input.nodes.map((n) => [n.id, (incoming.get(n.id) ?? []).length]));
    const ready = input.nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
    const order: string[] = [];
    while (ready.length > 0) {
      ready.sort((a, b) => (rank.get(a) as number) - (rank.get(b) as number));
      const id = ready.shift() as string;
      order.push(id);
      for (const next of successors(id)) {
        const remaining = (indegree.get(next) as number) - 1;
        indegree.set(next, remaining);
        if (remaining === 0) ready.push(next);
      }
    }
    topologicalOrder = order.length === input.nodes.length ? order : null;
  }

  // Definite assignment of data facts on every path (intersection over predecessors).
  if (topologicalOrder && startNodeId) {
    const available = new Map<string, Set<DataFact>>();
    for (const id of topologicalOrder) {
      if (!reachable.has(id)) continue;
      const node = byId.get(id) as GraphNodeInput;
      const preds = (incoming.get(id) ?? []).map((edge) => edge.from).filter((p) => reachable.has(p));
      let facts: Set<DataFact>;
      if (preds.length === 0) {
        facts = new Set();
      } else {
        const sets = preds.map((p) => available.get(p) ?? new Set<DataFact>());
        facts = new Set([...(sets[0] as Set<DataFact>)].filter((fact) => sets.every((set) => set.has(fact))));
      }
      const spec = CARD_KIND_SPECS[node.kind];
      const missing = spec.requires.filter((fact) => !facts.has(fact));
      if (missing.length > 0) {
        const producers = [...new Set(missing.map((f) => PRODUCER_OF[f]))];
        diagnostics.push(
          diag(
            'MISSING_REQUIRED_DATA',
            `${cardLabel(node.markerId, node.kind)} necesita ${listEs(missing.map((f) => DATA_FACT_LABEL_ES[f]))}, pero ningún paso anterior en su camino lo produce.`,
            [node],
            `Coloca antes ${listEs(producers.map((kind) => CARD_KIND_SPECS[kind].labelEs.toUpperCase()))} en el mismo camino.`,
            { ...nodeParams(node), facts: [...missing], producers },
          ),
        );
      }
      const out = new Set(facts);
      for (const fact of spec.produces) out.add(fact);
      available.set(id, out);
    }
  }

  return { diagnostics, startNodeId, topologicalOrder, reachable };
}
