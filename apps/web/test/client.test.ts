import { CARD_KIND_SPECS, CARD_KINDS, RUN_STATUSES } from '@tactiloom/contracts';
import { describe, expect, it } from 'vitest';
import { contrastRatio, textOn } from '../lib/client/contrast';
import { es } from '../lib/i18n/es';

describe('UI strings', () => {
  it('label every run status, card kind and source mode', () => {
    for (const status of RUN_STATUSES) expect(es.runStatus[status]).toBeTruthy();
    for (const kind of CARD_KINDS) expect(es.kinds[kind]).toBeTruthy();
    expect(es.modes.simulator).toBe('Simulador digital: no utiliza cámara');
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
