import { listScenarios } from '@/lib/server/assets';
import { handler, ok } from '@/lib/server/http';

export const GET = handler(async (_request, _context: unknown, requestId) => {
  const scenarios = await listScenarios();
  return ok(
    {
      note: 'Imágenes sintéticas renderizadas desde los PDF del kit y fotografiadas por software; el servidor las analiza con OpenCV píxel a píxel.',
      scenarios: scenarios.map((scenario) => ({
        id: scenario.id,
        titleEs: scenario.titleEs,
        descriptionEs: scenario.descriptionEs,
        provenance: scenario.provenance,
        imageUrl: `/api/demo/scenarios/${scenario.id}/image`,
        expected: { calibrated: scenario.vision.calibrated, cards: scenario.vision.cards.length, visionErrors: scenario.vision.errorCodes, compileValid: scenario.compile.valid, compileErrors: scenario.compile.errorCodes },
      })),
    },
    requestId,
  );
});
