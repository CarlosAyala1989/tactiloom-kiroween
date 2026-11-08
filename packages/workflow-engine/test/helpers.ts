import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile, OFFICIAL_TWO_BRANCH_LAYOUT, boardStateFromLayout, type LayoutEntry } from '@tactiloom/compiler';
import type { FieldId, WorkflowIR } from '@tactiloom/contracts';
import { FileSandbox, sha256Hex, type EnginePorts, type NodeEvent, type ResolvedDocument, type ReviewTaskRef, type SavedArtifactRef } from '../src/index';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export async function exampleDocument(file: string, uploadedFileId: string): Promise<ResolvedDocument> {
  const bytes = await readFile(join(ROOT, 'assets', 'examples', 'documents', file));
  return {
    uploadedFileId,
    originalName: file,
    mime: file.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
    bytes,
    sha256: sha256Hex(bytes),
  };
}

export function officialIr(uploadedFileId: string | null, layout: readonly LayoutEntry[] = OFFICIAL_TWO_BRANCH_LAYOUT, extraParams: Record<string, Record<string, unknown>> = {}): WorkflowIR {
  const inputId = compile(boardStateFromLayout(layout)).graph.nodes.find((n) => n.kind === 'INPUT_FILE')?.id ?? 'input-11';
  const result = compile(boardStateFromLayout(layout), { [inputId]: { uploadedFileId }, ...extraParams });
  if (!result.ir) throw new Error(`fixture does not compile: ${JSON.stringify(result.diagnostics)}`);
  return result.ir;
}

export interface TestHarness {
  readonly sandbox: FileSandbox;
  readonly workspaceId: string;
  readonly events: NodeEvent[];
  readonly reviews: Map<string, ReviewTaskRef & { label: string; missingFields: FieldId[]; invalidFields: FieldId[] }>;
  readonly artifacts: SavedArtifactRef[];
  cancelled: boolean;
  ports(documents: Record<string, ResolvedDocument>, overrides?: Partial<EnginePorts>): EnginePorts;
}

export async function harness(): Promise<TestHarness> {
  const root = await mkdtemp(join(tmpdir(), 'tactiloom-engine-'));
  const sandbox = await FileSandbox.open(root);
  const workspaceId = 'ws_test';
  const h: TestHarness = {
    sandbox,
    workspaceId,
    events: [],
    reviews: new Map(),
    artifacts: [],
    cancelled: false,
    ports(documents, overrides = {}) {
      return {
        now: () => new Date('2026-11-08T12:00:00.000Z'),
        resolveDocument: async (id) => {
          const document = documents[id];
          if (!document) throw new Error('not found');
          return document;
        },
        saveArtifact: async (input) => {
          const written = await sandbox.writeFileIdempotent(workspaceId, input.relativePath, input.bytes, 5 * 1024 * 1024);
          const ref: SavedArtifactRef = {
            artifactId: `art_${input.nodeId}_${input.type}`,
            nodeId: input.nodeId,
            type: input.type,
            safeName: input.safeName,
            relativePath: written.relativePath,
            size: written.size,
            sha256: written.sha256,
            created: written.created,
          };
          h.artifacts.push(ref);
          return ref;
        },
        createReviewTask: async (input) => {
          const existing = h.reviews.get(input.nodeId);
          if (existing) return { ...existing, created: false };
          const task = { reviewTaskId: `rev_${input.nodeId}`, created: true, ...input };
          h.reviews.set(input.nodeId, task);
          return task;
        },
        emit: async (event) => {
          h.events.push(event);
        },
        isCancelled: async () => h.cancelled,
        ...overrides,
      };
    },
  };
  return h;
}
