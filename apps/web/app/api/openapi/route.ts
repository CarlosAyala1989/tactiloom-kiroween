import { handler, ok } from '@/lib/server/http';

const error = { $ref: '#/components/schemas/Error' };
const json = (schema: unknown) => ({ content: { 'application/json': { schema } } });
const withErrors = (responses: Record<string, unknown>) => ({
  ...responses,
  '400': { description: 'Petición inválida', ...json(error) },
  '401': { description: 'Sin sesión de demo', ...json(error) },
  '403': { description: 'Origen no permitido (CSRF)', ...json(error) },
  '404': { description: 'No existe en tu workspace', ...json(error) },
  '429': { description: 'Cuota o límite de tasa', ...json(error) },
});

/** OpenAPI 3.1 description of the HTTP API. Contract bodies reference the versioned JSON Schemas. */
const DOCUMENT = {
  openapi: '3.1.0',
  info: { title: 'RitualOS API', version: '1.0.0', description: 'API HTTP de RitualOS (Next.js). Autenticación: cookie de sesión demo (HttpOnly, SameSite=Lax). Las mutaciones verifican Origin.' },
  servers: [{ url: '/' }],
  components: {
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: { error: { type: 'object', required: ['code', 'message', 'requestId'], properties: { code: { type: 'string' }, message: { type: 'string' }, requestId: { type: 'string' }, details: {} } } },
      },
      BoardState: { $ref: 'https://ritualos.dev/schemas/board-state.v1.schema.json' },
      DetectionResult: { $ref: 'https://ritualos.dev/schemas/detection-result.v1.schema.json' },
      WorkflowIR: { $ref: 'https://ritualos.dev/schemas/workflow-ir.v1.schema.json' },
      ExecutionPlan: { $ref: 'https://ritualos.dev/schemas/execution-plan.v1.schema.json' },
      Params: { type: 'object', additionalProperties: { type: 'object' }, description: 'Parámetros por instancia de tarjeta, p. ej. {"input-11": {"uploadedFileId": "…"}}' },
    },
  },
  paths: {
    '/api/health': { get: { summary: 'Estado de web, base de datos, visión y worker', responses: { '200': { description: 'Estado' } } } },
    '/api/catalog/cards': { get: { summary: 'Catálogo cerrado de tarjetas, tipos, puertos y parámetros', responses: { '200': { description: 'Catálogo' } } } },
    '/api/board/kit': { get: { summary: 'Manifiesto del kit imprimible', responses: { '200': { description: 'Manifiesto' } } } },
    '/api/board/kit/download': {
      get: { summary: 'Descarga un archivo del kit (lista blanca) o el ZIP', parameters: [{ name: 'file', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Archivo' }, '404': { description: 'No existe' } } },
    },
    '/api/demo/session': {
      get: { summary: 'Sesión actual', responses: { '200': { description: 'Sesión' } } },
      post: { summary: 'Crea un workspace demo aislado (TTL, cuotas, documentos ficticios)', responses: withErrors({ '201': { description: 'Creada (cookie)' } }) },
    },
    '/api/demo/scenarios': { get: { summary: 'Imágenes de la galería (sintéticas)', responses: { '200': { description: 'Escenarios' } } } },
    '/api/board/analyze': {
      post: {
        summary: 'Imagen o escenario → servicio OpenCV → captura almacenada (no ejecuta nada)',
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' }, scenarioId: { type: 'string' }, sourceMode: { enum: ['physical', 'image'] } } } } } },
        responses: withErrors({ '200': { description: 'Detección', ...json({ type: 'object', properties: { captureId: { type: 'string' }, detection: { $ref: '#/components/schemas/DetectionResult' }, boardState: { $ref: '#/components/schemas/BoardState' } } }) }, '413': { description: 'Imagen demasiado grande' }, '415': { description: 'Formato no soportado' }, '422': { description: 'Imagen dañada' }, '503': { description: 'Visión no disponible' } }),
      },
    },
    '/api/workflows/compile': {
      post: {
        summary: 'Compila un tablero (captura del servidor o estado del simulador) sin persistir',
        requestBody: json({ oneOf: [{ type: 'object', required: ['captureId', 'params'], properties: { captureId: { type: 'string' }, params: { $ref: '#/components/schemas/Params' } } }, { type: 'object', required: ['boardState', 'params'], properties: { boardState: { $ref: '#/components/schemas/BoardState' }, params: { $ref: '#/components/schemas/Params' } } }] }),
        responses: withErrors({ '200': { description: 'IR + diagnósticos + grafo' } }),
      },
    },
    '/api/workflows': {
      get: { summary: 'Flujos del workspace', responses: withErrors({ '200': { description: 'Lista' } }) },
      post: { summary: 'Recompila en el servidor y guarda una WorkflowVersion inmutable', responses: withErrors({ '201': { description: 'Versión creada' } }) },
    },
    '/api/workflows/{id}': { get: { summary: 'Detalle y versiones', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: withErrors({ '200': { description: 'Flujo' } }) } },
    '/api/versions/{id}': { get: { summary: 'Versión: IR, diagnósticos, parámetros, diff', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: withErrors({ '200': { description: 'Versión' } }) } },
    '/api/uploads': {
      get: { summary: 'Documentos del workspace', responses: withErrors({ '200': { description: 'Lista' } }) },
      post: { summary: 'Sube un PDF/TXT (≤10 MB, firma verificada) al sandbox', requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } }, responses: withErrors({ '201': { description: 'Documento' }, '413': { description: 'Demasiado grande' }, '415': { description: 'Tipo no soportado' } }) },
    },
    '/api/runs/preview': {
      post: { summary: 'Crea un Run DRAFT y encola un dry-run (solo lectura)', requestBody: json({ type: 'object', required: ['workflowVersionId'], properties: { workflowVersionId: { type: 'string' } } }), responses: withErrors({ '202': { description: 'En cola' }, '422': { description: 'Versión inválida o sin documento' } }) },
    },
    '/api/runs': {
      get: { summary: 'Ejecuciones del workspace', responses: withErrors({ '200': { description: 'Lista' } }) },
      post: {
        summary: 'Aprobación explícita: encola la ejecución real (una sola vez)',
        requestBody: json({ type: 'object', required: ['previewRunId', 'contentHash', 'planHash', 'confirm'], properties: { previewRunId: { type: 'string' }, contentHash: { type: 'string', pattern: '^sha256:[0-9a-f]{64}$' }, planHash: { type: 'string', pattern: '^sha256:[0-9a-f]{64}$' }, confirm: { const: true } } }),
        responses: withErrors({ '202': { description: 'Aprobado y en cola' }, '409': { description: 'Aprobación invalidada, caducada o duplicada' } }),
      },
    },
    '/api/runs/{id}': { get: { summary: 'Estado, plan, eventos por nodo, artefactos y revisiones', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: withErrors({ '200': { description: 'Run' } }) } },
    '/api/runs/{id}/cancel': { post: { summary: 'Solicita cancelación', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: withErrors({ '202': { description: 'Cancelación solicitada' }, '409': { description: 'Ya terminó' } }) } },
    '/api/artifacts/{id}/download': { get: { summary: 'Descarga autorizada de un reporte (checksum verificado)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: withErrors({ '200': { description: 'Archivo' } }) } },
    '/api/history': { get: { summary: 'Capturas, versiones, ejecuciones, documentos, reportes y revisiones', responses: withErrors({ '200': { description: 'Historial' } }) } },
  },
};

export const GET = handler(async (_request, _context: unknown, requestId) => ok(DOCUMENT, requestId));
