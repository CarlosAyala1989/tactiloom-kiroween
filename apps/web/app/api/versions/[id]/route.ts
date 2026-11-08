import { handler, ok } from '@/lib/server/http';
import { requireSession } from '@/lib/server/session';
import { getVersionDetail } from '@/lib/server/workflows';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_request, context: { params: Promise<{ id: string }> }, requestId) => {
  const session = await requireSession();
  const { id } = await context.params;
  return ok(await getVersionDetail(session, id), requestId);
});
