import {
  CARD_KINDS,
  CARD_KIND_SPECS,
  DEFAULT_LOCALE,
  getBoardTemplate,
  getCardCatalog,
  LOCALES,
  sha256HexBytes,
  type CardCatalogEntry,
  type Locale,
} from '@tactiloom/contracts';
import { PDFDocument } from 'pdf-lib';
import { ARUCO_DICTIONARY } from './aruco';
import { boardItems, boardTileGeometry, cardItems, cardSheetPageItems, layoutCardSheets, tileOverlayItems, type CardSheetLayout } from './designs';
import type { Drawing } from './display-list';
import { iconSvg } from './icons';
import { assemblyManual } from './manual';
import { KIT_INDEX_FILE, KIT_MANIFEST_FILE, KIT_README_FILE, kitFilePath, kitIndexLocales, type KitIndex, type KitManifest } from './manifest';
import { createKitDocument, MM_TO_PT, paintOnPage, paintPage, renderSinglePagePdf, type PdfMetadata } from './pdf';
import { kitReadme } from './readme';
import { renderSvg } from './svg';
import { kitTexts, type PdfTexts } from './texts';

export const SMALL_SCALE = Math.SQRT1_2; // A3 → A4
export const KIT_VERSION = 'board-kit/1.0.0';

/**
 * PDF language tag (/Lang). The Spanish kit at the root of assets/board-kit is the reference kit: the
 * synthetic vision fixtures are rendered from its exact bytes, and it was published without /Lang.
 * Writing it would change those bytes, so only the other languages declare it; add Spanish the next
 * time the fixtures are regenerated (`pnpm examples:generate`).
 */
function pdfLanguage(locale: Locale): string | undefined {
  return locale === DEFAULT_LOCALE ? undefined : locale;
}

function pdfMetadata(locale: Locale, texts: PdfTexts): PdfMetadata {
  return { ...texts, keywords: kitTexts(locale).pdf.keywords, language: pdfLanguage(locale) };
}

export function boardDrawing(variant: 'full' | 'small' = 'full', locale: Locale = DEFAULT_LOCALE): Drawing {
  const { page } = getBoardTemplate();
  return { width: page.width, height: page.height, items: boardItems(variant, locale) };
}

export function cardDrawing(entry: CardCatalogEntry, locale: Locale = DEFAULT_LOCALE): Drawing {
  const { card } = getBoardTemplate();
  return { width: card.width, height: card.height, items: cardItems(entry, locale) };
}

export function renderCardSvg(entry: CardCatalogEntry, locale: Locale = DEFAULT_LOCALE): string {
  return renderSvg(cardDrawing(entry, locale), `Tactiloom ${entry.kind} #${entry.markerId}`);
}

export function renderBoardSvg(locale: Locale = DEFAULT_LOCALE): string {
  return renderSvg(boardDrawing('full', locale), 'Tactiloom Board v1 (A3)');
}

export function enabledCards(): CardCatalogEntry[] {
  return getCardCatalog().cards.filter((card) => card.enabled);
}

export async function renderBoardPdf(variant: 'full' | 'small', locale: Locale = DEFAULT_LOCALE): Promise<Uint8Array> {
  const { pdf } = kitTexts(locale);
  if (variant === 'full') {
    return renderSinglePagePdf(boardDrawing('full', locale), pdfMetadata(locale, pdf.boardFull));
  }
  const { doc, fonts } = await createKitDocument(pdfMetadata(locale, pdf.boardSmall));
  const a4 = { width: 297, height: 210 };
  const drawing = boardDrawing('small', locale);
  paintPage(doc, fonts, a4.width, a4.height, drawing, { ox: 0, oy: 0, scale: SMALL_SCALE });
  return doc.save({ useObjectStreams: false });
}

/** 2×2 A4 landscape tiles at 1:1 scale with crop marks (assemble edge to edge). */
export async function renderBoardTilesPdf(locale: Locale = DEFAULT_LOCALE): Promise<Uint8Array> {
  const template = getBoardTemplate();
  const fullBytes = await renderBoardPdf('full', locale);
  const source = await PDFDocument.load(fullBytes, { updateMetadata: false });
  const { doc, fonts } = await createKitDocument(pdfMetadata(locale, kitTexts(locale).pdf.tiles));
  const { pageWidth: pageW, pageHeight: pageH, quadWidth: quadW, quadHeight: quadH, offsetX, offsetY } = boardTileGeometry(template);
  for (let index = 0; index < 4; index += 1) {
    const qx = (index % 2) * quadW;
    const qy = Math.floor(index / 2) * quadH;
    // PDF bounding box of the quadrant (points, origin bottom-left of the A3 page).
    const embedded = await doc.embedPage(source.getPage(0), {
      left: qx * MM_TO_PT,
      right: (qx + quadW) * MM_TO_PT,
      bottom: (template.page.height - qy - quadH) * MM_TO_PT,
      top: (template.page.height - qy) * MM_TO_PT,
    });
    const page = doc.addPage([pageW * MM_TO_PT, pageH * MM_TO_PT]);
    page.drawPage(embedded, { x: offsetX * MM_TO_PT, y: (pageH - offsetY - quadH) * MM_TO_PT });
    paintOnPage(page, pageH, fonts, tileOverlayItems(index, locale, template));
  }
  return doc.save({ useObjectStreams: false });
}

export async function renderCardsPdf(scale: number, locale: Locale = DEFAULT_LOCALE): Promise<{ bytes: Uint8Array; layout: CardSheetLayout }> {
  const entries = enabledCards();
  const layout = layoutCardSheets(entries, scale);
  const { pdf } = kitTexts(locale);
  const { doc, fonts } = await createKitDocument(pdfMetadata(locale, scale < 1 ? pdf.cardsSmall : pdf.cards));
  for (let page = 0; page < layout.pages; page += 1) {
    paintPage(doc, fonts, layout.pageWidth, layout.pageHeight, {
      width: layout.pageWidth,
      height: layout.pageHeight,
      items: cardSheetPageItems(layout, page, entries, locale),
    });
  }
  return { bytes: await doc.save({ useObjectStreams: false }), layout };
}

export interface KitFile {
  readonly path: string;
  readonly contents: Uint8Array | string;
  readonly description: string;
}

/** Contents of a kit file as bytes (text files are UTF-8). */
export function kitFileBytes(file: Pick<KitFile, 'contents'>): Uint8Array {
  return typeof file.contents === 'string' ? new TextEncoder().encode(file.contents) : file.contents;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Every printable/derived file of the kit in one language (pure, deterministic). Paths are relative
 * to the kit directory and identical in every language; the last file is its kit-manifest.json.
 */
export async function buildKit(locale: Locale = DEFAULT_LOCALE): Promise<KitFile[]> {
  const entries = enabledCards();
  const template = getBoardTemplate();
  const texts = kitTexts(locale);
  const described = texts.files;
  const files: KitFile[] = [];
  files.push({ path: 'board-v1-a3.pdf', contents: await renderBoardPdf('full', locale), description: described.boardPdf });
  files.push({ path: 'board-v1-a3.svg', contents: renderBoardSvg(locale), description: described.boardSvg });
  files.push({ path: 'board-v1-a4-tiles.pdf', contents: await renderBoardTilesPdf(locale), description: described.tilesPdf });
  files.push({ path: 'board-v1-small-a4.pdf', contents: await renderBoardPdf('small', locale), description: described.smallBoardPdf });
  const full = await renderCardsPdf(1, locale);
  files.push({ path: 'cards-v1-a4.pdf', contents: full.bytes, description: described.cardsPdf(entries.length) });
  files.push({ path: 'cards-v1-layout.json', contents: json(full.layout), description: described.cardsLayout });
  const small = await renderCardsPdf(SMALL_SCALE, locale);
  files.push({ path: 'cards-v1-small-a4.pdf', contents: small.bytes, description: described.smallCardsPdf });
  files.push({ path: 'cards-v1-small-layout.json', contents: json(small.layout), description: described.smallCardsLayout });
  for (let page = 0; page < full.layout.pages; page += 1) {
    files.push({
      path: `cards-v1-sheet-${page + 1}.svg`,
      contents: renderSvg(
        { width: full.layout.pageWidth, height: full.layout.pageHeight, items: cardSheetPageItems(full.layout, page, entries, locale) },
        texts.sheet.svgTitle(page + 1),
      ),
      description: described.sheetSvg(page + 1),
    });
  }
  for (const entry of entries) {
    files.push({ path: `cards/card-${entry.markerId}.svg`, contents: renderCardSvg(entry, locale), description: `${entry.kind} #${entry.markerId}` });
  }
  files.push({ path: 'board-v1.json', contents: json(template), description: described.boardJson });
  files.push({ path: 'cards-v1.json', contents: json(getCardCatalog()), description: described.catalogJson });
  files.push({ path: 'ASSEMBLY.md', contents: assemblyManual(entries, locale), description: described.manual });
  const manifest: KitManifest = {
    kitVersion: KIT_VERSION,
    dictionary: ARUCO_DICTIONARY,
    boardTemplate: template.templateId,
    catalogVersion: getCardCatalog().catalogVersion,
    files: files.map((file) => {
      const bytes = kitFileBytes(file);
      return { path: file.path, description: file.description, bytes: bytes.byteLength, sha256: sha256HexBytes(bytes) };
    }),
  };
  files.push({ path: KIT_MANIFEST_FILE, contents: json(manifest), description: described.manifest });
  return files;
}

/** The kits of every language, in LOCALES order. */
export async function buildKits(): Promise<{ readonly locale: Locale; readonly files: KitFile[] }[]> {
  const kits = [];
  for (const locale of LOCALES) kits.push({ locale, files: await buildKit(locale) });
  return kits;
}

/** kit-index.json: every file of every kit with its locale (the web download whitelist). */
export function buildKitIndex(kits: readonly { readonly locale: Locale; readonly files: readonly KitFile[] }[]): KitIndex {
  return {
    kitVersion: KIT_VERSION,
    dictionary: ARUCO_DICTIONARY,
    boardTemplate: getBoardTemplate().templateId,
    catalogVersion: getCardCatalog().catalogVersion,
    defaultLocale: DEFAULT_LOCALE,
    locales: kitIndexLocales(),
    files: kits.flatMap(({ locale, files }) =>
      files.map((file) => {
        const bytes = kitFileBytes(file);
        return {
          locale,
          name: file.path,
          path: kitFilePath(locale, file.path),
          description: file.description,
          bytes: bytes.byteLength,
          sha256: sha256HexBytes(bytes),
        };
      }),
    ),
  };
}

/**
 * Everything `pnpm board:generate` writes to assets/board-kit, with paths relative to it: the Spanish
 * kit at the root, the en/it/fr kits in their folders, kit-index.json and README.md.
 */
export async function buildKitTree(): Promise<KitFile[]> {
  const kits = await buildKits();
  return [
    ...kits.flatMap(({ locale, files }) => files.map((file) => ({ ...file, path: kitFilePath(locale, file.path) }))),
    { path: KIT_INDEX_FILE, contents: json(buildKitIndex(kits)), description: 'Index of the localized kits' },
    { path: KIT_README_FILE, contents: kitReadme(), description: 'Layout of the localized kits' },
  ];
}

export function iconFiles(): KitFile[] {
  return CARD_KINDS.map((kind) => ({
    path: `${kind.toLowerCase().replace(/_/g, '-')}.svg`,
    contents: iconSvg(kind, CARD_KIND_SPECS[kind].color),
    description: `Icono ${kind}`,
  }));
}
