# ADR 0002 — Contratos versionados entre TypeScript y Python

- **Estado:** aceptada · **Fecha:** 2026-11-08

## Decisión

1. **Zod es la fuente de autoría** (`packages/contracts/src`). Los JSON Schemas publicados en
   `packages/contracts/schemas/*.v1.schema.json` se generan con `pnpm contracts:schemas` (`z.toJSONSchema`,
   draft 2020-12). Son el contrato público y los consume Python.
2. Un **test de deriva** (`packages/contracts/test/contracts.test.ts`) falla si los schemas commiteados no
   coinciden con la salida actual de Zod. Un hook de Kiro (`.kiro/hooks/contracts-drift-check.json`) lo
   ejecuta al guardar un archivo de contratos.
3. El servicio de visión valida cada respuesta con **Pydantic** (`tactiloom_vision/models.py`, `extra="forbid"`)
   y, en pruebas, contra el JSON Schema publicado (`tests/test_contracts.py`, `jsonschema` Draft 2020-12),
   incluida la proyección `DetectionResult → BoardState`.
4. La web vuelve a validar la respuesta de visión con Zod (`DetectionResultSchema`) antes de usarla
   (`502 CONTRACT_VIOLATION` si no cumple).
5. El catálogo (`catalog/board-v1.json`, `catalog/cards-v1.json`) es un único archivo JSON leído por TS y Python;
   el compilador nunca confía en `type`/`cardInstanceId` enviados por el cliente.

## Versionado

`protocolVersion: "tactiloom-board/1"`, `irVersion: "tactiloom-ir/1"`, `planVersion: "tactiloom-plan/1"`,
`catalogVersion: "cards-v1"`, `templateId: "board-v1"`. Un cambio incompatible crea `/2` y nuevos archivos de
schema; nunca se reutiliza un identificador con otro significado.

## Alternativas descartadas

- Generar Pydantic desde JSON Schema (datamodel-code-generator): añade otra herramienta y el resultado es
  menos legible; los contract tests cubren la divergencia.
- Escribir JSON Schema a mano: duplicaría la fuente de verdad.
