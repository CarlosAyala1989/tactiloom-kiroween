import { CompileRequestSchema } from '@ritualos/contracts';
import { assertSameOrigin, handler, ok, parseJson } from '@/lib/server/http';
import { requireSession } from '@/lib/server/session';
import { compileBoard } from '@/lib/server/workflows';

export const dynamic = 'force-dynamic';

/** Stateless compilation (BoardState + params → IR + diagnostics). Never enqueues anything. */
export const POST = handler(async (request, _context: unknown, requestId) => {
  assertSameOrigin(request);
  const session = await requireSession();
  const body = await parseJson(request, CompileRequestSchema);
  const source = 'captureId' in body ? { captureId: body.captureId } : { boardState: body.boardState };
  return ok(await compileBoard(session, source, body.params), requestId);
});
