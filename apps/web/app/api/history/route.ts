import { handler, ok } from '@/lib/server/http';
import { prisma } from '@/lib/server/prisma';
import { requireSession } from '@/lib/server/session';
import { documentView } from '@/lib/server/uploads';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_request, _context: unknown, requestId) => {
  const session = await requireSession();
  const db = prisma();
  const where = { workspaceId: session.workspaceId };
  const [captures, versions, runs, documents, artifacts, reviewTasks] = await Promise.all([
    db.boardCapture.findMany({
      where,
      orderBy: { capturedAt: 'desc' },
      take: 50,
      select: { id: true, sourceMode: true, cardsDetected: true, calibrated: true, diagnostics: true, detectorVersion: true, capturedAt: true },
    }),
    db.workflowVersion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, workflowId: true, versionNumber: true, valid: true, contentHash: true, sourceMode: true, createdAt: true, boardCaptureId: true },
    }),
    db.run.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, status: true, sourceMode: true, contentHash: true, errorCode: true, outcome: true, createdAt: true, endedAt: true, workflowVersionId: true },
    }),
    db.uploadedDocument.findMany({ where, orderBy: { createdAt: 'desc' } }),
    db.generatedArtifact.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, runId: true, type: true, safeName: true, size: true, sha256: true, createdAt: true } }),
    db.reviewTask.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, runId: true, label: true, missingFields: true, invalidFields: true, status: true, createdAt: true } }),
  ]);
  return ok(
    {
      workspace: { id: session.workspaceId, expiresAt: session.expiresAt },
      captures: captures.map((capture) => ({
        ...capture,
        errorCodes: (capture.diagnostics as { code: string; severity: string }[]).filter((d) => d.severity === 'error').map((d) => d.code),
        diagnostics: undefined,
      })),
      versions,
      runs,
      documents: documents.map(documentView),
      artifacts,
      reviewTasks,
    },
    requestId,
  );
});
