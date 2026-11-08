import { CARD_PRINTED_TITLES, LOCALES } from '@tactiloom/contracts';
import fc from 'fast-check';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { FIT_STEP_MM, fitTextSize, textWidthMm, unencodableCharacters } from '../src/metrics';

const PREFERRED = 2.4;
const MIN = 1.8;
/** WinAnsi letters used by the four languages, plus space, digits and the typographic apostrophe. */
const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZÀÂÇÈÉÊÌÍÎÏÑÒÓÔÙÚÛÜ0123456789 ’'];

describe('Helvetica metrics', () => {
  it('measures like pdf-lib, never narrower than what pdf-lib measures or draws', async () => {
    const doc = await PDFDocument.create();
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    // No kerning pair in these strings: both measures must agree exactly.
    expect(textWidthMm('#14', 2.4, 'bold')).toBeCloseTo(bold.widthOfTextAtSize('#14', 2.4), 9);
    expect(textWidthMm('col 7', 2.4, 'regular')).toBeCloseTo(regular.widthOfTextAtSize('col 7', 2.4), 9);
    for (const locale of LOCALES) {
      for (const title of Object.values(CARD_PRINTED_TITLES[locale])) {
        expect(textWidthMm(title, 2.4, 'bold'), title).toBeGreaterThanOrEqual(bold.widthOfTextAtSize(title, 2.4) - 1e-9);
      }
    }
  });

  it('scales linearly with the font size', () => {
    expect(textWidthMm('VALIDER CHAMPS', 4.8, 'bold')).toBeCloseTo(2 * textWidthMm('VALIDER CHAMPS', 2.4, 'bold'), 9);
  });

  it('reports the characters the standard PDF fonts cannot encode', () => {
    expect(unencodableCharacters('SÍ · NO · 90° · d’angolo · «réduit» · 100 %')).toEqual([]);
    expect(unencodableCharacters('A → B → C ✓')).toEqual(['→', '✓']);
    expect(() => textWidthMm('→', 2.4, 'bold')).toThrow(/WinAnsi cannot encode/);
  });
});

describe('fitTextSize', () => {
  it('keeps the preferred size when the text fits', () => {
    expect(fitTextSize('INICIO', 'bold', 30.8, PREFERRED, MIN)).toBe(PREFERRED);
  });

  it('shrinks in 0.05 mm steps and refuses to go below the minimum', () => {
    const width = textWidthMm('ENREGISTRER RAPPORT', 1, 'bold');
    expect(fitTextSize('ENREGISTRER RAPPORT', 'bold', width * 2.0, PREFERRED, MIN)).toBe(2);
    expect(fitTextSize('ENREGISTRER RAPPORT', 'bold', width * 2.07, PREFERRED, MIN)).toBe(2.05);
    expect(() => fitTextSize('ENREGISTRER RAPPORT', 'bold', width * 1.79, PREFERRED, MIN)).toThrow(RangeError);
  });

  it('returns the largest step that fits, or throws only when even the minimum overflows (property)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...ALPHABET), { minLength: 1, maxLength: 40 }).map((chars) => chars.join('')),
        fc.double({ min: 2, max: 80, noNaN: true }),
        (text, maxWidth) => {
          const unit = textWidthMm(text, 1, 'bold');
          if (unit * MIN > maxWidth) {
            expect(() => fitTextSize(text, 'bold', maxWidth, PREFERRED, MIN)).toThrow(RangeError);
            return;
          }
          const size = fitTextSize(text, 'bold', maxWidth, PREFERRED, MIN);
          expect(size).toBeGreaterThanOrEqual(MIN);
          expect(size).toBeLessThanOrEqual(PREFERRED);
          expect(textWidthMm(text, size, 'bold')).toBeLessThanOrEqual(maxWidth);
          if (size < PREFERRED) {
            expect(Math.abs(size / FIT_STEP_MM - Math.round(size / FIT_STEP_MM))).toBeLessThan(1e-6);
            const next = Math.round((size + FIT_STEP_MM) * 1000) / 1000;
            expect(textWidthMm(text, next, 'bold')).toBeGreaterThan(maxWidth);
          }
        },
      ),
      { numRuns: 400 },
    );
  });
});
