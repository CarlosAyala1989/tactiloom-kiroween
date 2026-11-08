import { audit } from '@/lib/server/audit';
import { handler, HttpError } from '@/lib/server/http';
import { prisma } from '@/lib/server/prisma';
import { getSandbox } from '@/lib/server/sandbox';
import { requireSession } from '@/lib/server/session';
import { sha256Hex } from '@tactiloom/workflow-engine/sandbox';

export const dynamic = 'force-dynamic';

/** Authorised download of a generated report (workspace-scoped; integrity re-checked). */
export const GET = handler(async (_request, context: { params: Promise<{ id: string }> }, requestId) => {
  const session = await requireSession();
  const { id } = await context.params;
  const artifact = await prisma().generatedArtifact.findFirst({ where: { id, workspaceId: session.workspaceId } });
  if (!artifact) throw new HttpError(404, 'NOT_FOUND', 'Reporte no encontrado en tu workspace.');
  const bytes = await (await getSandbox()).readFile(session.workspaceId, artifact.sandboxPath, 5 * 1024 * 1024);
  if (sha256Hex(bytes) !== artifact.sha256) throw new HttpError(409, 'FILE_CHANGED', 'El reporte no coincide con su checksum registrado.');
  await audit('ARTIFACT_DOWNLOADED', { workspaceId: session.workspaceId, actorId: session.userId, entityId: artifact.id, requestId });
  const ascii = artifact.safeName.replace(/[^A-Za-z0-9._-]/g, '_');
  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': artifact.type === 'REPORT_JSON' ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(artifact.safeName)}`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
      'x-tactiloom-sha256': artifact.sha256,
      'x-request-id': requestId,
    },
  });
});
