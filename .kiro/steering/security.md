---
inclusion: always
---

# Seguridad (no negociable)

- **Catálogo cerrado.** Una tarjeta es un `markerId` del catálogo; nunca código. Prohibido `eval`, `new Function`,
  `child_process.exec` con datos de usuario, `os.system`, plantillas ejecutables o nombres de ejecutable recibidos.
- **Sin ejecución accidental.** Capturar, analizar o compilar nunca encola trabajo. Solo `POST /api/runs`
  con `confirm: true`, `contentHash` y `planHash` coincidentes con un dry-run reciente crea un job EXECUTE.
- **No confiar en el cliente.** El servidor recompila desde `BoardState` (o desde la captura almacenada) y
  recalcula el hash; nunca acepta IR ni `contentHash` del navegador como verdad. `workspaceId` siempre sale de la sesión.
- **Sandbox de ficheros.** Toda ruta pasa por `resolveInsideSandbox()` (canonicalización + `realpath` + rechazo de
  symlinks + `O_NOFOLLOW`). Los nombres de ficheros generados se derivan de IDs internos.
- **Uploads.** Límites de tamaño/píxeles, verificación de firma (magic bytes) y MIME, timeouts; PDF solo se procesa en el runner.
- **Sesiones demo.** Cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción; token aleatorio guardado como sha256.
  Mutaciones verifican `Origin`. Cuotas y TTL por workspace.
- **Privacidad.** Datos ficticios. Las fotos no se guardan por defecto. Logs sin contenido de documentos ni tokens.
- **Red.** Sin conectores salientes en P0. La visión vive en red privada y exige `X-Internal-Token` si está configurado.
- **Secretos** solo en variables de entorno; versionar únicamente `.env.example`.
- No desactivar controles de seguridad para que funcione una demo. Si algo falla, documentarlo.
