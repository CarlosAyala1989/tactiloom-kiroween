import 'server-only';
import { DetectionResultSchema, type DetectionResult } from '@tactiloom/contracts';
import { env } from './env';
import { HttpError } from './http';

/** Calls the private vision service. The Node side validates the response against the contract too. */
export async function analyzeWithVision(
  bytes: Uint8Array,
  filename: string,
  mime: string,
  sourceMode: 'physical' | 'image',
  requestId: string,
): Promise<DetectionResult> {
  const form = new FormData();
  form.append('image', new Blob([new Uint8Array(bytes)], { type: mime }), filename);
  form.append('sourceMode', sourceMode);
  const token = env().VISION_INTERNAL_TOKEN;
  let response: Response;
  try {
    response = await fetch(`${env().VISION_URL}/v1/analyze`, {
      method: 'POST',
      body: form,
      headers: { 'x-request-id': requestId, ...(token ? { 'x-internal-token': token } : {}) },
      signal: AbortSignal.timeout(25_000),
      cache: 'no-store',
    });
  } catch {
    throw new HttpError(503, 'VISION_UNAVAILABLE', 'El servicio de visión no está disponible. Inténtalo en unos segundos.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    if ([400, 413, 415, 422].includes(response.status)) {
      throw new HttpError(response.status, body?.error?.code ?? 'IMAGE_REJECTED', body?.error?.message ?? 'La imagen fue rechazada.');
    }
    throw new HttpError(503, 'VISION_UNAVAILABLE', 'El servicio de visión respondió con un error.');
  }
  const parsed = DetectionResultSchema.safeParse(await response.json());
  if (!parsed.success) throw new HttpError(502, 'CONTRACT_VIOLATION', 'La respuesta de visión no cumple el contrato tactiloom-board/1.');
  return parsed.data;
}

export async function visionHealth(): Promise<{ ok: boolean; detail?: unknown }> {
  try {
    const response = await fetch(`${env().VISION_URL}/health`, { signal: AbortSignal.timeout(2_000), cache: 'no-store' });
    if (!response.ok) return { ok: false };
    const body = (await response.json()) as { detectorVersion?: string; opencv?: string };
    return { ok: true, detail: { detectorVersion: body.detectorVersion, opencv: body.opencv } };
  } catch {
    return { ok: false };
  }
}
