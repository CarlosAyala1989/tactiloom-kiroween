import { z } from 'zod';
import { SourceModeSchema } from './board';
import { CardKindSchema, DataFactSchema, PortSchema } from './cards';
import { HASH_PATTERN } from './canonical';
import { OrientationSchema } from './geometry';

export const IR_VERSION = 'ritual-ir/1' as const;
export const MAX_IR_NODES = 30;

const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number(),
    z.string().max(500),
    z.array(JsonValueSchema).max(50),
    z.record(z.string().max(64), JsonValueSchema),
  ]),
);

export const IrNodeSchema = z.object({
  id: z.string().regex(/^[a-z]+-[0-9]{2}$/),
  markerId: z.number().int().min(10).max(89),
  kind: CardKindSchema,
  params: z.record(z.string().max(64), JsonValueSchema),
  /** Physical placement (λ(v)). Not part of contentHash: moving a whole valid flow keeps the program. */
  layout: z.object({
    row: z.number().int().min(0),
    col: z.number().int().min(0),
    orientation: OrientationSchema,
  }),
  dataRequirements: z.object({
    requires: z.array(DataFactSchema),
    produces: z.array(DataFactSchema),
  }),
});
export type IrNode = z.infer<typeof IrNodeSchema>;

export const IrEdgeSchema = z.object({
  from: z.string(),
  port: PortSchema,
  to: z.string(),
});
export type IrEdge = z.infer<typeof IrEdgeSchema>;

export const WorkflowIRSchema = z.object({
  irVersion: z.literal(IR_VERSION),
  compilerVersion: z.string().min(1),
  catalogVersion: z.literal('cards-v1'),
  boardTemplateId: z.literal('board-v1'),
  sourceMode: SourceModeSchema,
  startNodeId: z.string(),
  nodes: z.array(IrNodeSchema).min(2).max(MAX_IR_NODES),
  edges: z.array(IrEdgeSchema).max(MAX_IR_NODES * 2),
  topologicalOrder: z.array(z.string()),
  contentHash: z.string().regex(HASH_PATTERN),
});
export type WorkflowIR = z.infer<typeof WorkflowIRSchema>;

/**
 * Semantic payload covered by contentHash: contract version, catalog, nodes (id, marker,
 * kind, normalised params) and canonical edges. Excludes layout, sourceMode, compilerVersion
 * and the derived topological order.
 */
export function irHashPayload(ir: Pick<WorkflowIR, 'irVersion' | 'catalogVersion' | 'boardTemplateId' | 'startNodeId' | 'nodes' | 'edges'>) {
  return {
    irVersion: ir.irVersion,
    catalogVersion: ir.catalogVersion,
    boardTemplateId: ir.boardTemplateId,
    startNodeId: ir.startNodeId,
    nodes: [...ir.nodes]
      .sort((a, b) => a.markerId - b.markerId)
      .map((node) => ({ id: node.id, markerId: node.markerId, kind: node.kind, params: node.params })),
    edges: [...ir.edges]
      .sort((a, b) => compareEdges(a, b))
      .map((edge) => ({ from: edge.from, port: edge.port, to: edge.to })),
  };
}

export function compareEdges(a: IrEdge, b: IrEdge): number {
  if (a.from !== b.from) return a.from < b.from ? -1 : 1;
  if (a.port !== b.port) return a.port < b.port ? -1 : 1;
  if (a.to !== b.to) return a.to < b.to ? -1 : 1;
  return 0;
}
