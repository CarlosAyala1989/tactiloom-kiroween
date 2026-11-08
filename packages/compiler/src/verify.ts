import {
  canonicalHash,
  canonicalStringify,
  CARD_KIND_SPECS,
  indexCatalog,
  irHashPayload,
  PARAM_SCHEMAS,
  WorkflowIRSchema,
  type CatalogIndex,
  type Diagnostic,
  type WorkflowIR,
} from '@ritualos/contracts';
import { analyzeGraph } from './graph';

export interface IrVerification {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly ir: WorkflowIR | null;
}

function runtimeDiag(code: Diagnostic['code'], message: string, nodeIds?: string[]): Diagnostic {
  return { code, severity: 'error', stage: 'runtime', message, ...(nodeIds ? { nodeIds } : {}) };
}

/**
 * Defence in depth for the runner: an IR is executable only if it parses, its contentHash
 * recomputes to the stored value (and the approved value), every node matches the closed
 * catalog, parameters are canonical and the graph satisfies all v1 invariants.
 */
export function verifyIr(candidate: unknown, expectedHash?: string, catalog: CatalogIndex = indexCatalog()): IrVerification {
  const parsed = WorkflowIRSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, ir: null, diagnostics: [runtimeDiag('IR_INVALID', `La IR no cumple ritual-ir/1: ${parsed.error.issues[0]?.message ?? 'inválida'}.`)] };
  }
  const ir = parsed.data;
  const diagnostics: Diagnostic[] = [];
  const recomputed = canonicalHash(irHashPayload(ir));
  if (recomputed !== ir.contentHash) {
    diagnostics.push(runtimeDiag('IR_HASH_MISMATCH', 'El contentHash no corresponde al contenido de la IR (posible manipulación).'));
  }
  if (expectedHash !== undefined && expectedHash !== ir.contentHash) {
    diagnostics.push(runtimeDiag('IR_HASH_MISMATCH', 'La IR no es la versión aprobada.'));
  }
  const seenIds = new Set<string>();
  const seenMarkers = new Set<number>();
  for (const node of ir.nodes) {
    const entry = catalog.byMarkerId.get(node.markerId);
    if (seenIds.has(node.id) || seenMarkers.has(node.markerId)) {
      diagnostics.push(runtimeDiag('IR_INVALID', `Nodo duplicado ${node.id}.`, [node.id]));
    }
    seenIds.add(node.id);
    seenMarkers.add(node.markerId);
    if (!entry || !entry.enabled || entry.cardInstanceId !== node.id || entry.kind !== node.kind) {
      diagnostics.push(runtimeDiag('IR_INVALID', `El nodo ${node.id} no coincide con el catálogo cerrado.`, [node.id]));
      continue;
    }
    const spec = CARD_KIND_SPECS[node.kind];
    if (
      canonicalStringify(node.dataRequirements.requires) !== canonicalStringify([...spec.requires]) ||
      canonicalStringify(node.dataRequirements.produces) !== canonicalStringify([...spec.produces])
    ) {
      diagnostics.push(runtimeDiag('IR_INVALID', `Requisitos de datos alterados en ${node.id}.`, [node.id]));
    }
    const params = PARAM_SCHEMAS[node.kind].safeParse(node.params);
    if (!params.success || canonicalStringify(params.data) !== canonicalStringify(node.params)) {
      diagnostics.push(runtimeDiag('INVALID_PARAMETER', `Parámetros no canónicos o inválidos en ${node.id}.`, [node.id]));
    }
  }
  const analysis = analyzeGraph({
    nodes: ir.nodes.map((node) => ({ id: node.id, markerId: node.markerId, kind: node.kind, row: node.layout.row, col: node.layout.col })),
    edges: ir.edges,
  });
  for (const diagnostic of analysis.diagnostics) diagnostics.push({ ...diagnostic, stage: 'runtime' });
  if (analysis.startNodeId !== ir.startNodeId) {
    diagnostics.push(runtimeDiag('IR_INVALID', 'startNodeId no coincide con la única tarjeta INICIO.'));
  }
  if (analysis.topologicalOrder && canonicalStringify(analysis.topologicalOrder) !== canonicalStringify(ir.topologicalOrder)) {
    diagnostics.push(runtimeDiag('IR_INVALID', 'topologicalOrder no coincide con el grafo.'));
  }
  for (const node of ir.nodes) {
    const ports = ir.edges.filter((edge) => edge.from === node.id).length;
    if (ports !== CARD_KIND_SPECS[node.kind].outputs.length) {
      diagnostics.push(runtimeDiag('IR_INVALID', `El nodo ${node.id} no tiene todos sus puertos conectados.`, [node.id]));
    }
  }
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  return { ok: errors.length === 0, diagnostics, ir: errors.length === 0 ? ir : null };
}
