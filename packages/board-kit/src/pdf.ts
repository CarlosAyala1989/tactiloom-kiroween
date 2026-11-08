import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import type { Drawing, Primitive } from './display-list';

export const MM_TO_PT = 72 / 25.4;
/** Fixed metadata date keeps generated PDFs byte-for-byte reproducible. */
export const KIT_METADATA_DATE = new Date('2026-11-01T00:00:00.000Z');

interface Fonts {
  readonly regular: PDFFont;
  readonly bold: PDFFont;
}

interface Transform {
  readonly ox: number;
  readonly oy: number;
  readonly scale: number;
}

export function hexToRgb(hex: string): RGB {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function roundedRectPath(width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  return `M${r} 0 H${width - r} A${r} ${r} 0 0 1 ${width} ${r} V${height - r} A${r} ${r} 0 0 1 ${width - r} ${height} H${r} A${r} ${r} 0 0 1 0 ${height - r} V${r} A${r} ${r} 0 0 1 ${r} 0 Z`;
}

class PdfPainter {
  constructor(
    private readonly page: PDFPage,
    private readonly pageHeightMm: number,
    private readonly fonts: Fonts,
  ) {}

  private px(t: Transform, x: number): number {
    return (t.ox + x * t.scale) * MM_TO_PT;
  }

  private py(t: Transform, y: number): number {
    return (this.pageHeightMm - (t.oy + y * t.scale)) * MM_TO_PT;
  }

  draw(items: readonly Primitive[], t: Transform): void {
    for (const item of items) this.drawItem(item, t);
  }

  private drawItem(item: Primitive, t: Transform): void {
    const page = this.page;
    switch (item.type) {
      case 'rect': {
        if (item.radius && item.radius > 0) {
          page.drawSvgPath(roundedRectPath(item.width, item.height, item.radius), {
            x: this.px(t, item.x),
            y: this.py(t, item.y),
            scale: t.scale * MM_TO_PT,
            ...(item.fill ? { color: hexToRgb(item.fill) } : {}),
            // drawSvgPath applies `scale` to the CTM, so the border width is expressed in path units (mm).
            ...(item.stroke ? { borderColor: hexToRgb(item.stroke), borderWidth: item.strokeWidth ?? 0.25 } : {}),
          });
        } else {
          page.drawRectangle({
            x: this.px(t, item.x),
            y: this.py(t, item.y + item.height),
            width: item.width * t.scale * MM_TO_PT,
            height: item.height * t.scale * MM_TO_PT,
            ...(item.fill ? { color: hexToRgb(item.fill) } : {}),
            ...(item.stroke ? { borderColor: hexToRgb(item.stroke), borderWidth: (item.strokeWidth ?? 0.25) * t.scale * MM_TO_PT } : {}),
            ...(item.dash ? { borderDashArray: item.dash.map((d) => d * t.scale * MM_TO_PT) } : {}),
          });
        }
        return;
      }
      case 'line':
        page.drawLine({
          start: { x: this.px(t, item.x1), y: this.py(t, item.y1) },
          end: { x: this.px(t, item.x2), y: this.py(t, item.y2) },
          thickness: item.strokeWidth * t.scale * MM_TO_PT,
          color: hexToRgb(item.stroke),
          ...(item.dash ? { dashArray: item.dash.map((d) => d * t.scale * MM_TO_PT) } : {}),
        });
        return;
      case 'text': {
        const font = item.weight === 'bold' ? this.fonts.bold : this.fonts.regular;
        const size = item.size * t.scale * MM_TO_PT;
        const width = font.widthOfTextAtSize(item.text, size);
        const anchorShift = item.anchor === 'middle' ? width / 2 : item.anchor === 'end' ? width : 0;
        page.drawText(item.text, {
          x: this.px(t, item.x) - anchorShift,
          y: this.py(t, item.y),
          size,
          font,
          color: hexToRgb(item.fill),
        });
        return;
      }
      case 'path':
        page.drawSvgPath(item.d, {
          x: this.px(t, item.x),
          y: this.py(t, item.y),
          scale: item.scale * t.scale * MM_TO_PT,
          ...(item.fill ? { color: hexToRgb(item.fill) } : {}),
          ...(item.stroke ? { borderColor: hexToRgb(item.stroke), borderWidth: (item.strokeWidth ?? 0.25) / item.scale } : {}),
        });
        return;
      case 'marker': {
        const module = item.size / item.modules.length;
        page.drawRectangle({
          x: this.px(t, item.x),
          y: this.py(t, item.y + item.size),
          width: item.size * t.scale * MM_TO_PT,
          height: item.size * t.scale * MM_TO_PT,
          color: rgb(0, 0, 0),
        });
        item.modules.forEach((row, rowIndex) => {
          let start = -1;
          for (let col = 0; col <= row.length; col += 1) {
            const white = col < row.length && row[col] === true;
            if (white && start < 0) start = col;
            if (!white && start >= 0) {
              page.drawRectangle({
                x: this.px(t, item.x + start * module),
                y: this.py(t, item.y + (rowIndex + 1) * module),
                width: (col - start) * module * t.scale * MM_TO_PT,
                height: module * t.scale * MM_TO_PT,
                color: rgb(1, 1, 1),
              });
              start = -1;
            }
          }
        });
        return;
      }
      case 'group':
        this.draw(item.items, { ox: t.ox + item.x * t.scale, oy: t.oy + item.y * t.scale, scale: t.scale * item.scale });
        return;
    }
  }
}

export interface PdfMetadata {
  readonly title: string;
  readonly subject: string;
  readonly keywords: readonly string[];
  /** Language tag written to the document catalog (/Lang); omitted when undefined. */
  readonly language?: string;
}

export async function createKitDocument(meta: PdfMetadata): Promise<{ doc: PDFDocument; fonts: Fonts }> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setTitle(meta.title);
  doc.setSubject(meta.subject);
  doc.setAuthor('Tactiloom contributors');
  doc.setCreator('Tactiloom board-kit');
  doc.setProducer('Tactiloom board-kit (pdf-lib 1.17.1)');
  doc.setKeywords([...meta.keywords]);
  doc.setCreationDate(KIT_METADATA_DATE);
  doc.setModificationDate(KIT_METADATA_DATE);
  if (meta.language !== undefined) doc.setLanguage(meta.language);
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  return { doc, fonts };
}

/** Adds a page of `pageWidth`×`pageHeight` mm and paints `drawing` scaled at (ox, oy). */
export function paintPage(
  doc: PDFDocument,
  fonts: Fonts,
  pageWidthMm: number,
  pageHeightMm: number,
  drawing: Drawing,
  placement: Transform = { ox: 0, oy: 0, scale: 1 },
): PDFPage {
  const page = doc.addPage([pageWidthMm * MM_TO_PT, pageHeightMm * MM_TO_PT]);
  new PdfPainter(page, pageHeightMm, fonts).draw(drawing.items, placement);
  return page;
}

export function paintOnPage(page: PDFPage, pageHeightMm: number, fonts: Fonts, items: readonly Primitive[]): void {
  new PdfPainter(page, pageHeightMm, fonts).draw(items, { ox: 0, oy: 0, scale: 1 });
}

export async function renderSinglePagePdf(drawing: Drawing, meta: PdfMetadata): Promise<Uint8Array> {
  const { doc, fonts } = await createKitDocument(meta);
  paintPage(doc, fonts, drawing.width, drawing.height, drawing);
  return doc.save({ useObjectStreams: false });
}
