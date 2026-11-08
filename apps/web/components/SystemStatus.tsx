'use client';

import { useEffect, useState } from 'react';
import { api, type HealthView } from '@/lib/client/api';
import { es } from '@/lib/i18n/es';

/** Small live indicator of vision / worker / database availability (text + colour, never colour only). */
export function SystemStatus() {
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
    [es.system.vision, health?.checks.vision],
    [es.system.worker, health?.checks.worker],
    [es.system.database, health?.checks.database],
  ];
  return (
    <ul className="flex items-center gap-2" aria-label="Estado del sistema">
      {items.map(([label, up]) => (
        <li key={label} className="flex items-center gap-1" title={`${label}: ${up === undefined ? 'desconocido' : up ? 'disponible' : 'no disponible'}`}>
          <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${up === undefined ? 'bg-ink-500' : up ? 'bg-ok' : 'bg-err'}`} />
          <span>
            {label}
            <span className="sr-only">: {up === undefined ? 'desconocido' : up ? 'disponible' : 'no disponible'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
