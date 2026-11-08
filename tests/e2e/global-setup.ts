import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request, type FullConfig } from '@playwright/test';

export const STORAGE_STATE = join(dirname(fileURLToPath(import.meta.url)), '.artifacts', 'session.json');

/** One demo session (workspace) per suite run, shared by every test through storageState. */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3210';
  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  const context = await request.newContext({ baseURL, extraHTTPHeaders: { origin: new URL(baseURL).origin } });
  const response = await context.post('/api/demo/session');
  if (!response.ok()) throw new Error(`No se pudo crear la sesión demo para E2E: ${response.status()} ${await response.text()}`);
  await context.storageState({ path: STORAGE_STATE });
  await context.dispose();
}
