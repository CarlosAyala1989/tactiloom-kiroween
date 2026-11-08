import 'server-only';
import path from 'node:path';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET debe tener al menos 16 caracteres'),
  PUBLIC_ORIGIN: z.string().url().default('http://localhost:3210'),
  VISION_URL: z.string().url().default('http://127.0.0.1:8210'),
  VISION_INTERNAL_TOKEN: z.string().optional(),
  WORKSPACE_ROOT: z.string().default('./.data/workspace'),
  ASSETS_DIR: z.string().optional(),
  TRUST_PROXY: z.enum(['0', '1']).default('0'),
  DEMO_SESSION_TTL_HOURS: z.coerce.number().positive().max(24 * 30).default(24),
  DEMO_MAX_ANALYSES_PER_HOUR: z.coerce.number().int().positive().default(60),
  DEMO_MAX_RUNS_PER_HOUR: z.coerce.number().int().positive().default(40),
  DEMO_MAX_UPLOADS: z.coerce.number().int().positive().default(20),
  DEMO_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().max(10 * 1024 * 1024).default(10 * 1024 * 1024),
  DEMO_MAX_CONCURRENT_RUNS: z.coerce.number().int().positive().default(2),
  DEMO_MAX_SESSIONS_PER_IP_HOUR: z.coerce.number().int().positive().default(30),
});

export type WebEnv = z.infer<typeof EnvSchema> & { repoRoot: string; assetsDir: string; workspaceRoot: string; allowedOrigins: string[] };

let cached: WebEnv | undefined;

/** Repository root: Next runs with cwd = apps/web in dev and /app in the container. */
function findRepoRoot(): string {
  const cwd = process.cwd();
  return path.basename(cwd) === 'web' && path.basename(path.dirname(cwd)) === 'apps' ? path.resolve(cwd, '..', '..') : cwd;
}

export function env(): WebEnv {
  if (cached) return cached;
  const parsed = EnvSchema.parse(process.env);
  const repoRoot = findRepoRoot();
  const origin = new URL(parsed.PUBLIC_ORIGIN).origin;
  const allowedOrigins = new Set([origin]);
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.add('http://localhost:3210');
    allowedOrigins.add('http://127.0.0.1:3210');
  }
  cached = {
    ...parsed,
    repoRoot,
    assetsDir: parsed.ASSETS_DIR ? path.resolve(parsed.ASSETS_DIR) : path.join(repoRoot, 'assets'),
    workspaceRoot: path.isAbsolute(parsed.WORKSPACE_ROOT) ? parsed.WORKSPACE_ROOT : path.join(repoRoot, parsed.WORKSPACE_ROOT),
    allowedOrigins: [...allowedOrigins],
  };
  return cached;
}
