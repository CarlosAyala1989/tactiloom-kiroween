import { claimJob, completeJob, failJob, heartbeat } from '@ritualos/runner';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createPreviewRun, createVersion, createWorkspace, resetDatabase, testContext, testPrisma } from './support';

async function seedJobs(count: number) {
  const ctx = await testContext();
  const workspace = await createWorkspace(ctx);
  const version = await createVersion(ctx, workspace.id, null);
  const runs = [];
  for (let i = 0; i < count; i += 1) runs.push(await createPreviewRun(ctx, workspace.id, version.id, version.contentHash!));
  return runs;
}

describe('Postgres queue (FOR UPDATE SKIP LOCKED + lease)', () => {
  beforeEach(resetDatabase);
  afterAll(async () => testPrisma().$disconnect());

  it('a single job is never picked up twice by concurrent workers', async () => {
    await seedJobs(1);
    const prisma = testPrisma();
    const claims = await Promise.all(Array.from({ length: 12 }, (_, i) => claimJob(prisma, `worker-${i}`, 10_000)));
    const winners = claims.filter((job) => job !== null);
    expect(winners).toHaveLength(1);
    expect(winners[0]?.attempts).toBe(1);
  });

  it('many jobs and many workers: every job is claimed exactly once', async () => {
    await seedJobs(20);
    const prisma = testPrisma();
    const claimed: string[] = [];
    await Promise.all(
      Array.from({ length: 6 }, async (_, w) => {
        for (;;) {
          const job = await claimJob(prisma, `worker-${w}`, 10_000);
          if (!job) break;
          claimed.push(job.id);
        }
      }),
    );
    expect(claimed).toHaveLength(20);
    expect(new Set(claimed).size).toBe(20);
  });

  it('an expired lease can be reclaimed and the old owner loses it', async () => {
    await seedJobs(1);
    const prisma = testPrisma();
    const first = await claimJob(prisma, 'worker-a', 10_000);
    expect(first).not.toBeNull();
    expect(await claimJob(prisma, 'worker-b', 10_000)).toBeNull(); // still leased
    await prisma.job.update({ where: { id: first!.id }, data: { leaseExpiresAt: new Date(Date.now() - 1_000) } });
    const second = await claimJob(prisma, 'worker-b', 10_000);
    expect(second?.id).toBe(first!.id);
    expect(second?.attempts).toBe(2);
    expect(await heartbeat(prisma, first!.id, 'worker-a', 10_000)).toBe(false);
    expect(await completeJob(prisma, first!.id, 'worker-a')).toBe(false);
    expect(await heartbeat(prisma, first!.id, 'worker-b', 10_000)).toBe(true);
    expect(await completeJob(prisma, first!.id, 'worker-b')).toBe(true);
  });

  it('failures back off and finally become DEAD', async () => {
    await seedJobs(1);
    const prisma = testPrisma();
    let job = await claimJob(prisma, 'w', 10_000);
    expect(await failJob(prisma, job!, 'w', 'boom')).toBe('RETRY');
    expect(await claimJob(prisma, 'w', 10_000)).toBeNull(); // backoff window
    await prisma.job.update({ where: { id: job!.id }, data: { availableAt: new Date(Date.now() - 1) } });
    job = await claimJob(prisma, 'w', 10_000);
    expect(await failJob(prisma, job!, 'w', 'boom')).toBe('RETRY');
    await prisma.job.update({ where: { id: job!.id }, data: { availableAt: new Date(Date.now() - 1) } });
    job = await claimJob(prisma, 'w', 10_000);
    expect(job?.attempts).toBe(3);
    expect(await failJob(prisma, job!, 'w', 'boom')).toBe('DEAD');
    const stored = await prisma.job.findUniqueOrThrow({ where: { id: job!.id } });
    expect(stored.status).toBe('DEAD');
    expect(stored.lastError).toBe('boom');
  });

  it('the idempotency key prevents enqueuing the same EXECUTE twice', async () => {
    const [run] = await seedJobs(1);
    const prisma = testPrisma();
    await prisma.job.create({ data: { runId: run!.id, kind: 'EXECUTE', idempotencyKey: `${run!.id}:EXECUTE` } });
    await expect(prisma.job.create({ data: { runId: run!.id, kind: 'EXECUTE', idempotencyKey: `${run!.id}:EXECUTE` } })).rejects.toThrow();
  });
});
