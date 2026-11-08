import type { Locale } from '@tactiloom/contracts';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import type { KitTexts } from './types';

export type { KitTexts, PdfTexts } from './types';

/** Texts of the printable kit per language (Spanish is the reference kit). */
export const KIT_TEXTS: Readonly<Record<Locale, KitTexts>> = { es, en, it, fr };

export function kitTexts(locale: Locale): KitTexts {
  return KIT_TEXTS[locale];
}
