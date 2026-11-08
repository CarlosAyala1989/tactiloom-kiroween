import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from './env';
import { HttpError } from './http';
import { prisma } from './prisma';

export const SESSION_COOKIE = 'tactiloom_session';

/** `__Host-` prefix (Secure, Path=/, no Domain) whenever the public origin is HTTPS. */
export function sessionCookieName(): string {
  return new URL(env().PUBLIC_ORIGIN).protocol === 'https:' ? `__Host-${SESSION_COOKIE}` : SESSION_COOKIE;
}

export interface SessionContext {
  readonly sessionId: string;
  readonly userId: string;
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly expiresAt: Date;
}

/** Tokens are random 256-bit values; only an HMAC (keyed with SESSION_SECRET) is stored. */
export function hashToken(token: string): string {
  return createHmac('sha256', env().SESSION_SECRET).update(token).digest('hex');
}

export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: new URL(env().PUBLIC_ORIGIN).protocol === 'https:',
    path: '/',
    expires: expiresAt,
  };
}

export async function readSession(): Promise<SessionContext | null> {
  const store = await cookies();
  const token = store.get(sessionCookieName())?.value;
  if (!token || token.length > 128) return null;
  const session = await prisma().session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { workspace: { select: { id: true, name: true, expiresAt: true } } },
  });
  const now = new Date();
  if (!session || session.expiresAt < now || (session.workspace.expiresAt !== null && session.workspace.expiresAt < now)) return null;
  return {
    sessionId: session.id,
    userId: session.userId,
    workspaceId: session.workspaceId,
    workspaceName: session.workspace.name,
    expiresAt: session.expiresAt,
  };
}

/** Every API call that touches workspace data goes through here: workspaceId always comes from the session. */
export async function requireSession(): Promise<SessionContext> {
  const session = await readSession();
  if (!session) throw new HttpError(401, 'NO_SESSION', 'No hay una sesión de demo activa. Recarga la página para crear una.');
  return session;
}
