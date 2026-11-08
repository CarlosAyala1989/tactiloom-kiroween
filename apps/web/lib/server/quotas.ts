import 'server-only';
import { consumeQuota as consume, type QuotaKind } from '@tactiloom/db';
import { env } from './env';
import { HttpError } from './http';
import { prisma } from './prisma';

const LIMIT_MESSAGE: Record<QuotaKind, (limit: number) => string> = {
  ANALYZE: (limit) => `Límite de ${limit} análisis por hora alcanzado en esta demo.`,
  RUN: (limit) => `Límite de ${limit} ejecuciones por hora alcanzado en esta demo.`,
};

/** Atomic hourly quota (single SQL statement; safe under concurrency). */
export async function consumeQuota(workspaceId: string, kind: QuotaKind): Promise<void> {
  const limit = kind === 'ANALYZE' ? env().DEMO_MAX_ANALYSES_PER_HOUR : env().DEMO_MAX_RUNS_PER_HOUR;
  if (!(await consume(prisma(), workspaceId, kind, limit))) throw new HttpError(429, 'QUOTA_EXCEEDED', LIMIT_MESSAGE[kind](limit));
}

const inFlight = new Map<string, number>();

/** Bounds concurrent analyses per workspace in this process (vision is CPU-bound). */
export async function withAnalysisSlot<T>(workspaceId: string, fn: () => Promise<T>, maxConcurrent = 2): Promise<T> {
  const current = inFlight.get(workspaceId) ?? 0;
  if (current >= maxConcurrent) throw new HttpError(429, 'TOO_MANY_ANALYSES', 'Ya hay análisis en curso en tu workspace; espera a que terminen.');
  inFlight.set(workspaceId, current + 1);
  try {
    return await fn();
  } finally {
    const left = (inFlight.get(workspaceId) ?? 1) - 1;
    if (left <= 0) inFlight.delete(workspaceId);
    else inFlight.set(workspaceId, left);
  }
}
