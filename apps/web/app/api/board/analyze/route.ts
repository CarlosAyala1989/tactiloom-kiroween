import { createHash } from 'node:crypto';
import { boardStateFromDetection } from '@tactiloom/contracts';
import { readScenarioImage } from '@/lib/server/assets';
import { audit } from '@/lib/server/audit';
import { assertSameOrigin, handler, HttpError, ok, parseFormLimited } from '@/lib/server/http';
import { json, prisma } from '@/lib/server/prisma';
import { consumeQuota, withAnalysisSlot } from '@/lib/server/quotas';
import { requireSession } from '@/lib/server/session';
import { analyzeWithVision } from '@/lib/server/vision';

export const dynamic = 'force-dynamic';
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/**
 * Photo or uploaded image (or a whitelisted gallery scenario) → OpenCV service → stored capture.
 * Analysing never compiles into an executable job and never runs anything. The image itself is
 * not persisted (only its sha256 and the detection JSON).
 */
export const POST = handler(async (request, _context: unknown, requestId) => {
  assertSameOrigin(request);
  const session = await requireSession();
  const form = await parseFormLimited(request, MAX_IMAGE_BYTES + 64 * 1024);
  await consumeQuota(session.workspaceId, 'ANALYZE');
  const scenarioId = form.get('scenarioId');
  const requestedMode = form.get('sourceMode');
  let bytes: Uint8Array;
  let filename = 'board.jpg';
  let mime = 'application/octet-stream';
  let sourceMode: 'physical' | 'image' = requestedMode === 'physical' ? 'physical' : 'image';
  let scenario: string | null = null;
  if (typeof scenarioId === 'string' && scenarioId.length > 0) {
    const found = await readScenarioImage(scenarioId);
    if (!found) throw new HttpError(404, 'NOT_FOUND', 'Escenario de demostración no encontrado.');
    bytes = new Uint8Array(found.bytes);
    filename = found.scenario.file.split('/').pop() ?? 'scenario.png';
    mime = 'image/png';
    sourceMode = 'image';
    scenario = found.scenario.id;
  } else {
    const image = form.get('image');
    if (!(image instanceof File)) throw new HttpError(400, 'BAD_REQUEST', 'Falta el campo de archivo «image».');
    if (image.size > MAX_IMAGE_BYTES) throw new HttpError(413, 'IMAGE_TOO_LARGE', 'La imagen supera 12 MB.');
    bytes = new Uint8Array(await image.arrayBuffer());
    filename = 'upload';
    mime = image.type || 'application/octet-stream';
  }
  const detection = await withAnalysisSlot(session.workspaceId, () => analyzeWithVision(bytes, filename, mime, sourceMode, requestId));
  const boardState = boardStateFromDetection(detection);
  const { overlay, ...detectionWithoutOverlay } = detection;
  const capture = await prisma().boardCapture.create({
    data: {
      workspaceId: session.workspaceId,
      sourceMode,
      requestId: detection.requestId,
      imageSha256: createHash('sha256').update(bytes).digest('hex'),
      detectorVersion: detection.detectorVersion,
      detectionJson: json(detectionWithoutOverlay),
      boardStateJson: json(boardState),
      diagnostics: json(detection.diagnostics),
      cardsDetected: detection.cards.length,
      calibrated: detection.board.calibrated,
    },
  });
  await audit('BOARD_ANALYZED', {
    workspaceId: session.workspaceId,
    actorId: session.userId,
    entityId: capture.id,
    requestId,
    metadata: { sourceMode, scenario, cards: detection.cards.length, calibrated: detection.board.calibrated, codes: detection.diagnostics.map((d) => d.code) },
  });
  return ok({ captureId: capture.id, scenarioId: scenario, detection: { ...detectionWithoutOverlay, overlay }, boardState }, requestId);
});
