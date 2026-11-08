# Estado de implementación — RitualOS

> Registro honesto por fase. Solo se anotan comandos realmente ejecutados y resultados observados.
> Entorno de desarrollo: Ubuntu 24.04.5, Node 24.15.0, pnpm 11.9.0, Python 3.14.6, Docker 29.9.3 / Compose v5.7.0.

## Fase P0 — Arranque y especificaciones · *en curso (base lista)*

- Monorepo pnpm (`apps/*`, `packages/*`), TypeScript 6.0.3 estricto, licencia MIT, `.kiro/steering/*`.
- PostgreSQL 17 vía `docker compose up -d db` (puerto 127.0.0.1:55439). Migraciones Prisma 7.10.1:
  `20261108065545_init`, `20261108065731_worker_status`; `pnpm db:seed` → 26 entradas de catálogo.
- Pendiente en P0: Dockerfiles de web/vision/runner y `docker compose up --build` completo.

## Fase P1 — Visión y board-kit · *hecha (sin pruebas físicas)*

- `pnpm board:generate` → 40 archivos en `assets/board-kit` (PDF A3, mosaico 4×A4, A4 reducido, tarjetas, SVG, manifiesto).
- Detector FastAPI + OpenCV 5.0.0 (`DICT_4X4_100`, homografía con 16 esquinas, celdas, N/E/S/W, overlay).
- Fixtures sintéticos renderizados **desde los PDF del kit** (`python -m ritualos_vision.fixtures`): 8 de galería + 9 de prueba.
- `pnpm vision:test` → **67 passed** (incluye Hypothesis, raster del PDF/SVG del kit, contratos JSON Schema, API).
- No realizado: pruebas con impresiones y cámara reales (requiere al equipo; ver `docs/benchmarking.md`).

## Fase P2 — Compilador · *hecha*

- `packages/compiler`: gramática v1, diagnósticos en español, Tarjan, alcanzabilidad, terminación,
  definite assignment, `contentHash` sha256 canónico, `verifyIr` para el runner, diffs y descripción textual.
- `pnpm --filter @ritualos/compiler test` → **55 passed** (28 unitarias, 8 propiedades fast-check ×300, 17 fixtures, 2 de cobertura).
- Hallazgo real: la prueba de cobertura mostró que el generador inicial producía solo 12/400 flujos con CONDITION y 0 anidados;
  se rediseñó (elección de colocación factible) → 108/400 con CONDITION y 66/400 anidados.

## Fase P3 — Motor, persistencia y runner · *hecha*

- `packages/workflow-engine`: sandbox (segmentos, lstat, `O_NOFOLLOW`, escritura create-only), extracción PDF en worker aislado,
  validación determinista, reportes Markdown/JSON escapados, dry-run con `planHash`. **45 passed**.
- `apps/runner`: cola Postgres `FOR UPDATE SKIP LOCKED` + lease/heartbeat, PREVIEW/EXECUTE, limpieza TTL.
- `pnpm test:integration` → **16 passed** (doble pickup, lease vencido, crash/reintento, idempotencia, IR manipulada,
  aislamiento entre workspaces, cancelación, TTL).

## Próxima fase

P4 — Next.js (Board Studio, Workflow Studio, Review & Run, Monitor, Historial, Galería, Simulador) + API + E2E.
