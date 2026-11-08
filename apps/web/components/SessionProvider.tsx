'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/client/api';

interface SessionState {
  readonly ready: boolean;
  readonly workspaceId: string | null;
  readonly expiresAt: string | null;
  /** Hours until the demo workspace is deleted (computed when the session loads). */
  readonly hoursLeft: number | null;
  readonly error: string | null;
  readonly retry: () => void;
}

const SessionContext = createContext<SessionState>({ ready: false, workspaceId: null, expiresAt: null, hoursLeft: null, error: null, retry: () => undefined });

/** Ensures an isolated demo workspace exists (cookie session with TTL) before workspace pages load data. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<SessionState, 'retry'>>({ ready: false, workspaceId: null, expiresAt: null, hoursLeft: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let session = await api.session();
        if (!session.active) session = await api.createSession();
        const expiresAt = session.expiresAt ?? null;
        const hoursLeft = expiresAt ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3_600_000)) : null;
        if (!cancelled) setState({ ready: true, workspaceId: session.workspaceId ?? null, expiresAt, hoursLeft, error: null });
      } catch (error) {
        if (!cancelled) setState({ ready: false, workspaceId: null, expiresAt: null, hoursLeft: null, error: error instanceof ApiError ? error.message : 'No se pudo crear la sesión de demo.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return <SessionContext.Provider value={{ ...state, retry }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}

export function SessionGate({ children }: { children: ReactNode }) {
  const session = useSession();
  if (session.error) {
    return (
      <div role="alert" className="panel p-6">
        <p className="font-semibold text-err">No se pudo iniciar la sesión de demostración.</p>
        <p className="mt-1 text-sm text-muted">{session.error}</p>
        <button type="button" className="btn mt-4" onClick={session.retry}>
          Reintentar
        </button>
      </div>
    );
  }
  if (!session.ready) {
    return (
      <p className="panel p-6 text-muted" aria-live="polite">
        Preparando tu workspace de demostración aislado…
      </p>
    );
  }
  return <>{children}</>;
}
