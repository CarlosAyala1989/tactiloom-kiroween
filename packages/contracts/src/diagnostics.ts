import { z } from 'zod';
import { CellSchema } from './geometry';

/** Diagnostic codes shared by vision (Python), compiler and runtime. */
export const DIAGNOSTIC_CODES = [
  // Vision / board reading
  'BOARD_FIDUCIAL_MISSING',
  'DUPLICATE_FIDUCIAL',
  'HOMOGRAPHY_DEGENERATE',
  'NO_MARKERS_FOUND',
  'TOO_MANY_MARKERS',
  'MARKER_SIZE_MISMATCH',
  'AMBIGUOUS_POSITION',
  'AMBIGUOUS_ORIENTATION',
  'CARD_NOT_IN_CELL',
  'UNKNOWN_CARD',
  // Compiler
  'INVALID_BOARD_STATE',
  'BOARD_DIMENSIONS_MISMATCH',
  'BOARD_NOT_CALIBRATED',
  'CARD_COLLISION',
  'DUPLICATE_INSTANCE',
  'MISSING_START',
  'MULTIPLE_STARTS',
  'MISSING_END',
  'DANGLING_OUTPUT',
  'INCOMPATIBLE_PORTS',
  'MULTIPLE_INPUTS',
  'UNREACHABLE_NODE',
  'CYCLE_UNSUPPORTED',
  'NONTERMINATING_PATH',
  'BRANCH_TARGETS_IDENTICAL',
  'MISSING_REQUIRED_DATA',
  'INVALID_PARAMETER',
  'UNUSED_PARAMETER',
  'INPUT_NOT_SELECTED',
  'TOO_MANY_NODES',
  // Runtime
  'IR_INVALID',
  'IR_HASH_MISMATCH',
  'UNSUPPORTED_FILE_TYPE',
  'UNSAFE_FILE_PATH',
  'FILE_NOT_FOUND',
  'FILE_TOO_LARGE',
  'FILE_CHANGED',
  'PDF_NO_TEXT_LAYER',
  'EXTRACTION_FAILED',
  'OUTPUT_TOO_LARGE',
  'RUN_TIMEOUT',
  'RUN_CANCELLED',
  'NODE_LIMIT_EXCEEDED',
  'PRECONDITION_FAILED',
  'INTERNAL_ERROR',
] as const;
export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];
export const DiagnosticCodeSchema = z.enum(DIAGNOSTIC_CODES);

export const SEVERITIES = ['error', 'warning', 'info'] as const;
export type Severity = (typeof SEVERITIES)[number];

const MessageParamValueSchema = z.union([
  z.string().max(500),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string().max(200), z.number()])).max(64),
]);

/**
 * Structured values behind a human message (card ids, kinds, directions, counts…). Clients render
 * localized text from `code` + `params`; `message` stays as the canonical Spanish text.
 */
export const MessageParamsSchema = z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,40}$/), MessageParamValueSchema);
export type MessageParams = z.infer<typeof MessageParamsSchema>;

export const DiagnosticSchema = z.object({
  code: DiagnosticCodeSchema,
  severity: z.enum(SEVERITIES),
  stage: z.enum(['vision', 'compiler', 'runtime']),
  message: z.string().min(1).max(500),
  markerIds: z.array(z.number().int().min(0).max(999)).max(64).optional(),
  cells: z.array(CellSchema).max(64).optional(),
  nodeIds: z.array(z.string().max(64)).max(64).optional(),
  suggestion: z.string().max(500).optional(),
  params: MessageParamsSchema.optional(),
});
export type Diagnostic = z.infer<typeof DiagnosticSchema>;

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}

/** Human readable title (Spanish) for each code; detailed messages are built where detected. */
export const DIAGNOSTIC_TITLES_ES: Readonly<Record<DiagnosticCode, string>> = {
  BOARD_FIDUCIAL_MISSING: 'Falta un marcador de esquina del tablero',
  DUPLICATE_FIDUCIAL: 'Marcador de esquina repetido',
  HOMOGRAPHY_DEGENERATE: 'No se pudo calibrar la perspectiva',
  NO_MARKERS_FOUND: 'No se encontraron marcadores',
  TOO_MANY_MARKERS: 'Demasiados marcadores en la imagen',
  MARKER_SIZE_MISMATCH: 'Tamaño de tarjeta inesperado',
  AMBIGUOUS_POSITION: 'Tarjeta entre dos casillas',
  AMBIGUOUS_ORIENTATION: 'Orientación ambigua',
  CARD_NOT_IN_CELL: 'Tarjeta fuera de la cuadrícula',
  UNKNOWN_CARD: 'Tarjeta desconocida',
  INVALID_BOARD_STATE: 'Estado de tablero inválido',
  BOARD_DIMENSIONS_MISMATCH: 'Dimensiones de tablero incorrectas',
  BOARD_NOT_CALIBRATED: 'Tablero no calibrado',
  CARD_COLLISION: 'Dos tarjetas en la misma casilla',
  DUPLICATE_INSTANCE: 'Tarjeta duplicada',
  MISSING_START: 'Falta la tarjeta INICIO',
  MULTIPLE_STARTS: 'Hay más de una tarjeta INICIO',
  MISSING_END: 'Falta una tarjeta FIN',
  DANGLING_OUTPUT: 'Salida sin tarjeta receptora',
  INCOMPATIBLE_PORTS: 'Conexión con orientación incompatible',
  MULTIPLE_INPUTS: 'Tarjeta con más de una entrada',
  UNREACHABLE_NODE: 'Tarjeta inalcanzable desde INICIO',
  CYCLE_UNSUPPORTED: 'Ciclo no soportado',
  NONTERMINATING_PATH: 'Camino que no termina en FIN',
  BRANCH_TARGETS_IDENTICAL: 'Las dos ramas llegan a la misma tarjeta',
  MISSING_REQUIRED_DATA: 'Faltan datos requeridos',
  INVALID_PARAMETER: 'Parámetro inválido',
  UNUSED_PARAMETER: 'Parámetro sin tarjeta',
  INPUT_NOT_SELECTED: 'Documento de entrada sin seleccionar',
  TOO_MANY_NODES: 'Demasiadas tarjetas',
  IR_INVALID: 'Programa inválido',
  IR_HASH_MISMATCH: 'El hash del programa no coincide',
  UNSUPPORTED_FILE_TYPE: 'Tipo de archivo no soportado',
  UNSAFE_FILE_PATH: 'Ruta de archivo insegura',
  FILE_NOT_FOUND: 'Archivo no encontrado',
  FILE_TOO_LARGE: 'Archivo demasiado grande',
  FILE_CHANGED: 'El archivo cambió desde la aprobación',
  PDF_NO_TEXT_LAYER: 'PDF sin capa de texto',
  EXTRACTION_FAILED: 'No se pudo extraer el texto',
  OUTPUT_TOO_LARGE: 'Salida demasiado grande',
  RUN_TIMEOUT: 'Tiempo máximo de ejecución superado',
  RUN_CANCELLED: 'Ejecución cancelada',
  NODE_LIMIT_EXCEEDED: 'Límite de nodos superado',
  PRECONDITION_FAILED: 'Precondición no satisfecha',
  INTERNAL_ERROR: 'Error interno',
};
