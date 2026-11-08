# Modelo de amenazas — RitualOS

Alcance: demo pública multi-sesión (cualquiera puede crear un workspace temporal) y uso local en talleres.
Activos: integridad de lo que se ejecuta, aislamiento entre workspaces, disponibilidad, documentos subidos
(ficticios por diseño), secretos del servidor.

| # | Amenaza | Mitigación implementada | Prueba / evidencia | Riesgo residual |
|---|---|---|---|---|
| 1 | Tarjeta o parámetro como código | Catálogo cerrado de 9 tipos; parámetros con Zod estricto; sin `eval`/`new Function`/`child_process` (reglas ESLint) | `contracts.test.ts`, `compile.test.ts` (INVALID_PARAMETER), lint | — |
| 2 | Ejecución accidental | Analizar/compilar nunca encola; solo `POST /api/runs` con `confirm`, `contentHash` y `planHash`; ventana de 30 min | E2E (botón deshabilitado sin casilla), integración «refuses to execute without approval» | Un usuario puede aprobar sin leer |
| 3 | IR manipulada (cliente o BD) | El servidor recompila; `verifyIr` recalcula hash y reglas; el worker re-planifica y exige el `planHash` aprobado | propiedades «tampering», integración «tampered IR», «fails closed» | — |
| 4 | Imagen falsificada | Se trata como «imagen»; el modo se registra; no se afirma cámara física | `sourceMode` en captura/versión/run | Una foto real de otro tablero es indistinguible (aceptado) |
| 5 | Path traversal / symlinks | `FileSandbox`: segmentos validados, `lstat` en cada componente, `O_NOFOLLOW`, escrituras `O_EXCL` + `link`; nombres derivados de IDs | `sandbox-and-documents.test.ts` (incl. propiedad con 400 rutas) | Carrera TOCTOU si otro proceso local escribe en `WORKSPACE_ROOT` (no expuesto por la API) |
| 6 | Uploads maliciosos | Firma (magic bytes), TXT validado completo (UTF-8 sin NUL), ≤ 10 MB, cuotas; PDF solo en el runner, en `worker_threads` con memoria limitada, timeout, entorno vacío y `isEvalSupported: false` | tests de sniffing, PDF dañado, timeout | Vulnerabilidades desconocidas de pdf.js (mitigadas por aislamiento) |
| 7 | Imágenes maliciosas | Firma + formato Pillow coincidente, límite de píxeles antes de decodificar, bomba de descompresión, tamaño de cuerpo (también chunked) | `test_api.py` | — |
| 8 | Acceso cruzado entre workspaces (IDOR) | `workspaceId` solo desde la sesión; todas las consultas filtran por él; el runner revalida la propiedad del documento | integración «workspace isolation»; revisión de rutas | — |
| 9 | CSRF / sesión | Cookie `HttpOnly`, `SameSite=Lax`, `Secure` + prefijo `__Host-` en HTTPS; token de 256 bits guardado como HMAC; Origin obligatorio en mutaciones | `http-guards.test.ts`, `abuse-check.mjs` | — |
| 10 | DoS | Cuerpos limitados por streaming (también chunked); cuotas atómicas por hora; 2 análisis concurrentes por workspace; cola de visión con timeout; límite global de workspaces; límite de sesiones por IP (proxy de confianza) | `hardening.test.ts`, `abuse-check.mjs` (413 en 39 ms) | Sin proxy de confianza todas las IP comparten cupo; el límite global puede agotarse |
| 11 | Ejecución repetida / colas duplicadas | `idempotencyKey` única, transición condicionada, artefactos únicos, reporte con fecha `approvedAt` | `queue.test.ts`, «crash after the report files were written» | — |
| 12 | Filtración en logs/errores | Logs JSON sin contenido de documentos, correos enmascarados, sin tokens; errores internos genéricos hacia el cliente | revisión del agente de seguridad | — |
| 13 | Red y secretos | Sin conectores salientes; visión en red privada con `X-Internal-Token` verificado antes de leer el cuerpo; secretos solo en `.env` (ignorado) | `test_api.py` | — |
| 14 | Privacidad | Datos ficticios; fotos no persistidas (solo sha256 y JSON); TTL con limpieza de BD y archivos | integración «TTL cleanup» | — |
| 15 | Contenedores | Usuarios sin root, `no-new-privileges`, visión con rootfs de solo lectura, puertos solo en `127.0.0.1` | `docker-compose.yml` | CSP con `'unsafe-inline'` para scripts |

## Revisión independiente

El 2026-11-08 el agente `ritualos-security-reviewer` (`.kiro/agents/`) revisó el código en modo solo lectura:
4 problemas confirmados (cuerpos chunked sin límite, limitador global/IP falsificable, cuotas con carrera,
sniffing de TXT parcial) y varias mejoras (plan fail-closed, transiciones condicionadas, errores internos
expuestos, entorno del worker PDF, token antes del cuerpo, `__Host-`). Todos corregidos en el commit `885c463`
con pruebas; ver `docs/kiro-usage.md`.

## Pendiente

- CSP con nonces (middleware de Next.js) para retirar `'unsafe-inline'`.
- Auditoría de dependencias en CI (`pnpm audit`, `pip-audit`) — no ejecutada en esta sesión.
- Revisión con el kit impreso: tarjetas fotocopiadas con ID duplicado se detectan (`DUPLICATE_INSTANCE`), pero
  no se distingue una tarjeta impresa por terceros (no es un objetivo de seguridad v1).
