'use client';

import { useEffect, useState } from 'react';
import { api, type HealthView } from '@/lib/client/api';
import { useI18n } from '@/lib/i18n/provider';

/** Small live indicator of vision / worker / database availability (text + colour, never colour only). */
export function SystemStatus() {
  const { t } = useI18n();
  const [health, setHealth] = useState<HealthView | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .health()
        .then((value) => alive && setHealth(value))
        .catch(() => alive && setHealth(null));
    void load();
    const timer = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  const items: [string, boolean | undefined][] = [
    [t.system.vision, health?.checks.vision],
    [t.system.worker, health?.checks.worker],
    [t.system.database, health?.checks.database],
  ];
  const state = (up: boolean | undefined) => (up === undefined ? t.system.unknown : up ? t.system.up : t.system.down);
  return (
    <ul className="flex items-center gap-2" aria-label={t.system.label}>
      {items.map(([label, up]) => (
        <li key={label} className="flex items-center gap-1" title={`${label}: ${state(up)}`}>
          <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${up === undefined ? 'bg-ink-500' : up ? 'bg-ok' : 'bg-err'}`} />
          <span>
            {label}
            <span className="sr-only">: {state(up)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
