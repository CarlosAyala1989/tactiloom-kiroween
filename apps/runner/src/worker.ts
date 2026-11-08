import type { Job } from '@tactiloom/db';
import { cleanupExpired } from './cleanup';
import { log } from './log';
import { failRunForDeadJob, processJob, type RunnerContext } from './process';
import { claimJob, completeJob, failJob, heartbeat } from './queue';

export const RUNNER_VERSION = 'tactiloom-runner/1.0.0';

/** Processes one claimed job with a heartbeat that extends the lease while it runs. */
export async function runClaimedJob(ctx: RunnerContext, job: Job): Promise<'DONE' | 'RETRY' | 'DEAD'> {
  const { prisma, config } = ctx;
  if (job.attempts > job.maxAttempts) {
    await prisma.job.updateMany({ where: { id: job.id, leaseOwner: config.runnerId }, data: { status: 'DEAD', lastError: 'lease vencido demasiadas veces' } });
    await failRunForDeadJob(ctx, job, 'lease vencido demasiadas veces');
    log('warn', 'job.dead', { jobId: job.id, attempts: job.attempts });
    return 'DEAD';
  }
  let leaseLost = false;
  const timer = setInterval(() => {
    heartbeat(prisma, job.id, config.runnerId, config.leaseMs)
      .then((ok) => {
        if (!ok) leaseLost = true;
      })
      .catch(() => undefined);
  }, Math.max(Math.floor(config.leaseMs / 3), 500));
  try {
    await processJob(ctx, job, () => leaseLost);
    await completeJob(prisma, job.id, config.runnerId);
    return 'DONE';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', 'job.error', { jobId: job.id, runId: job.runId, attempt: job.attempts, message });
    const result = await failJob(prisma, job, config.runnerId, message);
    if (result === 'DEAD') await failRunForDeadJob(ctx, job, message);
    return result;
  } finally {
    clearInterval(timer);
  }
}

/** Claims and processes at most one job. Returns false when the queue was empty. */
export async function runOnce(ctx: RunnerContext): Promise<boolean> {
  const job = await claimJob(ctx.prisma, ctx.config.runnerId, ctx.config.leaseMs);
  if (!job) return false;
  await runClaimedJob(ctx, job);
  await ctx.prisma.workerStatus
    .update({ where: { id: ctx.config.runnerId }, data: { jobsDone: { increment: 1 }, lastSeenAt: new Date() } })
    .catch(() => undefined);
  return true;
}

export async function reportAlive(ctx: RunnerContext, startedAt: Date): Promise<void> {
  await ctx.prisma.workerStatus.upsert({
    where: { id: ctx.config.runnerId },
    create: { id: ctx.config.runnerId, version: RUNNER_VERSION, startedAt, lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Long-running loop: poll, process, heartbeat liveness, periodic TTL cleanup. */
export async function runLoop(ctx: RunnerContext, shouldStop: () => boolean): Promise<void> {
  const startedAt = new Date();
  let lastAlive = 0;
  let lastCleanup = 0;
  while (!shouldStop()) {
    try {
      if (Date.now() - lastAlive > 5_000) {
        await reportAlive(ctx, startedAt);
        lastAlive = Date.now();
      }
      if (Date.now() - lastCleanup > ctx.config.cleanupIntervalMs) {
        await cleanupExpired(ctx);
        lastCleanup = Date.now();
      }
      const worked = await runOnce(ctx);
      if (!worked) await sleep(ctx.config.pollIntervalMs);
    } catch (error) {
      log('error', 'runner.loop_error', { message: error instanceof Error ? error.message : String(error) });
      await sleep(1_000);
    }
  }
  await ctx.prisma.workerStatus.delete({ where: { id: ctx.config.runnerId } }).catch(() => undefined);
}
