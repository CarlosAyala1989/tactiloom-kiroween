import { PreviewRunRequestSchema } from '@ritualos/contracts';
import { assertSameOrigin, handler, ok, parseJson } from '@/lib/server/http';
import { requestPreview } from '@/lib/server/runs';
import { requireSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** Queues a dry-run (read-only) in the worker. Produces a plan to review; never writes artifacts. */
export const POST = handler(async (request, _context: unknown, requestId) => {
  assertSameOrigin(request);
  const session = await requireSession();
  const body = await parseJson(request, PreviewRunRequestSchema);
  return ok(await requestPreview(session, body.workflowVersionId, requestId), requestId, { status: 202 });
});
