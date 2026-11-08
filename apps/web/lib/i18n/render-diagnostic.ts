import { DIAGNOSTIC_TITLES_ES, LOCALE_INTL_TAGS, type CardKind, type DataFact, type Diagnostic, type Locale, type Orientation } from '@tactiloom/contracts';
import { catalog } from './dictionaries/catalog';
import { common } from './dictionaries/common';
import { diagnostics, MissingParamError, type ParamReader, type TemplateHelpers } from './dictionaries/diagnostics';

export interface LocalizedDiagnostic {
  readonly title: string;
  readonly message: string;
  readonly suggestion: string | null;
  /**
   * True when the canonical Spanish text is shown in another language because the stored
   * diagnostic has no structured params (captures analysed before i18n).
   */
  readonly fallback: boolean;
}

function reader(params: NonNullable<Diagnostic['params']>): ParamReader {
  const fail = (key: string): never => {
    throw new MissingParamError(key);
  };
  return {
    num: (key) => {
      const value = params[key];
      return typeof value === 'number' && Number.isFinite(value) ? value : fail(key);
    },
    str: (key) => {
      const value = params[key];
      return typeof value === 'string' ? value : fail(key);
    },
    nums: (key) => {
      const value = params[key];
      return Array.isArray(value) && value.every((item) => typeof item === 'number') ? (value as number[]) : fail(key);
    },
    strs: (key) => {
      const value = params[key];
      return Array.isArray(value) && value.every((item) => typeof item === 'string') ? (value as string[]) : fail(key);
    },
    has: (key) => Object.hasOwn(params, key) && params[key] !== null && params[key] !== undefined,
    variant: () => (typeof params.variant === 'string' ? params.variant : null),
  };
}

/** Locale building blocks: card labels, cells, lists, directions, ports, data facts, corners. */
export function templateHelpers(locale: Locale): TemplateHelpers {
  const words = catalog[locale];
  const tag = LOCALE_INTL_TAGS[locale];
  const lists = new Intl.ListFormat(tag, { style: 'long', type: 'conjunction' });
  const orientation = (value: string): Orientation => {
    if (value === 'N' || value === 'E' || value === 'S' || value === 'W') return value;
    throw new MissingParamError('direction');
  };
  const kindLabel = (kind: string) => (words.kinds[kind as CardKind] ?? kind).toLocaleUpperCase(tag);
  return {
    card: (markerId, kind) => `#${markerId} ${kindLabel(kind)}`,
    kindLabel,
    cell: (row, col) => `(${row},${col})`,
    list: (items) => lists.format(items),
    toward: (direction) => words.toward[orientation(direction)],
    side: (direction) => words.side[orientation(direction)],
    port: (port) => words.port[port as 'NEXT' | 'TRUE' | 'FALSE'] ?? port,
    fact: (fact) => words.facts[fact as DataFact] ?? fact,
    corner: (fiducial) => words.corners[fiducial as 0 | 1 | 2 | 3] ?? String(fiducial),
    branch: (port) => common[locale].branch[port],
  };
}

/**
 * Text of a diagnostic in the UI language. Spanish shows the canonical `message`/`suggestion`;
 * other languages render from `code` + `params` and fall back to the Spanish text (flagged) when a
 * stored diagnostic predates structured params.
 */
export function localizeDiagnostic(diagnostic: Diagnostic, locale: Locale): LocalizedDiagnostic {
  const dictionary = diagnostics[locale];
  const title = dictionary.titles[diagnostic.code] ?? DIAGNOSTIC_TITLES_ES[diagnostic.code] ?? diagnostic.code;
  const canonical = { title, message: diagnostic.message, suggestion: diagnostic.suggestion ?? null };
  if (locale === 'es') return { ...canonical, fallback: false };
  const template = dictionary.templates[diagnostic.code];
  if (!template || !diagnostic.params) return { ...canonical, fallback: true };
  try {
    const rendered = template({ p: reader(diagnostic.params), d: diagnostic, h: templateHelpers(locale) });
    return { title, message: rendered.message, suggestion: rendered.suggestion ?? null, fallback: false };
  } catch (error) {
    if (error instanceof MissingParamError) return { ...canonical, fallback: true };
    throw error;
  }
}
