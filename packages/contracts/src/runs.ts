import { z } from 'zod';
import { CardKindSchema, FieldIdSchema, PortSchema } from './cards';
import { HASH_PATTERN } from './canonical';
import { DiagnosticCodeSchema } from './diagnostics';

/** Run lifecycle: DRAFT → COMPILED → AWAITING_APPROVAL → QUEUED → RUNNING → SUCCEEDED | FAILED | CANCELLED */
export const RUN_STATUSES = [
  'DRAFT',
  'COMPILED',
  'AWAITING_APPROVAL',
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];
export const RunStatusSchema = z.enum(RUN_STATUSES);
export const TERMINAL_RUN_STATUSES: readonly RunStatus[] = ['SUCCEEDED', 'FAILED', 'CANCELLED'];

export const NODE_RUN_STATUSES = ['STARTED', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'PREDICTED'] as const;
export const NodeRunStatusSchema = z.enum(NODE_RUN_STATUSES);
export type NodeRunStatus = z.infer<typeof NodeRunStatusSchema>;

export const EXECUTION_MODES = ['dry-run', 'execute'] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export const PLAN_VERSION = 'ritual-plan/1' as const;

export const PlannedEffectSchema = z.object({
  nodeId: z.string(),
  kind: z.enum(['WRITE_ARTIFACT', 'CREATE_REVIEW_TASK']),
  descriptionEs: z.string(),
  /** Relative sandbox location or entity description. Never an absolute host path. */
  target: z.string(),
});
export type PlannedEffect = z.infer<typeof PlannedEffectSchema>;

export const FieldValuesSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  workshop: z.string().nullable(),
});

export const ExecutionPlanSchema = z.object({
  planVersion: z.literal(PLAN_VERSION),
  contentHash: z.string().regex(HASH_PATTERN),
  input: z
    .object({
      uploadedFileId: z.string(),
      originalName: z.string(),
      mime: z.string(),
      bytes: z.number().int().nonnegative(),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
    })
    .nullable(),
  path: z.array(z.object({ nodeId: z.string(), kind: CardKindSchema })),
  decision: z
    .object({ nodeId: z.string(), predicate: z.literal('allRequiredPresent'), result: z.boolean(), port: PortSchema })
    .nullable(),
  validation: z
    .object({
      fields: FieldValuesSchema,
      missingFields: z.array(FieldIdSchema),
      invalidFields: z.array(FieldIdSchema),
      isValid: z.boolean(),
    })
    .nullable(),
  effects: z.array(PlannedEffectSchema),
  reportPreview: z.string().max(20_000).nullable(),
  planHash: z.string().regex(HASH_PATTERN),
});
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

export const RunFailureSchema = z.object({
  code: DiagnosticCodeSchema,
  messageEs: z.string(),
  nodeId: z.string().nullable(),
});
export type RunFailure = z.infer<typeof RunFailureSchema>;
