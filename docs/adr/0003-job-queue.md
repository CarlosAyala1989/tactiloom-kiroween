# ADR 0003 — Cola de trabajos en PostgreSQL con leases

- **Estado:** aceptada · **Fecha:** 2026-11-08

## Decisión

Tabla `Job` (`PENDING → LEASED → DONE | FAILED | DEAD`) reclamada con una sola sentencia
`UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *` (`apps/runner/src/queue.ts`).
Cada reclamación fija `leaseOwner` y `leaseExpiresAt`; el worker renueva el lease con un heartbeat cada
`leaseMs/3`. Un lease vencido se puede reclamar de nuevo (incrementa `attempts`); tras `maxAttempts` el job pasa
a `DEAD` y el run a `FAILED` con un mensaje genérico.

Dos tipos de job por run: `PREVIEW` (dry-run, crea el plan) y `EXECUTE` (solo tras la aprobación). La clave
`idempotencyKey = <runId>:<KIND>` es única: no se puede encolar dos veces la misma ejecución.

## Garantías reales (sin afirmar exactly-once)

- **Como máximo un lease vivo por job** (bloqueo de fila + `SKIP LOCKED`). Probado con 12 workers concurrentes
  sobre 1 job y 6 workers sobre 20 jobs (`tests/integration/queue.test.ts`).
- **Al menos una vez**: un worker que muere deja el lease vencido y otro lo retoma.
- **Sin efectos duplicados** por diseño idempotente, no por la cola:
  - artefactos únicos por `(runId, nodeId, type)` y archivos create-only en `runs/<runId>/reports/`;
  - el reporte usa como fecha `approvedAt`, así un reintento regenera bytes idénticos;
  - tareas de revisión únicas por `(runId, nodeId)`;
  - un run terminado nunca se re-ejecuta; los eventos se separan por `attempt`.
- **Fail-closed:** antes de cualquier efecto, el worker repite el plan sin efectos y exige el `planHash` aprobado.

## Alternativas descartadas

- Redis/BullMQ: otra pieza de infraestructura sin necesidad para la escala de una demo.
- `pg-boss`: válido, pero la lógica de lease + idempotencia es corta y queda totalmente probada aquí.
