import { NextResponse } from 'next/server';
import { createDemoSession } from '@/lib/server/demo';
import { env } from '@/lib/server/env';
import { assertSameOrigin, clientKey, handler, ok, rateLimit } from '@/lib/server/http';
import { cookieOptions, readSession, sessionCookieName } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_request, _context: unknown, requestId) => {
  const session = await readSession();
  return ok(
    session
      ? { active: true, workspaceId: session.workspaceId, workspaceName: session.workspaceName, expiresAt: session.expiresAt }
      : { active: false },
    requestId,
  );
});

/** Creates an isolated demo workspace (TTL + quotas) with fictitious documents. */
export const POST = handler(async (request, _context: unknown, requestId) => {
  assertSameOrigin(request);
  const existing = await readSession();
  if (existing) {
    return ok({ active: true, workspaceId: existing.workspaceId, workspaceName: existing.workspaceName, expiresAt: existing.expiresAt, created: false }, requestId);
  }
  rateLimit(`session:${clientKey(request)}`, env().DEMO_MAX_SESSIONS_PER_IP_HOUR, 3_600_000);
  const created = await createDemoSession(requestId);
  const response = NextResponse.json(
    { active: true, workspaceId: created.workspaceId, expiresAt: created.expiresAt, created: true },
    { status: 201, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } },
  );
  response.cookies.set(sessionCookieName(), created.token, cookieOptions(created.expiresAt));
  return response;
});
