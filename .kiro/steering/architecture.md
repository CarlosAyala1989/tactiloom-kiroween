---
inclusion: always
---

# Arquitectura de Tactiloom

Ver `docs/adr/0001-architecture.md` para versiones fijadas y justificación.

## Monorepo (pnpm workspaces)
| Ruta | Paquete | Responsabilidad |
|---|---|---|
| `packages/contracts` | `@tactiloom/contracts` | Zod + JSON Schema (`schemas/`), catálogo `catalog/board-v1.json` y `catalog/cards-v1.json` |
| `packages/compiler` | `@tactiloom/compiler` | `BoardState` → IR canónica + diagnósticos + `contentHash` (sha256) |
| `packages/workflow-engine` | `@tactiloom/workflow-engine` | Ejecutor DAG con handlers cerrados, sandbox de ficheros, dry-run |
| `packages/board-kit` | `@tactiloom/board-kit` | SVG/PDF imprimibles con marcadores ArUco reales (bits exportados de OpenCV) |
| `packages/db` | `@tactiloom/db` | Cliente Prisma (esquema en `prisma/schema.prisma`) |
| `apps/web` | `@tactiloom/web` | Next.js (UI + API HTTP). Nunca ejecuta flujos dentro de una petición |
| `apps/runner` | `@tactiloom/runner` | Worker de larga duración: cola Postgres `FOR UPDATE SKIP LOCKED` + lease |
| `services/vision` | `tactiloom_vision` | FastAPI + OpenCV: ArUco, homografía, celdas, orientación, overlay |

## Reglas de dependencia
- `contracts` no depende de nada interno. `compiler` y `board-kit` dependen solo de `contracts`.
- `workflow-engine` depende de `contracts` y `compiler` (verificación de hash/estructura), nunca de Prisma.
- `apps/*` componen paquetes. La visión (Python) solo comparte los JSON de `packages/contracts/catalog` y `schemas`.
- Los paquetes internos se consumen como TypeScript fuente (`exports` → `src/index.ts`).

## Contratos
- `BoardState` / `DetectionResult` (`tactiloom-board/1`) y `WorkflowIR` (`tactiloom-ir/1`) están versionados.
  Cambiar un contrato exige: actualizar Zod, regenerar `schemas/*.json` (`pnpm contracts:schemas`),
  actualizar Pydantic en `services/vision` y que pasen los contract tests de ambos lados.
- Errores HTTP: `{ "error": { "code", "message", "requestId" } }`.

## Límites de servicio
- La visión no ve secretos, base de datos ni el sandbox; solo recibe bytes de imagen y devuelve JSON.
- El runner solo escribe en `WORKSPACE_ROOT/<workspaceId>/...`.
- Puertos locales por defecto (evitan conflictos en la máquina de desarrollo): web 3210, vision 8210, Postgres 55439.
