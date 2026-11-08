import { CreateWorkflowVersionRequestSchema } from '@ritualos/contracts';
import { assertSameOrigin, handler, ok, parseJson } from '@/lib/server/http';
import { prisma } from '@/lib/server/prisma';
import { requireSession } from '@/lib/server/session';
import { createVersion } from '@/lib/server/workflows';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_request, _context: unknown, requestId) => {
  const session = await requireSession();
  const workflows = await prisma().workflow.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1, select: { id: true, versionNumber: true, valid: true, contentHash: true } } },
  });
  return ok({ workflows }, requestId);
});

/** Compiles on the server and stores an immutable WorkflowVersion (the client never sends IR). */
export const POST = handler(async (request, _context: unknown, requestId) => {
  assertSameOrigin(request);
  const session = await requireSession();
  const body = await parseJson(request, CreateWorkflowVersionRequestSchema);
  const source = 'captureId' in body ? { captureId: body.captureId } : { boardState: body.boardState };
  const created = await createVersion(session, source, body.params, { ...(body.workflowId ? { workflowId: body.workflowId } : {}), ...(body.name ? { name: body.name } : {}) }, requestId);
  return ok(created, requestId, { status: 201 });
});
