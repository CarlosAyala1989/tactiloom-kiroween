import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BoardStateSchema,
  CARD_KIND_SPECS,
  canonicalHash,
  canonicalStringify,
  getBoardTemplate,
  getCardCatalog,
  indexCatalog,
  isLocale,
  LOCALES,
  negotiateLocale,
  opposite,
  PARAM_SCHEMAS,
  rotateClockwise,
} from '../src/index';
import { JSON_SCHEMA_TARGETS, renderJsonSchemaFile } from '../src/json-schemas';

const here = dirname(fileURLToPath(import.meta.url));

describe('geometry', () => {
  it('rotates clockwise and computes opposites', () => {
    expect(rotateClockwise('N')).toBe('E');
    expect(rotateClockwise('E')).toBe('S');
    expect(rotateClockwise('S')).toBe('W');
    expect(rotateClockwise('W')).toBe('N');
    expect(opposite('E')).toBe('W');
    expect(opposite('S')).toBe('N');
  });
});

describe('catalog and template', () => {
  it('loads a consistent board template', () => {
    const template = getBoardTemplate();
    expect(template.columns).toBe(8);
    expect(template.rows).toBe(4);
    expect(template.fiducials.map((f) => f.markerId)).toEqual([0, 1, 2, 3]);
    // fiducials must lie outside the grid cells
    const gridRight = template.grid.x + template.columns * template.grid.cellWidth;
    const gridBottom = template.grid.y + template.rows * template.grid.cellHeight;
    for (const fiducial of template.fiducials) {
      const half = fiducial.size / 2;
      const insideX = fiducial.center.x + half > template.grid.x && fiducial.center.x - half < gridRight;
      const insideY = fiducial.center.y + half > template.grid.y && fiducial.center.y - half < gridBottom;
      expect(insideX && insideY).toBe(false);
    }
    // cards are smaller than cells
    expect(template.card.width).toBeLessThan(template.grid.cellWidth);
    expect(template.card.height).toBeLessThan(template.grid.cellHeight);
  });

  it('has unique marker and instance ids that follow the prefix convention', () => {
    const index = indexCatalog(getCardCatalog());
    expect(index.byMarkerId.size).toBe(getCardCatalog().cards.length);
    for (const card of getCardCatalog().cards) {
      expect(card.cardInstanceId).toBe(`${CARD_KIND_SPECS[card.kind].instancePrefix}-${card.markerId}`);
      expect(card.markerId).toBeGreaterThanOrEqual(10);
      expect(card.markerId).toBeLessThanOrEqual(89);
    }
  });

  it('contains the mandatory demo set 10..19', () => {
    const index = indexCatalog();
    const expected = ['START', 'INPUT_FILE', 'EXTRACT_TEXT', 'VALIDATE_FIELDS', 'CONDITION', 'CREATE_REPORT', 'SAVE_REPORT', 'END', 'REQUEST_REVIEW', 'END'];
    expected.forEach((kind, offset) => expect(index.byMarkerId.get(10 + offset)?.kind).toBe(kind));
  });
});

describe('params', () => {
  it('fills defaults and normalises field order', () => {
    expect(PARAM_SCHEMAS.VALIDATE_FIELDS.parse({})).toEqual({ requiredFields: ['name', 'email', 'workshop'] });
    expect(PARAM_SCHEMAS.VALIDATE_FIELDS.parse({ requiredFields: ['workshop', 'name'] })).toEqual({
      requiredFields: ['name', 'workshop'],
    });
    expect(PARAM_SCHEMAS.INPUT_FILE.parse({})).toEqual({ uploadedFileId: null });
    // No default: pre-i18n programs keep their canonical params (and contentHash).
    expect(PARAM_SCHEMAS.CREATE_REPORT.parse({})).toEqual({ template: 'workshop-summary-v1', format: 'both' });
    expect(PARAM_SCHEMAS.CREATE_REPORT.parse({ language: 'fr' }).language).toBe('fr');
    expect(PARAM_SCHEMAS.EXTRACT_TEXT.parse({ language: 'it' })).toEqual({ language: 'it' });
  });

  it('rejects unsafe values', () => {
    expect(PARAM_SCHEMAS.SAVE_REPORT.safeParse({ baseName: '../../etc/passwd' }).success).toBe(false);
    expect(PARAM_SCHEMAS.INPUT_FILE.safeParse({ uploadedFileId: '../x' }).success).toBe(false);
    expect(PARAM_SCHEMAS.REQUEST_REVIEW.safeParse({ label: '<script>alert(1)</script>' }).success).toBe(false);
    expect(PARAM_SCHEMAS.CONDITION.safeParse({ predicate: 'process.exit()' }).success).toBe(false);
    expect(PARAM_SCHEMAS.START.safeParse({ command: 'rm -rf /' }).success).toBe(false);
    expect(PARAM_SCHEMAS.VALIDATE_FIELDS.safeParse({ requiredFields: ['name', 'name'] }).success).toBe(false);
    expect(PARAM_SCHEMAS.CREATE_REPORT.safeParse({ language: 'de' }).success).toBe(false);
  });
});

describe('locales', () => {
  it('lists the four supported languages', () => {
    expect(LOCALES).toEqual(['es', 'en', 'it', 'fr']);
    expect(isLocale('it')).toBe(true);
    expect(isLocale('de')).toBe(false);
  });

  it('negotiates Accept-Language with weights and fallbacks', () => {
    expect(negotiateLocale('fr-FR,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(negotiateLocale('de-DE,it;q=0.7,en;q=0.9')).toBe('en');
    expect(negotiateLocale('de,nl;q=0.5')).toBe('es');
    expect(negotiateLocale('en;q=0, it')).toBe('it');
    expect(negotiateLocale('')).toBe('es');
    expect(negotiateLocale(null)).toBe('es');
    expect(negotiateLocale('garbage;;;q=x')).toBe('es');
  });
});

describe('canonical JSON', () => {
  it('is independent of key order', () => {
    expect(canonicalStringify({ b: 1, a: [1, { d: 2, c: 'x' }] })).toBe('{"a":[1,{"c":"x","d":2}],"b":1}');
    expect(canonicalHash({ a: 1, b: 2 })).toBe(canonicalHash({ b: 2, a: 1 }));
    expect(canonicalHash({ a: 1 })).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('rejects lossy values', () => {
    expect(() => canonicalStringify({ a: Number.NaN })).toThrow();
    expect(() => canonicalStringify({ a: new Date(0) })).toThrow();
    expect(() => canonicalStringify(() => 1)).toThrow();
  });

  it('matches a known sha256 vector', () => {
    // sha256("{}") computed independently with `printf '{}' | sha256sum`
    expect(canonicalHash({})).toBe('sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a');
  });
});

describe('BoardState schema', () => {
  it('accepts the documented example and applies defaults', () => {
    const state = BoardStateSchema.parse({
      protocolVersion: 'tactiloom-board/1',
      sourceMode: 'simulator',
      board: { templateId: 'board-v1', columns: 8, rows: 4, calibrated: true },
      cards: [{ markerId: 10, row: 0, col: 0, orientation: 'E' }],
    });
    expect(state.cards[0]?.quality).toBeNull();
    expect(state.diagnostics).toEqual([]);
  });
});

describe('published JSON Schemas', () => {
  it.each(JSON_SCHEMA_TARGETS.map((target) => [target.file, target] as const))(
    '%s is up to date with the Zod source (run `pnpm contracts:schemas`)',
    (file, target) => {
      const committed = readFileSync(join(here, '..', 'schemas', file), 'utf8');
      expect(committed).toBe(renderJsonSchemaFile(target));
    },
  );
});
