import { handler, ok } from '@/lib/server/http';
import { getRunDetail } from '@/lib/server/runs';
import { requireSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_request, context: { params: Promise<{ id: string }> }, requestId) => {
  const session = await requireSession();
  const { id } = await context.params;
  return ok(await getRunDetail(session, id), requestId);
});
