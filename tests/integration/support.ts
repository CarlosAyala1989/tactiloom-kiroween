import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { boardStateFromLayout, compile, OFFICIAL_TWO_BRANCH_LAYOUT, type LayoutEntry } from '@tactiloom/compiler';
import { createPrismaClient, type PrismaClient, type Prisma } from '@tactiloom/db';
import type { RunnerConfig, RunnerContext } from '@tactiloom/runner';
import { FileSandbox, sha256Hex } from '@tactiloom/workflow-engine';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

let prisma: PrismaClient | undefined;

export function testPrisma(): PrismaClient {
  prisma ??= createPrismaClient(process.env.TEST_DATABASE_URL as string);
  return prisma;
}

export async function resetDatabase(): Promise<void> {
  await testPrisma().$executeRawUnsafe(
    'TRUNCATE "AuditEvent","NodeRunEvent","GeneratedArtifact","ReviewTask","Job","Run","WorkflowParameters","WorkflowVersion","Workflow","BoardCapture","UploadedDocument","Session","Workspace","User","WorkerStatus" CASCADE',
  );
}

export async function testContext(overrides: Partial<RunnerConfig> = {}): Promise<RunnerContext> {
  const sandbox = await FileSandbox.open(await mkdtemp(join(tmpdir(), 'tactiloom-it-')));
  return {
    prisma: testPrisma(),
    sandbox,
    config: {
      databaseUrl: process.env.TEST_DATABASE_URL as string,
      workspaceRoot: sandbox.root,
      pollIntervalMs: 50,
      leaseMs: 5_000,
      maxAttempts: 3,
      maxDurationMs: 60_000,
      cleanupIntervalMs: 60_000,
      runnerId: 'runner-test-a',
      ...overrides,
    },
  };
}

export async function createWorkspace(ctx: RunnerContext, name = 'Demo') {
  const user = await ctx.prisma.user.create({ data: { role: 'DEMO' } });
  return ctx.prisma.workspace.create({ data: { ownerId: user.id, name, demoMode: true, expiresAt: new Date(Date.now() + 3_600_000) } });
}

export async function uploadExample(ctx: RunnerContext, workspaceId: string, file: string) {
  const bytes = await readFile(join(ROOT, 'assets', 'examples', 'documents', file));
  const doc = await ctx.prisma.uploadedDocument.create({
    data: {
      workspaceId,
      originalName: file,
      mime: file.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
      bytes: bytes.byteLength,
      sha256: sha256Hex(bytes),
      sandboxPath: 'pending',
      isDemo: true,
    },
  });
  const relative = `uploads/${doc.id}${file.endsWith('.pdf') ? '.pdf' : '.txt'}`;
  await ctx.sandbox.writeFileIdempotent(workspaceId, relative, bytes, 10 * 1024 * 1024);
  return ctx.prisma.uploadedDocument.update({ where: { id: doc.id }, data: { sandboxPath: relative } });
}

/** Compiles a layout server-side and stores an immutable WorkflowVersion. */
export async function createVersion(ctx: RunnerContext, workspaceId: string, documentId: string | null, layout: readonly LayoutEntry[] = OFFICIAL_TWO_BRANCH_LAYOUT) {
  const params = { 'input-11': { uploadedFileId: documentId } };
  const boardState = boardStateFromLayout(layout);
  const result = compile(boardState, params);
  if (!result.ir) throw new Error('fixture must compile');
  const workflow = await ctx.prisma.workflow.create({ data: { workspaceId, name: 'Solicitudes de taller' } });
  return ctx.prisma.workflowVersion.create({
    data: {
      workflowId: workflow.id,
      workspaceId,
      versionNumber: 1,
      sourceMode: 'simulator',
      compilerVersion: result.ir.compilerVersion,
      valid: true,
      boardStateJson: boardState as unknown as Prisma.InputJsonValue,
      irJson: result.ir as unknown as Prisma.InputJsonValue,
      contentHash: result.ir.contentHash,
      diagnostics: result.diagnostics as unknown as Prisma.InputJsonValue,
      parameters: { create: { perCardInstance: params as unknown as Prisma.InputJsonValue } },
    },
  });
}

export async function createPreviewRun(ctx: RunnerContext, workspaceId: string, versionId: string, contentHash: string) {
  const run = await ctx.prisma.run.create({ data: { workflowVersionId: versionId, workspaceId, status: 'DRAFT', sourceMode: 'simulator', contentHash } });
  await ctx.prisma.job.create({ data: { runId: run.id, kind: 'PREVIEW', idempotencyKey: `${run.id}:PREVIEW` } });
  return run;
}

/** What POST /api/runs does after verifying hashes (approval + EXECUTE job). */
export async function approve(ctx: RunnerContext, runId: string) {
  await ctx.prisma.run.update({ where: { id: runId }, data: { status: 'QUEUED', approvedAt: new Date() } });
  return ctx.prisma.job.create({ data: { runId, kind: 'EXECUTE', idempotencyKey: `${runId}:EXECUTE` } });
}
