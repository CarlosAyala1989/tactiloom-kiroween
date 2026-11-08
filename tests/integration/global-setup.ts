import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Creates the dedicated test database (never the dev database) and applies the migrations. */
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL no está definida (ver .env.example)');
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, '');
  if (!/^[a-z0-9_]+_test$/.test(database)) throw new Error('TEST_DATABASE_URL debe apuntar a una base *_test');
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${database}"`);
  await client.end();
  execFileSync(join(root, 'node_modules', '.bin', 'prisma'), ['migrate', 'deploy'], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
