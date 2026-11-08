import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { createPrismaClient } from '@tactiloom/db';
import { FileSandbox } from '@tactiloom/workflow-engine';
import { loadRunnerConfig, REPO_ROOT } from './config';
import { log } from './log';
import { RUNNER_VERSION, runLoop } from './worker';

// Local development: read the repository .env (containers receive real environment variables).
loadDotenv({ path: [path.join(process.cwd(), '.env'), path.join(REPO_ROOT, '.env')], quiet: true });

const config = loadRunnerConfig();
const prisma = createPrismaClient(config.databaseUrl);
const sandbox = await FileSandbox.open(config.workspaceRoot);

let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    log('info', 'runner.stopping', { signal });
    stopping = true;
  });
}

log('info', 'runner.started', { runnerId: config.runnerId, version: RUNNER_VERSION, leaseMs: config.leaseMs, maxDurationMs: config.maxDurationMs });
await runLoop({ prisma, sandbox, config }, () => stopping);
await prisma.$disconnect();
log('info', 'runner.stopped', { runnerId: config.runnerId });
