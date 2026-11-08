import type { PrismaClient } from './generated/prisma/client';

export type QuotaKind = 'ANALYZE' | 'RUN';

/**
 * Atomically consumes one unit of a per-workspace hourly quota. A single statement increments the
 * counter only while it is below `limit`, so concurrent requests can never exceed it
 * (no check-then-act race). Returns false when the quota is exhausted.
 */
export async function consumeQuota(prisma: PrismaClient, workspaceId: string, kind: QuotaKind, limit: number): Promise<boolean> {
  if (limit <= 0) return false;
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "QuotaUsage" ("workspaceId", "kind", "windowStart", "count")
    VALUES (${workspaceId}, ${kind}, date_trunc('hour', now()), 1)
    ON CONFLICT ("workspaceId", "kind", "windowStart")
    DO UPDATE SET "count" = "QuotaUsage"."count" + 1
    WHERE "QuotaUsage"."count" < ${limit}
    RETURNING "count"`;
  return rows.length === 1;
}

type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/** Serialises concurrent mutations of one workspace inside the current transaction (row lock). */
export async function lockWorkspace(tx: TransactionClient, workspaceId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Workspace" WHERE "id" = ${workspaceId} FOR UPDATE`;
  return rows.length === 1;
}

/** Transaction-scoped advisory lock for global critical sections (e.g. demo workspace cap). */
export async function advisoryLock(tx: TransactionClient, key: number): Promise<void> {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(${key}::bigint)`;
}
