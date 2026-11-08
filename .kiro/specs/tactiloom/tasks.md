# Implementation Plan

Estado real a 2026-11-08. `[x]` = implementado y verificado con el comando indicado; `[ ]` = pendiente.
Responsables sugeridos: **A** visión y materiales físicos · **B** compilador, runner y seguridad · **C** producto, infraestructura y E2E.

- [x] 1. Monorepo, contratos y steering (C)
  - pnpm workspaces, TypeScript 6.0.3 estricto, `.kiro/steering/*`, licencia MIT, `.env.example`
  - Zod como fuente de autoría y JSON Schemas publicados en `packages/contracts/schemas` con drift test
  - _Requirements: 5.3, 14.1_ · Verificación: `pnpm --filter @tactiloom/contracts test` · Commit `9fc4afb`

- [x] 2. Board-kit imprimible (A)
  - [x] 2.1 Exportar los bits de `DICT_4X4_100` desde OpenCV y test de deriva (`test_imaging_and_dictionary.py`)
  - [x] 2.2 Display list común → SVG y PDF deterministas (A3, mosaico 4×A4, reducido A4, tarjetas)
  - [x] 2.3 Manual de montaje y manifiesto con sha256
  - [x] 2.4 Rasterizar PDF/SVG y recuperar todos los IDs con OpenCV
  - _Requirements: 1.1–1.4_ · Verificación: `pnpm board:generate`, `pnpm --filter @tactiloom/board-kit test`, `test_board_kit_raster.py` · Commits `9fc4afb`, `527e58a`

- [x] 3. Servicio de visión (A)
  - [x] 3.1 Decodificación segura (firma, píxeles, EXIF), detector ArUco, homografía de 16 esquinas
  - [x] 3.2 Casillas, orientación, calidad heurística, diagnósticos y overlay fiel
  - [x] 3.3 Filtro de falsos positivos por forma (imagen y mm)
  - [x] 3.4 Fixtures sintéticos renderizados desde el kit + `expected-results.json` como oráculo
  - [x] 3.5 Segunda pasada con nitidez cuando falta un fiducial (hallazgo del benchmark)
  - _Requirements: 2.1–2.7_ · Verificación: `pnpm vision:test` (75 passed) · Commits `9fc4afb`, `f2687d2`, `885c463`

- [x] 4. Compilador (B)
  - [x] 4.1 Puertos geométricos F / R(F) / B(F), colisiones, duplicados, catálogo cerrado
  - [x] 4.2 Análisis de grafo: Tarjan, alcanzabilidad, terminación, definite assignment
  - [x] 4.3 IR canónica, `contentHash`, `verifyIr`, diffs y descripción textual
  - [x] 4.4 Propiedades fast-check y guardia de cobertura del generador
  - _Requirements: 3.1–3.5, 4.1–4.2, 5.1–5.2_ · Verificación: `pnpm --filter @tactiloom/compiler test` (55 passed) · Commit `527e58a`

- [x] 5. Motor de ejecución (B)
  - [x] 5.1 Sandbox (segmentos, lstat, `O_NOFOLLOW`, escritura create-only idempotente)
  - [x] 5.2 Extracción PDF en worker aislado con límites; TXT; error claro sin capa de texto
  - [x] 5.3 Handlers cerrados, dry-run con plan/planHash, postcondiciones de `SUCCEEDED`
  - _Requirements: 7.1–7.5, 12.1–12.2_ · Verificación: `pnpm --filter @tactiloom/workflow-engine test` (46 passed) · Commits `2904162`, `885c463`

- [x] 6. Persistencia y runner (B)
  - [x] 6.1 Esquema Prisma, migraciones, seed del catálogo
  - [x] 6.2 Cola Postgres con lease/heartbeat, reintentos, `DEAD`
  - [x] 6.3 PREVIEW/EXECUTE, idempotencia de artefactos y revisiones, limpieza TTL
  - _Requirements: 6.1, 8.1–8.3, 9.1_ · Verificación: `pnpm test:integration` (21 passed) · Commits `c95f15a`, `885c463`

- [x] 7. Web y API (C)
  - [x] 7.1 Sesiones demo (token aleatorio + HMAC, TTL, cuotas), verificación de Origin, sobre de errores
  - [x] 7.2 Board Studio (cámara, subida, galería), overlay y diff entre capturas
  - [x] 7.3 Simulador accesible por teclado con compilación en vivo
  - [x] 7.4 Workflow Studio: diagrama derivado de la IR, alternativa textual, parámetros → nueva versión
  - [x] 7.5 Review & Run, aprobación ligada a hashes, monitor, descargas, historial, kit, ayuda, OpenAPI
  - _Requirements: 6.2–6.4, 9.2–9.3, 10.1–10.2, 11.1–11.3, 12.3–12.4_ · Commit `02c058f`

- [x] 8. Pruebas E2E y accesibilidad (C)
  - Playwright con Chrome del sistema: flujo de jueces, tableros inválidos, uploads, simulador, cámara falsa, axe en 8 páginas
  - _Requirements: 4.3, 10.2, 13.1_ · Verificación: `pnpm test:e2e` (16 passed contra el stack Docker) · Commits `02c058f`, `885c463`

- [x] 9. Contenedores (C)
  - Dockerfiles (visión `python:3.14-slim`, Node `node:24-alpine`), compose con health checks, usuarios sin root
  - _Requirements: 13.2_ · Verificación: `docker compose up --build` + `node scripts/smoke.mjs http://localhost:3210` · Commit `f69a2d5`

- [x] 10. Benchmark sintético de visión (A)
  - 120 escenas, 6 condiciones; línea base y resultado tras la mejora en `docs/benchmark-results/`
  - _Requirements: 2.1_ · Commit `f2687d2`

- [x] 11. Documentación y Kiro (todos)
  - README bilingüe, ADRs, gramática, IR, modelo de amenazas, guía de jueces, guion de vídeo, diferenciación, uso de Kiro
  - Hooks y agentes en `.kiro/` validados contra la versión instalada (`kiro-cli agent validate`)
  - _Requirements: 14.1–14.2_

- [x] 11b. Revisión de seguridad con el agente `tactiloom-security-reviewer` y correcciones (B)
  - Cuerpos chunked limitados, cuotas atómicas (`QuotaUsage`), locks de workspace, claves de cliente con proxy de confianza,
    Origin obligatorio, plan fail-closed en el worker, fecha de reporte determinista, errores genéricos, token antes del multipart
  - _Requirements: 8.3, 12.1–12.5, 13.3_ · Verificación: `pnpm test:integration` (21 passed), `node scripts/abuse-check.mjs` · Commit `885c463`

- [ ] 12. Pruebas físicas con impresiones y cámara real (A) — requiere al equipo
  - Imprimir A3 o mosaico, fotografiar ≥10 veces por condición, registrar en `docs/benchmarking.md` (tabla preparada)
  - _Requirements: 2.1_ · Objetivo experimental: 10 nodos reconocidos en ≥8/10 capturas controladas

- [ ] 13. Despliegue público (C) — requiere cuenta/servidor del equipo
  - Seguir `docs/deployment.md` (VPS + Docker Compose + Caddy/HTTPS), `PUBLIC_ORIGIN` con https, cuotas y TTL
  - _Requirements: 13.1, 13.3_

- [ ] 14. Entrega Kiroween (todos) — requiere cuentas del equipo
  - Repositorio público en GitHub con licencia visible, vídeo < 3 min (guion en `docs/demo-script.md`), formulario Devpost antes del 2026-12-04 14:00 PST

- [ ] 15. P1 opcional
  - [ ] 15.1 Cámara en vivo 1–2 FPS con estabilización temporal (K observaciones iguales)
  - [ ] 15.2 Exportar/importar flujos JSON versionados
  - [x] 15.3 Interfaz en inglés → ampliado a es/en/it/fr en la tarea 16

- [x] 16. Idiomas: español, inglés, italiano y francés (todos) — ADR 0005
  - [x] 16.1 Contratos: `LOCALES`, negociación de `Accept-Language`, `params` en diagnósticos y efectos; `CREATE_REPORT.language` opcional (sin cambio de `contentHash`) · Commit `6fa5ca1`
  - [x] 16.2 Compilador: `params` en todos los diagnósticos; motor: reporte en 4 idiomas (español idéntico), etiquetas de campos en 4 idiomas, documentos de demostración por idioma · Commit `6fa5ca1`
  - [x] 16.3 Visión: `params` en todos los diagnósticos, `locale` en `/v1/analyze`, overlay localizado, muestras reales para la web (`tests/fixtures/vision-diagnostic-samples.json`) · Commit `063581f`
  - [x] 16.4 Web: diccionarios tipados, selector de idioma, diagnósticos/efectos/errores localizados, pasos del programa en el idioma elegido · Commit `063581f`
  - [x] 16.5 Kit imprimible por idioma (`assets/board-kit/<locale>/`, `kit-index.json`, ZIP por idioma, ajuste de títulos con métricas reales) · Commit `063581f`
  - [x] 16.6 Pruebas: paridad de diccionarios, fast-check de diagnósticos, kit por idioma rasterizado con OpenCV, E2E en/it/fr + axe · Commit `063581f`
  - _Requirements: 15.1–15.8_
