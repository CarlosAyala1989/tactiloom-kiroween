import type { Locale } from '@tactiloom/contracts';
import { catalog } from './dictionaries/catalog';
import { common } from './dictionaries/common';
import { diagnostics } from './dictionaries/diagnostics';
import { errors } from './dictionaries/errors';
import { kit } from './dictionaries/kit';
import { pages } from './dictionaries/pages';
import { scenarios } from './dictionaries/scenarios';
import { studio } from './dictionaries/studio';
import { workflow } from './dictionaries/workflow';

function build(locale: Locale) {
  return {
    ...common[locale],
    catalog: catalog[locale],
    diagnostics: diagnostics[locale],
    errors: errors[locale],
    studio: studio[locale],
    workflow: workflow[locale],
    pages: pages[locale],
    scenarios: scenarios[locale],
    kit: kit[locale],
  };
}

/** Full UI dictionary of one language (the Spanish one defines the shape). */
export type Dictionary = ReturnType<typeof build>;

export const DICTIONARIES: Readonly<Record<Locale, Dictionary>> = { es: build('es'), en: build('en'), it: build('it'), fr: build('fr') };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export * from './config';
export { formatters, type Formatters } from './format';
