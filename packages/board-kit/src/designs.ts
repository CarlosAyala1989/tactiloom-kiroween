import {
  CARD_KIND_SPECS,
  getBoardTemplate,
  type BoardTemplate,
  type CardCatalogEntry,
  type CardKind,
} from '@tactiloom/contracts';
import { markerModules } from './aruco';
import type { Primitive } from './display-list';
import { translate } from './display-list';
import { CARD_ICONS } from './icons';

/** Printed titles (Spanish, WinAnsi-safe). Sizes are verified to fit by test/board-kit.test.ts. */
export const CARD_TITLES: Readonly<Record<CardKind, string>> = {
  START: 'INICIO',
  INPUT_FILE: 'ARCHIVO',
  EXTRACT_TEXT: 'EXTRAER TEXTO',
  VALIDATE_FIELDS: 'VALIDAR CAMPOS',
  CONDITION: 'CONDICIÓN',
  CREATE_REPORT: 'CREAR REPORTE',
  SAVE_REPORT: 'GUARDAR REPORTE',
  REQUEST_REVIEW: 'PEDIR REVISIÓN',
  END: 'FIN',
};

export const TITLE_SIZE_MM = 2.4;
export const INK = '#202124';
export const MUTED = '#5f6368';

/** Right-pointing arrow from (x, y) of length `length` (mm). */
function arrowRight(x: number, y: number, length: number, color: string, shaft = 0.7, head = 2.1): Primitive {
  const neck = length - head * 1.4;
  return {
    type: 'path',
    d: `M0 ${-shaft} H${neck} V${-head} L${length} 0 L${neck} ${head} V${shaft} H0 Z`,
    x,
    y,
    scale: 1,
    fill: color,
  };
}

/** Down-pointing arrow from (x, y) of length `length` (mm). */
function arrowDown(x: number, y: number, length: number, color: string, shaft = 0.7, head = 2.1): Primitive {
  const neck = length - head * 1.4;
  return {
    type: 'path',
    d: `M${-shaft} 0 V${neck} H${-head} L0 ${length} L${head} ${neck} H${shaft} V0 Z`,
    x,
    y,
    scale: 1,
    fill: color,
  };
}

function icon(kind: CardKind, x: number, y: number, size: number, color: string): Primitive[] {
  return CARD_ICONS[kind].map((layer) => ({
    type: 'path' as const,
    d: layer.d,
    x,
    y,
    scale: size / 24,
    fill: layer.fill === 'ink' ? color : '#ffffff',
  }));
}

function sideLabel(text: string, x: number, y: number): Primitive {
  return { type: 'text', x, y, text, size: 1.9, weight: 'bold', anchor: 'middle', fill: MUTED };
}

/**
 * Card face in its own frame (mm, upright). The printed arrow points right: when the card is
 * upright on the board its forward direction F is East. The marker is drawn upright, so the
 * marker's +x axis (corner0 → corner1) equals F — this is what the vision service measures.
 */
export function cardItems(entry: CardCatalogEntry, template: BoardTemplate = getBoardTemplate()): Primitive[] {
  const { width: W, height: H, cornerRadius, markerSize, markerCenter } = template.card;
  const spec = CARD_KIND_SPECS[entry.kind];
  const color = spec.color;
  const markerX = markerCenter.x - markerSize / 2;
  const markerY = markerCenter.y - markerSize / 2;
  const sideY = markerCenter.y + 0.7;
  const items: Primitive[] = [
    { type: 'rect', x: 0, y: 0, width: W, height: H, fill: '#ffffff', stroke: '#9aa0a6', strokeWidth: 0.25, radius: cornerRadius },
    { type: 'rect', x: 0.8, y: 0.8, width: W - 1.6, height: 8.4, fill: color, radius: Math.max(cornerRadius - 0.8, 0.5) },
    { type: 'text', x: 2.2, y: 5.0, text: CARD_TITLES[entry.kind], size: TITLE_SIZE_MM, weight: 'bold', anchor: 'start', fill: '#ffffff' },
    { type: 'text', x: 2.2, y: 8.0, text: entry.kind, size: 1.5, weight: 'regular', anchor: 'start', fill: '#ffffff' },
    { type: 'text', x: W - 2.2, y: 5.0, text: `#${entry.markerId}`, size: 2.4, weight: 'bold', anchor: 'end', fill: '#ffffff' },
    { type: 'marker', x: markerX, y: markerY, size: markerSize, modules: markerModules(entry.markerId), markerId: entry.markerId },
  ];

  if (spec.hasInput) {
    items.push(sideLabel('IN', 3.2, sideY - 1.6), arrowRight(1.6, sideY + 1.4, 3.4, MUTED, 0.35, 1.0));
  }

  const iconSize = 8;
  items.push(...icon(entry.kind, 2.4, 40.2, iconSize, color));

  switch (entry.kind) {
    case 'CONDITION': {
      items.push(sideLabel('SÍ', W - 3.0, sideY - 1.6), arrowRight(W - 4.7, sideY + 1.4, 3.4, color, 0.35, 1.0));
      items.push(
        { type: 'text', x: 25.2, y: 46.6, text: 'NO', size: 2.8, weight: 'bold', anchor: 'end', fill: color },
        arrowDown(28.8, 39.4, 10.8, color, 0.75, 2.2),
      );
      break;
    }
    case 'END': {
      items.push(
        arrowRight(13.0, 44.2, 19.0, color, 0.7, 2.1),
        { type: 'rect', x: 33.2, y: 39.8, width: 1.6, height: 8.8, fill: color },
      );
      break;
    }
    default: {
      items.push(
        sideLabel('OUT', W - 3.0, sideY - 1.6),
        arrowRight(W - 4.7, sideY + 1.4, 3.4, MUTED, 0.35, 1.0),
        arrowRight(13.0, 44.2, 25.0, color, 0.7, 2.1),
      );
    }
  }
  return items;
}

export type BoardVariant = 'full' | 'small';

/** Full board page in A3 millimetres (variant only changes the scale verification label). */
export function boardItems(variant: BoardVariant = 'full', template: BoardTemplate = getBoardTemplate()): Primitive[] {
  const { grid, columns, rows, page } = template;
  const gridWidth = columns * grid.cellWidth;
  const gridHeight = rows * grid.cellHeight;
  const items: Primitive[] = [{ type: 'rect', x: 0, y: 0, width: page.width, height: page.height, fill: '#ffffff' }];

  items.push(
    { type: 'text', x: page.width / 2, y: 17.5, text: 'Tactiloom · Board v1', size: 6, weight: 'bold', anchor: 'middle', fill: INK },
    {
      type: 'text',
      x: page.width / 2,
      y: 24,
      text: '8 × 4 casillas · ArUco DICT_4X4_100 · fiduciales 0, 1, 2, 3 · tarjetas #10–#89',
      size: 2.8,
      weight: 'regular',
      anchor: 'middle',
      fill: MUTED,
    },
  );

  // Cells: centre guides + coordinates.
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const x = grid.x + col * grid.cellWidth;
      const y = grid.y + row * grid.cellHeight;
      const cx = x + grid.cellWidth / 2;
      const cy = y + grid.cellHeight / 2;
      items.push(
        { type: 'text', x: x + 1.6, y: y + 3.6, text: `${row},${col}`, size: 2.4, weight: 'regular', anchor: 'start', fill: '#a0a4a8' },
        { type: 'line', x1: cx - 2, y1: cy, x2: cx + 2, y2: cy, stroke: '#d0d3d6', strokeWidth: 0.3 },
        { type: 'line', x1: cx, y1: cy - 2, x2: cx, y2: cy + 2, stroke: '#d0d3d6', strokeWidth: 0.3 },
      );
    }
  }
  for (let col = 0; col <= columns; col += 1) {
    const x = grid.x + col * grid.cellWidth;
    items.push({ type: 'line', x1: x, y1: grid.y, x2: x, y2: grid.y + gridHeight, stroke: '#8a8f94', strokeWidth: col === 0 || col === columns ? 0.6 : 0.35 });
  }
  for (let row = 0; row <= rows; row += 1) {
    const y = grid.y + row * grid.cellHeight;
    items.push({ type: 'line', x1: grid.x, y1: y, x2: grid.x + gridWidth, y2: y, stroke: '#8a8f94', strokeWidth: row === 0 || row === rows ? 0.6 : 0.35 });
  }
  for (let col = 0; col < columns; col += 1) {
    items.push({ type: 'text', x: grid.x + (col + 0.5) * grid.cellWidth, y: grid.y - 1.6, text: `col ${col}`, size: 2.4, weight: 'bold', anchor: 'middle', fill: MUTED });
  }
  for (let row = 0; row < rows; row += 1) {
    items.push({ type: 'text', x: grid.x - 4.8, y: grid.y + (row + 0.5) * grid.cellHeight + 0.9, text: `F${row}`, size: 2.6, weight: 'bold', anchor: 'middle', fill: MUTED });
  }

  // Fiducials (IDs 0..3, outside the cells) with labels outside their quiet zone.
  for (const fiducial of template.fiducials) {
    const half = fiducial.size / 2;
    items.push({
      type: 'marker',
      x: fiducial.center.x - half,
      y: fiducial.center.y - half,
      size: fiducial.size,
      modules: markerModules(fiducial.markerId),
      markerId: fiducial.markerId,
    });
    const left = fiducial.corner.endsWith('left');
    const top = fiducial.corner.startsWith('top');
    items.push({
      type: 'text',
      x: left ? fiducial.center.x + half + 5 : fiducial.center.x - half - 5,
      y: top ? fiducial.center.y + 1.2 : fiducial.center.y + 1.2,
      text: `ID ${fiducial.markerId}`,
      size: 2.6,
      weight: 'bold',
      anchor: left ? 'start' : 'end',
      fill: MUTED,
    });
  }

  // Scale verification bar (100 mm at 100 % print scale).
  const barY = 268.5;
  const barX = page.width / 2 - 50;
  items.push(
    { type: 'line', x1: barX, y1: barY, x2: barX + 100, y2: barY, stroke: INK, strokeWidth: 0.5 },
    { type: 'line', x1: barX, y1: barY - 1.5, x2: barX, y2: barY + 1.5, stroke: INK, strokeWidth: 0.5 },
    { type: 'line', x1: barX + 100, y1: barY - 1.5, x2: barX + 100, y2: barY + 1.5, stroke: INK, strokeWidth: 0.5 },
    {
      type: 'text',
      x: page.width / 2,
      y: barY + 5,
      text:
        variant === 'full'
          ? 'Verificación: esta barra mide 100 mm si imprimiste al 100 % (A3 horizontal).'
          : 'Versión reducida A4 (escala 0,707): esta barra mide 70,7 mm. Usa las tarjetas reducidas.',
      size: 2.4,
      weight: 'regular',
      anchor: 'middle',
      fill: MUTED,
    },
    {
      type: 'text',
      x: page.width / 2,
      y: 281,
      text: 'Una tarjeta por casilla. La flecha impresa indica el flujo; cada tarjeta recibe por su lado trasero (IN).',
      size: 2.8,
      weight: 'regular',
      anchor: 'middle',
      fill: INK,
    },
    {
      type: 'text',
      x: page.width / 2,
      y: 286.5,
      text: 'CONDICIÓN: SÍ sigue la flecha, NO gira 90° a la derecha. Los 4 marcadores de esquina deben verse en la foto.',
      size: 2.8,
      weight: 'regular',
      anchor: 'middle',
      fill: INK,
    },
  );
  return items;
}

export interface CardSheetSlot {
  readonly markerId: number;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CardSheetLayout {
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly scale: number;
  readonly pages: number;
  readonly slots: readonly CardSheetSlot[];
}

/** Lays out cards on A4 portrait pages (mm). `scale` < 1 produces the reduced kit. */
export function layoutCardSheets(entries: readonly CardCatalogEntry[], scale = 1, template: BoardTemplate = getBoardTemplate()): CardSheetLayout {
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const gap = 4;
  const width = template.card.width * scale;
  const height = template.card.height * scale;
  const columns = Math.floor((pageWidth - 2 * margin + gap) / (width + gap));
  const rowsPerPage = Math.floor((pageHeight - 2 * margin - 8 + gap) / (height + gap));
  const perPage = columns * rowsPerPage;
  const usedWidth = columns * width + (columns - 1) * gap;
  const usedHeight = rowsPerPage * height + (rowsPerPage - 1) * gap;
  const offsetX = (pageWidth - usedWidth) / 2;
  const offsetY = (pageHeight - usedHeight) / 2 + 3;
  const slots = entries.map((entry, index) => {
    const page = Math.floor(index / perPage);
    const position = index % perPage;
    const col = position % columns;
    const row = Math.floor(position / columns);
    return {
      markerId: entry.markerId,
      page,
      x: round(offsetX + col * (width + gap)),
      y: round(offsetY + row * (height + gap)),
      width: round(width),
      height: round(height),
    };
  });
  return { pageWidth, pageHeight, scale, pages: Math.ceil(entries.length / perPage), slots };
}

export function cardSheetPageItems(
  layout: CardSheetLayout,
  page: number,
  entries: readonly CardCatalogEntry[],
  template: BoardTemplate = getBoardTemplate(),
): Primitive[] {
  const byMarker = new Map(entries.map((entry) => [entry.markerId, entry]));
  const items: Primitive[] = [
    { type: 'rect', x: 0, y: 0, width: layout.pageWidth, height: layout.pageHeight, fill: '#ffffff' },
    {
      type: 'text',
      x: layout.pageWidth / 2,
      y: 8.5,
      text: `Tactiloom · tarjetas cards-v1 · hoja ${page + 1}/${layout.pages}${layout.scale < 1 ? ' · versión reducida' : ''} · recorta por el borde gris`,
      size: 2.6,
      weight: 'regular',
      anchor: 'middle',
      fill: MUTED,
    },
  ];
  for (const slot of layout.slots.filter((candidate) => candidate.page === page)) {
    const entry = byMarker.get(slot.markerId);
    if (!entry) continue;
    items.push(translate(cardItems(entry, template), slot.x, slot.y, layout.scale, `card-${entry.markerId}`));
  }
  return items;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
