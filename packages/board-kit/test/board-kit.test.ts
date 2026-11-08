import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBoardTemplate, getCardCatalog, sha256HexBytes } from '@tactiloom/contracts';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  ARUCO_MARKER_COUNT,
  buildKit,
  CARD_TITLES,
  cardSvg,
  enabledCards,
  layoutCardSheets,
  markerModules,
  renderBoardPdf,
  renderBoardSvg,
  renderCardsPdf,
  TITLE_SIZE_MM,
} from '../src/index';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('ArUco modules', () => {
  it('exposes the 100 OpenCV DICT_4X4_100 markers with a black border', () => {
    expect(ARUCO_MARKER_COUNT).toBe(100);
    for (let id = 0; id < 100; id += 1) {
      const modules = markerModules(id);
      expect(modules).toHaveLength(6);
      for (let i = 0; i < 6; i += 1) {
        expect(modules[0]![i]).toBe(false);
        expect(modules[5]![i]).toBe(false);
        expect(modules[i]![0]).toBe(false);
        expect(modules[i]![5]).toBe(false);
      }
    }
    expect(() => markerModules(100)).toThrow();
  });

  it('keeps the exact OpenCV bit pattern (marker 0)', () => {
    expect(markerModules(0).map((row) => row.map((white) => (white ? '1' : '0')).join(''))).toEqual([
      '000000',
      '010110',
      '001010',
      '000110',
      '000100',
      '000000',
    ]);
  });
});

describe('card design', () => {
  it('fits every printed title inside the card header (pdf-lib Helvetica-Bold metrics)', async () => {
    const doc = await PDFDocument.create();
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const { card } = getBoardTemplate();
    const available = card.width - 2.2 - 8; // left padding and the "#NN" id label
    for (const title of Object.values(CARD_TITLES)) {
      const widthMm = bold.widthOfTextAtSize(title, TITLE_SIZE_MM);
      expect(widthMm, title).toBeLessThan(available);
    }
  });

  it('renders each card SVG with exactly one ArUco group of its own id', () => {
    for (const entry of enabledCards()) {
      const svg = cardSvg(entry);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.match(/data-aruco-id="(\d+)"/g)).toEqual([`data-aruco-id="${entry.markerId}"`]);
    }
  });

  it('renders the board SVG with fiducials 0..3 only', () => {
    const ids = [...renderBoardSvg().matchAll(/data-aruco-id="(\d+)"/g)].map((m) => Number(m[1]));
    expect(ids.sort()).toEqual([0, 1, 2, 3]);
  });
});

describe('sheet layout', () => {
  it.each([1, Math.SQRT1_2])('places every card inside the printable area without overlaps (scale %s)', (scale) => {
    const layout = layoutCardSheets(enabledCards(), scale);
    expect(layout.slots).toHaveLength(getCardCatalog().cards.filter((c) => c.enabled).length);
    for (const slot of layout.slots) {
      expect(slot.x).toBeGreaterThanOrEqual(5);
      expect(slot.y).toBeGreaterThanOrEqual(5);
      expect(slot.x + slot.width).toBeLessThanOrEqual(layout.pageWidth - 5);
      expect(slot.y + slot.height).toBeLessThanOrEqual(layout.pageHeight - 5);
    }
    for (const a of layout.slots) {
      for (const b of layout.slots) {
        if (a === b || a.page !== b.page) continue;
        const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlap).toBe(false);
      }
    }
  });
});

describe('PDF output', () => {
  it('is byte-for-byte deterministic', async () => {
    expect(Buffer.from(await renderBoardPdf('full')).equals(Buffer.from(await renderBoardPdf('full')))).toBe(true);
    const a = await renderCardsPdf(1);
    const b = await renderCardsPdf(1);
    expect(Buffer.from(a.bytes).equals(Buffer.from(b.bytes))).toBe(true);
  });

  it('uses A3 landscape for the full board and A4 for the reduced board', async () => {
    const full = await PDFDocument.load(await renderBoardPdf('full'));
    const { width, height } = full.getPage(0).getSize();
    expect(Math.round((width * 25.4) / 72)).toBe(420);
    expect(Math.round((height * 25.4) / 72)).toBe(297);
    const small = await PDFDocument.load(await renderBoardPdf('small'));
    expect(Math.round((small.getPage(0).getSize().width * 25.4) / 72)).toBe(297);
  });
});

describe('committed kit (assets/board-kit)', () => {
  it('is up to date with the generator (run `pnpm board:generate` after design changes)', async () => {
    const files = await buildKit();
    for (const file of files) {
      const committed = readFileSync(join(root, 'assets', 'board-kit', file.path));
      const generated = typeof file.contents === 'string' ? Buffer.from(file.contents, 'utf8') : Buffer.from(file.contents);
      expect(committed.equals(generated), file.path).toBe(true);
    }
  });

  it('has a manifest whose hashes match the files', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'assets', 'board-kit', 'kit-manifest.json'), 'utf8')) as {
      files: { path: string; sha256: string; bytes: number }[];
    };
    for (const entry of manifest.files) {
      const bytes = readFileSync(join(root, 'assets', 'board-kit', entry.path));
      expect(bytes.byteLength, entry.path).toBe(entry.bytes);
      expect(sha256HexBytes(bytes), entry.path).toBe(entry.sha256);
    }
  });
});
