import { ApproveRunRequestSchema } from '@tactiloom/contracts';
import { assertSameOrigin, handler, ok, parseJson } from '@/lib/server/http';
import { prisma } from '@/lib/server/prisma';
import { approveRun } from '@/lib/server/runs';
import { requireSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_request, _context: unknown, requestId) => {
  const session = await requireSession();
  const runs = await prisma().run.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, status: true, sourceMode: true, contentHash: true, planHash: true, errorCode: true, outcome: true, createdAt: true, endedAt: true, workflowVersionId: true },
  });
  return ok({ runs }, requestId);
});

/** Explicit approval: `confirm: true` + echoed contentHash and planHash. The only way to enqueue an execution. */
export const POST = handler(async (request, _context: unknown, requestId) => {
  assertSameOrigin(request);
  const session = await requireSession();
  const body = await parseJson(request, ApproveRunRequestSchema);
  return ok(await approveRun(session, body, requestId), requestId, { status: 202 });
});
