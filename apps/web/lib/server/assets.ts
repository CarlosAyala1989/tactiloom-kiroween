import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { KIT_FILE_NAME_PATTERN, KIT_INDEX_FILE, kitFilePath } from '@tactiloom/board-kit/manifest';
import { LocaleSchema, type Locale } from '@tactiloom/contracts';
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

/** Fictitious documents copied into every demo workspace (one valid + one invalid per language). */
export const DEMO_DOCUMENTS = [
  { file: 'valid-application.pdf', mime: 'application/pdf' },
  { file: 'invalid-application.pdf', mime: 'application/pdf' },
  { file: 'valid-application.txt', mime: 'text/plain' },
  { file: 'invalid-application.txt', mime: 'text/plain' },
  { file: 'scanned-application.pdf', mime: 'application/pdf' },
  { file: 'valid-application-en.pdf', mime: 'application/pdf' },
  { file: 'invalid-application-en.pdf', mime: 'application/pdf' },
  { file: 'valid-application-it.pdf', mime: 'application/pdf' },
  { file: 'invalid-application-it.pdf', mime: 'application/pdf' },
  { file: 'valid-application-fr.pdf', mime: 'application/pdf' },
  { file: 'invalid-application-fr.pdf', mime: 'application/pdf' },
] as const;

export function readDemoDocument(file: (typeof DEMO_DOCUMENTS)[number]['file']): Promise<Buffer> {
  return readFile(path.join(env().assetsDir, 'examples', 'documents', file));
}

/**
 * kit-index.json (written by `pnpm board:generate`): every file of every localized kit with its locale.
 * Validated on load: each path must be the one the board-kit derives from (locale, name), and names
 * cannot contain `..` or start with `/`.
 */
const KitIndexSchema = z.object({
  kitVersion: z.string(),
  defaultLocale: LocaleSchema,
  locales: z.array(z.object({ locale: LocaleSchema, directory: z.string(), manifest: z.string(), zipName: z.string() })),
  files: z.array(
    z
      .object({
        locale: LocaleSchema,
        name: z.string().regex(KIT_FILE_NAME_PATTERN),
        path: z.string(),
        description: z.string(),
        bytes: z.number().int().nonnegative(),
        sha256: z.string().regex(/^[0-9a-f]{64}$/),
      })
      .refine((file) => file.path === kitFilePath(file.locale, file.name), { message: 'path must equal kitFilePath(locale, name)' }),
  ),
});
type KitIndex = z.infer<typeof KitIndexSchema>;
export type KitIndexEntry = KitIndex['files'][number];

let kitIndexCache: Promise<KitIndex> | undefined;

export function kitIndex(): Promise<KitIndex> {
  kitIndexCache ??= readFile(path.join(env().assetsDir, 'board-kit', KIT_INDEX_FILE), 'utf8')
    .then((text) => KitIndexSchema.parse(JSON.parse(text)))
    .catch((error: unknown) => {
      kitIndexCache = undefined; // retry on the next request instead of caching the failure
      throw error;
    });
  return kitIndexCache;
}

/** Files of the kit in `locale`, in manifest order. */
export async function kitFiles(locale: Locale): Promise<KitIndexEntry[]> {
  return (await kitIndex()).files.filter((file) => file.locale === locale);
}

/** Download URL of a file of the kit in `locale` (also used for its ZIP). */
export function kitDownloadUrl(locale: Locale, name: string): string {
  return `/api/board/kit/download?locale=${locale}&file=${encodeURIComponent(name)}`;
}

/**
 * Only files listed in kit-index.json can be downloaded: `locale` and `name` are lookup keys, never
 * parts of a path; the path read from disk comes from the validated index entry.
 */
export async function readKitFile(locale: Locale, name: string): Promise<{ bytes: Buffer; entry: KitIndexEntry } | null> {
  const entry = (await kitFiles(locale)).find((file) => file.name === name);
  if (!entry) return null;
  return { bytes: await readFile(path.join(env().assetsDir, 'board-kit', entry.path)), entry };
}
