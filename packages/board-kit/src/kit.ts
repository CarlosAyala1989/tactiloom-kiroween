import {
  CARD_KINDS,
  CARD_KIND_SPECS,
  getBoardTemplate,
  getCardCatalog,
  sha256HexBytes,
  type CardCatalogEntry,
} from '@ritualos/contracts';
import { PDFDocument } from 'pdf-lib';
import { ARUCO_DICTIONARY } from './aruco';
import { boardItems, cardItems, cardSheetPageItems, layoutCardSheets, MUTED, type CardSheetLayout } from './designs';
import type { Drawing, Primitive } from './display-list';
import { iconSvg } from './icons';
import { assemblyManual } from './manual';
import { createKitDocument, MM_TO_PT, paintOnPage, paintPage, renderSinglePagePdf } from './pdf';
import { renderSvg } from './svg';

export const SMALL_SCALE = Math.SQRT1_2; // A3 → A4
export const KIT_VERSION = 'board-kit/1.0.0';

export function boardDrawing(variant: 'full' | 'small' = 'full'): Drawing {
  const { page } = getBoardTemplate();
  return { width: page.width, height: page.height, items: boardItems(variant) };
}

export function cardDrawing(entry: CardCatalogEntry): Drawing {
  const { card } = getBoardTemplate();
  return { width: card.width, height: card.height, items: cardItems(entry) };
}

export function renderCardSvg(entry: CardCatalogEntry): string {
  return renderSvg(cardDrawing(entry), `RitualOS ${entry.kind} #${entry.markerId}`);
}

export function renderBoardSvg(): string {
  return renderSvg(boardDrawing('full'), 'RitualOS Ritual Board v1 (A3)');
}

export function enabledCards(): CardCatalogEntry[] {
  return getCardCatalog().cards.filter((card) => card.enabled);
}

export async function renderBoardPdf(variant: 'full' | 'small'): Promise<Uint8Array> {
  if (variant === 'full') {
    return renderSinglePagePdf(boardDrawing('full'), {
      title: 'RitualOS Ritual Board v1 — A3 horizontal',
      subject: 'Imprimir al 100 % en A3 horizontal. Fiduciales ArUco 0-3.',
    });
  }
  const { doc, fonts } = await createKitDocument({
    title: 'RitualOS Ritual Board v1 — versión reducida A4',
    subject: 'Tablero a escala 0,707 en A4 horizontal; usar con cards-v1-small-a4.pdf.',
  });
  const a4 = { width: 297, height: 210 };
  const drawing = boardDrawing('small');
  paintPage(doc, fonts, a4.width, a4.height, drawing, { ox: 0, oy: 0, scale: SMALL_SCALE });
  return doc.save({ useObjectStreams: false });
}

const TILE_NAMES = ['superior izquierdo', 'superior derecho', 'inferior izquierdo', 'inferior derecho'] as const;

/** 2×2 A4 landscape tiles at 1:1 scale with crop marks (assemble edge to edge). */
export async function renderBoardTilesPdf(): Promise<Uint8Array> {
  const template = getBoardTemplate();
  const fullBytes = await renderBoardPdf('full');
  const source = await PDFDocument.load(fullBytes, { updateMetadata: false });
  const { doc, fonts } = await createKitDocument({
    title: 'RitualOS Ritual Board v1 — mosaico 2×2 A4',
    subject: 'Cuatro hojas A4 horizontales a escala real; recortar por las marcas y unir borde con borde.',
  });
  const quadW = template.page.width / 2;
  const quadH = template.page.height / 2;
  const pageW = 297;
  const pageH = 210;
  const offsetX = (pageW - quadW) / 2;
  const offsetY = (pageH - quadH) / 2 + 4;
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
    const marks: Primitive[] = [];
    const corners = [
      [offsetX, offsetY],
      [offsetX + quadW, offsetY],
      [offsetX, offsetY + quadH],
      [offsetX + quadW, offsetY + quadH],
    ] as const;
    for (const [cx, cy] of corners) {
      const dirX = cx === offsetX ? -1 : 1;
      const dirY = cy === offsetY ? -1 : 1;
      marks.push(
        { type: 'line', x1: cx + dirX * 2, y1: cy, x2: cx + dirX * 8, y2: cy, stroke: '#000000', strokeWidth: 0.25 },
        { type: 'line', x1: cx, y1: cy + dirY * 2, x2: cx, y2: cy + dirY * 8, stroke: '#000000', strokeWidth: 0.25 },
      );
    }
    marks.push({
      type: 'text',
      x: pageW / 2,
      y: 8,
      text: `RitualOS board-v1 · mosaico ${index + 1}/4 (${TILE_NAMES[index]}) · imprimir al 100 %, sin ajustar a página · recortar por las marcas`,
      size: 2.6,
      weight: 'regular',
      anchor: 'middle',
      fill: MUTED,
    });
    paintOnPage(page, pageH, fonts, marks);
  }
  return doc.save({ useObjectStreams: false });
}

export async function renderCardsPdf(scale: number): Promise<{ bytes: Uint8Array; layout: CardSheetLayout }> {
  const entries = enabledCards();
  const layout = layoutCardSheets(entries, scale);
  const { doc, fonts } = await createKitDocument({
    title: scale < 1 ? 'RitualOS cards-v1 — versión reducida' : 'RitualOS cards-v1 — tarjetas A4',
    subject: 'Tarjetas con marcadores ArUco DICT_4X4_100 (IDs 10-35). Imprimir al 100 %.',
  });
  for (let page = 0; page < layout.pages; page += 1) {
    paintPage(doc, fonts, layout.pageWidth, layout.pageHeight, {
      width: layout.pageWidth,
      height: layout.pageHeight,
      items: cardSheetPageItems(layout, page, entries),
    });
  }
  return { bytes: await doc.save({ useObjectStreams: false }), layout };
}

export interface KitFile {
  readonly path: string;
  readonly contents: Uint8Array | string;
  readonly description: string;
}

/** Produces every printable/derived file of the kit (pure, deterministic). */
export async function buildKit(): Promise<KitFile[]> {
  const entries = enabledCards();
  const template = getBoardTemplate();
  const files: KitFile[] = [];
  files.push({ path: 'board-v1-a3.pdf', contents: await renderBoardPdf('full'), description: 'Tablero A3 horizontal, escala real' });
  files.push({ path: 'board-v1-a3.svg', contents: renderBoardSvg(), description: 'Tablero A3 en SVG (1 unidad = 1 mm)' });
  files.push({ path: 'board-v1-a4-tiles.pdf', contents: await renderBoardTilesPdf(), description: 'Tablero en 4 hojas A4 a escala real' });
  files.push({ path: 'board-v1-small-a4.pdf', contents: await renderBoardPdf('small'), description: 'Tablero reducido (0,707) en una hoja A4' });
  const full = await renderCardsPdf(1);
  files.push({ path: 'cards-v1-a4.pdf', contents: full.bytes, description: `${entries.length} tarjetas en A4 (escala real)` });
  files.push({ path: 'cards-v1-layout.json', contents: `${JSON.stringify(full.layout, null, 2)}\n`, description: 'Posición (mm) de cada tarjeta en cards-v1-a4.pdf' });
  const small = await renderCardsPdf(SMALL_SCALE);
  files.push({ path: 'cards-v1-small-a4.pdf', contents: small.bytes, description: 'Tarjetas reducidas para el tablero A4' });
  files.push({ path: 'cards-v1-small-layout.json', contents: `${JSON.stringify(small.layout, null, 2)}\n`, description: 'Posición (mm) en cards-v1-small-a4.pdf' });
  for (let page = 0; page < full.layout.pages; page += 1) {
    files.push({
      path: `cards-v1-sheet-${page + 1}.svg`,
      contents: renderSvg(
        { width: full.layout.pageWidth, height: full.layout.pageHeight, items: cardSheetPageItems(full.layout, page, entries) },
        `RitualOS cards-v1 hoja ${page + 1}`,
      ),
      description: `Hoja ${page + 1} de tarjetas en SVG`,
    });
  }
  for (const entry of entries) {
    files.push({ path: `cards/card-${entry.markerId}.svg`, contents: renderCardSvg(entry), description: `${entry.kind} #${entry.markerId}` });
  }
  files.push({ path: 'board-v1.json', contents: `${JSON.stringify(template, null, 2)}\n`, description: 'Geometría del tablero (contrato)' });
  files.push({ path: 'cards-v1.json', contents: `${JSON.stringify(getCardCatalog(), null, 2)}\n`, description: 'Catálogo markerId → tipo → instancia' });
  files.push({ path: 'ASSEMBLY.md', contents: assemblyManual(entries), description: 'Manual de impresión y montaje (es/en)' });
  const manifest = {
    kitVersion: KIT_VERSION,
    dictionary: ARUCO_DICTIONARY,
    boardTemplate: template.templateId,
    catalogVersion: getCardCatalog().catalogVersion,
    files: files.map((file) => {
      const bytes = typeof file.contents === 'string' ? new TextEncoder().encode(file.contents) : file.contents;
      return { path: file.path, description: file.description, bytes: bytes.byteLength, sha256: sha256HexBytes(bytes) };
    }),
  };
  files.push({ path: 'kit-manifest.json', contents: `${JSON.stringify(manifest, null, 2)}\n`, description: 'Manifiesto del kit' });
  return files;
}

export function iconFiles(): KitFile[] {
  return CARD_KINDS.map((kind) => ({
    path: `${kind.toLowerCase().replace(/_/g, '-')}.svg`,
    contents: iconSvg(kind, CARD_KIND_SPECS[kind].color),
    description: `Icono ${kind}`,
  }));
}
