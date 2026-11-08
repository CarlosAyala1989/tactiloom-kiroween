import type { Job, PrismaClient } from '@ritualos/db';

/**
 * Postgres job queue with leases.
 *
 * Guarantees: a job is held by at most one live lease at a time (row lock + SKIP LOCKED makes
 * concurrent claims pick different rows); an expired lease can be reclaimed (at-least-once).
 * Exactly-once is NOT claimed: duplicate side effects are prevented by idempotent writes
 * (unique artifact/review keys and create-only sandbox files).
 */
export async function claimJob(prisma: PrismaClient, owner: string, leaseMs: number): Promise<Job | null> {
  const rows = await prisma.$queryRaw<Job[]>`
    UPDATE "Job" AS j
    SET "status" = 'LEASED',
        "leaseOwner" = ${owner},
        "leaseExpiresAt" = now() + (${leaseMs}::int * interval '1 millisecond'),
        "heartbeatAt" = now(),
        "attempts" = j."attempts" + 1,
        "updatedAt" = now()
    WHERE j."id" = (
      SELECT q."id" FROM "Job" AS q
      WHERE (q."status" = 'PENDING' AND q."availableAt" <= now())
         OR (q."status" = 'LEASED' AND q."leaseExpiresAt" < now())
      ORDER BY q."createdAt", q."id"
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING j.*`;
  return rows[0] ?? null;
}

/** Extends the lease only if we still own it. Returns false when the lease was lost. */
export async function heartbeat(prisma: PrismaClient, jobId: string, owner: string, leaseMs: number): Promise<boolean> {
  const updated = await prisma.$executeRaw`
    UPDATE "Job"
    SET "heartbeatAt" = now(),
        "leaseExpiresAt" = now() + (${leaseMs}::int * interval '1 millisecond'),
        "updatedAt" = now()
    WHERE "id" = ${jobId} AND "leaseOwner" = ${owner} AND "status" = 'LEASED'`;
  return updated === 1;
}

export async function completeJob(prisma: PrismaClient, jobId: string, owner: string): Promise<boolean> {
  const result = await prisma.job.updateMany({
    where: { id: jobId, leaseOwner: owner, status: 'LEASED' },
    data: { status: 'DONE', leaseExpiresAt: null, lastError: null },
  });
  return result.count === 1;
}

/** Retry later (exponential backoff) or mark DEAD when attempts are exhausted. */
export async function failJob(prisma: PrismaClient, job: Job, owner: string, error: string): Promise<'RETRY' | 'DEAD'> {
  const dead = job.attempts >= job.maxAttempts;
  const delayMs = Math.min(30_000, 1_000 * 2 ** Math.max(job.attempts - 1, 0));
  await prisma.job.updateMany({
    where: { id: job.id, leaseOwner: owner },
    data: dead
      ? { status: 'DEAD', leaseExpiresAt: null, lastError: error.slice(0, 500) }
      : { status: 'PENDING', leaseOwner: null, leaseExpiresAt: null, availableAt: new Date(Date.now() + delayMs), lastError: error.slice(0, 500) },
  });
  return dead ? 'DEAD' : 'RETRY';
}
