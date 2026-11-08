import {
  adjacent,
  BoardStateSchema,
  canonicalHash,
  CARD_KIND_SPECS,
  cellKey,
  compareEdges,
  getBoardTemplate,
  hasErrors,
  indexCatalog,
  IR_VERSION,
  irHashPayload,
  isFiducialId,
  MAX_IR_NODES,
  opposite,
  PARAM_SCHEMAS,
  rotateClockwise,
  WorkflowParamsInputSchema,
  type BoardState,
  type BoardTemplate,
  type CardKind,
  type CatalogIndex,
  type DataFact,
  type Diagnostic,
  type IrEdge,
  type IrNode,
  type Orientation,
  type Port,
  type SourceMode,
  type WorkflowIR,
} from '@ritualos/contracts';
import { analyzeGraph, type GraphInput } from './graph';
import { cardLabel, cellLabel, directionLabel } from './messages';

export const COMPILER_VERSION = 'ritualos-compiler/1.0.0';

/** A recognised card instance after normalisation (catalog-derived identity). */
export interface CompiledNode {
  readonly id: string;
  readonly markerId: number;
  readonly kind: CardKind;
  readonly row: number;
  readonly col: number;
  readonly orientation: Orientation;
  readonly quality: number | null;
}

export interface GraphView {
  readonly nodes: readonly CompiledNode[];
  readonly edges: readonly IrEdge[];
}

export interface CompileResult {
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly ir: WorkflowIR | null;
  /** Always present: lets the UI draw what was understood, even when invalid. */
  readonly graph: GraphView;
  readonly normalizedParams: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly sourceMode: SourceMode | null;
}

export interface CompileOptions {
  readonly catalog?: CatalogIndex;
  readonly template?: BoardTemplate;
  readonly maxNodes?: number;
}

const SEVERITY_RANK = { error: 0, warning: 1, info: 2 } as const;

export function sortDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((a, b) => {
    const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severity !== 0) return severity;
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    const markerA = a.markerIds?.[0] ?? -1;
    const markerB = b.markerIds?.[0] ?? -1;
    if (markerA !== markerB) return markerA - markerB;
    return a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
  });
}

function compilerDiagnostic(
  code: Diagnostic['code'],
  severity: Diagnostic['severity'],
  message: string,
  extra: Partial<Pick<Diagnostic, 'markerIds' | 'cells' | 'nodeIds' | 'suggestion'>> = {},
): Diagnostic {
  return { code, severity, stage: 'compiler', message, ...extra };
}

function portDirection(orientation: Orientation, direction: 'FORWARD' | 'RIGHT'): Orientation {
  return direction === 'FORWARD' ? orientation : rotateClockwise(orientation);
}

/**
 * Ritual Board Grammar v1 compiler (docs/physical-grammar-v1.md, Appendix A of the master prompt).
 * Pure and deterministic: the same BoardState + params always yields the same IR and contentHash.
 */
export function compile(boardStateInput: unknown, paramsInput: unknown = {}, options: CompileOptions = {}): CompileResult {
  const template = options.template ?? getBoardTemplate();
  const catalog = options.catalog ?? indexCatalog();
  const maxNodes = options.maxNodes ?? MAX_IR_NODES;
  const diagnostics: Diagnostic[] = [];
  const empty: GraphView = { nodes: [], edges: [] };

  const parsedState = BoardStateSchema.safeParse(boardStateInput);
  if (!parsedState.success) {
    const issues = parsedState.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('; ');
    return {
      valid: false,
      diagnostics: [
        compilerDiagnostic('INVALID_BOARD_STATE', 'error', `El estado del tablero no cumple el contrato ritual-board/1: ${issues}`, {
          suggestion: 'Vuelve a analizar la imagen o recarga el simulador.',
        }),
      ],
      ir: null,
      graph: empty,
      normalizedParams: {},
      sourceMode: null,
    };
  }
  const state: BoardState = parsedState.data;

  // Vision diagnostics travel with the board state; their errors block compilation.
  for (const diagnostic of state.diagnostics) diagnostics.push(diagnostic);

  if (state.board.columns !== template.columns || state.board.rows !== template.rows) {
    diagnostics.push(
      compilerDiagnostic(
        'BOARD_DIMENSIONS_MISMATCH',
        'error',
        `El tablero declara ${state.board.columns}×${state.board.rows} casillas; board-v1 exige ${template.columns}×${template.rows}.`,
      ),
    );
  }
  if (!state.board.calibrated && state.sourceMode !== 'simulator') {
    diagnostics.push(
      compilerDiagnostic('BOARD_NOT_CALIBRATED', 'error', 'El tablero no está calibrado: no se puede asignar cada tarjeta a una casilla.', {
        suggestion: 'Captura de nuevo asegurando que se vean los cuatro marcadores de esquina.',
      }),
    );
  }

  const parsedParams = WorkflowParamsInputSchema.safeParse(paramsInput ?? {});
  const rawParams: Record<string, Record<string, unknown>> = parsedParams.success ? parsedParams.data : {};
  if (!parsedParams.success) {
    diagnostics.push(
      compilerDiagnostic('INVALID_PARAMETER', 'error', 'Los parámetros deben ser un objeto { "<instancia>": { ... } } con ids como "input-11".'),
    );
  }

  // 1. Normalise and index cards (stable order by row, col, markerId).
  const cards = [...state.cards].sort((a, b) => a.row - b.row || a.col - b.col || a.markerId - b.markerId);
  const nodes: CompiledNode[] = [];
  const byCell = new Map<string, CompiledNode>();
  const byInstance = new Map<string, CompiledNode>();
  for (const card of cards) {
    const entry = catalog.byMarkerId.get(card.markerId);
    const cells = [{ row: card.row, col: card.col }];
    if (isFiducialId(card.markerId) || !entry || !entry.enabled) {
      diagnostics.push(
        compilerDiagnostic('UNKNOWN_CARD', 'error', `El marcador #${card.markerId} en ${cellLabel(card.row, card.col)} no es una tarjeta del catálogo ${catalog.catalog.catalogVersion}.`, {
          markerIds: [card.markerId],
          cells,
          suggestion: 'Retírala o usa una tarjeta impresa con el kit oficial.',
        }),
      );
      continue;
    }
    if (card.row >= template.rows || card.col >= template.columns) {
      diagnostics.push(
        compilerDiagnostic('CARD_NOT_IN_CELL', 'error', `${cardLabel(card.markerId, entry.kind)} está fuera de la cuadrícula de ${template.columns}×${template.rows}.`, {
          markerIds: [card.markerId],
          cells,
          suggestion: 'Colócala dentro de una casilla del tablero.',
        }),
      );
      continue;
    }
    const node: CompiledNode = {
      id: entry.cardInstanceId,
      markerId: card.markerId,
      kind: entry.kind,
      row: card.row,
      col: card.col,
      orientation: card.orientation,
      quality: card.quality,
    };
    const previous = byInstance.get(node.id);
    if (previous) {
      diagnostics.push(
        compilerDiagnostic(
          'DUPLICATE_INSTANCE',
          'error',
          `${cardLabel(node.markerId, node.kind)} aparece dos veces: en ${cellLabel(previous.row, previous.col)} y en ${cellLabel(node.row, node.col)}.`,
          {
            markerIds: [node.markerId],
            cells: [
              { row: previous.row, col: previous.col },
              { row: node.row, col: node.col },
            ],
            nodeIds: [node.id],
            suggestion: 'Cada tarjeta física es única: retira la copia o usa otra tarjeta del mismo tipo (otro número).',
          },
        ),
      );
      continue;
    }
    const occupant = byCell.get(cellKey(node));
    if (occupant) {
      diagnostics.push(
        compilerDiagnostic(
          'CARD_COLLISION',
          'error',
          `${cardLabel(occupant.markerId, occupant.kind)} y ${cardLabel(node.markerId, node.kind)} ocupan la misma casilla ${cellLabel(node.row, node.col)}.`,
          {
            markerIds: [occupant.markerId, node.markerId],
            cells,
            nodeIds: [occupant.id, node.id],
            suggestion: 'Deja una sola tarjeta por casilla.',
          },
        ),
      );
      byInstance.set(node.id, node);
      nodes.push(node);
      continue;
    }
    byCell.set(cellKey(node), node);
    byInstance.set(node.id, node);
    nodes.push(node);
  }

  if (nodes.length > maxNodes) {
    diagnostics.push(compilerDiagnostic('TOO_MANY_NODES', 'error', `Hay ${nodes.length} tarjetas; el máximo por flujo es ${maxNodes}.`));
  }

  // 2. Resolve output ports geometrically (adjacency + orientation), never by proximity heuristics.
  const edges: IrEdge[] = [];
  for (const node of nodes) {
    if (byCell.get(cellKey(node)) !== node) continue; // colliding duplicate: no ports
    for (const output of CARD_KIND_SPECS[node.kind].outputs) {
      const direction = portDirection(node.orientation, output.direction);
      const target = adjacent(node, direction);
      const portName = output.port === 'NEXT' ? 'salida' : output.port === 'TRUE' ? 'salida SÍ' : 'salida NO';
      const inside = target.row >= 0 && target.col >= 0 && target.row < template.rows && target.col < template.columns;
      const receiver = inside ? byCell.get(cellKey(target)) : undefined;
      if (!receiver) {
        diagnostics.push(
          compilerDiagnostic(
            'DANGLING_OUTPUT',
            'error',
            inside
              ? `La ${portName} de ${cardLabel(node.markerId, node.kind)} en ${cellLabel(node.row, node.col)} apunta al ${directionLabel(direction)}, pero la casilla ${cellLabel(target.row, target.col)} está vacía.`
              : `La ${portName} de ${cardLabel(node.markerId, node.kind)} en ${cellLabel(node.row, node.col)} apunta al ${directionLabel(direction)}, fuera del tablero.`,
            {
              markerIds: [node.markerId],
              cells: inside ? [{ row: node.row, col: node.col }, target] : [{ row: node.row, col: node.col }],
              nodeIds: [node.id],
              suggestion: inside
                ? `Coloca la siguiente tarjeta en ${cellLabel(target.row, target.col)} con su flecha hacia el ${directionLabel(direction)}, o gira ${cardLabel(node.markerId, node.kind)}.`
                : `Gira ${cardLabel(node.markerId, node.kind)} para que su ${portName} apunte hacia dentro del tablero.`,
            },
          ),
        );
        continue;
      }
      const receiverSpec = CARD_KIND_SPECS[receiver.kind];
      const arrivingSide = opposite(direction);
      const expectedSide = opposite(receiver.orientation);
      if (!receiverSpec.hasInput || receiver.orientation !== direction) {
        diagnostics.push(
          compilerDiagnostic(
            'INCOMPATIBLE_PORTS',
            'error',
            !receiverSpec.hasInput
              ? `La ${portName} de ${cardLabel(node.markerId, node.kind)} llega a ${cardLabel(receiver.markerId, receiver.kind)}, que no admite entrada.`
              : `La ${portName} de ${cardLabel(node.markerId, node.kind)} llega a ${cardLabel(receiver.markerId, receiver.kind)} por su lado ${directionLabel(arrivingSide)}, pero esa tarjeta recibe por su lado ${directionLabel(expectedSide)}.`,
            {
              markerIds: [node.markerId, receiver.markerId],
              cells: [
                { row: node.row, col: node.col },
                { row: receiver.row, col: receiver.col },
              ],
              nodeIds: [node.id, receiver.id],
              suggestion: !receiverSpec.hasInput
                ? `Mueve ${cardLabel(receiver.markerId, receiver.kind)} o gira ${cardLabel(node.markerId, node.kind)}.`
                : `Gira ${cardLabel(receiver.markerId, receiver.kind)} para que su flecha apunte al ${directionLabel(direction)}.`,
            },
          ),
        );
        continue;
      }
      edges.push({ from: node.id, port: output.port as Port, to: receiver.id });
    }
  }
  edges.sort(compareEdges);

  // 3. Parameters (validated per card kind; defaults filled so the hash is canonical).
  const normalizedParams: Record<string, Record<string, unknown>> = {};
  for (const node of nodes) {
    const schema = PARAM_SCHEMAS[node.kind];
    const parsed = schema.safeParse(rawParams[node.id] ?? {});
    if (!parsed.success) {
      const detail = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'valor'}: ${issue.message}`).join('; ');
      diagnostics.push(
        compilerDiagnostic('INVALID_PARAMETER', 'error', `Parámetros inválidos para ${cardLabel(node.markerId, node.kind)}: ${detail}.`, {
          markerIds: [node.markerId],
          cells: [{ row: node.row, col: node.col }],
          nodeIds: [node.id],
          suggestion: 'Corrige el valor en el panel de parámetros.',
        }),
      );
      continue;
    }
    normalizedParams[node.id] = parsed.data as Record<string, unknown>;
    if (node.kind === 'INPUT_FILE' && (parsed.data as { uploadedFileId: string | null }).uploadedFileId === null) {
      diagnostics.push(
        compilerDiagnostic('INPUT_NOT_SELECTED', 'warning', `${cardLabel(node.markerId, node.kind)} aún no tiene documento: elígelo antes de revisar y ejecutar.`, {
          markerIds: [node.markerId],
          cells: [{ row: node.row, col: node.col }],
          nodeIds: [node.id],
        }),
      );
    }
  }
  for (const instanceId of Object.keys(rawParams).sort()) {
    if (!byInstance.has(instanceId)) {
      diagnostics.push(compilerDiagnostic('UNUSED_PARAMETER', 'info', `Hay parámetros para «${instanceId}», pero esa tarjeta no está en el tablero; se ignoran.`));
    }
  }

  // 4. Graph semantics: cardinalities, reachability, cycles, termination, data availability.
  const graphInput: GraphInput = {
    nodes: nodes.map((node) => ({ id: node.id, markerId: node.markerId, kind: node.kind, row: node.row, col: node.col })),
    edges,
  };
  const analysis = analyzeGraph(graphInput);
  diagnostics.push(...analysis.diagnostics);

  const sorted = sortDiagnostics(diagnostics);
  const graph: GraphView = { nodes, edges };
  if (hasErrors(sorted) || analysis.startNodeId === null || analysis.topologicalOrder === null) {
    return { valid: false, diagnostics: sorted, ir: null, graph, normalizedParams, sourceMode: state.sourceMode };
  }

  const irNodes: IrNode[] = nodes.map((node) => ({
    id: node.id,
    markerId: node.markerId,
    kind: node.kind,
    params: normalizedParams[node.id] ?? {},
    layout: { row: node.row, col: node.col, orientation: node.orientation },
    dataRequirements: {
      requires: [...CARD_KIND_SPECS[node.kind].requires] as DataFact[],
      produces: [...CARD_KIND_SPECS[node.kind].produces] as DataFact[],
    },
  }));
  const withoutHash = {
    irVersion: IR_VERSION,
    compilerVersion: COMPILER_VERSION,
    catalogVersion: catalog.catalog.catalogVersion,
    boardTemplateId: template.templateId,
    sourceMode: state.sourceMode,
    startNodeId: analysis.startNodeId,
    nodes: irNodes,
    edges,
    topologicalOrder: analysis.topologicalOrder,
  } as const;
  const ir: WorkflowIR = { ...withoutHash, contentHash: canonicalHash(irHashPayload(withoutHash)) };
  return { valid: true, diagnostics: sorted, ir, graph, normalizedParams, sourceMode: state.sourceMode };
}
