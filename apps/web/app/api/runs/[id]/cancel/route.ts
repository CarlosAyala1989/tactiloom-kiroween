import { assertSameOrigin, handler, ok } from '@/lib/server/http';
import { cancelRun } from '@/lib/server/runs';
import { requireSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export const POST = handler(async (request, context: { params: Promise<{ id: string }> }, requestId) => {
  assertSameOrigin(request);
  const session = await requireSession();
  const { id } = await context.params;
  return ok(await cancelRun(session, id, requestId), requestId, { status: 202 });
});
