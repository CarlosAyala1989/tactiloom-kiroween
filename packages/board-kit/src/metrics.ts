/**
 * Real Helvetica metrics (Adobe AFM shipped with pdf-lib) for the two weights the kit prints, and the
 * WinAnsi encoding used by the standard PDF fonts. Browser-safe: no PDF document is created, so the
 * SVG previews compute exactly the same sizes as the PDFs.
 */
import { Encodings, Font, FontNames } from '@pdf-lib/standard-fonts';

export type FontWeight = 'regular' | 'bold';

const FONT_NAMES: Readonly<Record<FontWeight, FontNames>> = {
  regular: FontNames.Helvetica,
  bold: FontNames.HelveticaBold,
};

/** pdf-lib uses this advance for glyphs the font does not define. */
const MISSING_GLYPH_WIDTH = 250;

function glyphNames(text: string): string[] {
  return Array.from(text, (char) => Encodings.WinAnsi.encodeUnicodeCodePoint(char.codePointAt(0) ?? 0).name);
}

/** Characters of `text` that the standard PDF fonts cannot print (pdf-lib throws on them). */
export function unencodableCharacters(text: string): string[] {
  return [...new Set(Array.from(text).filter((char) => !Encodings.WinAnsi.canEncodeUnicodeCodePoint(char.codePointAt(0) ?? 0)))];
}

/**
 * Width of `text` in millimetres at a font size of `sizeMm`. The larger of the kerned width (what
 * pdf-lib measures) and the plain advance sum (what pdf-lib draws, and what an SVG renderer shows when
 * it does not kern) is returned, so a text that fits by this measure fits in every output.
 * Throws if the text is not WinAnsi-encodable.
 */
export function textWidthMm(text: string, sizeMm: number, weight: FontWeight): number {
  const font = Font.load(FONT_NAMES[weight]);
  const glyphs = glyphNames(text);
  let advances = 0;
  let kerning = 0;
  glyphs.forEach((glyph, index) => {
    advances += font.getWidthOfGlyph(glyph) || MISSING_GLYPH_WIDTH;
    const next = glyphs[index + 1];
    if (next !== undefined) kerning += font.getXAxisKerningForPair(glyph, next) || 0;
  });
  return (Math.max(advances, advances + kerning) * sizeMm) / 1000;
}

/** Granularity of shrunk sizes (keeps SVG numbers short and the output deterministic). */
export const FIT_STEP_MM = 0.05;

/**
 * Largest font size ≤ `preferredMm` (in steps of FIT_STEP_MM) at which `text` is at most `maxWidthMm`
 * wide. Returns `preferredMm` unchanged when the text already fits. Throws instead of returning a size
 * below `minMm`: an over-long text must be shortened, never printed outside its box.
 */
export function fitTextSize(text: string, weight: FontWeight, maxWidthMm: number, preferredMm: number, minMm: number): number {
  const fits = (size: number) => textWidthMm(text, size, weight) <= maxWidthMm;
  if (fits(preferredMm)) return preferredMm;
  const sizeAt = (steps: number) => roundMm(steps * FIT_STEP_MM);
  // Width is linear in the size: estimate, then settle on the largest step that fits despite rounding.
  let steps = Math.floor(maxWidthMm / textWidthMm(text, 1, weight) / FIT_STEP_MM);
  while (sizeAt(steps + 1) < preferredMm && fits(sizeAt(steps + 1))) steps += 1;
  while (steps > 0 && !fits(sizeAt(steps))) steps -= 1;
  const size = sizeAt(steps);
  if (!(size >= minMm) || !fits(size)) {
    throw new RangeError(`El texto «${text}» no cabe en ${roundMm(maxWidthMm)} mm ni con el tamaño mínimo de ${minMm} mm`);
  }
  return size;
}

function roundMm(value: number): number {
  return Math.round(value * 1000) / 1000;
}
