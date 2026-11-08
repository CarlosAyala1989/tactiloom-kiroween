# Requirements Document — Tactiloom

## Introduction

Tactiloom convierte tarjetas físicas con marcadores ArUco dispuestas sobre un tablero de 8×4 casillas en
programas reales: OpenCV lee el tablero desde los píxeles, un compilador produce un grafo dirigido tipado
(IR `tactiloom-ir/1`) y un worker aislado ejecuta un catálogo cerrado de acciones sobre documentos de prueba,
solo después de un dry-run revisado y una aprobación explícita. Fuente contractual:
#[[file:RitualOS_KiroCLI_Prompt_Maestro.md]].

Cada criterio indica cómo se verifica (archivo de prueba o comando). Formato EARS:
`WHEN <condición> THE SYSTEM SHALL <comportamiento>`.

## Glossary

- **Fiducial:** marcador ArUco de esquina del tablero (IDs 0 TL, 1 TR, 2 BR, 3 BL).
- **Instancia de tarjeta:** tarjeta física única (`markerId` 10–89) mapeada por el catálogo a un tipo (`START`…`END`).
- **F / R(F) / B(F):** dirección de avance impresa, giro horario de 90° y dirección opuesta.
- **BoardState:** estado del tablero (`tactiloom-board/1`); **DetectionResult:** salida de visión.
- **IR:** programa compilado `tactiloom-ir/1` con `contentHash` sha256 canónico.
- **Plan / planHash:** resultado del dry-run que el usuario aprueba.

## Requirements

### Requirement 1 — Kit imprimible

**User Story:** Como facilitador, quiero descargar un tablero y tarjetas imprimibles con marcadores reales para montar el taller.

#### Acceptance Criteria

1. WHEN el usuario abre el kit THE SYSTEM SHALL ofrecer tablero A3, mosaico 4×A4 a escala real, versión reducida A4 y hojas de tarjetas en PDF y SVG. *(`/kit`, `GET /api/board/kit`)*
2. THE SYSTEM SHALL usar `DICT_4X4_100`, IDs 0–3 para las esquinas y 10–89 para instancias, con ID visible en cada tarjeta. *(`packages/board-kit/test/board-kit.test.ts`)*
3. WHEN se genera el kit THE SYSTEM SHALL rasterizar el PDF/SVG y recuperar con OpenCV todos los IDs previstos. *(`services/vision/tests/test_board_kit_raster.py`)*
4. THE SYSTEM SHALL generar salidas deterministas y un manifiesto con sha256 de cada archivo. *(drift test del kit)*

### Requirement 2 — Lectura del tablero desde píxeles

**User Story:** Como usuario, quiero fotografiar o subir una imagen del tablero y ver qué se reconoció.

#### Acceptance Criteria

1. WHEN se recibe una imagen JPG/PNG/WEBP válida THE SYSTEM SHALL detectar los marcadores desde los píxeles, calibrar con los 4 fiduciales (homografía de 16 esquinas) y asignar casilla y orientación N/E/S/W. *(`test_fixtures.py`, `test_properties.py`)*
2. IF falta un fiducial THEN THE SYSTEM SHALL devolver `BOARD_FIDUCIAL_MISSING` indicando cuál falta y no asignar tarjetas.
3. IF una tarjeta cae entre casillas o fuera de la cuadrícula THEN THE SYSTEM SHALL devolver `AMBIGUOUS_POSITION` o `CARD_NOT_IN_CELL` con las casillas candidatas.
4. IF la orientación se desvía más de 18° de un eje THEN THE SYSTEM SHALL devolver `AMBIGUOUS_ORIENTATION`.
5. THE SYSTEM SHALL emitir las tarjetas en orden estable `(row, col, markerId)` e incluir un overlay dibujado con la misma salida del detector.
6. IF la imagen está dañada, no es una imagen, es demasiado grande o tiene demasiados píxeles THEN THE SYSTEM SHALL rechazarla con 422/415/413 y un mensaje claro. *(`test_api.py`)*
7. THE SYSTEM SHALL validar su salida contra el JSON Schema publicado `detection-result.v1`. *(`test_contracts.py`)*

### Requirement 3 — Gramática física y compilación

**User Story:** Como usuario, quiero que la disposición física se traduzca en un programa con reglas públicas, sin conexiones inventadas.

#### Acceptance Criteria

1. THE SYSTEM SHALL conectar una salida con la casilla vecina en F (`NEXT`/`TRUE`) o en R(F) (`FALSE` de CONDITION) solo si el receptor está orientado de modo que su lado trasero B(F) mira a la salida. *(`packages/compiler/test/compile.test.ts`)*
2. WHEN se compila el ejemplo oficial de dos ramas THE SYSTEM SHALL producir 10 nodos y 9 aristas, TRUE→`report-15` y FALSE→`review-18`.
3. THE SYSTEM SHALL rechazar ciclos (`CYCLE_UNSUPPORTED`), entradas múltiples, nodos inalcanzables y caminos que no terminan en FIN.
4. THE SYSTEM SHALL comprobar la disponibilidad de datos en cada camino (definite assignment) y emitir `MISSING_REQUIRED_DATA`.
5. THE SYSTEM SHALL derivar tipo e instancia del catálogo cerrado e ignorar tipos enviados por el cliente.

### Requirement 4 — Diagnósticos comprensibles

**User Story:** Como usuario no programador, quiero saber qué está mal, dónde y cómo corregirlo.

#### Acceptance Criteria

1. THE SYSTEM SHALL estructurar cada diagnóstico como `{code, severity, stage, message, markerIds?, cells?, nodeIds?, suggestion?}` con mensaje en español.
2. THE SYSTEM SHALL implementar como mínimo los códigos de §6.4 del prompt maestro. *(`packages/contracts/src/diagnostics.ts`)*
3. WHEN el grafo es inválido THE SYSTEM SHALL mostrar los errores con tarjeta y casilla y no ofrecer botón de ejecución. *(E2E `demo.spec.ts`)*

### Requirement 5 — IR versionada, determinismo y hash

#### Acceptance Criteria

1. THE SYSTEM SHALL producir `tactiloom-ir/1` canónica: el mismo BoardState y parámetros generan la misma IR y `contentHash`. *(propiedades: idempotencia e invarianza de orden)*
2. WHEN cambia la orientación de una tarjeta, una tarjeta o un parámetro semántico THE SYSTEM SHALL producir una IR inválida o un hash distinto. *(propiedades de detección de cambio)*
3. THE SYSTEM SHALL publicar JSON Schemas versionados generados desde Zod y detectar divergencias. *(`contracts.test.ts`, `test_contracts.py`)*

### Requirement 6 — Revisión, dry-run y aprobación explícita

**User Story:** Como usuario, quiero revisar entrada, pasos y efectos antes de autorizar.

#### Acceptance Criteria

1. WHEN el usuario solicita revisar THE SYSTEM SHALL ejecutar un dry-run en el worker sin escribir archivos ni crear tareas y mostrar entrada, pasos, decisión prevista, efectos y `planHash`. *(`tests/integration/runner.test.ts`)*
2. THE SYSTEM SHALL encolar la ejecución solo con `confirm: true` y `contentHash`/`planHash` iguales a los del servidor, dentro de 30 minutos. *(`apps/web/lib/server/runs.ts`)*
3. WHEN cambian los parámetros o el documento THE SYSTEM SHALL crear una nueva versión con otro hash e invalidar aprobaciones previas.
4. THE SYSTEM SHALL impedir doble encolado (clave de idempotencia única por run).

### Requirement 7 — Ejecución real y segura

#### Acceptance Criteria

1. WHEN se ejecuta con `valid-application.pdf` THE SYSTEM SHALL extraer el texto real, validar los campos, tomar la rama TRUE y guardar reportes Markdown/JSON descargables con checksum. *(engine + integración + E2E)*
2. WHEN se ejecuta con `invalid-application.pdf` THE SYSTEM SHALL tomar la rama FALSE y crear una `ReviewTask` OPEN con campos faltantes, sin reporte.
3. IF el PDF no tiene capa de texto THEN THE SYSTEM SHALL fallar con `PDF_NO_TEXT_LAYER` sin inventar campos.
4. THE SYSTEM SHALL ejecutar solo la rama elegida, emitir `NodeRunEvent` por nodo y marcar `SUCCEEDED` solo si los artefactos o revisiones prometidos existen.
5. THE SYSTEM SHALL verificar el hash y la estructura de la IR antes de ejecutar y rechazar IR manipulada. *(`verifyIr`)*

### Requirement 8 — Worker y cola

#### Acceptance Criteria

1. THE SYSTEM SHALL reclamar trabajos con `FOR UPDATE SKIP LOCKED` y lease con heartbeat; un trabajo no puede ser tomado por dos workers a la vez. *(`queue.test.ts`)*
2. WHEN un lease vence THE SYSTEM SHALL permitir reclamarlo, con reintentos limitados y estado `DEAD` al agotarlos.
3. THE SYSTEM SHALL evitar efectos duplicados ante reintentos (artefactos y revisiones idempotentes).

### Requirement 9 — Persistencia, historial y descargas

#### Acceptance Criteria

1. THE SYSTEM SHALL guardar capturas (sin la foto), versiones inmutables, runs, eventos, artefactos, revisiones y auditoría en PostgreSQL.
2. WHEN el usuario consulta el historial THE SYSTEM SHALL mostrar capturas, versiones, ejecuciones, reportes y revisiones de su workspace.
3. THE SYSTEM SHALL servir descargas solo del workspace de la sesión y verificar el checksum.

### Requirement 10 — Interfaz y accesibilidad

#### Acceptance Criteria

1. THE SYSTEM SHALL ofrecer Landing, Cómo funciona, Board Studio, Workflow Studio, Review & Run, Monitor, Historial, Galería, Simulador, Kit y Ayuda.
2. THE SYSTEM SHALL ofrecer alternativa textual al diagrama, foco visible, navegación por teclado y sin violaciones axe graves. *(`a11y.spec.ts`)*

### Requirement 11 — Modos honestos

#### Acceptance Criteria

1. THE SYSTEM SHALL registrar `sourceMode: physical | image | simulator` y etiquetar el simulador como «Simulador digital: no utiliza cámara».
2. THE SYSTEM SHALL tratar los estados del simulador siempre como `simulator` aunque el cliente declare otro modo.
3. THE SYSTEM SHALL etiquetar las imágenes de la galería como sintéticas.

### Requirement 12 — Seguridad

#### Acceptance Criteria

1. THE SYSTEM SHALL confinar todo acceso a archivos a `WORKSPACE_ROOT/<workspaceId>` rechazando `../`, rutas absolutas y symlinks. *(`sandbox-and-documents.test.ts`)*
2. THE SYSTEM SHALL validar uploads por contenido (firma), tamaño y MIME.
3. THE SYSTEM SHALL tomar `workspaceId` siempre de la sesión y aislar workspaces. *(integración: aislamiento)*
4. THE SYSTEM SHALL verificar `Origin` en mutaciones y usar cookies `HttpOnly`, `SameSite=Lax`.
5. THE SYSTEM SHALL no ejecutar código arbitrario (sin `eval`, sin shell con datos de usuario). *(ESLint `no-eval`, `no-restricted-imports`)*

### Requirement 13 — Demo remota y despliegue

#### Acceptance Criteria

1. WHEN un juez sin hardware abre la demo THE SYSTEM SHALL permitir analizar imágenes de la galería, compilar, ejecutar y descargar el resultado. *(E2E `demo.spec.ts`, `scripts/smoke.mjs`)*
2. THE SYSTEM SHALL levantarse con `docker compose up --build` con health checks.
3. THE SYSTEM SHALL limitar la demo pública con TTL de workspace y cuotas.

### Requirement 14 — Uso de Kiro y documentación

#### Acceptance Criteria

1. THE SYSTEM SHALL versionar `.kiro/` (steering, specs, hooks, agents) en la raíz del repositorio.
2. THE SYSTEM SHALL documentar el uso real de Kiro en `docs/kiro-usage.md` y el estado en `docs/implementation-status.md`.

### Requirement 15 — Idiomas (es, en, it, fr)

**User Story:** Como participante de un taller en Italia, Francia o un país angloparlante, quiero usar Tactiloom
en mi idioma, para entender cada paso, cada error y el reporte sin traducir nada. Decisiones: ADR 0005.

#### Acceptance Criteria

1. THE SYSTEM SHALL ofrecer la interfaz completa en español (por defecto), inglés, italiano y francés, con un selector visible en la cabecera que no recarga el trabajo en curso y guarda la preferencia. *(E2E `i18n.spec.ts`, `client.test.ts`: paridad de claves)*
2. WHEN no hay preferencia guardada THE SYSTEM SHALL elegir el idioma con `Accept-Language` y, si no hay coincidencia, español; `<html lang>` SHALL coincidir. *(`contracts.test.ts`, E2E `i18n.spec.ts`)*
3. THE SYSTEM SHALL explicar cada diagnóstico de visión y de compilación en el idioma elegido con la misma tarjeta, fila y columna que el texto canónico en español. *(`diagnostics-i18n.test.ts`: fast-check sobre tableros aleatorios y diagnósticos reales del detector)*
4. WHEN un diagnóstico almacenado no tiene `params` THE SYSTEM SHALL mostrar el texto español original marcado como tal (nunca inventar un texto).
5. THE SYSTEM SHALL generar el reporte en el idioma del parámetro «Idioma del reporte» de CREAR REPORTE (por defecto, el de la interfaz) sin cambiar el `contentHash` de los programas existentes, y el reporte español SHALL ser idéntico byte a byte al de la v1. *(`i18n.test.ts` del motor, snapshot del compilador)*
6. THE SYSTEM SHALL ofrecer el kit imprimible en los cuatro idiomas, con títulos que caben en la tarjeta y marcadores que OpenCV recupera desde los PDF de cada idioma. *(`locales.test.ts`, `test_board_kit_raster.py`)*
7. THE SYSTEM SHALL dibujar los textos de la superposición de OpenCV en el idioma de la petición sin cambiar los datos de detección. *(`test_i18n.py`)*
8. THE SYSTEM SHALL reconocer las etiquetas de campos de los documentos en los cuatro idiomas y ofrecer documentos de demostración ficticios en cada uno. *(`i18n.test.ts` del motor)*
