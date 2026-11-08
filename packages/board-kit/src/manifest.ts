/**
 * Layout of the localized kits under assets/board-kit and their packaging (no PDF dependencies, so
 * the web server can import it):
 *
 *   assets/board-kit/                  Spanish kit (reference kit: the vision fixtures come from it)
 *   assets/board-kit/<en|it|fr>/       the same file names, texts in that language
 *   assets/board-kit/<dir>/kit-manifest.json   files of that kit (paths relative to its directory)
 *   assets/board-kit/kit-index.json    every file of every kit with its locale (the download whitelist)
 */
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@tactiloom/contracts';
import { zipSync } from 'fflate';

export const KIT_MANIFEST_FILE = 'kit-manifest.json';
export const KIT_INDEX_FILE = 'kit-index.json';
export const KIT_README_FILE = 'README.md';

/**
 * Names of kit files inside a kit (and inside its ZIP): letters, digits and dashes, optionally under
 * `cards/`, with a printable/derived extension. Never absolute, never `..`: the web server only reads
 * files whose index entry matches this pattern and whose path is `kitFilePath(locale, name)`.
 */
export const KIT_FILE_NAME_PATTERN = /^(?:cards\/)?[A-Za-z0-9][A-Za-z0-9-]*\.(?:pdf|svg|json|md)$/;

/** Directory of a kit relative to assets/board-kit ('.' for the Spanish reference kit at the root). */
export function kitDirectory(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '.' : locale;
}

/** Path of a kit file relative to assets/board-kit. */
export function kitFilePath(locale: Locale, name: string): string {
  const directory = kitDirectory(locale);
  return directory === '.' ? name : `${directory}/${name}`;
}

/** Download name of the ZIP of one kit (also the name of its top-level folder, without `.zip`). */
export function kitZipName(locale: Locale): string {
  return `tactiloom-board-kit-${locale}.zip`;
}

/** Per-kit manifest (`kit-manifest.json` in every kit directory); paths are relative to that directory. */
export interface KitManifest {
  readonly kitVersion: string;
  readonly dictionary: string;
  readonly boardTemplate: string;
  readonly catalogVersion: string;
  readonly files: readonly { readonly path: string; readonly description: string; readonly bytes: number; readonly sha256: string }[];
}

export interface KitIndexLocale {
  readonly locale: Locale;
  /** Kit directory relative to assets/board-kit ('.' = root). */
  readonly directory: string;
  /** Path of the kit manifest relative to assets/board-kit. */
  readonly manifest: string;
  readonly zipName: string;
}

export interface KitIndexFile {
  readonly locale: Locale;
  /** Path inside the kit and inside its ZIP; the same in every language. */
  readonly name: string;
  /** Path relative to assets/board-kit (`kitFilePath(locale, name)`). */
  readonly path: string;
  /** Description in the language of the kit. */
  readonly description: string;
  readonly bytes: number;
  readonly sha256: string;
}

/** `kit-index.json`: every file of every localized kit, with its locale. */
export interface KitIndex {
  readonly kitVersion: string;
  readonly dictionary: string;
  readonly boardTemplate: string;
  readonly catalogVersion: string;
  readonly defaultLocale: Locale;
  readonly locales: readonly KitIndexLocale[];
  readonly files: readonly KitIndexFile[];
}

export function kitIndexLocales(): KitIndexLocale[] {
  return LOCALES.map((locale) => ({
    locale,
    directory: kitDirectory(locale),
    manifest: kitFilePath(locale, KIT_MANIFEST_FILE),
    zipName: kitZipName(locale),
  }));
}

/**
 * DOS timestamps (ZIP) have no time zone and fflate fills them with local-time getters, so the date
 * is built from local components: every machine writes 2026-11-01 00:00, the same day as the PDF
 * metadata, and the archive is byte-for-byte reproducible.
 */
function zipTimestamp(): Date {
  return new Date(2026, 10, 1, 0, 0, 0);
}

/** Deterministic ZIP of one kit: each file under the folder `tactiloom-board-kit-<locale>/`, in the given order. */
export function zipKit(locale: Locale, files: readonly { readonly name: string; readonly bytes: Uint8Array }[]): Uint8Array {
  const folder = kitZipName(locale).replace(/\.zip$/, '');
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) {
    if (!KIT_FILE_NAME_PATTERN.test(file.name)) throw new RangeError(`Nombre de archivo del kit no válido: ${file.name}`);
    entries[`${folder}/${file.name}`] = file.bytes;
  }
  return zipSync(entries, { level: 6, mtime: zipTimestamp() });
}
