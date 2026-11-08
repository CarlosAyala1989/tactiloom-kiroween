import { z } from 'zod';
import { BoardStateSchema } from './board';
import { HASH_PATTERN } from './canonical';
import { WorkflowParamsInputSchema } from './params';

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

const IdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

/**
 * Compile either a server-stored capture (image/physical) or a simulator BoardState.
 * Image-mode states always come from the server-side capture, never from the browser.
 */
export const CompileRequestSchema = z.union([
  z.strictObject({
    captureId: IdSchema,
    params: WorkflowParamsInputSchema,
  }),
  z.strictObject({
    boardState: BoardStateSchema,
    params: WorkflowParamsInputSchema,
  }),
]);
export type CompileRequest = z.input<typeof CompileRequestSchema>;

const SaveFieldsShape = {
  workflowId: IdSchema.optional(),
  name: z.string().trim().min(1).max(80).optional(),
};

export const CreateWorkflowVersionRequestSchema = z.union([
  z.strictObject({ captureId: IdSchema, params: WorkflowParamsInputSchema, ...SaveFieldsShape }),
  z.strictObject({ boardState: BoardStateSchema, params: WorkflowParamsInputSchema, ...SaveFieldsShape }),
]);
export type CreateWorkflowVersionRequest = z.input<typeof CreateWorkflowVersionRequestSchema>;

export const PreviewRunRequestSchema = z.strictObject({
  workflowVersionId: IdSchema,
});

export const ApproveRunRequestSchema = z.strictObject({
  previewRunId: IdSchema,
  contentHash: z.string().regex(HASH_PATTERN),
  planHash: z.string().regex(HASH_PATTERN),
  confirm: z.literal(true),
});
export type ApproveRunRequest = z.infer<typeof ApproveRunRequestSchema>;
