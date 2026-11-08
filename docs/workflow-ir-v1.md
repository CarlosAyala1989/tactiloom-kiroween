# Workflow IR `ritual-ir/1` y plan de ejecución `ritual-plan/1`

Fuente: `packages/contracts/src/ir.ts`, `runs.ts`; JSON Schemas en `packages/contracts/schemas/`.

## Modelo

Multigrafo dirigido etiquetado `G = (V, E, τ, λ)`, `E ⊆ V × {NEXT, TRUE, FALSE} × V`. Los datos no viajan por
las aristas: un `ExecutionContext` tipado acumula hechos (`DocumentRef`, `ExtractedText`, `ValidationResult`,
`Report`, `SavedArtifact`, `ReviewTask`) y el compilador comprueba su disponibilidad en cada camino.

```jsonc
{
  "irVersion": "ritual-ir/1",
  "compilerVersion": "ritualos-compiler/1.0.0",
  "catalogVersion": "cards-v1",
  "boardTemplateId": "board-v1",
  "sourceMode": "image",                  // physical | image | simulator (no entra en el hash)
  "startNodeId": "start-10",
  "nodes": [{
    "id": "validate-13", "markerId": 13, "kind": "VALIDATE_FIELDS",
    "params": { "requiredFields": ["name", "email", "workshop"] },   // normalizados (defaults incluidos)
    "layout": { "row": 0, "col": 3, "orientation": "E" },             // λ(v); no entra en el hash
    "dataRequirements": { "requires": ["ExtractedText"], "produces": ["ValidationResult"] }
  }],
  "edges": [{ "from": "condition-14", "port": "FALSE", "to": "review-18" }],   // ordenadas canónicamente
  "topologicalOrder": ["start-10", "…"],  // Kahn determinista
  "contentHash": "sha256:<64 hex>"
}
```

## `contentHash`

`sha256` de la serialización canónica (claves ordenadas, sin espacios, números finitos, sin objetos no planos;
subconjunto de RFC 8785) de:

```
{ irVersion, catalogVersion, boardTemplateId, startNodeId,
  nodes: [{ id, markerId, kind, params }] ordenados por markerId,
  edges: [{ from, port, to }] ordenadas por (from, port, to) }
```

Propiedades verificadas con fast-check (`packages/compiler/test/properties.test.ts`): invariante al orden de
detección, idempotente, cambia con cualquier rotación que altere conexiones o con un parámetro semántico, y
no cambia al trasladar el flujo completo por el tablero (el layout no es semántica).

El runner nunca confía en el hash almacenado: `verifyIr` recalcula el hash, comprueba que coincide con el
aprobado, valida cada nodo contra el catálogo cerrado, la canonicidad de los parámetros y todas las reglas
del grafo antes de ejecutar.

## Parámetros (cerrados)

| Tipo | Parámetros |
|---|---|
| `INPUT_FILE` | `uploadedFileId` (id interno o `null`) |
| `EXTRACT_TEXT` | `language`: `es` \| `en` |
| `VALIDATE_FIELDS` | `requiredFields` ⊆ {`name`, `email`, `workshop`} (sin repetidos, orden canónico) |
| `CONDITION` | `predicate`: `allRequiredPresent` (único valor v1) |
| `CREATE_REPORT` | `template`: `workshop-summary-v1`; `format`: `markdown` \| `json` \| `both` |
| `SAVE_REPORT` | `baseName`: `^[a-z0-9][a-z0-9-]{0,39}$` (solo nombre de descarga, nunca ruta) |
| `REQUEST_REVIEW` | `label`: texto corto con caracteres seguros |

Objetos estrictos: cualquier clave desconocida es `INVALID_PARAMETER`.

## Plan de ejecución y aprobación

El dry-run produce `ritual-plan/1`: `{ contentHash, input{uploadedFileId, originalName, mime, bytes, sha256},
path[], decision, validation, effects[], reportPreview, planHash }`. `planHash` = sha256 canónico de todo
salvo `reportPreview`. Aprobar requiere `confirm: true` + `contentHash` + `planHash` iguales a los del
servidor, dentro de 30 min; el worker repite el plan sin efectos y exige el mismo `planHash` antes de escribir.

## Estados del run

`DRAFT → COMPILED → AWAITING_APPROVAL → QUEUED → RUNNING → SUCCEEDED | FAILED | CANCELLED`.
`SUCCEEDED` exige que existan los artefactos o tareas de revisión del camino recorrido.
