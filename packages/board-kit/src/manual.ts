import { BRANCH_LABELS, CARD_PRINTED_TITLES, DEFAULT_LOCALE, getBoardTemplate, type CardCatalogEntry, type Locale } from '@tactiloom/contracts';
import { manualEn } from './manuals/en';
import { manualEs } from './manuals/es';
import { manualFr } from './manuals/fr';
import { manualIt } from './manuals/it';
import type { ManualContext } from './manuals/shared';

const MANUALS: Readonly<Record<Locale, (context: ManualContext) => string>> = { es: manualEs, en: manualEn, it: manualIt, fr: manualFr };

/** Printing & assembly manual (ASSEMBLY.md) in one language. Generated with the kit. */
export function assemblyManual(entries: readonly CardCatalogEntry[], locale: Locale = DEFAULT_LOCALE): string {
  return MANUALS[locale]({ entries, template: getBoardTemplate(), titles: CARD_PRINTED_TITLES[locale], branch: BRANCH_LABELS[locale] });
}
