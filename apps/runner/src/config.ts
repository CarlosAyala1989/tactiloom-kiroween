import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/** Repository root (apps/runner/src → ../../..). Relative paths in env are resolved against it. */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const RunnerEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  WORKSPACE_ROOT: z.string().min(1).default('./.data/workspace'),
  RUNNER_POLL_INTERVAL_MS: z.coerce.number().int().min(50).max(60_000).default(500),
  RUNNER_LEASE_MS: z.coerce.number().int().min(2_000).max(600_000).default(30_000),
  RUNNER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  RUNNER_MAX_DURATION_MS: z.coerce.number().int().min(1_000).max(600_000).default(60_000),
  RUNNER_CLEANUP_INTERVAL_MS: z.coerce.number().int().min(10_000).default(300_000),
  RUNNER_ID: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/).optional(),
});

export type RunnerConfig = {
  readonly databaseUrl: string;
  readonly workspaceRoot: string;
  readonly pollIntervalMs: number;
  readonly leaseMs: number;
  readonly maxAttempts: number;
  readonly maxDurationMs: number;
  readonly cleanupIntervalMs: number;
  readonly runnerId: string;
};

export function loadRunnerConfig(env: NodeJS.ProcessEnv = process.env): RunnerConfig {
  const parsed = RunnerEnvSchema.parse(env);
  return {
    databaseUrl: parsed.DATABASE_URL,
    workspaceRoot: path.isAbsolute(parsed.WORKSPACE_ROOT) ? parsed.WORKSPACE_ROOT : path.join(REPO_ROOT, parsed.WORKSPACE_ROOT),
    pollIntervalMs: parsed.RUNNER_POLL_INTERVAL_MS,
    leaseMs: parsed.RUNNER_LEASE_MS,
    maxAttempts: parsed.RUNNER_MAX_ATTEMPTS,
    maxDurationMs: parsed.RUNNER_MAX_DURATION_MS,
    cleanupIntervalMs: parsed.RUNNER_CLEANUP_INTERVAL_MS,
    runnerId: parsed.RUNNER_ID ?? `runner-${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
  };
}
