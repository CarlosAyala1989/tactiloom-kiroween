# API HTTP

Documento OpenAPI 3.1 servido por la app: **`GET /api/openapi`**. Cuerpos de contrato: JSON Schemas en
`packages/contracts/schemas/`. Errores: `{ "error": { "code", "message", "requestId" } }`.

Autenticación: cookie de sesión demo (`POST /api/demo/session`). Todas las mutaciones exigen un `Origin`
permitido. `workspaceId` nunca se acepta del cliente.

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/health` | Estado de web, BD, visión y worker |
| GET | `/api/catalog/cards` | Catálogo cerrado, puertos, requisitos de datos, parámetros |
| GET | `/api/board/kit` · `/api/board/kit/download?locale=…&file=…` | Kit del idioma de la petición y descargas (lista blanca `kit-index.json`, ZIP `tactiloom-board-kit-<locale>.zip`) |
| GET/POST | `/api/demo/session` | Sesión actual / crear workspace aislado (TTL, cuotas) |
| GET | `/api/demo/scenarios` · `/api/demo/scenarios/:id/image` | Galería (imágenes sintéticas) |
| POST | `/api/board/analyze` | Imagen o escenario → OpenCV → captura (no ejecuta) |
| POST | `/api/workflows/compile` | Compilar captura o estado del simulador (sin persistir) |
| GET/POST | `/api/workflows` | Listar / recompilar y guardar versión inmutable |
| GET | `/api/workflows/:id` · `/api/versions/:id` | Detalle, versiones, diff |
| GET/POST | `/api/uploads` | Documentos / subir PDF o TXT (≤ 10 MB, firma verificada) |
| POST | `/api/runs/preview` | Crear run y encolar dry-run |
| GET/POST | `/api/runs` | Listar / **aprobar**: `{ previewRunId, contentHash, planHash, confirm: true }` |
| GET | `/api/runs/:id` | Estado, plan, eventos por nodo, artefactos, revisiones |
| POST | `/api/runs/:id/cancel` | Solicitar cancelación |
| GET | `/api/artifacts/:id/download` | Descarga autorizada con checksum verificado |
| GET | `/api/history` | Capturas, versiones, runs, documentos, reportes, revisiones |

Idioma: las respuestas de la UI y del kit siguen la cookie `tactiloom_locale` (`es` | `en` | `it` | `fr`) o, sin
ella, `Accept-Language`. Los mensajes de error y de diagnóstico de la API son canónicos en español; los
diagnósticos incluyen además `params` estructurados para redactarlos en otro idioma (ADR 0005).

Servicio interno de visión (red privada): `GET /health`, `POST /v1/analyze` (multipart `image`,
`sourceMode` = `physical` | `image`, `locale` = `es` | `en` | `it` | `fr` para los textos del overlay, cabecera
`X-Internal-Token`).
