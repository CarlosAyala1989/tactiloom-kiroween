import { readScenarioImage } from '@/lib/server/assets';
import { errorResponse, handler } from '@/lib/server/http';

export const GET = handler(async (_request, context: { params: Promise<{ id: string }> }, requestId) => {
  const { id } = await context.params;
  const found = /^[a-z0-9-]{1,64}$/.test(id) ? await readScenarioImage(id) : null;
  if (!found) return errorResponse(404, 'NOT_FOUND', 'Escenario no encontrado.', requestId);
  return new Response(new Uint8Array(found.bytes), {
    headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' },
  });
});
