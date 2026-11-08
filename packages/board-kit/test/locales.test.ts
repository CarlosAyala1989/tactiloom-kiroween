import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRANCH_LABELS, CARD_PRINTED_TITLES, DEFAULT_LOCALE, getBoardTemplate, LOCALES, sha256HexBytes, type Locale } from '@tactiloom/contracts';
import { unzipSync } from 'fflate';
import { PDFDocument, PDFName } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  boardItems,
  buildKit,
  buildKitIndex,
  buildKitTree,
  cardItems,
  cardSheetPageItems,
  cardSvg,
  cardTitleMaxWidth,
  cardTitleSize,
  collectTexts,
  enabledCards,
  HEADER_PADDING_MM,
  ID_LABEL_SIZE_MM,
  KIT_FILE_NAME_PATTERN,
  KIT_INDEX_FILE,
  KIT_MANIFEST_FILE,
  KIT_README_FILE,
  kitFileBytes,
  kitFilePath,
  kitReadme,
  kitTexts,
  kitZipName,
  layoutCardSheets,
  renderBoardSvg,
  SMALL_SCALE,
  textWidthMm,
  tileOverlayItems,
  TITLE_ID_GAP_MM,
  TITLE_MIN_SIZE_MM,
  TITLE_SIZE_MM,
  unencodableCharacters,
  zipKit,
  type KitFile,
  type KitIndex,
  type KitManifest,
  type Primitive,
} from '../src/index';

const kitRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'assets', 'board-kit');
const template = getBoardTemplate();
const PDFS = ['board-v1-a3.pdf', 'board-v1-a4-tiles.pdf', 'board-v1-small-a4.pdf', 'cards-v1-a4.pdf', 'cards-v1-small-a4.pdf'] as const;

const kits = new Map<Locale, KitFile[]>();
beforeAll(async () => {
  for (const locale of LOCALES) kits.set(locale, await buildKit(locale));
});

function kit(locale: Locale): KitFile[] {
  const files = kits.get(locale);
  if (!files) throw new Error(`kit ${locale} not built`);
  return files;
}

function file(locale: Locale, name: string): KitFile {
  const found = kit(locale).find((candidate) => candidate.path === name);
  if (!found) throw new Error(`${name} missing in kit ${locale}`);
  return found;
}

function committed(path: string): Buffer {
  return readFileSync(join(kitRoot, path));
}

type TextItem = Extract<Primitive, { type: 'text' }>;

function texts(items: readonly Primitive[]): TextItem[] {
  return items.filter((item): item is TextItem => item.type === 'text');
}

/** Horizontal extent of a text item with the real metrics (mm, in the frame of its display list). */
function extent(item: TextItem): { left: number; right: number } {
  const width = textWidthMm(item.text, item.size, item.weight);
  const left = item.anchor === 'start' ? item.x : item.anchor === 'middle' ? item.x - width / 2 : item.x - width;
  return { left, right: left + width };
}

/** Every display list painted into the PDFs of one language. */
function printedItems(locale: Locale): Primitive[] {
  const entries = enabledCards();
  const items: Primitive[] = [...boardItems('full', locale), ...boardItems('small', locale)];
  for (const scale of [1, SMALL_SCALE]) {
    const layout = layoutCardSheets(entries, scale);
    for (let page = 0; page < layout.pages; page += 1) items.push(...cardSheetPageItems(layout, page, entries, locale));
  }
  for (let tile = 0; tile < 4; tile += 1) items.push(...tileOverlayItems(tile, locale));
  return items;
}

describe.each(LOCALES)('kit %s', (locale) => {
  it('fits every card title in its header with the real Helvetica-Bold metrics', () => {
    for (const entry of enabledCards()) {
      const printed = CARD_PRINTED_TITLES[locale][entry.kind];
      const title = texts(cardItems(entry, locale)).find((item) => item.text === printed);
      expect(title, `${entry.kind} #${entry.markerId}`).toBeDefined();
      if (!title) continue;
      expect(title.size).toBeGreaterThanOrEqual(TITLE_MIN_SIZE_MM);
      expect(title.size).toBeLessThanOrEqual(TITLE_SIZE_MM);
      if (locale === DEFAULT_LOCALE) expect(title.size, printed).toBe(TITLE_SIZE_MM);
      const idLabelLeft = template.card.width - HEADER_PADDING_MM - textWidthMm(`#${entry.markerId}`, ID_LABEL_SIZE_MM, 'bold');
      expect(extent(title).right, printed).toBeLessThanOrEqual(idLabelLeft - TITLE_ID_GAP_MM + 1e-9);
    }
  });

  it('prints the localized branch labels on CONDITION cards and keeps every card text inside the card', () => {
    for (const entry of enabledCards()) {
      const items = texts(cardItems(entry, locale));
      if (entry.kind === 'CONDITION') {
        expect(items.map((item) => item.text)).toEqual(expect.arrayContaining([BRANCH_LABELS[locale].TRUE, BRANCH_LABELS[locale].FALSE]));
      }
      for (const item of items) {
        const { left, right } = extent(item);
        expect(left, item.text).toBeGreaterThanOrEqual(0.8);
        expect(right, item.text).toBeLessThanOrEqual(template.card.width - 0.8);
      }
    }
  });

  it('keeps the board, sheet and tile texts inside their pages', () => {
    const entries = enabledCards();
    const pages: [readonly Primitive[], number][] = [
      [boardItems('full', locale), template.page.width],
      [boardItems('small', locale), template.page.width],
      [cardSheetPageItems(layoutCardSheets(entries, 1), 0, entries, locale), 210],
      [cardSheetPageItems(layoutCardSheets(entries, SMALL_SCALE), 0, entries, locale), 210],
      ...[0, 1, 2, 3].map((tile): [readonly Primitive[], number] => [tileOverlayItems(tile, locale), 297]),
    ];
    for (const [items, width] of pages) {
      for (const item of texts(items)) {
        const { left, right } = extent(item);
        expect(left, item.text).toBeGreaterThanOrEqual(5);
        expect(right, item.text).toBeLessThanOrEqual(width - 5);
      }
    }
  });

  it('prints only WinAnsi-encodable characters (standard PDF fonts)', () => {
    const printed = collectTexts(printedItems(locale));
    expect(printed.length).toBeGreaterThan(100);
    for (const text of printed) {
      expect(unencodableCharacters(text), text).toEqual([]);
      expect(text, 'unfilled placeholder').not.toMatch(/undefined|NaN|\[object/);
    }
  });

  it('labels rows with the localized prefix', () => {
    const prefix = { es: 'F', en: 'R', it: 'R', fr: 'L' }[locale];
    expect(kitTexts(locale).board.rowPrefix).toBe(prefix);
    const labels = texts(boardItems('full', locale)).map((item) => item.text);
    expect(labels).toEqual(expect.arrayContaining([0, 1, 2, 3].map((row) => `${prefix}${row}`)));
  });

  it('is byte-for-byte deterministic', async () => {
    const again = await buildKit(locale);
    expect(again.map((entry) => entry.path)).toEqual(kit(locale).map((entry) => entry.path));
    again.forEach((entry, index) => {
      expect(Buffer.from(kitFileBytes(entry)).equals(Buffer.from(kitFileBytes(kit(locale)[index]!))), entry.path).toBe(true);
    });
  });

  it('equals the committed files in its folder of assets/board-kit (run `pnpm board:generate` after changes)', () => {
    for (const entry of kit(locale)) {
      const path = kitFilePath(locale, entry.path);
      expect(committed(path).equals(Buffer.from(kitFileBytes(entry))), path).toBe(true);
    }
  });

  it('renders the same card SVG in the browser API (cardSvg) as in the kit', () => {
    for (const entry of enabledCards()) {
      expect(cardSvg(entry, locale), `#${entry.markerId}`).toBe(file(locale, `cards/card-${entry.markerId}.svg`).contents);
    }
  });

  it('writes the localized PDF metadata (title, subject, keywords, language)', async () => {
    const { pdf } = kitTexts(locale);
    const expected: Record<(typeof PDFS)[number], { title: string; subject: string }> = {
      'board-v1-a3.pdf': pdf.boardFull,
      'board-v1-a4-tiles.pdf': pdf.tiles,
      'board-v1-small-a4.pdf': pdf.boardSmall,
      'cards-v1-a4.pdf': pdf.cards,
      'cards-v1-small-a4.pdf': pdf.cardsSmall,
    };
    for (const name of PDFS) {
      const doc = await PDFDocument.load(kitFileBytes(file(locale, name)), { updateMetadata: false });
      expect(doc.getTitle(), name).toBe(expected[name].title);
      expect(doc.getSubject(), name).toBe(expected[name].subject);
      expect(doc.getKeywords(), name).toBe(pdf.keywords.join(' '));
      // The Spanish reference kit keeps its published bytes, which have no /Lang (see pdfLanguage in kit.ts).
      const language = doc.catalog.get(PDFName.of('Lang'));
      expect(language === undefined ? undefined : String(language), name).toBe(locale === DEFAULT_LOCALE ? undefined : `(${locale})`);
    }
  });

  it('writes the manual in its language', () => {
    const manual = String(file(locale, 'ASSEMBLY.md').contents);
    const heading = { es: 'Manual de impresión y montaje', en: 'Printing and assembly manual', it: 'Manuale di stampa e montaggio', fr: 'Manuel d’impression et d’assemblage' }[locale];
    expect(manual.split('\n')[0]).toContain(heading);
    for (const title of Object.values(CARD_PRINTED_TITLES[locale])) expect(manual, title).toContain(`| ${title} |`);
  });

  it('lists every file of the kit in its kit-manifest.json with matching hashes', () => {
    const files = kit(locale);
    const manifest = JSON.parse(String(file(locale, KIT_MANIFEST_FILE).contents)) as KitManifest;
    expect(files.at(-1)?.path).toBe(KIT_MANIFEST_FILE);
    expect(manifest.files.map((entry) => entry.path)).toEqual(files.slice(0, -1).map((entry) => entry.path));
    for (const entry of manifest.files) {
      const bytes = committed(kitFilePath(locale, entry.path));
      expect(bytes.byteLength, entry.path).toBe(entry.bytes);
      expect(sha256HexBytes(bytes), entry.path).toBe(entry.sha256);
      expect(entry.description, entry.path).toBe(file(locale, entry.path).description);
    }
  });

  it('records each of its files with its locale in kit-index.json', () => {
    const index = JSON.parse(committed(KIT_INDEX_FILE).toString('utf8')) as KitIndex;
    const own = index.files.filter((entry) => entry.locale === locale);
    expect(own.map((entry) => entry.name)).toEqual(kit(locale).map((entry) => entry.path));
    for (const entry of own) {
      expect(entry.name).toMatch(KIT_FILE_NAME_PATTERN);
      expect(entry.path).toBe(kitFilePath(locale, entry.name));
      if (locale !== DEFAULT_LOCALE) expect(entry.path.startsWith(`${locale}/`)).toBe(true);
      const bytes = committed(entry.path);
      expect(bytes.byteLength, entry.path).toBe(entry.bytes);
      expect(sha256HexBytes(bytes), entry.path).toBe(entry.sha256);
    }
    expect(index.locales.find((entry) => entry.locale === locale)).toEqual({
      locale,
      directory: locale === DEFAULT_LOCALE ? '.' : locale,
      manifest: kitFilePath(locale, KIT_MANIFEST_FILE),
      zipName: kitZipName(locale),
    });
  });

  it(`packs exactly its own files into ${kitZipName(locale)}`, () => {
    const files = kit(locale).map((entry) => ({ name: entry.path, bytes: kitFileBytes(entry) }));
    const zip = zipKit(locale, files);
    expect(Buffer.from(zipKit(locale, files)).equals(Buffer.from(zip))).toBe(true);
    const unzipped = unzipSync(zip);
    const folder = `tactiloom-board-kit-${locale}/`;
    expect(Object.keys(unzipped)).toEqual(files.map((entry) => `${folder}${entry.name}`));
    for (const entry of files) {
      expect(Buffer.from(unzipped[`${folder}${entry.name}`]!).equals(Buffer.from(entry.bytes)), entry.name).toBe(true);
    }
    expect(new TextDecoder().decode(unzipped[`${folder}ASSEMBLY.md`])).toBe(file(locale, 'ASSEMBLY.md').contents);
  });
});

describe('localized kits together', () => {
  it('shrink a title that would not fit at the preferred size, on the real card geometry', () => {
    const longTitle = 'ENREGISTRER LE RAPPORT';
    const size = cardTitleSize(longTitle, 18);
    expect(size).toBeLessThan(TITLE_SIZE_MM);
    expect(size).toBeGreaterThanOrEqual(TITLE_MIN_SIZE_MM);
    expect(textWidthMm(longTitle, size, 'bold')).toBeLessThanOrEqual(cardTitleMaxWidth(18));
    expect(() => cardTitleSize('ENREGISTRER LE RAPPORT DE VALIDATION', 18)).toThrow(RangeError);
  });

  it('use the same file names and layout in every language, and differ only where texts are printed', () => {
    const names = kit(DEFAULT_LOCALE).map((entry) => entry.path);
    for (const locale of LOCALES) {
      expect(kit(locale).map((entry) => entry.path), locale).toEqual(names);
      for (const neutral of ['board-v1.json', 'cards-v1.json', 'cards-v1-layout.json', 'cards-v1-small-layout.json']) {
        expect(file(locale, neutral).contents, `${locale}/${neutral}`).toBe(file(DEFAULT_LOCALE, neutral).contents);
      }
      if (locale !== DEFAULT_LOCALE) expect(file(locale, 'board-v1-a3.svg').contents).not.toBe(file(DEFAULT_LOCALE, 'board-v1-a3.svg').contents);
    }
  });

  it('keep the default card SVG (no locale argument) Spanish', () => {
    const [entry] = enabledCards();
    expect(entry).toBeDefined();
    if (entry) expect(cardSvg(entry)).toBe(cardSvg(entry, DEFAULT_LOCALE));
    expect(renderBoardSvg()).toBe(file(DEFAULT_LOCALE, 'board-v1-a3.svg').contents);
  });

  it('have an index and a README equal to the committed ones', () => {
    const index = `${JSON.stringify(buildKitIndex(LOCALES.map((locale) => ({ locale, files: kit(locale) }))), null, 2)}\n`;
    expect(committed(KIT_INDEX_FILE).toString('utf8')).toBe(index);
    expect(committed(KIT_README_FILE).toString('utf8')).toBe(kitReadme());
    const parsed = JSON.parse(index) as KitIndex;
    expect(parsed.defaultLocale).toBe(DEFAULT_LOCALE);
    expect(parsed.locales.map((entry) => entry.locale)).toEqual([...LOCALES]);
    expect(new Set(parsed.files.map((entry) => entry.path)).size).toBe(parsed.files.length);
  });

  it('are what `pnpm board:generate` writes (Spanish at the root, en/it/fr in folders, index and README)', async () => {
    const tree = await buildKitTree();
    const paths = tree.map((entry) => entry.path);
    expect(paths).toContain('board-v1-a3.pdf');
    expect(paths).toContain('fr/cards/card-35.svg');
    expect(paths.slice(-2)).toEqual([KIT_INDEX_FILE, KIT_README_FILE]);
    for (const entry of tree) expect(committed(entry.path).equals(Buffer.from(kitFileBytes(entry))), entry.path).toBe(true);
  });

  it('refuse to pack a file name that could escape the kit folder', () => {
    for (const name of ['../secret.pdf', '/etc/passwd.json', 'cards/../../x.svg', 'en/board-v1-a3.pdf', 'board.exe']) {
      expect(KIT_FILE_NAME_PATTERN.test(name), name).toBe(false);
      expect(() => zipKit('es', [{ name, bytes: new Uint8Array() }]), name).toThrow(RangeError);
    }
  });
});
