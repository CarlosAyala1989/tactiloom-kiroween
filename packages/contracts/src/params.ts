import { z } from 'zod';
import { FIELD_IDS, FieldIdSchema, type CardKind, type FieldId } from './cards';

/** Characters allowed in free-text labels (letters incl. accents, digits, basic punctuation). */
export const SAFE_LABEL_PATTERN = /^[\p{L}\p{N} .,:;()_¿?¡!-]{1,80}$/u;
/** Base names for downloadable files. Never used to build sandbox paths. */
export const SAFE_BASENAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
/** Internal ids (cuid/uuid-like). */
export const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const sortFields = (fields: FieldId[]): FieldId[] =>
  [...fields].sort((a, b) => FIELD_IDS.indexOf(a) - FIELD_IDS.indexOf(b));

export const PARAM_SCHEMAS = {
  START: z.strictObject({}),
  INPUT_FILE: z.strictObject({
    uploadedFileId: z.string().regex(SAFE_ID_PATTERN).nullable().default(null),
  }),
  EXTRACT_TEXT: z.strictObject({
    language: z.enum(['es', 'en']).default('es'),
  }),
  VALIDATE_FIELDS: z.strictObject({
    requiredFields: z
      .array(FieldIdSchema)
      .min(1)
      .max(FIELD_IDS.length)
      .refine((fields) => new Set(fields).size === fields.length, {
        message: 'Los campos obligatorios no pueden repetirse.',
      })
      .transform(sortFields)
      .default([...FIELD_IDS]),
  }),
  CONDITION: z.strictObject({
    predicate: z.literal('allRequiredPresent').default('allRequiredPresent'),
  }),
  CREATE_REPORT: z.strictObject({
    template: z.literal('workshop-summary-v1').default('workshop-summary-v1'),
    format: z.enum(['markdown', 'json', 'both']).default('both'),
  }),
  SAVE_REPORT: z.strictObject({
    baseName: z.string().regex(SAFE_BASENAME_PATTERN).default('workshop-report'),
  }),
  REQUEST_REVIEW: z.strictObject({
    label: z.string().trim().regex(SAFE_LABEL_PATTERN).default('Revisión manual'),
  }),
  END: z.strictObject({}),
} as const satisfies Record<CardKind, z.ZodType>;

export type ParamsOf<K extends CardKind> = z.output<(typeof PARAM_SCHEMAS)[K]>;
export type AnyCardParams = { [K in CardKind]: ParamsOf<K> }[CardKind];

/** Parameters supplied by the UI, keyed by card instance id (e.g. `input-11`). */
export const WorkflowParamsInputSchema = z
  .record(z.string().regex(/^[a-z]+-[0-9]{1,2}$/), z.record(z.string(), z.unknown()))
  .default({});
export type WorkflowParamsInput = z.input<typeof WorkflowParamsInputSchema>;

export type ParamControl = 'document' | 'select' | 'multiselect' | 'text' | 'readonly';

export interface ParamFieldUi {
  readonly key: string;
  readonly labelEs: string;
  readonly control: ParamControl;
  readonly helpEs?: string;
  readonly options?: readonly { readonly value: string; readonly labelEs: string }[];
}

/** Declarative description used by the Workflow Studio to render parameter forms. */
export const PARAM_UI: Readonly<Record<CardKind, readonly ParamFieldUi[]>> = {
  START: [],
  INPUT_FILE: [
    {
      key: 'uploadedFileId',
      labelEs: 'Documento de entrada',
      control: 'document',
      helpEs: 'Elige un documento ya subido a tu workspace (PDF con texto o TXT).',
    },
  ],
  EXTRACT_TEXT: [
    {
      key: 'language',
      labelEs: 'Idioma del documento',
      control: 'select',
      options: [
        { value: 'es', labelEs: 'Español' },
        { value: 'en', labelEs: 'Inglés' },
      ],
    },
  ],
  VALIDATE_FIELDS: [
    {
      key: 'requiredFields',
      labelEs: 'Campos obligatorios',
      control: 'multiselect',
      options: [
        { value: 'name', labelEs: 'Nombre' },
        { value: 'email', labelEs: 'Correo' },
        { value: 'workshop', labelEs: 'Taller' },
      ],
    },
  ],
  CONDITION: [
    {
      key: 'predicate',
      labelEs: 'Predicado',
      control: 'readonly',
      helpEs: 'v1 solo admite «todos los campos obligatorios presentes» (allRequiredPresent).',
    },
  ],
  CREATE_REPORT: [
    {
      key: 'format',
      labelEs: 'Formato del reporte',
      control: 'select',
      options: [
        { value: 'both', labelEs: 'Markdown + JSON' },
        { value: 'markdown', labelEs: 'Solo Markdown' },
        { value: 'json', labelEs: 'Solo JSON' },
      ],
    },
  ],
  SAVE_REPORT: [
    {
      key: 'baseName',
      labelEs: 'Nombre base de descarga',
      control: 'text',
      helpEs: 'Minúsculas, números y guiones (máx. 40). Solo se usa como nombre de descarga.',
    },
  ],
  REQUEST_REVIEW: [
    {
      key: 'label',
      labelEs: 'Etiqueta de la revisión',
      control: 'text',
      helpEs: 'Texto corto (máx. 80) que verá quien revise.',
    },
  ],
  END: [],
};
