# Design Document — Tactiloom

## Overview

Tactiloom integra programación tangible (tarjetas ArUco sobre un tablero) con un motor seguro de
automatización documental. El flujo es siempre: **leer → compilar → revisar (dry-run) → aprobar → ejecutar**.
Contratos normativos: `docs/physical-grammar-v1.md` y `docs/workflow-ir-v1.md`. Decisiones: `docs/adr/`.

## Architecture

```
Navegador (cámara · imagen · simulador)
        │  HTTPS (cookie de sesión demo, Origin verificado)
        ▼
Next.js 16 (apps/web) ── UI + API HTTP ──────────────┐
   │ multipart (X-Internal-Token)                     │ Prisma 7 (adapter-pg)
   ▼                                                  ▼
FastAPI + OpenCV 5 (services/vision)            PostgreSQL 17
   red privada, sin acceso a BD ni sandbox            ▲   cola Job (FOR UPDATE SKIP LOCKED + lease)
                                                      │
                                   Runner Node 24 (apps/runner) ── workflow-engine ── sandbox /workspace/<ws>/
```

| Componente | Responsabilidad | Nunca hace |
|---|---|---|
| `services/vision` | píxeles → `DetectionResult` (fiduciales, homografía, casillas, orientación, overlay) | ejecutar, guardar fotos, leer BD |
| `packages/compiler` | `BoardState` + parámetros → IR canónica + diagnósticos; `verifyIr` | E/S |
| `packages/workflow-engine` | handlers cerrados, sandbox, extracción PDF aislada, dry-run/plan | red, shell |
| `apps/runner` | cola, leases, puertos BD/sandbox, limpieza TTL | aceptar IR sin verificar |
| `apps/web` | sesiones, cuotas, compilación en servidor, aprobación, descargas | ejecutar flujos o parsear PDF |

## Components and Interfaces

- **Visión:** `POST /v1/analyze` (multipart `image`, `sourceMode`). Pipeline: decodificación segura (firma,
  límites, EXIF) → ArUco `DICT_4X4_100` (segunda pasada con nitidez si falta un fiducial) → homografía con las
  16 esquinas de los fiduciales (comprobación de convexidad, orientación y RMS ≤ 4 mm) → proyección a mm →
  centro de tarjeta corregido por el desplazamiento del marcador → casilla (tolerancia 0,32 por eje) →
  orientación por el eje c0→c1 (tolerancia 18°) → calidad heurística → overlay.
- **Compilador:** normaliza por `(row,col,markerId)`, resuelve puertos geométricamente, analiza el grafo
  (Tarjan, BFS, terminación, definite assignment), valida parámetros con Zod y emite IR con `contentHash`
  sobre `{irVersion, catalogVersion, boardTemplateId, startNodeId, nodes{id,markerId,kind,params}, edges}`.
  El layout no entra en el hash (mover todo el flujo conserva el programa).
- **Motor:** `runWorkflow({ir, expectedContentHash, runId, mode}, ports)`; puertos: `resolveDocument`,
  `saveArtifact`, `createReviewTask`, `emit`, `isCancelled`, `now`. `planHash` = sha256 canónico de
  `{contentHash, input, path, decision, validation, effects}`.
- **API HTTP:** ver `GET /api/openapi` (OpenAPI 3.1) y `docs/api.md`.

## Data Models

Prisma (`prisma/schema.prisma`): `User`, `Session` (hash HMAC del token), `Workspace` (TTL), `BoardTemplate`,
`CardCatalogEntry`, `BoardCapture` (JSON de detección, sha256 de la imagen, sin la imagen), `Workflow`,
`WorkflowVersion` (inmutable), `WorkflowParameters`, `UploadedDocument`, `Run`, `Job`, `NodeRunEvent`,
`GeneratedArtifact` (único por run+nodo+tipo), `ReviewTask` (único por run+nodo), `AuditEvent`, `WorkerStatus`.

Estados del run: `DRAFT → COMPILED → AWAITING_APPROVAL → QUEUED → RUNNING → SUCCEEDED | FAILED | CANCELLED`.
El dry-run es la fase PREVIEW del mismo run (job `PREVIEW`); la ejecución real es el job `EXECUTE`.

## Error Handling

- HTTP: `{ "error": { "code", "message", "requestId" } }`; sin trazas internas ni rutas absolutas.
- Visión → web: 4xx se propagan con su código; 5xx/red → `503 VISION_UNAVAILABLE`; respuesta fuera de contrato → `502 CONTRACT_VIOLATION`.
- Runner: errores del motor → run `FAILED` con código; excepciones → reintento con backoff hasta `DEAD`.
- UI: estados explícitos (sin cámara, esquina faltante, tarjeta desplazada, grafo inválido, worker caído, PDF sin texto).

## Testing Strategy

| Nivel | Herramienta | Qué |
|---|---|---|
| Visión | pytest + Hypothesis | fixtures desde el kit, escenas aleatorias, ambigüedades, contratos, API, raster del kit |
| Compilador | Vitest + fast-check | unitarias por código, 8 propiedades × 300, cobertura del generador |
| Motor | Vitest | handlers reales, sandbox, PDF aislado, dry-run, manipulación, timeouts |
| Integración | Vitest + Postgres | cola, leases, crash/reintento, idempotencia, aislamiento, TTL |
| E2E | Playwright (Chrome) | flujo de jueces, errores, simulador, cámara falsa, axe |
| Benchmark | `tactiloom_vision.benchmark` | 120 escenas sintéticas por condición |

## Security

Ver `docs/threat-model.md` y `.kiro/steering/security.md`: catálogo cerrado, aprobación ligada a hashes,
sandbox con `O_NOFOLLOW`, extracción PDF en worker con límites (`isEvalSupported: false`), sesiones con token
aleatorio y HMAC, verificación de Origin, CSP en producción, contenedores sin root, visión en red privada.
