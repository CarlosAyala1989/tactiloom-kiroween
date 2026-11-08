import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { LINEAR_LAYOUT } from '@tactiloom/compiler';
import type { ExecutionPlan } from '@tactiloom/contracts';
import type { Prisma } from '@tactiloom/db';
import { cleanupExpired, runOnce } from '@tactiloom/runner';
import { sha256Hex } from '@tactiloom/workflow-engine';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { approve, createPreviewRun, createVersion, createWorkspace, resetDatabase, testContext, testPrisma, uploadExample } from './support';

async function files(dir: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (current: string, prefix: string) => {
    for (const entry of await readdir(current, { withFileTypes: true }).catch(() => [])) {
      if (entry.isDirectory()) await walk(join(current, entry.name), `${prefix}${entry.name}/`);
      else out.push(`${prefix}${entry.name}`);
    }
  };
  await walk(dir, '');
  return out.sort();
}

async function drain(ctx: Awaited<ReturnType<typeof testContext>>) {
  while (await runOnce(ctx)) {
    // process until the queue is empty
  }
}

describe('runner end-to-end with Postgres and the sandbox', () => {
  beforeEach(resetDatabase);
  afterAll(async () => testPrisma().$disconnect());

  it('preview → approval → execution on the valid document produces a real downloadable report', async () => {
    const ctx = await testContext();
    const ws = await createWorkspace(ctx);
    const doc = await uploadExample(ctx, ws.id, 'valid-application.pdf');
    const version = await createVersion(ctx, ws.id, doc.id);
    const run = await createPreviewRun(ctx, ws.id, version.id, version.contentHash!);

    await drain(ctx);
    const previewed = await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    expect(previewed.status).toBe('AWAITING_APPROVAL');
    const plan = previewed.plan as unknown as ExecutionPlan;
    expect(plan.decision?.port).toBe('TRUE');
    expect(plan.effects.map((e) => e.kind)).toEqual(['WRITE_ARTIFACT', 'WRITE_ARTIFACT']);
    expect(previewed.planHash).toBe(plan.planHash);
    expect(await ctx.prisma.generatedArtifact.count()).toBe(0); // dry-run wrote nothing
    expect((await files(join(ctx.sandbox.root, ws.id))).every((f) => f.startsWith('uploads/'))).toBe(true);
    const previewEvents = await ctx.prisma.nodeRunEvent.findMany({ where: { runId: run.id, phase: 'PREVIEW' } });
    expect(previewEvents.every((e) => e.status === 'PREDICTED')).toBe(true);

    await approve(ctx, run.id);
    await drain(ctx);
    const done = await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    expect(done.status).toBe('SUCCEEDED');
    expect((done.outcome as { planMatched: boolean }).planMatched).toBe(true);
    const artifacts = await ctx.prisma.generatedArtifact.findMany({ where: { runId: run.id }, orderBy: { type: 'asc' } });
    // Postgres orders enum values by declaration order (REPORT_MARKDOWN, REPORT_JSON).
    expect(artifacts.map((a) => a.type)).toEqual(['REPORT_MARKDOWN', 'REPORT_JSON']);
    for (const artifact of artifacts) {
      const bytes = await readFile(join(ctx.sandbox.root, ws.id, artifact.sandboxPath));
      expect(sha256Hex(bytes)).toBe(artifact.sha256);
      expect(artifact.sandboxPath.startsWith(`runs/${run.id}/reports/`)).toBe(true);
    }
    const markdown = await readFile(join(ctx.sandbox.root, ws.id, artifacts[0]!.sandboxPath), 'utf8');
    expect(markdown).toContain('Ana Ejemplo Ríos');
    const executed = await ctx.prisma.nodeRunEvent.findMany({ where: { runId: run.id, phase: 'EXECUTE', status: 'SUCCEEDED' }, orderBy: { seq: 'asc' } });
    expect(executed.map((e) => e.nodeId)).toEqual(['start-10', 'input-11', 'extract-12', 'validate-13', 'condition-14', 'report-15', 'save-16', 'end-17']);
    const audits = (await ctx.prisma.auditEvent.findMany({ where: { entityId: run.id }, orderBy: { createdAt: 'asc' } })).map((a) => a.action);
    expect(audits).toEqual(['RUN_PREVIEWED', 'RUN_STARTED', 'RUN_SUCCEEDED']);
  });

  it('invalid document → FALSE branch → OPEN ReviewTask and no report', async () => {
    const ctx = await testContext();
    const ws = await createWorkspace(ctx);
    const doc = await uploadExample(ctx, ws.id, 'invalid-application.pdf');
    const version = await createVersion(ctx, ws.id, doc.id);
    const run = await createPreviewRun(ctx, ws.id, version.id, version.contentHash!);
    await drain(ctx);
    await approve(ctx, run.id);
    await drain(ctx);
    const done = await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    expect(done.status).toBe('SUCCEEDED');
    const tasks = await ctx.prisma.reviewTask.findMany({ where: { runId: run.id } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ status: 'OPEN', nodeId: 'review-18', missingFields: ['workshop'], invalidFields: ['email'] });
    expect(await ctx.prisma.generatedArtifact.count({ where: { runId: run.id } })).toBe(0);
  });

  it('a re-delivered EXECUTE job never duplicates artifacts nor re-runs a finished run', async () => {
    const ctx = await testContext();
    const ws = await createWorkspace(ctx);
    const doc = await uploadExample(ctx, ws.id, 'valid-application.pdf');
    const version = await createVersion(ctx, ws.id, doc.id);
    const run = await createPreviewRun(ctx, ws.id, version.id, version.contentHash!);
    await drain(ctx);
    const job = await approve(ctx, run.id);
    await drain(ctx);
    const eventsBefore = await ctx.prisma.nodeRunEvent.count({ where: { runId: run.id } });
    await ctx.prisma.job.update({ where: { id: job.id }, data: { status: 'PENDING', leaseOwner: null } });
    await drain(ctx);
    expect(await ctx.prisma.generatedArtifact.count({ where: { runId: run.id } })).toBe(2);
    expect(await ctx.prisma.nodeRunEvent.count({ where: { runId: run.id } })).toBe(eventsBefore);
    expect((await files(join(ctx.sandbox.root, ws.id, 'runs', run.id, 'reports'))).length).toBe(2);
  });

  it('crash recovery: an expired lease mid-run is reclaimed and completes without duplicating effects', async () => {
    const ctx = await testContext();
    const ws = await createWorkspace(ctx);
    const doc = await uploadExample(ctx, ws.id, 'valid-application.pdf');
    const version = await createVersion(ctx, ws.id, doc.id);
    const run = await createPreviewRun(ctx, ws.id, version.id, version.contentHash!);
    await drain(ctx);
    const job = await approve(ctx, run.id);
    // Simulate worker A crashing after claiming the job and starting the run.
    await ctx.prisma.job.update({ where: { id: job.id }, data: { status: 'LEASED', leaseOwner: 'dead-worker', attempts: 1, leaseExpiresAt: new Date(Date.now() - 1_000) } });
    await ctx.prisma.run.update({ where: { id: run.id }, data: { status: 'RUNNING', startedAt: new Date() } });
    await drain(ctx);
    const reclaimed = await ctx.prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(reclaimed.attempts).toBe(2);
    expect(reclaimed.status).toBe('DONE');
    expect((await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } })).status).toBe('SUCCEEDED');
    expect(await ctx.prisma.generatedArtifact.count({ where: { runId: run.id } })).toBe(2);
  });

  it('a job whose lease expired too many times becomes DEAD and the run FAILED', async () => {
    const ctx = await testContext();
    const ws = await createWorkspace(ctx);
    const version = await createVersion(ctx, ws.id, null);
    const run = await createPreviewRun(ctx, ws.id, version.id, version.contentHash!);
    await ctx.prisma.job.updateMany({ where: { runId: run.id }, data: { status: 'LEASED', attempts: 3, leaseExpiresAt: new Date(Date.now() - 1_000) } });
    await drain(ctx);
    expect((await ctx.prisma.job.findFirstOrThrow({ where: { runId: run.id } })).status).toBe('DEAD');
    expect((await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } })).status).toBe('FAILED');
  });

  it('refuses to execute without approval', async () => {
    const ctx = await testContext();
    const ws = await createWorkspace(ctx);
    const doc = await uploadExample(ctx, ws.id, 'valid-application.pdf');
    const version = await createVersion(ctx, ws.id, doc.id);
    const run = await createPreviewRun(ctx, ws.id, version.id, version.contentHash!);
    await drain(ctx);
    await ctx.prisma.job.create({ data: { runId: run.id, kind: 'EXECUTE', idempotencyKey: `${run.id}:EXECUTE` } }); // forged, no approval
    await drain(ctx);
    const stored = await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    expect(stored.status).toBe('FAILED');
    expect(stored.errorCode).toBe('PRECONDITION_FAILED');
    expect(await ctx.prisma.generatedArtifact.count()).toBe(0);
  });

  it('a tampered IR in the database is rejected before any node runs', async () => {
    const ctx = await testContext();
    const ws = await createWorkspace(ctx);
    const doc = await uploadExample(ctx, ws.id, 'valid-application.pdf');
    const version = await createVersion(ctx, ws.id, doc.id);
    const ir = structuredClone(version.irJson) as { nodes: { id: string; params: Record<string, unknown> }[] };
    ir.nodes.find((n) => n.id === 'save-16')!.params = { baseName: 'pwned' };
    await ctx.prisma.workflowVersion.update({ where: { id: version.id }, data: { irJson: ir as unknown as Prisma.InputJsonValue } });
    const run = await createPreviewRun(ctx, ws.id, version.id, version.contentHash!);
    await drain(ctx);
    const stored = await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    expect(stored.status).toBe('FAILED');
    expect(stored.errorCode).toBe('IR_INVALID');
    expect(await ctx.prisma.nodeRunEvent.count({ where: { runId: run.id } })).toBe(0);
  });

  it('workspace isolation: a program cannot read a document of another workspace', async () => {
    const ctx = await testContext();
    const attacker = await createWorkspace(ctx, 'A');
    const victim = await createWorkspace(ctx, 'B');
    const secret = await uploadExample(ctx, victim.id, 'valid-application.pdf');
    const version = await createVersion(ctx, attacker.id, secret.id);
    const run = await createPreviewRun(ctx, attacker.id, version.id, version.contentHash!);
    await drain(ctx);
    const stored = await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    expect(stored.status).toBe('FAILED');
    expect(stored.errorCode).toBe('FILE_NOT_FOUND');
  });

  it('cancellation before execution', async () => {
    const ctx = await testContext();
    const ws = await createWorkspace(ctx);
    const doc = await uploadExample(ctx, ws.id, 'valid-application.pdf');
    const version = await createVersion(ctx, ws.id, doc.id);
    const run = await createPreviewRun(ctx, ws.id, version.id, version.contentHash!);
    await drain(ctx);
    await approve(ctx, run.id);
    await ctx.prisma.run.update({ where: { id: run.id }, data: { cancelRequestedAt: new Date() } });
    await drain(ctx);
    expect((await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } })).status).toBe('CANCELLED');
    expect(await ctx.prisma.generatedArtifact.count()).toBe(0);
  });

  it('linear flow and preview failure on a PDF without text', async () => {
    const ctx = await testContext();
    const ws = await createWorkspace(ctx);
    const scanned = await uploadExample(ctx, ws.id, 'scanned-application.pdf');
    const version = await createVersion(ctx, ws.id, null, LINEAR_LAYOUT);
    expect(version.valid).toBe(true);
    const params = { 'input-21': { uploadedFileId: scanned.id } };
    const { compile, boardStateFromLayout } = await import('@tactiloom/compiler');
    const ir = compile(boardStateFromLayout(LINEAR_LAYOUT), params).ir!;
    const v2 = await ctx.prisma.workflowVersion.create({
      data: {
        workflowId: version.workflowId,
        workspaceId: ws.id,
        versionNumber: 2,
        sourceMode: 'simulator',
        compilerVersion: ir.compilerVersion,
        valid: true,
        boardStateJson: boardStateFromLayout(LINEAR_LAYOUT) as unknown as Prisma.InputJsonValue,
        irJson: ir as unknown as Prisma.InputJsonValue,
        contentHash: ir.contentHash,
        diagnostics: [],
      },
    });
    const run = await createPreviewRun(ctx, ws.id, v2.id, ir.contentHash);
    await drain(ctx);
    const stored = await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    expect(stored.status).toBe('FAILED');
    expect(stored.errorCode).toBe('PDF_NO_TEXT_LAYER');
  });

  it('TTL cleanup removes expired workspaces, their files and orphan directories', async () => {
    const ctx = await testContext();
    const expired = await createWorkspace(ctx, 'old');
    const alive = await createWorkspace(ctx, 'new');
    await uploadExample(ctx, expired.id, 'valid-application.txt');
    await uploadExample(ctx, alive.id, 'valid-application.txt');
    await ctx.sandbox.writeFileIdempotent('orphan_ws', 'uploads/x.txt', new TextEncoder().encode('x'), 100);
    await ctx.prisma.workspace.update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
    const result = await cleanupExpired(ctx);
    expect(result).toEqual({ workspaces: 1, orphans: 1 });
    expect(await ctx.prisma.workspace.findUnique({ where: { id: expired.id } })).toBeNull();
    expect(await ctx.prisma.uploadedDocument.count({ where: { workspaceId: expired.id } })).toBe(0);
    expect((await ctx.sandbox.listWorkspaces()).sort()).toEqual([alive.id]);
  });
});
