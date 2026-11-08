import { z } from 'zod';
import { BoardStateSchema, BoardTemplateSchema, DetectionResultSchema } from './board';
import { CardCatalogSchema } from './catalog';
import { WorkflowIRSchema } from './ir';
import { ExecutionPlanSchema } from './runs';

const BASE_ID = 'https://ritualos.dev/schemas';

interface SchemaTarget {
  readonly file: string;
  readonly title: string;
  readonly schema: z.ZodType;
  readonly io: 'input' | 'output';
}

/** Versioned JSON Schemas published from the Zod authoring source (see docs/adr/0002-contracts.md). */
export const JSON_SCHEMA_TARGETS: readonly SchemaTarget[] = [
  { file: 'board-template.v1.schema.json', title: 'RitualOS BoardTemplate v1', schema: BoardTemplateSchema, io: 'output' },
  { file: 'card-catalog.v1.schema.json', title: 'RitualOS CardCatalog v1', schema: CardCatalogSchema, io: 'output' },
  { file: 'board-state.v1.schema.json', title: 'RitualOS BoardState (ritual-board/1)', schema: BoardStateSchema, io: 'input' },
  { file: 'detection-result.v1.schema.json', title: 'RitualOS DetectionResult (ritual-board/1)', schema: DetectionResultSchema, io: 'output' },
  { file: 'workflow-ir.v1.schema.json', title: 'RitualOS Workflow IR (ritual-ir/1)', schema: WorkflowIRSchema, io: 'output' },
  { file: 'execution-plan.v1.schema.json', title: 'RitualOS Execution Plan (ritual-plan/1)', schema: ExecutionPlanSchema, io: 'output' },
];

export function buildJsonSchema(target: SchemaTarget): Record<string, unknown> {
  const generated = z.toJSONSchema(target.schema, {
    target: 'draft-2020-12',
    io: target.io,
    unrepresentable: 'any',
  }) as Record<string, unknown>;
  return {
    $id: `${BASE_ID}/${target.file}`,
    title: target.title,
    ...generated,
  };
}

export function renderJsonSchemaFile(target: SchemaTarget): string {
  return `${JSON.stringify(buildJsonSchema(target), null, 2)}\n`;
}
