import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { consumeQuota } from '@ritualos/db';
import { runOnce } from '@ritualos/runner';
import { sha256Hex } from '@ritualos/workflow-engine';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { approve, createPreviewRun, createVersion, createWorkspace, resetDatabase, testContext, testPrisma, uploadExample } from './support';

async function drain(ctx: Awaited<ReturnType<typeof testContext>>) {
  while (await runOnce(ctx)) {
    // until the queue is empty
  }
}

async function approvedRun(file = 'valid-application.pdf') {
  const ctx = await testContext();
  const ws = await createWorkspace(ctx);
  const doc = await uploadExample(ctx, ws.id, file);
  const version = await createVersion(ctx, ws.id, doc.id);
  const run = await createPreviewRun(ctx, ws.id, version.id, version.contentHash!);
  await drain(ctx);
  const job = await approve(ctx, run.id);
  return { ctx, ws, run, job };
}

describe('hardening found by the security review', () => {
  beforeEach(resetDatabase);
  afterAll(async () => testPrisma().$disconnect());

  it('quota consumption is atomic under concurrency (no check-then-act race)', async () => {
    const ctx = await testContext();
    const ws = await createWorkspace(ctx);
    const results = await Promise.all(Array.from({ length: 40 }, () => consumeQuota(ctx.prisma, ws.id, 'ANALYZE', 7)));
    expect(results.filter(Boolean)).toHaveLength(7);
    expect(await consumeQuota(ctx.prisma, ws.id, 'RUN', 7)).toBe(true); // other kinds are independent
  });

  it('a crash after the report files were written is retried to SUCCEEDED with byte-identical files', async () => {
    const { ctx, ws, run, job } = await approvedRun();
    await drain(ctx);
    const reportsDir = join(ctx.sandbox.root, ws.id, 'runs', run.id, 'reports');
    const before = await Promise.all((await readdir(reportsDir)).sort().map(async (name) => sha256Hex(await readFile(join(reportsDir, name)))));
    // Simulate: files written, then the worker died before registering the artifacts and finishing the run.
    await ctx.prisma.generatedArtifact.deleteMany({ where: { runId: run.id } });
    await ctx.prisma.run.update({ where: { id: run.id }, data: { status: 'RUNNING', endedAt: null, outcome: undefined } });
    await ctx.prisma.job.update({ where: { id: job.id }, data: { status: 'LEASED', leaseOwner: 'dead-worker', leaseExpiresAt: new Date(Date.now() - 1_000) } });
    await new Promise((resolve) => setTimeout(resolve, 20)); // a later wall-clock time than the first attempt
    await drain(ctx);
    const after = await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    expect(after.errorCode).toBeNull();
    expect(after.status).toBe('SUCCEEDED');
    const hashes = await Promise.all((await readdir(reportsDir)).sort().map(async (name) => sha256Hex(await readFile(join(reportsDir, name)))));
    expect(hashes).toEqual(before);
    expect(await ctx.prisma.generatedArtifact.count({ where: { runId: run.id } })).toBe(2);
  });

  it('fails closed when the execution would not match the approved plan', async () => {
    const { ctx, run } = await approvedRun();
    // e.g. a forged approval that points to another plan: nothing may be written.
    await ctx.prisma.run.update({ where: { id: run.id }, data: { planHash: `sha256:${'b'.repeat(64)}` } });
    await drain(ctx);
    const stored = await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    expect(stored.status).toBe('FAILED');
    expect(stored.errorCode).toBe('PRECONDITION_FAILED');
    expect(await ctx.prisma.generatedArtifact.count()).toBe(0);
    expect(await ctx.prisma.nodeRunEvent.count({ where: { runId: run.id, phase: 'EXECUTE' } })).toBe(0);
  });

  it('an approval that waited too long in the queue is not executed', async () => {
    const { ctx, run } = await approvedRun();
    await ctx.prisma.run.update({ where: { id: run.id }, data: { approvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) } });
    await drain(ctx);
    const stored = await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    expect(stored.status).toBe('FAILED');
    expect(stored.errorMessage).toContain('caducó');
    expect(await ctx.prisma.generatedArtifact.count()).toBe(0);
  });

  it('client-visible failure messages never contain raw internal errors', async () => {
    const ctx = await testContext();
    const ws = await createWorkspace(ctx);
    const version = await createVersion(ctx, ws.id, null);
    const run = await createPreviewRun(ctx, ws.id, version.id, version.contentHash!);
    await ctx.prisma.job.updateMany({ where: { runId: run.id }, data: { status: 'LEASED', attempts: 3, leaseExpiresAt: new Date(Date.now() - 1_000) } });
    await drain(ctx);
    const stored = await ctx.prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    expect(stored.errorMessage).toBe('El trabajo agotó sus reintentos por un error interno del worker.');
  });
});
