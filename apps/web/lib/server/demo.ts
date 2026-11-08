import 'server-only';
import { sha256Hex } from '@ritualos/workflow-engine/sandbox';
import { DEMO_DOCUMENTS, readDemoDocument } from './assets';
import { audit } from './audit';
import { env } from './env';
import { prisma } from './prisma';
import { getSandbox } from './sandbox';
import { hashToken, newToken } from './session';

/**
 * Creates an isolated demo workspace with TTL, a DEMO user, a session token and copies of the
 * fictitious demo documents. The DB row is committed before any file is written.
 */
export async function createDemoSession(requestId: string): Promise<{ token: string; expiresAt: Date; workspaceId: string }> {
  const ttlMs = env().DEMO_SESSION_TTL_HOURS * 3_600_000;
  const expiresAt = new Date(Date.now() + ttlMs);
  const token = newToken();
  const db = prisma();
  const { workspace, user } = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { role: 'DEMO' } });
    const workspace = await tx.workspace.create({ data: { ownerId: user.id, name: 'Workspace de demostración', demoMode: true, expiresAt } });
    await tx.session.create({ data: { tokenHash: hashToken(token), userId: user.id, workspaceId: workspace.id, expiresAt } });
    return { workspace, user };
  });
  const sandbox = await getSandbox();
  for (const demo of DEMO_DOCUMENTS) {
    const bytes = await readDemoDocument(demo.file);
    const doc = await db.uploadedDocument.create({
      data: {
        workspaceId: workspace.id,
        originalName: demo.file,
        mime: demo.mime,
        bytes: bytes.byteLength,
        sha256: sha256Hex(bytes),
        sandboxPath: 'pending',
        isDemo: true,
      },
    });
    const relative = `uploads/${doc.id}.${demo.mime === 'application/pdf' ? 'pdf' : 'txt'}`;
    await sandbox.writeFileIdempotent(workspace.id, relative, bytes, env().DEMO_MAX_UPLOAD_BYTES);
    await db.uploadedDocument.update({ where: { id: doc.id }, data: { sandboxPath: relative } });
  }
  await audit('SESSION_CREATED', { workspaceId: workspace.id, actorId: user.id, requestId, metadata: { ttlHours: env().DEMO_SESSION_TTL_HOURS } });
  return { token, expiresAt, workspaceId: workspace.id };
}
