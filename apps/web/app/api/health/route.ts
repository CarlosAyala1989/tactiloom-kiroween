import { handler, ok } from '@/lib/server/http';
import { prisma } from '@/lib/server/prisma';
import { visionHealth } from '@/lib/server/vision';

export const dynamic = 'force-dynamic';

/** Liveness of web, database, vision and runner. Never exposes secrets or internal paths. */
export const GET = handler(async (_request, _context: unknown, requestId) => {
  let database = false;
  let worker: { alive: boolean; lastSeenAt: Date | null } = { alive: false, lastSeenAt: null };
  try {
    await prisma().$queryRaw`SELECT 1`;
    database = true;
    const latest = await prisma().workerStatus.findFirst({ orderBy: { lastSeenAt: 'desc' } });
    if (latest) worker = { alive: Date.now() - latest.lastSeenAt.getTime() < 20_000, lastSeenAt: latest.lastSeenAt };
  } catch {
    database = false;
  }
  const vision = await visionHealth();
  const healthy = database && vision.ok && worker.alive;
  return ok(
    {
      status: healthy ? 'ok' : 'degraded',
      service: 'tactiloom-web',
      checks: { web: true, database, vision: vision.ok, worker: worker.alive },
      worker,
      vision: vision.detail ?? null,
      time: new Date().toISOString(),
    },
    requestId,
  );
});
