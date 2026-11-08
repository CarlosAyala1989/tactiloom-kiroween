import { z } from 'zod';

export const CARD_KINDS = [
  'START',
  'INPUT_FILE',
  'EXTRACT_TEXT',
  'VALIDATE_FIELDS',
  'CONDITION',
  'CREATE_REPORT',
  'SAVE_REPORT',
  'REQUEST_REVIEW',
  'END',
] as const;
export type CardKind = (typeof CARD_KINDS)[number];
export const CardKindSchema = z.enum(CARD_KINDS);

/** Labelled output ports of the IR multigraph (L in G = (V, E, τ, λ)). */
export const PORTS = ['NEXT', 'TRUE', 'FALSE'] as const;
export type Port = (typeof PORTS)[number];
export const PortSchema = z.enum(PORTS);

/**
 * Resources carried by the typed ExecutionContext. Edges only carry control;
 * these facts implement the "definite assignment" data-availability analysis.
 */
export const DATA_FACTS = [
  'DocumentRef',
  'ExtractedText',
  'ValidationResult',
  'Report',
  'SavedArtifact',
  'ReviewTask',
] as const;
export type DataFact = (typeof DATA_FACTS)[number];
export const DataFactSchema = z.enum(DATA_FACTS);

/** Physical direction of an output port relative to the card's forward direction F. */
export type PortDirection = 'FORWARD' | 'RIGHT';

export interface CardKindSpec {
  readonly kind: CardKind;
  readonly labelEs: string;
  readonly labelEn: string;
  readonly descriptionEs: string;
  /** v1: every card except START receives control through its back side B(F). */
  readonly hasInput: boolean;
  readonly outputs: readonly { readonly port: Port; readonly direction: PortDirection }[];
  readonly requires: readonly DataFact[];
  readonly produces: readonly DataFact[];
  /** Prefix used to build card instance ids (e.g. `start-10`). */
  readonly instancePrefix: string;
  /** Print/UI accent colour (hex). */
  readonly color: string;
  /** Short effect summary shown in the approval screen. */
  readonly effectEs: string;
  readonly sideEffect: 'none' | 'read' | 'write-artifact' | 'create-review';
}

export const CARD_KIND_SPECS: Readonly<Record<CardKind, CardKindSpec>> = {
  START: {
    kind: 'START',
    labelEs: 'Inicio',
    labelEn: 'Start',
    descriptionEs: 'Comienzo manual del flujo.',
    hasInput: false,
    outputs: [{ port: 'NEXT', direction: 'FORWARD' }],
    requires: [],
    produces: [],
    instancePrefix: 'start',
    color: '#2f9e44',
    effectEs: 'Crea el contexto de ejecución. No modifica archivos.',
    sideEffect: 'none',
  },
  INPUT_FILE: {
    kind: 'INPUT_FILE',
    labelEs: 'Archivo de entrada',
    labelEn: 'Input file',
    descriptionEs: 'Incorpora un documento ya subido al workspace.',
    hasInput: true,
    outputs: [{ port: 'NEXT', direction: 'FORWARD' }],
    requires: [],
    produces: ['DocumentRef'],
    instancePrefix: 'input',
    color: '#1971c2',
    effectEs: 'Lee un documento del workspace (solo lectura).',
    sideEffect: 'read',
  },
  EXTRACT_TEXT: {
    kind: 'EXTRACT_TEXT',
    labelEs: 'Extraer texto',
    labelEn: 'Extract text',
    descriptionEs: 'Extrae el texto de un TXT o de un PDF con capa de texto.',
    hasInput: true,
    outputs: [{ port: 'NEXT', direction: 'FORWARD' }],
    requires: ['DocumentRef'],
    produces: ['ExtractedText'],
    instancePrefix: 'extract',
    color: '#0c8599',
    effectEs: 'Extrae texto en memoria (solo lectura).',
    sideEffect: 'read',
  },
  VALIDATE_FIELDS: {
    kind: 'VALIDATE_FIELDS',
    labelEs: 'Validar campos',
    labelEn: 'Validate fields',
    descriptionEs: 'Comprueba la presencia y el formato de los campos obligatorios.',
    hasInput: true,
    outputs: [{ port: 'NEXT', direction: 'FORWARD' }],
    requires: ['ExtractedText'],
    produces: ['ValidationResult'],
    instancePrefix: 'validate',
    color: '#6741d9',
    effectEs: 'Valida campos en memoria. No modifica archivos.',
    sideEffect: 'none',
  },
  CONDITION: {
    kind: 'CONDITION',
    labelEs: 'Condición',
    labelEn: 'Condition',
    descriptionEs: '¿Están todos los campos obligatorios? SÍ sigue la flecha; NO gira a la derecha.',
    hasInput: true,
    outputs: [
      { port: 'TRUE', direction: 'FORWARD' },
      { port: 'FALSE', direction: 'RIGHT' },
    ],
    requires: ['ValidationResult'],
    produces: [],
    instancePrefix: 'condition',
    color: '#e67700',
    effectEs: 'Elige exactamente una rama (TRUE o FALSE).',
    sideEffect: 'none',
  },
  CREATE_REPORT: {
    kind: 'CREATE_REPORT',
    labelEs: 'Crear reporte',
    labelEn: 'Create report',
    descriptionEs: 'Genera un reporte Markdown/JSON con los datos extraídos.',
    hasInput: true,
    outputs: [{ port: 'NEXT', direction: 'FORWARD' }],
    requires: ['ExtractedText', 'ValidationResult'],
    produces: ['Report'],
    instancePrefix: 'report',
    color: '#c2255c',
    effectEs: 'Genera el contenido del reporte en memoria.',
    sideEffect: 'none',
  },
  SAVE_REPORT: {
    kind: 'SAVE_REPORT',
    labelEs: 'Guardar reporte',
    labelEn: 'Save report',
    descriptionEs: 'Guarda el reporte en el sandbox del workspace como artefacto descargable.',
    hasInput: true,
    outputs: [{ port: 'NEXT', direction: 'FORWARD' }],
    requires: ['Report'],
    produces: ['SavedArtifact'],
    instancePrefix: 'save',
    color: '#5c940d',
    effectEs: 'Escribe archivos dentro de runs/<runId>/reports/ del workspace.',
    sideEffect: 'write-artifact',
  },
  REQUEST_REVIEW: {
    kind: 'REQUEST_REVIEW',
    labelEs: 'Solicitar revisión',
    labelEn: 'Request review',
    descriptionEs: 'Registra una tarea de revisión con los campos faltantes.',
    hasInput: true,
    outputs: [{ port: 'NEXT', direction: 'FORWARD' }],
    requires: ['ValidationResult'],
    produces: ['ReviewTask'],
    instancePrefix: 'review',
    color: '#f08c00',
    effectEs: 'Crea una tarea de revisión OPEN en la base de datos (sin correos ni notificaciones).',
    sideEffect: 'create-review',
  },
  END: {
    kind: 'END',
    labelEs: 'Fin',
    labelEn: 'End',
    descriptionEs: 'Termina una rama. No tiene salida.',
    hasInput: true,
    outputs: [],
    requires: [],
    produces: [],
    instancePrefix: 'end',
    color: '#495057',
    effectEs: 'Finaliza el camino. No hace nada irreversible.',
    sideEffect: 'none',
  },
};

/** Field identifiers understood by VALIDATE_FIELDS (v1). */
export const FIELD_IDS = ['name', 'email', 'workshop'] as const;
export type FieldId = (typeof FIELD_IDS)[number];
export const FieldIdSchema = z.enum(FIELD_IDS);

export const FIELD_LABELS_ES: Readonly<Record<FieldId, string>> = {
  name: 'Nombre',
  email: 'Correo',
  workshop: 'Taller',
};
