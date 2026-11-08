# ADR 0001 — Arquitectura, entorno y versiones

- **Estado:** aceptada · **Fecha:** 2026-11-08
- **Contexto:** prompt maestro §3 (stack preferido) y §0.1 (confirmar tecnologías en el entorno real).

## Entorno inspeccionado (máquina de desarrollo)

| Herramienta | Versión encontrada |
|---|---|
| SO | Ubuntu 24.04.5 LTS, kernel 7.0.0, x86_64, 8 CPU (i5-1155G7), 11 GiB RAM |
| Node.js / npm / pnpm | 24.15.0 / 11.12.1 / 11.9.0 |
| Python | 3.14.6 (venv propio en `services/vision/.venv`) |
| Docker / Compose | 29.9.3 / v5.7.0 |
| Navegador para E2E | Google Chrome 157 (sistema) |
| Otros | ffmpeg 6.1.1, poppler 24.02, ImageMagick 6.9, Tesseract 5.3.4 (no usado), Kiro CLI 2.34.2 |
| Cámara | `/dev/video0`, `/dev/video1` presentes; no usadas en pruebas automáticas |

Puertos 3000, 8000 y 55432 ya estaban ocupados por otros proyectos: RitualOS usa **web 3210, vision 8210,
Postgres 55439** (solo `127.0.0.1`).

## Decisiones

| Capa | Elección (versión fijada) | Motivo / desviación respecto al prompt |
|---|---|---|
| Web + API | Next.js 16.4.5, React 19.3.1, Tailwind 4.3.5 | Estables más recientes. `next lint` ya no existe en 16 → ESLint 9 flat config |
| Lenguaje | TypeScript 6.0.3 estricto | 7.0 ya publicado, pero `typescript-eslint` 8.72 exige `<6.1` |
| Contratos | Zod 4.6.7 → `z.toJSONSchema` (draft 2020-12) | Ver ADR 0002 |
| Visión | Python 3.14 (≥ 3.11 pedido), FastAPI 0.162, OpenCV contrib headless **5.0.0.93** | API `cv2.aruco.ArucoDetector` verificada en el entorno antes de fijarla |
| PDF | `unpdf` 2.1.0 (pdf.js) en `worker_threads` con límites | Sin dependencias nativas; `isEvalSupported: false` |
| Generación PDF/SVG | `pdf-lib` 1.17.1 + lista de primitivas propia | Mismo dibujo para SVG y PDF; salidas deterministas |
| Persistencia | PostgreSQL 17 + Prisma **7.10.1** (`prisma-client` + `@prisma/adapter-pg`) | Prisma 7 exige `prisma.config.ts` y adaptador; 8.0 sigue en RC |
| Cola | Tabla `Job` con `FOR UPDATE SKIP LOCKED` + lease | Ver ADR 0003; sin Redis |
| Diagrama | `@xyflow/react` 12.12.1 | Con alternativa textual accesible |
| Pruebas | Vitest 5.1, fast-check 4.10, pytest 9.2, Hypothesis 6.170, Playwright 1.65 (Chrome del sistema), axe-core 4.14 | — |
| Paquetes | pnpm 11 workspaces; `allowBuilds` en `pnpm-workspace.yaml` | pnpm 11 sustituyó `onlyBuiltDependencies` |
| Contenedores | `node:24-alpine`, `python:3.14-slim`, `postgres:17-alpine`; usuarios sin root | Visión con rootfs de solo lectura |

## Consecuencias

- Los paquetes internos se consumen como TypeScript fuente (`exports` → `src/index.ts`); Next.js los transpila
  (`transpilePackages`) y el runner usa `tsx`. No hay paso de build por paquete.
- La web nunca ejecuta flujos ni parsea PDF: solo encola trabajos. El runner es el único que escribe artefactos.
- La visión es un servicio sin estado en red privada; la web valida su respuesta contra el contrato.
- Desviación de geometría respecto al prompt (celdas 47 × **57** mm en vez de 47 × 58): ver ADR 0004.
