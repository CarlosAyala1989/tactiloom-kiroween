import { describe, expect, it } from 'vitest';
import { assertSameOrigin, clientKey, HttpError, parseFormLimited, parseJson, rateLimit, readBodyLimited } from '../lib/server/http';
import { displayName } from '../lib/server/uploads';
import { z } from 'zod';

const ORIGIN = 'https://demo.tactiloom.test';

function chunkedRequest(totalBytes: number, chunkBytes = 64 * 1024, headers: Record<string, string> = {}): Request {
  let sent = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (cancelled) return;
      if (sent >= totalBytes) {
        controller.close();
        return;
      }
      const size = Math.min(chunkBytes, totalBytes - sent);
      sent += size;
      controller.enqueue(new Uint8Array(size).fill(0x61));
    },
    cancel() {
      cancelled = true;
    },
  });
  // No Content-Length: the body arrives chunked.
  return new Request(`${ORIGIN}/api/x`, { method: 'POST', body, headers, duplex: 'half' } as RequestInit & { duplex: 'half' });
}

async function expectHttpError(promise: Promise<unknown> | (() => unknown), status: number, code: string) {
  try {
    await (typeof promise === 'function' ? promise() : promise);
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(status);
    expect((error as HttpError).code).toBe(code);
    return;
  }
  throw new Error('expected an HttpError');
}

describe('readBodyLimited', () => {
  it('stops chunked bodies without Content-Length at the limit', async () => {
    await expectHttpError(readBodyLimited(chunkedRequest(5 * 1024 * 1024), 1024 * 1024), 413, 'PAYLOAD_TOO_LARGE');
  });

  it('rejects a declared Content-Length above the limit and malformed values', async () => {
    const big = new Request(`${ORIGIN}/api/x`, { method: 'POST', body: 'x', headers: { 'content-length': '999999999' } });
    await expectHttpError(readBodyLimited(big, 1024), 413, 'PAYLOAD_TOO_LARGE');
  });

  it('returns small bodies intact', async () => {
    const body = await readBodyLimited(chunkedRequest(3000, 1000), 4096);
    expect(body.byteLength).toBe(3000);
  });
});

describe('parseJson / parseFormLimited', () => {
  const schema = z.object({ a: z.number() });

  it('accepts exactly application/json', async () => {
    const ok = new Request(`${ORIGIN}/api/x`, { method: 'POST', body: '{"a":1}', headers: { 'content-type': 'application/json; charset=utf-8' } });
    expect(await parseJson(ok, schema)).toEqual({ a: 1 });
    const sneaky = new Request(`${ORIGIN}/api/x`, { method: 'POST', body: '{"a":1}', headers: { 'content-type': 'text/plain; application/json' } });
    await expectHttpError(parseJson(sneaky, schema), 415, 'UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects oversized chunked JSON', async () => {
    await expectHttpError(parseJson(chunkedRequest(400 * 1024, 64 * 1024, { 'content-type': 'application/json' }), schema), 413, 'PAYLOAD_TOO_LARGE');
  });

  it('parses multipart within the limit and rejects it above', async () => {
    // Serialise the multipart body first (as it arrives over the network) instead of streaming a FormData.
    const asRequest = async (form: FormData) => {
      const encoded = new Response(form);
      const bytes = new Uint8Array(await encoded.arrayBuffer());
      return new Request(`${ORIGIN}/api/x`, { method: 'POST', body: bytes, headers: { 'content-type': encoded.headers.get('content-type') ?? '' } });
    };
    const form = new FormData();
    form.append('file', new Blob(['hola']), 'a.txt');
    const parsed = await parseFormLimited(await asRequest(form), 64 * 1024);
    expect(parsed.get('file')).toBeInstanceOf(File);
    const big = new FormData();
    big.append('file', new Blob([new Uint8Array(200 * 1024)]), 'b.bin');
    await expectHttpError(parseFormLimited(await asRequest(big), 64 * 1024), 413, 'PAYLOAD_TOO_LARGE');
  });
});

describe('assertSameOrigin (CSRF)', () => {
  const request = (headers: Record<string, string>) => new Request(`${ORIGIN}/api/x`, { method: 'POST', headers });

  it('accepts our origin and explicit same-origin fetches', () => {
    expect(() => assertSameOrigin(request({ origin: ORIGIN }))).not.toThrow();
    expect(() => assertSameOrigin(request({ 'sec-fetch-site': 'same-origin' }))).not.toThrow();
  });

  it('rejects foreign origins, cross-site fetches and requests without Origin', async () => {
    await expectHttpError(() => assertSameOrigin(request({ origin: 'https://evil.example' })), 403, 'CSRF_REJECTED');
    await expectHttpError(() => assertSameOrigin(request({ origin: ORIGIN, 'sec-fetch-site': 'cross-site' })), 403, 'CSRF_REJECTED');
    await expectHttpError(() => assertSameOrigin(request({})), 403, 'CSRF_REJECTED');
  });
});

describe('clientKey and rateLimit', () => {
  const withXff = (value: string) => new Request(`${ORIGIN}/api/x`, { headers: { 'x-forwarded-for': value } });

  it('ignores X-Forwarded-For without trusted proxies', () => {
    expect(clientKey(withXff('1.2.3.4'), 0)).toBe('direct');
  });

  it('uses the entry appended by the trusted proxy, not the client-supplied leftmost one', () => {
    expect(clientKey(withXff('6.6.6.6, 203.0.113.9'), 1)).toBe('203.0.113.9');
    expect(clientKey(withXff('6.6.6.6, 203.0.113.9, 10.0.0.2'), 2)).toBe('203.0.113.9');
    expect(clientKey(withXff('not an ip'), 1)).toBe('unknown-proxy-client');
  });

  it('limits per key within the window', async () => {
    const key = `test:${Math.random()}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    await expectHttpError(() => rateLimit(key, 2, 60_000), 429, 'RATE_LIMITED');
  });
});

describe('upload display names', () => {
  it('never keeps directories or control characters', () => {
    expect(displayName('../../etc/passwd', 'text/plain')).toBe('passwd.txt');
    expect(displayName('C:\\Users\\x\\solicitud.pdf', 'application/pdf')).toBe('solicitud.pdf');
    expect(displayName('.env', 'text/plain')).toBe('documento.env.txt');
    expect(displayName('a\u0000b<script>.txt', 'text/plain')).toBe('a_b_script_.txt');
  });
});
