import { assertSameOrigin, handler, HttpError, ok } from '@/lib/server/http';
import { prisma } from '@/lib/server/prisma';
import { requireSession } from '@/lib/server/session';
import { documentView, storeUpload } from '@/lib/server/uploads';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_request, _context: unknown, requestId) => {
  const session = await requireSession();
  const documents = await prisma().uploadedDocument.findMany({ where: { workspaceId: session.workspaceId }, orderBy: [{ isDemo: 'desc' }, { createdAt: 'asc' }] });
  return ok({ documents: documents.map(documentView) }, requestId);
});

export const POST = handler(async (request, _context: unknown, requestId) => {
  assertSameOrigin(request);
  const session = await requireSession();
  if (Number(request.headers.get('content-length') ?? '0') > 11 * 1024 * 1024) throw new HttpError(413, 'FILE_TOO_LARGE', 'El archivo supera 10 MB.');
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'BAD_REQUEST', 'Falta el campo de archivo «file».');
  return ok({ document: await storeUpload(session, file, requestId) }, requestId, { status: 201 });
});
