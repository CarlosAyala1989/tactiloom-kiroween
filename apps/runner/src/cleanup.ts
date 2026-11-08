import { log } from './log';
import type { RunnerContext } from './process';

/** TTL cleanup for the public demo: expired workspaces (DB rows + sandbox files) and sessions. */
export async function cleanupExpired(ctx: RunnerContext, now: Date = new Date()): Promise<{ workspaces: number; orphans: number }> {
  const { prisma, sandbox } = ctx;
  const expired = await prisma.workspace.findMany({ where: { expiresAt: { lt: now } }, select: { id: true }, take: 100 });
  for (const workspace of expired) {
    await sandbox.removeWorkspace(workspace.id);
    await prisma.workspace.delete({ where: { id: workspace.id } }).catch(() => undefined);
    await prisma.auditEvent.create({ data: { workspaceId: null, action: 'WORKSPACE_EXPIRED', entityId: workspace.id } });
  }
  await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.user.deleteMany({ where: { role: 'DEMO', workspaces: { none: {} } } });
  // Directories without a workspace row (e.g. crash between delete steps).
  const directories = await sandbox.listWorkspaces();
  const alive = new Set((await prisma.workspace.findMany({ where: { id: { in: directories } }, select: { id: true } })).map((w) => w.id));
  let orphans = 0;
  for (const directory of directories) {
    if (!alive.has(directory)) {
      await sandbox.removeWorkspace(directory);
      orphans += 1;
    }
  }
  if (expired.length > 0 || orphans > 0) log('info', 'cleanup.done', { workspaces: expired.length, orphans });
  return { workspaces: expired.length, orphans };
}
