'use client';

import { useState, type ReactNode } from 'react';
import type { RunStatus } from '@ritualos/contracts';
import { es } from '@/lib/i18n/es';

export function ModeBadge({ mode }: { mode: 'physical' | 'image' | 'simulator' | string }) {
  const styles: Record<string, string> = {
    physical: 'border-ok/60 text-ok',
    image: 'border-info/60 text-info',
    simulator: 'border-warn/60 text-warn',
  };
  const label = (es.modes as Record<string, string>)[mode] ?? mode;
  return <span className={`chip ${styles[mode] ?? ''}`}>{label}</span>;
}

const STATUS_STYLE: Record<RunStatus, string> = {
  DRAFT: 'text-muted',
  COMPILED: 'text-info',
  AWAITING_APPROVAL: 'border-amber/70 text-amber-strong',
  QUEUED: 'text-info',
  RUNNING: 'border-info/70 text-info',
  SUCCEEDED: 'border-ok/70 text-ok',
  FAILED: 'border-err/70 text-err',
  CANCELLED: 'text-muted',
};

export function StatusPill({ status }: { status: RunStatus }) {
  return (
    <span className={`chip ${STATUS_STYLE[status]}`} data-status={status}>
      {es.runStatus[status]}
    </span>
  );
}

export function HashLabel({ value, label = 'hash' }: { value: string | null | undefined; label?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-muted">—</span>;
  const short = value.replace('sha256:', '').slice(0, 12);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="mono rounded bg-ink-950 px-1.5 py-0.5 text-xs" title={value} aria-label={`${label}: ${value}`}>
        {value.startsWith('sha256:') ? 'sha256:' : ''}
        {short}…
      </span>
      <button
        type="button"
        className="text-xs text-muted underline hover:text-paper"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? 'copiado' : es.actions.copy}
      </button>
    </span>
  );
}

export function Section({ title, children, actions, id }: { title: string; children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section className="panel p-5" aria-labelledby={id}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        {actions && <div className="ml-auto flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg border border-err/60 bg-err/10 px-3 py-2 text-sm text-err">
      {error}
    </p>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' });
}
