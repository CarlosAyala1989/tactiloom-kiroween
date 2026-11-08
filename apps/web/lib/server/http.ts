import 'server-only';
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { env } from './env';

export function newRequestId(): string {
  return `req_${randomBytes(10).toString('hex')}`;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function errorResponse(status: number, code: string, message: string, requestId: string, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: { code, message, requestId, ...(details === undefined ? {} : { details }) } },
    { status, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } },
  );
}

export function ok<T>(body: T, requestId: string, init: { status?: number } = {}): NextResponse {
  return NextResponse.json(body, { status: init.status ?? 200, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
}

/**
 * CSRF defence for cookie-authenticated mutations: browsers always send Origin on POST, so a
 * mutation must carry an allowed Origin (or be explicitly same-origin). SameSite=Lax cookies are
 * the second layer.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site' || fetchSite === 'same-site') throw new HttpError(403, 'CSRF_REJECTED', 'Petición entre sitios rechazada.');
  if (origin === null) {
    if (fetchSite === 'same-origin') return;
    throw new HttpError(403, 'CSRF_REJECTED', 'Falta la cabecera Origin.');
  }
  if (!env().allowedOrigins.includes(origin)) throw new HttpError(403, 'CSRF_REJECTED', 'Origen no permitido.');
}

/**
 * Reads the request body with a hard byte limit, also for chunked bodies without Content-Length
 * (Next.js does not cap route-handler bodies by itself).
 */
export async function readBodyLimited(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo de la petición es demasiado grande.');
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo de la petición es demasiado grande.');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function mediaType(request: Request): string {
  return (request.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
}

/** multipart/form-data parsed from a size-limited buffer. */
export async function parseFormLimited(request: Request, maxBytes: number): Promise<FormData> {
  if (mediaType(request) !== 'multipart/form-data') throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Se esperaba multipart/form-data.');
  const body = await readBodyLimited(request, maxBytes);
  try {
    return await new Response(new Blob([new Uint8Array(body)]), { headers: { 'content-type': request.headers.get('content-type') ?? '' } }).formData();
  } catch {
    throw new HttpError(400, 'BAD_REQUEST', 'Formulario multipart inválido.');
  }
}

export async function parseJson<T>(request: Request, schema: ZodType<T>, maxBytes = 256 * 1024): Promise<T> {
  if (mediaType(request) !== 'application/json') throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Se esperaba application/json.');
  const body = await readBodyLimited(request, maxBytes);
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'JSON inválido.');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(
      400,
      'VALIDATION_FAILED',
      'La petición no cumple el contrato.',
      parsed.error.issues.slice(0, 10).map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  return parsed.data;
}

/** Wraps a route handler: request id, uniform error envelope, no stack traces to clients. */
export function handler<C>(fn: (request: Request, context: C, requestId: string) => Promise<Response>) {
  return async (request: Request, context: C): Promise<Response> => {
    const requestId = newRequestId();
    try {
      return await fn(request, context, requestId);
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error.status, error.code, error.message, requestId, error.details);
      console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', service: 'web', requestId, event: 'unhandled', message: error instanceof Error ? error.message : String(error) }));
      return errorResponse(500, 'INTERNAL_ERROR', 'Error interno. Inténtalo de nuevo.', requestId);
    }
  };
}

/**
 * Client key for rate limiting. With TRUST_PROXY_HOPS=N the N-th X-Forwarded-For entry from the
 * right (appended by our own reverse proxies) is used; leftmost entries are client-controlled.
 * Without a trusted proxy every client shares one key (local / single-user deployments).
 */
export function clientKey(request: Request, hops: number = env().TRUST_PROXY_HOPS): string {
  if (hops > 0) {
    const entries = (request.headers.get('x-forwarded-for') ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    const candidate = entries[entries.length - hops];
    if (candidate && /^[0-9a-fA-F:.]{2,45}$/.test(candidate)) return candidate;
    return 'unknown-proxy-client';
  }
  return 'direct';
}

const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 10_000;

/** Small in-memory fixed-window limiter (per process) with bounded memory (oldest keys evicted). */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.delete(key);
    while (buckets.size >= MAX_BUCKETS) {
      const oldest = buckets.keys().next().value;
      if (oldest === undefined) break;
      buckets.delete(oldest);
    }
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new HttpError(429, 'RATE_LIMITED', 'Demasiadas peticiones. Espera unos minutos.');
}
