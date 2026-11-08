import { CARD_KIND_SPECS, ORIENTATION_LABEL_ES, type CardKind, type DataFact, type Orientation } from '@tactiloom/contracts';

export const DATA_FACT_LABEL_ES: Readonly<Record<DataFact, string>> = {
  DocumentRef: 'documento de entrada',
  ExtractedText: 'texto extraído',
  ValidationResult: 'resultado de validación',
  Report: 'reporte',
  SavedArtifact: 'artefacto guardado',
  ReviewTask: 'tarea de revisión',
};

/** Which card kind produces each fact (used in suggestions). */
export const PRODUCER_OF: Readonly<Record<DataFact, CardKind>> = {
  DocumentRef: 'INPUT_FILE',
  ExtractedText: 'EXTRACT_TEXT',
  ValidationResult: 'VALIDATE_FIELDS',
  Report: 'CREATE_REPORT',
  SavedArtifact: 'SAVE_REPORT',
  ReviewTask: 'REQUEST_REVIEW',
};

export function cardLabel(markerId: number, kind: CardKind): string {
  return `#${markerId} ${CARD_KIND_SPECS[kind].labelEs.toUpperCase()}`;
}

export function cellLabel(row: number, col: number): string {
  return `(${row},${col})`;
}

export function directionLabel(direction: Orientation): string {
  return ORIENTATION_LABEL_ES[direction];
}

export function listEs(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
