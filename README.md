# Tactiloom — Build workflows with your hands. Run them on your computer.

> **ES** · Automatización tangible: tarjetas con marcadores ArUco sobre un tablero 8×4 → OpenCV lee el
> tablero desde los píxeles → un compilador genera un grafo tipado (`tactiloom-ir/1`) → un worker aislado
> lo ejecuta sobre documentos de prueba, **solo después de un dry-run revisado y una aprobación explícita**.
>
> **EN** · Tangible automation: ArUco-marked cards on an 8×4 board → OpenCV reads the board from pixels →
> a compiler builds a typed graph (`tactiloom-ir/1`) → a sandboxed worker runs it on test documents, **only after
> a reviewed dry-run and an explicit, hash-bound approval**. English summary at the end.

Kiroween 2026 · categoría **Frankenstein** · licencia [MIT](LICENSE) · estado real: [`docs/implementation-status.md`](docs/implementation-status.md).

> El brief original ([`RitualOS_KiroCLI_Prompt_Maestro.md`](RitualOS_KiroCLI_Prompt_Maestro.md)) usa el nombre
> provisional *RitualOS*; el producto se llama **Tactiloom** (paquetes `@tactiloom/*`, contratos `tactiloom-*/1`).

---

## Qué resuelve

Personas que procesan documentos repetitivos (por ejemplo, solicitudes de un taller) pueden diseñar y
discutir el procedimiento **juntas, sobre una mesa**, moviendo tarjetas, y verlo ejecutarse en una
computadora real con trazabilidad. Caso de demostración:

```
INICIO → ARCHIVO → EXTRAER TEXTO → VALIDAR CAMPOS → CONDICIÓN ─ SÍ → CREAR REPORTE → GUARDAR REPORTE → FIN
                                                              └ NO → PEDIR REVISIÓN → FIN
```

- Con `valid-application.pdf` (ficticio) la rama **SÍ** genera un reporte Markdown + JSON real y descargable.
- Con `invalid-application.pdf` la rama **NO** crea una tarea de revisión `OPEN` con los campos faltantes.
- Mover, girar o retirar una tarjeta cambia el programa (otro `contentHash`) o produce errores explicados
  con tarjeta, fila y columna. Mover una tarjeta **nunca** ejecuta nada.

No inventamos la programación tangible: [FloBlocks (2025)](https://link.springer.com/article/10.1007/s44217-025-01064-7)
y [Sheets (2015)](https://www.iplab.cs.tsukuba.ac.jp/paper/international/tada_ahfe2015.pdf) ya usaron tarjetas
de papel y cámara. Tactiloom lo integra con un motor seguro de automatización documental, aprobación ligada a
hashes y trazabilidad. Ver [`docs/frankenstein-differentiation.md`](docs/frankenstein-differentiation.md).

## Qué es real y qué no (honestidad)

| Parte | Estado |
|---|---|
| Detección ArUco desde píxeles, homografía, casillas, orientación | Real (OpenCV 5.0.0) |
| Kit imprimible PDF/SVG con marcadores reales | Real; un test rasteriza los PDF y recupera todos los IDs |
| Galería de tableros | **Imágenes sintéticas** renderizadas desde los PDF del kit y «fotografiadas» por software |
| Cámara del navegador | Real (`getUserMedia`). El E2E usa el dispositivo **falso** de Chrome; **no hay pruebas físicas registradas todavía** |
| Simulador | Construye el tablero digitalmente y lo indica: «Simulador digital: no utiliza cámara» |
| Ejecución | Real: worker separado, PDF con capa de texto, reportes con sha256, revisiones en BD |
| Despliegue público y vídeo | **Pendientes** (requieren cuentas del equipo; ver [`docs/deployment.md`](docs/deployment.md)) |

## Arquitectura

```
Navegador (cámara · imagen · simulador)
   │ HTTPS · cookie de sesión demo · Origin verificado
   ▼
apps/web (Next.js 16) ─ UI + API ──► PostgreSQL 17 ◄── apps/runner (Node 24, worker de larga duración)
   │ multipart + X-Internal-Token          ▲  cola Job: FOR UPDATE SKIP LOCKED + lease
   ▼                                       │
services/vision (FastAPI + OpenCV 5)       └── packages/workflow-engine → sandbox /workspace/<workspaceId>/
   red privada · sin BD · sin sandbox
```

| Ruta | Contenido |
|---|---|
| `packages/contracts` | Zod (fuente) → JSON Schemas versionados, catálogo `board-v1` / `cards-v1` |
| `packages/compiler` | Gramática física v1 → IR canónica + diagnósticos + `contentHash`; `verifyIr` |
| `packages/workflow-engine` | 9 handlers cerrados, sandbox, extracción PDF aislada, dry-run/plan |
| `packages/board-kit` | Generador SVG/PDF del tablero y tarjetas |
| `packages/db` · `prisma/` | Prisma 7 (adapter-pg), migraciones, cuotas atómicas |
| `apps/web` · `apps/runner` | Next.js (UI + API) · worker |
| `services/vision` | Servicio de visión, fixtures sintéticos, benchmark |
| `.kiro/` | Steering, spec (requirements/design/tasks), hooks y agentes de Kiro |

Detalles: [ADR 0001](docs/adr/0001-architecture.md) · [gramática física](docs/physical-grammar-v1.md) ·
[IR](docs/workflow-ir-v1.md) · [API](docs/api.md) · [modelo de amenazas](docs/threat-model.md).

## Requisitos

- Docker 24+ con Compose v2 (probado con Docker 29.9.3 / Compose v5.7.0) — suficiente para ejecutar todo.
- Para desarrollo y pruebas: Node.js ≥ 24 (probado 24.15.0), pnpm 11.9.0, Python ≥ 3.12 (probado 3.14.6),
  Google Chrome (E2E), ffmpeg (solo para la prueba de cámara falsa).
- Espacio en disco: ~2 GB para las imágenes Docker (node 1,45 GB + vision 579 MB).

## Inicio rápido (Docker)

```bash
cp .env.example .env
# Cambia POSTGRES_PASSWORD, SESSION_SECRET (openssl rand -hex 32) y VISION_INTERNAL_TOKEN (openssl rand -hex 24).
# Actualiza también la contraseña dentro de DATABASE_URL / TEST_DATABASE_URL.
docker compose up --build
```

Abre **http://localhost:3210** (usa `localhost`: el servidor solo acepta mutaciones con ese Origin).
El servicio `migrate` aplica las migraciones y el seed del catálogo antes de arrancar `web` y `runner`.
Comprobación: `curl http://localhost:3210/api/health` → `"status":"ok"` con `database`, `vision` y `worker` en `true`.

## Desarrollo local (sin contenedores para web/runner/vision)

```bash
pnpm install                  # también genera el cliente Prisma
pnpm vision:setup             # venv de Python con OpenCV y dependencias de prueba
pnpm db:up                    # solo PostgreSQL en Docker (127.0.0.1:55439)
pnpm db:migrate && pnpm db:seed
pnpm build                    # build de producción de Next.js
./scripts/dev/vision.sh &     # FastAPI en 127.0.0.1:8210
./scripts/dev/runner.sh &     # worker
./scripts/dev/web.sh          # http://localhost:3210  (./scripts/dev/web.sh dev para next dev)
```

Regenerar artefactos (deterministas): `pnpm board:generate` (kit), `pnpm examples:generate`
(documentos ficticios + imágenes sintéticas + `tests/fixtures/expected-results.json`),
`pnpm contracts:schemas` (JSON Schemas), `pnpm benchmark:vision` (benchmark sintético).
Borrar los workspaces de demostración: `pnpm db:reset-demo --yes`.

## Probar sin cámara (jueces)

1. **Galería** → «Analizar con OpenCV» en *Tablero válido en perspectiva*: 10 tarjetas leídas desde los píxeles.
2. «Guardar versión y abrir Workflow Studio» → «Revisar y ejecutar (dry-run)».
3. Revisa entrada, pasos, decisión y efectos → marca la casilla → «Aprobar y ejecutar» → descarga el reporte.
4. En Workflow Studio cambia el documento a `invalid-application.pdf` → nueva versión → rama NO → tarea de revisión.
5. Analiza *Tarjeta entre dos casillas* o *Falta una tarjeta FIN*: no hay botón de ejecutar; el error dice dónde.
6. En el **Simulador**, enfoca una tarjeta y pulsa `R`: el diagnóstico cambia en vivo.

Guía completa: [`docs/judge-guide.md`](docs/judge-guide.md). Recorrido automatizado: `node scripts/smoke.mjs http://localhost:3210`.

## Imprimir y usar tarjetas reales

Página **Kit imprimible** (o `assets/board-kit/`): tablero A3 horizontal, mosaico 4×A4 a escala real o
versión reducida A4, y hojas de tarjetas. Imprime al 100 % y verifica la barra de 100 mm.
Manual: [`assets/board-kit/ASSEMBLY.md`](assets/board-kit/ASSEMBLY.md). Reglas: una tarjeta por casilla; la
flecha impresa es la dirección F; CONDICIÓN envía SÍ hacia F y NO a la derecha; toda rama termina en FIN;
las 4 esquinas (ID 0–3) deben verse en la foto.

**Cámara:** navegadores modernos con HTTPS o `localhost`; se activa solo al pulsar «Activar cámara» y se
envía una única foto por análisis (no se guarda). Sin permiso o sin cámara: subir foto o usar la galería.

## Pruebas

| Comando | Qué ejecuta | Último resultado real (2026-11-08) |
|---|---|---|
| `pnpm typecheck` | TypeScript estricto en todos los paquetes + scripts/tests | 0 errores |
| `pnpm lint` | ESLint (reglas de seguridad) + Ruff | 0 avisos |
| `pnpm test` | Vitest (155) + pytest con Hypothesis (75) | 230 passed |
| `pnpm test:integration` | Runner + Postgres (cola, leases, idempotencia, aislamiento, hardening) | 21 passed |
| `pnpm test:e2e` | Playwright con Chrome contra el stack levantado (+ axe) | 16 passed |
| `node scripts/abuse-check.mjs` | Cuerpo chunked de 40 MB, CSRF | 413 en 39 ms, 403 / 403 |

Benchmark **sintético** de visión (120 escenas, 6 condiciones, i5-1155G7): 120/120 tableros calibrados,
recall de tarjetas 1,0, casilla y orientación 1,0, 0 falsos positivos; mediana 23,8 ms, p95 40,3 ms.
No sustituye pruebas con cámara: [`docs/benchmarking.md`](docs/benchmarking.md).

## Seguridad

Catálogo cerrado de 9 acciones (sin shell, red saliente ni plugins) · el servidor recompila y nunca acepta IR
del cliente · ejecución solo con dry-run + `confirm` + `contentHash` + `planHash` y re-verificación en el
worker · sandbox por workspace con `O_NOFOLLOW` y escrituras create-only · uploads verificados por contenido ·
cuotas atómicas, TTL y límite global de workspaces · cookies `HttpOnly`/`SameSite=Lax` (`__Host-` en HTTPS) y
verificación de Origin · fotos no persistidas · datos ficticios. Una revisión con el agente
`tactiloom-security-reviewer` de Kiro encontró 4 problemas confirmados, ya corregidos con pruebas
([`docs/kiro-usage.md`](docs/kiro-usage.md)). Detalle: [`docs/threat-model.md`](docs/threat-model.md).

## Limitaciones conocidas

- Sin pruebas físicas con tarjetas impresas y cámara registradas aún (protocolo y tabla listos en `docs/benchmarking.md`).
- Sin OCR: los PDF escaneados fallan con `PDF_NO_TEXT_LAYER` (nunca se inventan campos).
- Lectura de cámara por foto; la estabilización en vivo (P1) no está implementada.
- CSP de producción con `'unsafe-inline'` para scripts (hidratación de Next.js sin nonces).
- Interfaz solo en español (cadenas centralizadas en `apps/web/lib/i18n/es.ts`).
- Despliegue público, repositorio GitHub y vídeo dependen del equipo.

## Cómo se usó Kiro

Steering (`.kiro/steering/`), spec con requisitos EARS, diseño y tareas trazables a commits
(`.kiro/specs/tactiloom/`), 3 hooks `PostFileSave` (tests del compilador, deriva de contratos, visión) y 2 agentes
personalizados validados con `kiro-cli agent validate`. Registro con evidencias: [`docs/kiro-usage.md`](docs/kiro-usage.md).

## Licencias y créditos

Código y assets propios: MIT. Dependencias principales: OpenCV (Apache-2.0), FastAPI (MIT), NumPy (BSD),
Pillow (MIT-CMU), Next.js (MIT), React (MIT), React Flow / `@xyflow/react` (MIT), Prisma (Apache-2.0),
Zod (MIT), pdf-lib (MIT), unpdf / pdf.js (MIT / Apache-2.0), fast-check (MIT), Hypothesis (MPL-2.0),
Playwright (Apache-2.0), Tailwind CSS (MIT). Iconos de tarjetas: dibujos propios (`assets/card-icons`).

---

## English summary

**What:** Tactiloom turns a physical arrangement of ArUco cards on a printed 8×4 board into a real, typed
workflow. OpenCV reads the photo (four corner fiducials, 16-point homography, cell and N/E/S/W orientation),
a deterministic compiler produces `tactiloom-ir/1` with a canonical sha256 `contentHash` and Spanish diagnostics
that point to card, row and column, and a separate worker executes a closed set of 9 actions on fictitious
documents inside a per-workspace sandbox — only after a dry-run plan is reviewed and approved with matching
`contentHash` and `planHash`.

**Run it:** `cp .env.example .env` (set secrets) → `docker compose up --build` → open http://localhost:3210 →
Gallery → "Analizar con OpenCV" → save version → dry-run → approve → download the report. Or run
`node scripts/smoke.mjs http://localhost:3210`.

**Honesty:** gallery images are synthetic renders of the real printable kit; the simulator says it does not use a
camera; no physical-camera benchmark has been recorded yet; public deployment and the demo video are still to be
done by the team. Test status and every command actually run are in `docs/implementation-status.md`.
