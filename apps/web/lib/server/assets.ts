import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { env } from './env';

const ScenarioSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,64}$/),
  file: z.string(),
  titleEs: z.string(),
  descriptionEs: z.string(),
  provenance: z.string(),
  vision: z.object({ calibrated: z.boolean(), cards: z.array(z.unknown()), errorCodes: z.array(z.string()) }),
  compile: z.object({ valid: z.boolean(), errorCodes: z.array(z.string()) }),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

let scenarios: Promise<Scenario[]> | undefined;

export function listScenarios(): Promise<Scenario[]> {
  scenarios ??= readFile(path.join(env().assetsDir, 'examples', 'boards', 'scenarios.json'), 'utf8').then(
    (text) => z.object({ scenarios: z.array(ScenarioSchema) }).parse(JSON.parse(text)).scenarios,
  );
  return scenarios;
}

/** Reads a gallery image by scenario id (whitelisted from scenarios.json, never a client path). */
export async function readScenarioImage(id: string): Promise<{ bytes: Buffer; scenario: Scenario } | null> {
  const scenario = (await listScenarios()).find((candidate) => candidate.id === id);
  if (!scenario) return null;
  const file = path.join(env().assetsDir, 'examples', 'boards', path.basename(scenario.file));
  return { bytes: await readFile(file), scenario };
}

export const DEMO_DOCUMENTS = [
  { file: 'valid-application.pdf', mime: 'application/pdf' },
  { file: 'invalid-application.pdf', mime: 'application/pdf' },
  { file: 'valid-application.txt', mime: 'text/plain' },
  { file: 'invalid-application.txt', mime: 'text/plain' },
  { file: 'scanned-application.pdf', mime: 'application/pdf' },
] as const;

export function readDemoDocument(file: (typeof DEMO_DOCUMENTS)[number]['file']): Promise<Buffer> {
  return readFile(path.join(env().assetsDir, 'examples', 'documents', file));
}

interface KitManifest {
  kitVersion: string;
  files: { path: string; description: string; bytes: number; sha256: string }[];
}

let manifest: Promise<KitManifest> | undefined;

export function kitManifest(): Promise<KitManifest> {
  manifest ??= readFile(path.join(env().assetsDir, 'board-kit', 'kit-manifest.json'), 'utf8').then((text) => JSON.parse(text) as KitManifest);
  return manifest;
}

/** Only files listed in the manifest can be downloaded (no path input reaches the filesystem). */
export async function readKitFile(name: string): Promise<{ bytes: Buffer; entry: KitManifest['files'][number] } | null> {
  const entry = (await kitManifest()).files.find((file) => file.path === name);
  if (!entry) return null;
  return { bytes: await readFile(path.join(env().assetsDir, 'board-kit', entry.path)), entry };
}
