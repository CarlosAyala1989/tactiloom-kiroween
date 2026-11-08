---
inclusion: always
---

# Pruebas

- **Cada cambio con su prueba.** Compilador, motor y seguridad tienen prioridad de cobertura.
- **TypeScript:** Vitest (`pnpm test`), property-based testing con `fast-check` en `packages/compiler`.
  Si una propiedad falla, registrar la semilla y la causa raíz en `docs/kiro-usage.md`.
- **Visión:** pytest + Hypothesis en `services/vision/tests` (`pnpm vision:test`).
  Las imágenes de prueba se generan rasterizando los PDF reales del board-kit (pypdfium2) y transformándolas
  con `warpPerspective`, blur y ruido. El detector **siempre** procesa píxeles; `expected-results.json`
  solo se usa como oráculo de comparación, nunca como atajo del lector.
- **Board-kit:** rasterizar el PDF generado y recuperar con OpenCV todos los IDs previstos; si falla, el kit no está listo.
- **Contratos:** los JSON Schema de `packages/contracts/schemas` se validan desde TS (drift test) y desde Python.
- **Integración:** runner + Postgres (doble pickup, lease vencido, timeout, idempotencia) y aislamiento entre workspaces.
- **E2E:** Playwright con Chrome del sistema contra el stack levantado (`pnpm test:e2e`).
- **Honestidad:** nunca inventar resultados. Pruebas físicas reales se documentan aparte en `docs/benchmarking.md`.
- Comandos: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`.
