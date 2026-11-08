import { CARD_KIND_SPECS, getBoardTemplate, getCardCatalog, PARAM_UI } from '@tactiloom/contracts';
import { handler, ok } from '@/lib/server/http';

export const GET = handler(async (_request, _context: unknown, requestId) =>
  ok(
    {
      catalog: getCardCatalog(),
      kinds: Object.values(CARD_KIND_SPECS).map((spec) => ({
        kind: spec.kind,
        labelEs: spec.labelEs,
        labelEn: spec.labelEn,
        descriptionEs: spec.descriptionEs,
        color: spec.color,
        hasInput: spec.hasInput,
        outputs: spec.outputs,
        requires: spec.requires,
        produces: spec.produces,
        effectEs: spec.effectEs,
        params: PARAM_UI[spec.kind],
      })),
      board: getBoardTemplate(),
    },
    requestId,
  ),
);
