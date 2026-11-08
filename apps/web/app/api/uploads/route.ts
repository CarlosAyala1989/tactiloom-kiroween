import { assertSameOrigin, handler, HttpError, ok, parseFormLimited } from '@/lib/server/http';
import { prisma } from '@/lib/server/prisma';
import { requireSession } from '@/lib/server/session';
import { documentView, storeUpload } from '@/lib/server/uploads';

export const dynamic = 'force-dynamic';
const MAX_MULTIPART_BYTES = 10 * 1024 * 1024 + 64 * 1024;

export const GET = handler(async (_request, _context: unknown, requestId) => {
  const session = await requireSession();
  const documents = await prisma().uploadedDocument.findMany({ where: { workspaceId: session.workspaceId }, orderBy: [{ isDemo: 'desc' }, { createdAt: 'asc' }] });
  return ok({ documents: documents.map(documentView) }, requestId);
});

export const POST = handler(async (request, _context: unknown, requestId) => {
  assertSameOrigin(request);
  const session = await requireSession();
  const form = await parseFormLimited(request, MAX_MULTIPART_BYTES);
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'BAD_REQUEST', 'Falta el campo de archivo «file».');
  return ok({ document: await storeUpload(session, file, requestId) }, requestId, { status: 201 });
});
