import { z } from 'zod';
import boardV1Json from '../catalog/board-v1.json';
import cardsV1Json from '../catalog/cards-v1.json';
import { BoardTemplateSchema, type BoardTemplate } from './board';
import { CARD_KIND_SPECS, CardKindSchema, type CardKind } from './cards';

export const CardCatalogEntrySchema = z.object({
  markerId: z.number().int().min(10).max(89),
  kind: CardKindSchema,
  cardInstanceId: z.string().regex(/^[a-z]+-[0-9]{2}$/),
  set: z.string().min(1).max(16),
  enabled: z.boolean(),
});
export type CardCatalogEntry = z.infer<typeof CardCatalogEntrySchema>;

export const CardCatalogSchema = z
  .object({
    catalogVersion: z.literal('cards-v1'),
    dictionary: z.literal('DICT_4X4_100'),
    reservedFiducialIds: z.tuple([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    instanceIdRange: z.object({ min: z.literal(10), max: z.literal(89) }),
    cards: z.array(CardCatalogEntrySchema).min(1).max(80),
  })
  .superRefine((catalog, ctx) => {
    const markerIds = new Set<number>();
    const instanceIds = new Set<string>();
    for (const card of catalog.cards) {
      if (markerIds.has(card.markerId)) {
        ctx.addIssue({ code: 'custom', message: `markerId duplicado ${card.markerId}` });
      }
      if (instanceIds.has(card.cardInstanceId)) {
        ctx.addIssue({ code: 'custom', message: `cardInstanceId duplicado ${card.cardInstanceId}` });
      }
      const expectedId = `${CARD_KIND_SPECS[card.kind].instancePrefix}-${card.markerId}`;
      if (card.cardInstanceId !== expectedId) {
        ctx.addIssue({
          code: 'custom',
          message: `cardInstanceId ${card.cardInstanceId} debería ser ${expectedId}`,
        });
      }
      markerIds.add(card.markerId);
      instanceIds.add(card.cardInstanceId);
    }
  });
export type CardCatalog = z.infer<typeof CardCatalogSchema>;

let cachedTemplate: BoardTemplate | undefined;
let cachedCatalog: CardCatalog | undefined;

export function getBoardTemplate(): BoardTemplate {
  cachedTemplate ??= BoardTemplateSchema.parse(boardV1Json);
  return cachedTemplate;
}

export function getCardCatalog(): CardCatalog {
  cachedCatalog ??= CardCatalogSchema.parse(cardsV1Json);
  return cachedCatalog;
}

export interface CatalogIndex {
  readonly catalog: CardCatalog;
  readonly byMarkerId: ReadonlyMap<number, CardCatalogEntry>;
  readonly byInstanceId: ReadonlyMap<string, CardCatalogEntry>;
}

export function indexCatalog(catalog: CardCatalog = getCardCatalog()): CatalogIndex {
  return {
    catalog,
    byMarkerId: new Map(catalog.cards.map((card) => [card.markerId, card])),
    byInstanceId: new Map(catalog.cards.map((card) => [card.cardInstanceId, card])),
  };
}

export function isFiducialId(markerId: number): boolean {
  return markerId >= 0 && markerId <= 3;
}

export function kindLabelEs(kind: CardKind): string {
  return CARD_KIND_SPECS[kind].labelEs;
}
