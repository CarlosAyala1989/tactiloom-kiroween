import 'server-only';
import { env } from './env';
import { HttpError } from './http';
import { prisma } from './prisma';

const HOUR = 3_600_000;

export async function assertAnalysisQuota(workspaceId: string): Promise<void> {
  const count = await prisma().boardCapture.count({ where: { workspaceId, capturedAt: { gt: new Date(Date.now() - HOUR) } } });
  if (count >= env().DEMO_MAX_ANALYSES_PER_HOUR) {
    throw new HttpError(429, 'QUOTA_EXCEEDED', `Límite de ${env().DEMO_MAX_ANALYSES_PER_HOUR} análisis por hora alcanzado en esta demo.`);
  }
}

export async function assertRunQuota(workspaceId: string): Promise<void> {
  const count = await prisma().run.count({ where: { workspaceId, createdAt: { gt: new Date(Date.now() - HOUR) } } });
  if (count >= env().DEMO_MAX_RUNS_PER_HOUR) {
    throw new HttpError(429, 'QUOTA_EXCEEDED', `Límite de ${env().DEMO_MAX_RUNS_PER_HOUR} ejecuciones por hora alcanzado en esta demo.`);
  }
}

export async function assertConcurrentRuns(workspaceId: string): Promise<void> {
  const active = await prisma().run.count({ where: { workspaceId, status: { in: ['QUEUED', 'RUNNING'] } } });
  if (active >= env().DEMO_MAX_CONCURRENT_RUNS) {
    throw new HttpError(429, 'TOO_MANY_ACTIVE_RUNS', `Ya hay ${active} ejecuciones activas; espera a que terminen.`);
  }
}

export async function assertUploadQuota(workspaceId: string): Promise<void> {
  const count = await prisma().uploadedDocument.count({ where: { workspaceId, isDemo: false } });
  if (count >= env().DEMO_MAX_UPLOADS) {
    throw new HttpError(429, 'QUOTA_EXCEEDED', `Límite de ${env().DEMO_MAX_UPLOADS} documentos subidos por workspace.`);
  }
}
