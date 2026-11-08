/**
 * Seeds the immutable reference data (board template + closed card catalog).
 * Demo users/workspaces are created on demand by POST /api/demo/session with fictitious data only.
 * Idempotent: safe to run on every deploy.
 */
import 'dotenv/config';
import { getBoardTemplate, getCardCatalog } from '@tactiloom/contracts';
import { getPrisma } from '@tactiloom/db';

const prisma = getPrisma();
const template = getBoardTemplate();
const catalog = getCardCatalog();

await prisma.boardTemplate.upsert({
  where: { id: template.templateId },
  create: {
    id: template.templateId,
    version: template.protocolVersion,
    cols: template.columns,
    rows: template.rows,
    catalogVersion: catalog.catalogVersion,
    description: template.description,
    geometry: template,
  },
  update: {
    version: template.protocolVersion,
    cols: template.columns,
    rows: template.rows,
    catalogVersion: catalog.catalogVersion,
    description: template.description,
    geometry: template,
  },
});

for (const card of catalog.cards) {
  const data = {
    type: card.kind,
    cardInstanceId: card.cardInstanceId,
    version: catalog.catalogVersion,
    set: card.set,
    printAssetPath: `assets/board-kit/cards/card-${card.markerId}.svg`,
    enabled: card.enabled,
  };
  await prisma.cardCatalogEntry.upsert({ where: { markerId: card.markerId }, create: { markerId: card.markerId, ...data }, update: data });
}

const count = await prisma.cardCatalogEntry.count();
console.log(`seed: board template ${template.templateId}, ${count} card catalog entries`);
await prisma.$disconnect();
