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
 * CSRF defence for cookie-authenticated mutations: the Origin must be ours and the request must
 * not be cross-site (SameSite=Lax cookies are the second layer).
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') throw new HttpError(403, 'CSRF_REJECTED', 'Petición entre sitios rechazada.');
  if (origin !== null && !env().allowedOrigins.includes(origin)) {
    throw new HttpError(403, 'CSRF_REJECTED', 'Origen no permitido.');
  }
}

export async function parseJson<T>(request: Request, schema: ZodType<T>, maxBytes = 256 * 1024): Promise<T> {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo de la petición es demasiado grande.');
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Se esperaba application/json.');
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo de la petición es demasiado grande.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
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

export function clientIp(request: Request): string {
  if (env().TRUST_PROXY === '1') {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return 'direct';
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Small in-memory fixed-window limiter (per process) for unauthenticated endpoints. */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new HttpError(429, 'RATE_LIMITED', 'Demasiadas peticiones. Espera unos minutos.');
}
