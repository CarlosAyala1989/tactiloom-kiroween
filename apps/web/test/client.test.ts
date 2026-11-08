import { BRANCH_LABELS, CARD_KIND_SPECS, CARD_KINDS, CARD_PRINTED_TITLES, DIAGNOSTIC_CODES, LOCALES, RUN_STATUSES } from '@tactiloom/contracts';
import { describe, expect, it } from 'vitest';
import { contrastRatio, textOn } from '../lib/client/contrast';
import { DICTIONARIES } from '../lib/i18n';

const es = DICTIONARIES.es;

describe('UI strings', () => {
  it('label every run status, card kind, source mode and diagnostic code in every language', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      for (const status of RUN_STATUSES) expect(t.runStatus[status], `${locale} ${status}`).toBeTruthy();
      for (const kind of CARD_KINDS) {
        expect(t.catalog.kinds[kind], `${locale} ${kind}`).toBeTruthy();
        expect(t.catalog.short[kind], `${locale} ${kind}`).toBeTruthy();
        expect(t.catalog.description[kind], `${locale} ${kind}`).toBeTruthy();
        expect(t.catalog.effect[kind], `${locale} ${kind}`).toBeTruthy();
      }
      for (const code of DIAGNOSTIC_CODES) expect(t.diagnostics.titles[code], `${locale} ${code}`).toBeTruthy();
      expect(t.branch).toEqual(BRANCH_LABELS[locale]);
    }
    expect(es.modes.simulator).toBe('Simulador digital: no utiliza cámara');
  });

  it('keeps the Spanish catalog wording of the contracts', () => {
    for (const kind of CARD_KINDS) {
      expect(es.catalog.kinds[kind]).toBe(CARD_KIND_SPECS[kind].labelEs);
      expect(es.catalog.description[kind]).toBe(CARD_KIND_SPECS[kind].descriptionEs);
      expect(es.catalog.effect[kind]).toBe(CARD_KIND_SPECS[kind].effectEs);
    }
  });

  it('prints card titles that the standard PDF fonts can encode (WinAnsi)', () => {
    const winAnsiExtras = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
    for (const locale of LOCALES) {
      for (const kind of CARD_KINDS) {
        for (const char of CARD_PRINTED_TITLES[locale][kind]) {
          const code = char.codePointAt(0) ?? 0;
          expect(code < 0x100 || winAnsiExtras.has(char), `${locale} ${kind} «${char}»`).toBe(true);
        }
      }
    }
  });
});

type Leaf = readonly [path: string, kind: string, text: string | null];

/**
 * Flattens a dictionary into [path, kind, text]. Functions are compared by arity (their outputs need
 * typed arguments and are covered by the component and diagnostics tests).
 */
function leaves(value: unknown, path = ''): Leaf[] {
  if (typeof value === 'string') return [[path, 'string', value]];
  if (typeof value === 'function') return [[path, `function/${value.length}`, null]];
  if (Array.isArray(value)) return [[`${path}[]`, `array/${value.length}`, null], ...value.flatMap((item, index) => leaves(item, `${path}[${index}]`))];
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) => leaves(child, path ? `${path}.${key}` : key));
  return [[path, typeof value, String(value)]];
}

describe('dictionaries in English, Italian and French mirror the Spanish one', () => {
  // Spanish shows canonical server texts, so it has no diagnostic templates and no per-code error texts by design.
  const shape = (locale: (typeof LOCALES)[number]) => {
    const t = DICTIONARIES[locale];
    return leaves({ ...t, diagnostics: { ...t.diagnostics, templates: {} }, errors: { ...t.errors, api: {}, runtime: {} } });
  };
  const spanish = shape('es');

  it.each(['en', 'it', 'fr'] as const)('%s has the same keys, value kinds, arities and list lengths', (locale) => {
    expect(shape(locale).map(([path, kind]) => `${path}:${kind}`)).toEqual(spanish.map(([path, kind]) => `${path}:${kind}`));
  });

  it.each(LOCALES)('%s has no empty texts or unresolved placeholders', (locale) => {
    for (const [path, , text] of shape(locale)) {
      if (text === null) continue;
      expect(text.trim(), `${locale} ${path}`).not.toBe('');
      expect(text, `${locale} ${path}`).not.toMatch(/\{[A-Za-z_]\w*\}|\$\{|undefined|NaN|\[object /);
    }
  });

  it('has per-code error texts for every runtime failure code and the same API codes in every non-Spanish language', () => {
    const runtimeCodes = DIAGNOSTIC_CODES.slice(DIAGNOSTIC_CODES.indexOf('IR_INVALID'));
    const apiCodes = Object.keys(DICTIONARIES.en.errors.api).sort();
    for (const locale of ['en', 'it', 'fr'] as const) {
      expect(Object.keys(DICTIONARIES[locale].errors.api).sort(), locale).toEqual(apiCodes);
      for (const code of runtimeCodes) expect(DICTIONARIES[locale].errors.runtime[code], `${locale} ${code}`).toBeTruthy();
    }
  });

  it('has a diagnostic template for every vision and compiler code in every non-Spanish language', () => {
    const runtimeOnly = new Set(DIAGNOSTIC_CODES.slice(DIAGNOSTIC_CODES.indexOf('IR_HASH_MISMATCH')));
    for (const locale of ['en', 'it', 'fr'] as const) {
      const missing = DIAGNOSTIC_CODES.filter((code) => !runtimeOnly.has(code) && !DICTIONARIES[locale].diagnostics.templates[code]);
      expect(missing, locale).toEqual([]);
    }
  });
});

describe('colour contrast of card labels (WCAG AA, small text ≥ 4.5:1)', () => {
  it.each(CARD_KINDS.map((kind) => [kind, CARD_KIND_SPECS[kind].color] as const))('%s', (_kind, color) => {
    expect(contrastRatio(color, textOn(color))).toBeGreaterThanOrEqual(4.5);
  });

  it('computes known ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});
