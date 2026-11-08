import { handler, HttpError, ok } from '@/lib/server/http';
import { prisma } from '@/lib/server/prisma';
import { requireSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_request, context: { params: Promise<{ id: string }> }, requestId) => {
  const session = await requireSession();
  const { id } = await context.params;
  const workflow = await prisma().workflow.findFirst({
    where: { id, workspaceId: session.workspaceId },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
        select: { id: true, versionNumber: true, valid: true, contentHash: true, sourceMode: true, compilerVersion: true, createdAt: true, boardCaptureId: true },
      },
    },
  });
  if (!workflow) throw new HttpError(404, 'NOT_FOUND', 'Flujo no encontrado en tu workspace.');
  return ok({ workflow }, requestId);
});
