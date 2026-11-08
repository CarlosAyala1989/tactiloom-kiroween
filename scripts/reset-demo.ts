/**
 * `pnpm db:reset-demo` — deletes every demo workspace (DB rows cascade) and its sandbox files.
 * Reference data (board template, card catalog) is kept. Requires DATABASE_URL.
 * Asks for an explicit `--yes` because it is destructive for demo data.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { createPrismaClient } from '@tactiloom/db';
import { FileSandbox } from '@tactiloom/workflow-engine/sandbox';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: path.join(root, '.env'), quiet: true });

if (!process.argv.includes('--yes')) {
  console.error('Esto borra TODOS los workspaces de demostración y sus archivos. Repite con: pnpm db:reset-demo --yes');
  process.exit(2);
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL no está configurada');
const workspaceRoot = process.env.WORKSPACE_ROOT ?? './.data/workspace';
const sandbox = await FileSandbox.open(path.isAbsolute(workspaceRoot) ? workspaceRoot : path.join(root, workspaceRoot));
const prisma = createPrismaClient(url);
const demos = await prisma.workspace.findMany({ where: { demoMode: true }, select: { id: true } });
for (const workspace of demos) await sandbox.removeWorkspace(workspace.id);
await prisma.user.deleteMany({ where: { role: 'DEMO' } });
await prisma.workspace.deleteMany({ where: { demoMode: true } });
await prisma.auditEvent.create({ data: { action: 'DEMO_RESET', metadataWithoutSecrets: { workspaces: demos.length } } });
console.log(`reset-demo: ${demos.length} workspaces de demostración eliminados`);
await prisma.$disconnect();
