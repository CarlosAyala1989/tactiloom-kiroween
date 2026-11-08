# RITUALOS — PROMPT MAESTRO DE IMPLEMENTACIÓN PARA KIRO CLI

> **Versión del documento:** 1.0 — 3 de noviembre de 2026  
> **Proyecto:** RitualOS  
> **Categoría objetivo:** Kiroween 2026 — Frankenstein  
> **Equipo:** 3 desarrolladores con React, Next.js, Node.js, Python, bases de datos, móvil y escritorio  
> **Idioma de la aplicación:** español inicialmente; arquitectura preparada para inglés y contenido de entrega en inglés  
> **Entregable:** aplicación funcional, ejecutable, documentada, probada y apta para demostración física y remota  
> **Convención:** especificaciones/documentación en español; código, APIs y nombres de clases en inglés.

**Fuentes y referencias:** [Kiroween 2026 — reglas](https://kiroween.devpost.com/rules) · [Kiroween — FAQ](https://kiroween.devpost.com/details/faqs) · [Kiro CLI — inicio](https://kiro.dev/docs/cli/quick-start/) · [OpenCV ArUco](https://docs.opencv.org/4.12.0/d5/dae/tutorial_aruco_detection.html) · [FloBlocks](https://link.springer.com/article/10.1007/s44217-025-01064-7) · [Sheets](https://www.sciencedirect.com/science/article/pii/S2351978915006940).

---

# 0. ORDEN INICIAL AL AGENTE — LEER PRIMERO

**Actúa como el ingeniero principal que IMPLEMENTA RitualOS.** Tienes responsabilidad de arquitectura, compiladores, visión computacional, frontend, backend, seguridad, calidad, DevOps, accesibilidad, documentación y pruebas. Tu tarea **NO** es entregar únicamente un plan, un mockup, una colección de TODO ni pseudocódigo. Debes escribir el código, instalar dependencias cuando el entorno lo permita, iniciar servicios, ejecutar pruebas y corregir fallos verificables.

Trabaja **dentro del repositorio donde se encuentra este archivo**, sin acceder a carpetas personales fuera del proyecto ni ejecutar cambios destructivos no autorizados. Si el repositorio está vacío, inicialízalo. Si existen archivos, inspecciónalos y evita sobrescribir trabajo válido. Nunca inventes resultados de pruebas, métricas, enlaces de despliegue, imágenes de una cámara real ni confirmaciones de una acción externa. Documenta cualquier limitación no resuelta.

## 0.1 Orden de trabajo obligatorio

1. Leer **todo** este documento y examinar el entorno (versiones disponibles de Node, pnpm, Python, Docker, sistema operativo, cámara si existe). Confirmar tecnologías y restricciones en `docs/adr/0001-architecture.md`.
2. Crear en la raíz **`.kiro/` real y versionada**. Preparar `.kiro/steering/`, `.kiro/specs/ritualos/requirements.md`, `design.md`, `tasks.md` y un registro de evidencia real de uso de Kiro. Validar configuración de hooks/agentes contra la documentación vigente antes de escribir formatos dependientes de versión.
3. Implementar primero un **vertical slice comprobable**: una imagen de tablero con marcadores reales ArUco → detección desde píxeles → calibración → detección de tarjetas y orientaciones → construcción de grafo → validación → ejecución en modo simulación → resultado comprobable. No comenzar con un dashboard decorativo.
4. Implementar el motor de automatizaciones seguro para archivos de ejemplo y reportes reales, no operaciones ficticias. Conectar persistencia, historial, logs y interfaz Next.js.
5. Completar generación e impresión de tablero y tarjetas, cámara del navegador, subida de imágenes, simulador digital accesible y ejemplos precargados.
6. Ejecutar pruebas unitarias, de integración, de extremo a extremo, de seguridad y pruebas con imágenes sintéticas rasterizadas y transformadas. Documentar por separado las pruebas físicas hechas realmente por el equipo.
7. Preparar el despliegue de una instancia accesible en Internet, instrucciones reproducibles, vídeo de menos de 3 minutos, documentación para jueces, licencia abierta y verificación de las reglas.
8. Al terminar cada fase actualizar `docs/implementation-status.md` con: archivos modificados, comandos ejecutados, resultados **reales**, problemas pendientes, riesgos y próxima fase. Nunca marcar «listo» por el mero hecho de generar código.
9. Preferir soluciones locales reproducibles. No exigir servicios externos de pago, una API de LLM ni hardware especializado para probar el MVP.
10. Tomar decisiones técnicas menores de forma autónoma y registrarlas. Solicitar autorización cuando se requieran pagos, claves reales, cambios destructivos o acceso a cuentas externas. No desactivar controles de seguridad para hacer funcionar la demo.

## 0.2 Definición irrenunciable de terminado

RitualOS se considera **MVP funcional** cuando una persona puede:

- Abrir la web, acceder al proyecto de demostración y consultar las instrucciones de uso.
- Descargar un tablero y tarjetas ArUco imprimibles, con etiquetas legibles y numeración única.
- Fotografiar un tablero real **o subir una imagen** del tablero; el servicio detecta los marcadores desde los píxeles.
- Ver en pantalla las tarjetas reconocidas, sus posiciones, rotaciones, confianza y posibles errores.
- Compilar el tablero en un **grafo dirigido tipado** y visualizarlo como diagrama editable en parámetros, no como conexiones manualmente inventadas.
- Recibir mensajes comprensibles si el flujo está incompleto, ambiguo, no conectado, tiene ciclos o no supera validaciones.
- Revisar un resumen de acciones y **aprobar explícitamente** la ejecución. Mover una tarjeta nunca ejecuta una acción por sí solo.
- Ejecutar un flujo real y seguro sobre un documento de prueba, extraer datos, verificar campos, bifurcar por condición y generar o guardar un reporte dentro de un directorio controlado.
- Cambiar físicamente la configuración, volver a escanear, ver qué cambió y obtener otro resultado coherente.
- Consultar historial, evidencias, errores y descargar el reporte generado.
- Probar una **demo remota sin cámara física** mediante imágenes auténticamente procesadas por OpenCV y un editor/simulador claramente identificado como tal.
- Levantar el proyecto localmente con instrucciones verificadas y disponer de URL de app desplegada (si el equipo realiza despliegue externo).

No se aceptan botones muertos, rutas que devuelven siempre éxito, datos inventados presentados como ejecución real ni reconocimiento «simulado» haciéndose pasar por lectura por cámara.

---

# 1. PRODUCTO Y PROBLEMA REAL

## 1.1 Visión

**RitualOS — Build workflows with your hands. Run them on your computer.**

Una plataforma de **automatización tangible** que convierte tarjetas físicas dispuestas sobre un tablero en programas reales. Una cámara reconoce marcadores y posiciones; un compilador traduce la disposición a un grafo de instrucciones; un motor aislado ejecuta acciones autorizadas sobre documentos y archivos. Una aplicación web permite observar, parametrizar, validar, aprobar, ejecutar, inspeccionar y compartir los flujos.

### Problema concreto

Personal no programador que procesa documentos repetitivos puede tener dificultades para diseñar automatizaciones digitales usando lenguajes formales. Una interfaz tangible permite a dos o tres personas **construir, revisar y discutir un procedimiento juntas**, sobre una mesa, y verlo ejecutarse en una computadora real. RitualOS busca especialmente facilitar talleres de diseño de procesos y capacitación administrativa.

### Público inicial

1. **Usuario principal:** coordinadores de talleres, personal administrativo y estudiantes que necesitan comprender y prototipar procesos de documentos.
2. **Facilitador:** docente o integrante de un equipo que imprime las tarjetas, prepara archivos de prueba y guía la sesión.
3. **Juez remoto:** puede evaluar el flujo por navegador usando imágenes de tableros precapturadas y un sandbox de ejecución en el servidor.

### Propuesta diferencial ante Frankenstein

Esto **NO** es un juego educativo de tarjetas que solamente mueve figuras, ni un simple lector de QR que abre enlaces. El diferencial debe ser demostrable: **programación tangible → análisis de un grafo formal → controles de seguridad → ejecución real de una tarea de oficina → historial verificable**.

Reconocer antecedentes sin adjudicarse invenciones previas: **FloBlocks** (2025) y **Sheets** (2015) ya trabajaron programación con tarjetas y webcam. No afirmar que RitualOS inventó la programación tangible; explicar que propone integrarla con un motor seguro de automatización documental, trazabilidad y uso colaborativo.

## 1.2 Principios de producto

- Interfaz física comprensible y programable sin escribir código.
- Confianza: primero leer y validar, luego revisar, finalmente ejecutar con consentimiento.
- Transparencia: mostrar **qué se reconoció**, **qué programa se compiló** y **qué acciones ocurrieron**.
- Determinismo: la misma imagen normalizada y mismos parámetros generan la misma IR y el mismo hash de compilación.
- Comportamiento seguro: no hay ejecución automática, shell arbitraria, plugins opacos ni acceso irrestricto a archivos.
- Resiliencia: se puede probar con fotos de un tablero o desde un simulador virtual sin hardware externo.
- Accesibilidad: el usuario puede comprender y usar las funciones clave también mediante teclado y pantalla.
- Una historia de usuario fuerte antes de ampliar a casos universales.

## 1.3 Caso principal de demostración

**Procesamiento de solicitudes de participación en un taller.** Se sube un archivo PDF o TXT ficticio con campos `name`, `email`, `workshop` (o sus equivalentes en español). El flujo tangible:

```
START → INPUT_FILE → EXTRACT_TEXT → VALIDATE_FIELDS → CONDITION
                                                   ├─ YES → CREATE_REPORT → SAVE_REPORT → END
                                                   └─ NO  → REQUEST_REVIEW → END
```

- Camino `YES`: crea de verdad un reporte `.md` o `.json` y lo guarda en el workspace sandbox; se puede descargar.
- Camino `NO`: crea un evento de revisión, muestra campos faltantes y concluye sin reporte aprobado.
- La demo incluye **un archivo válido y uno inválido**; cambiar de archivo o los parámetros modifica el resultado.
- El usuario puede **mover tarjetas** para crear un flujo incorrecto y ver el error de compilación, luego corregirlo.
- Para tener un segundo flujo tangible válido sin duplicar infraestructura, admitir una secuencia lineal alternativa con tarjetas de control y reportes.

---

# 2. LÍMITES DE ALCANCE, PRIORIZACIÓN Y RESULTADOS

## 2.1 P0 — Obligatorio y prioritario

- Generación de tablero y tarjetas ArUco; reconocimiento desde imagen; calibración de perspectiva.
- Reglas físicas explícitas, orientación y construcción reproducible de grafo.
- Compilador seguro con IR versionada y errores de diagnóstico útiles.
- Ejecución real de documentos de ejemplo mediante ocho o más clases de tarjetas, con bifurcación.
- Web Next.js con captura, subida, diagrama, parámetros, aprobación, estado y descarga.
- Backend Node.js, CV Python, base de datos, jobs con runner dedicado, auditoría.
- Simulador de tablero sin cámara; muestras sintéticas generadas y transformadas desde píxeles.
- Pruebas automáticas, README, `.kiro/`, licencia, Docker Compose, una demo alojada accesible a jueces.

## 2.2 P1 — Tras completar P0

- Vista de cámara continua con estabilización temporal, no solo fotografía.
- Comparación visual de dos versiones de un tablero y explicación de diferencias.
- Exportación/importación de flujos JSON versionados.
- Edición compartida de parámetros, historial de revisiones y perfiles de ejecución.
- Soporte de múltiples idiomas, onboarding guiado, accesibilidad mejorada.
- Modo escritorio opcional con agente local claramente identificado y autorizado.

## 2.3 P2 — Investigación futura, no bloquear P0

- Reconocer flechas o conectores trazados a mano.
- Compilación con bucles finitos, variables, funciones, nodos personalizados firmados.
- Automatización de aplicaciones arbitrarias mediante accesibilidad de SO o computer use.
- LLM para proponer flujos; jamás imprescindible para lectura, compilación o ejecución.
- Sincronización de varias cámaras, colaboración multiusuario en vivo, sensores físicos adicionales.
- Marketplace de tarjetas y extensiones externas.

**Regla de alcance:** si la fecha aprieta, primero sacrificar P2 y P1, nunca el núcleo de imagen real → programa → acción real con confirmación.

---

# 3. STACK Y ARQUITECTURA DE REFERENCIA

## 3.1 Tecnologías preferidas

| Capa | Elección | Justificación |
|---|---|---|
| Web + API HTTP | Next.js con TypeScript estricto, React, Tailwind CSS | Experiencia de usuario, páginas, API y sesiones |
| Servicios de visión | Python 3.11+ con FastAPI, NumPy y `opencv-contrib-python-headless` | ArUco, homografía, rotación, procesamiento de imágenes |
| Compilador/IR | TypeScript puro, Zod, Vitest, fast-check | Tipos, reglas y pruebas de propiedades |
| Ejecutor | Node.js TypeScript en proceso **worker separado** | Acciones reales, sandbox, cola e historial; evita tareas largas en una API serverless |
| Persistencia | PostgreSQL + Prisma | Proyectos, archivos de prueba, tableros, jobs y auditoría |
| UI de grafos | React Flow / `@xyflow/react` | Diagrama resultante; accesible con alternativa textual |
| Jobs | Tabla Postgres con `FOR UPDATE SKIP LOCKED` y lease, o biblioteca equivalente justificada | Fiabilidad básica sin Redis obligatorio |
| Captura | `getUserMedia` del navegador, envío de snapshots y subida de archivos | Compatibilidad web, permisos visibles |
| QA | Playwright, Vitest, pytest, Hypothesis, ESLint, Ruff | Pruebas UI, motor, CV y propiedades |
| Desarrollo | pnpm workspaces, Docker Compose | Monorepositorio reproducible |
| Observabilidad | Logs estructurados + trazas con correlation ID | Depuración y presentación comprobable |

**Restricción:** antes de fijar una versión, inspeccionar las versiones estables instalables compatibles. Fijar lockfiles. Si una biblioteca del stack elegido no es compatible con el entorno, reemplazarla por una alternativa estable documentando el cambio, sin rediseñar innecesariamente toda la arquitectura.

## 3.2 Servicios

```
Navegador (webcam / imagen / editor virtual)
                   |
                HTTPS
                   v
           Next.js Web + API
            |           |
            v           v
       PostgreSQL    Python CV (red privada)
            ^             |
            |         JSON detecciones
            |
       Node Worker <--- trabajos pendientes
            |
       sandbox /workspace/demo
            |
     reportes y trazas descargables
```

- La web nunca ejecuta automatizaciones largas dentro del ciclo de petición HTTP.
- El servicio de visión **no tiene acceso** a secretos de usuarios, sistemas operativos personales ni rutas privadas.
- El worker es un proceso separado que opera exclusivamente sobre un volumen `demo-workspace` y un conjunto fijo de acciones.
- El usuario remoto no controla el sistema operativo del servidor: selecciona archivos ya cargados en su workspace aislado.
- El demo público puede funcionar con una única organización y un sandbox multi-sesión con separación por `workspaceId`, TTL y cuotas.

## 3.3 Árbol objetivo

```text
ritualos/
├── .kiro/
│   ├── steering/
│   │   ├── product.md
│   │   ├── architecture.md
│   │   ├── security.md
│   │   └── testing.md
│   ├── specs/ritualos/
│   │   ├── requirements.md
│   │   ├── design.md
│   │   └── tasks.md
│   └── ... (solo configuración válida para la versión instalada)
├── apps/
│   ├── web/                   # Next.js: pantallas + API
│   └── runner/                # Node worker / acciones permitidas
├── services/
│   └── vision/                # FastAPI + OpenCV
├── packages/
│   ├── contracts/             # schemas Zod, JSON Schema y tipos
│   ├── compiler/              # tablero → IR + validación
│   ├── workflow-engine/       # ejecutor de DAG tipado
│   ├── board-kit/             # generador SVG/PDF y catálogo de tarjetas
│   └── ui/                    # componentes compartidos si se justifica
├── prisma/
├── assets/
│   ├── card-icons/            # ilustraciones propias/licenciadas
│   └── examples/              # capturas / documentos ficticios
├── tests/
│   ├── fixtures/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── adr/
│   ├── physical-grammar-v1.md
│   ├── workflow-ir-v1.md
│   ├── threat-model.md
│   ├── implementation-status.md
│   ├── benchmarking.md
│   ├── judge-guide.md
│   ├── demo-script.md
│   ├── frankenstein-differentiation.md
│   └── kiro-usage.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
├── pnpm-workspace.yaml
├── package.json
└── RitualOS_KiroCLI_Prompt_Maestro.md
```

*Si el generador de cartas o el esquema prisma requiere otra ubicación, documentar el cambio en un ADR; mantener interfaces claras entre módulos.*

---

# 4. LENGUAJE FÍSICO: RITUAL BOARD GRAMMAR v1 (NORMATIVO)

**Esta sección es el contrato central. Evitar inferir conexiones arbitrarias por mera cercanía.** El tablero debe producir un programa determinista a partir de reglas geométricas públicas.

## 4.1 Tablero

- Diseño objetivo: **8 columnas × 4 filas** (`COLS=8`, `ROWS=4`); casillas cuadrangulares claramente delimitadas.
- Tamaño imprimible recomendado: A3 horizontal con zona interior aproximada de 376 × 232 mm, 47 × 58 mm por celda; optimizar impresión real con márgenes. Ofrecer mosaico en A4 a escala real con instrucciones de ensamblaje y una versión de menor tamaño para pruebas. No afirmar tamaños sin validar PDF/SVG real.
- Cuatro marcadores fiduciales exclusivos ubicados en esquinas del tablero, fuera de las casillas; IDs ArUco **0, 1, 2, 3**, en orden superior-izquierda, superior-derecha, inferior-derecha, inferior-izquierda.
- Tarjetas: marcador ArUco único del mismo diccionario (IDs desde **10**), título, icono, flecha de dirección, marcas `IN/OUT` o `YES/NO` y etiqueta de ID visible.
- Diccionario fijo v1: `DICT_4X4_100` (si el entorno soporta OpenCV actual). Reservar 0–3 para esquinas y 10–89 para instancias. No confundir ID de instancia con tipo de acción.
- Diseñar tarjetas físicas de tamaño menor al de la casilla, con un área libre alrededor de cada marcador para robustez de lectura.
- Una casilla admite **máximo una tarjeta**. IDs de instancia únicos por tarjeta. Las tarjetas se pueden rotar en múltiplos de 90°.
- La orientación de un marcador se obtiene por el orden de las esquinas detectadas por ArUco, no por OCR de palabras.

## 4.2 Sistema de coordenadas

- La imagen física se transforma mediante **homografía** de cuatro marcadores de esquina al plano canónico del tablero.
- Definir coordenadas en píxeles normalizados, por ejemplo tablero de `1600 × 800` para 8 columnas y 4 filas, cada celda 200 × 200. Lo importante es que sean invariantes ante perspectiva.
- El ID de una casilla es `(row, col)` con índices desde 0. Asignar el centro detectado al centro de celda más cercano **solo si** cae dentro de la tolerancia definida, por ejemplo distancia al centro ≤ 0.32 del ancho/alto de celda por eje (ajustable con mediciones).
- Si un marcador cae fuera o entre celdas, devolver error recuperable `CARD_NOT_IN_CELL` o `AMBIGUOUS_POSITION` con superposición visual.
- Cuantizar rotaciones a `N, E, S, W` a partir del cuadrilátero; si difiere más de 18° del ángulo recto más cercano, marcar `AMBIGUOUS_ORIENTATION`.
- Emitir detecciones en orden estable `(row, col, markerId)`; no usar el orden arbitrario de `detectMarkers()`.

## 4.3 Semántica de conexiones (reglas exactas)

Todos los nodos se conectan **por adyacencia de casillas** y puertos orientados; la separación vacía no equivale a una conexión. Definir:

- `F` = dirección **forward** de la tarjeta según su flecha impresa.
- `R(F)` = giro horario 90° de `F`.
- `B(F)` = dirección opuesta a `F`.
- Un nodo normal (`START`, `INPUT_FILE`, `EXTRACT_TEXT`, `VALIDATE_FIELDS`, `CREATE_REPORT`, `SAVE_REPORT`, `REQUEST_REVIEW`) tiene **salida forward** hacia la celda inmediatamente vecina en `F`.
- `CONDITION` tiene **salida TRUE** en `F` y **salida FALSE** en `R(F)`; ambas deben conectar con nodos diferentes.
- `END` no tiene salida.
- La conexión existe cuando el puerto de salida llega a una tarjeta adyacente **y el nodo receptor admite entrada por ese lado**. En v1 la entrada de cada tarjeta es por su `back`, `B(F)`; para ramificación, una tarjeta receptora de la rama FALSE puede orientarse en dirección del flujo.
- Los nodos no reciben múltiples aristas, excepto si en una futura versión se introduce `MERGE` con contrato explícito. En v1, duplicidad de entrada = error.
- Tarjetas sin salida (`END`) son válidas únicamente como terminales de caminos completos; si quedan caminos abiertos, error.
- No interpretar visualmente «líneas» dibujadas en el tablero como conexiones v1; solo marcadores, cuadrícula y orientación.

### Ejemplo físico obligatorio (dos ramas)

La posición `row, col` y orientación están definidas para un tablero de 8 × 4:

| Tarjeta / instancia | Posición | Orientación | Función |
|---|---|---|---|
| `START#10` | `(0,0)` | `E` | Comienzo manual |
| `INPUT_FILE#11` | `(0,1)` | `E` | Archivo seleccionado en UI |
| `EXTRACT_TEXT#12` | `(0,2)` | `E` | Extraer texto PDF/TXT |
| `VALIDATE_FIELDS#13` | `(0,3)` | `E` | Validar campos configurados |
| `CONDITION#14` | `(0,4)` | `E` | TRUE→este, FALSE→sur |
| `CREATE_REPORT#15` | `(0,5)` | `E` | Generar reporte |
| `SAVE_REPORT#16` | `(0,6)` | `E` | Guardar salida en sandbox |
| `END#17` | `(0,7)` | `E` | Fin exitoso |
| `REQUEST_REVIEW#18` | `(1,4)` | `S` | Crear tarea de revisión |
| `END#19` | `(2,4)` | `S` | Fin de revisión |

**Observación de consistencia importante:** el receptor `REQUEST_REVIEW` en `(1,4)` orientado hacia `S` tiene su entrada por `N`, y el receptor `END#19` en `(2,4)` orientado hacia `S` también recibe por `N`. `CONDITION` con orientación `E` envía FALSE al `S`. Este ejemplo debe convertirse en fixture y generar exactamente dos ramas sin contradicción de puertos.

## 4.4 Tarjetas soportadas v1

| Tipo | Inputs semánticos | Outputs semánticos | Parámetros por UI | Efecto |
|---|---|---|---|---|
| `START` | ninguno | `control` | ninguno | inicializa el flujo manual |
| `INPUT_FILE` | `control` | `control + DocumentRef` | `uploadedFileId` | incorpora un archivo del workspace |
| `EXTRACT_TEXT` | `DocumentRef` | `ExtractedText` | `language` opcional | extrae PDF texto o TXT; OCR opcional controlado |
| `VALIDATE_FIELDS` | `ExtractedText` | `ValidationResult` | campos obligatorios | genera presencia/ausencia de campos |
| `CONDITION` | `ValidationResult` | `true/false` | predicado fijo `allRequiredPresent` | decide rama |
| `CREATE_REPORT` | `ExtractedText + ValidationResult` | `Report` | plantilla validada | arma Markdown/JSON |
| `SAVE_REPORT` | `Report` | `SavedArtifact` | nombre base seguro | guarda en workspace, crea artefacto |
| `REQUEST_REVIEW` | `ValidationResult` | `ReviewTask` | etiqueta opcional | registra revisión y motivos |
| `END` | `control` | ninguno | ninguno | termina una rama |

**Nota de tipado:** estas columnas son un modelo conceptual de datos, NO implican que todos los nodos necesiten cables separados para cada variable. La IR contiene **flujo de control** (aristas) y un `ExecutionContext` tipado que transporta recursos acumulados. Definir un *effect system* o reglas de disponibilidad para evitar ejecutar `CREATE_REPORT` sin `ExtractedText` y `ValidationResult`, incluso cuando las aristas de control sean válidas.

## 4.5 Instancias y catálogo de marcadores

- Guardar catálogo explícito `markerId → cardType → cardInstanceId` en BD y un JSON versionado verificable. El ID ArUco **no** define por sí solo un tipo universal.
- Permitir imprimir múltiples tarjetas `END`, cada una con markerId diferente. Impedir instancia duplicada en un mismo tablero.
- Generador de tarjetas: SVG y PDF (en el programa resultante) con marker IDs, tipo y orientación de flecha correcta. Incluir `board-v1.json` y `cards-v1.json`.
- Al reproducir imágenes de muestra, el lector debe reconocer los marcadores a partir de los píxeles rasterizados, no leer el JSON de la escena como sustituto de visión.

---

# 5. VISIÓN POR COMPUTADORA — ESPECIFICACIÓN FUNCIONAL

## 5.1 Pipeline de análisis

1. Recibir JPG/PNG/WEBP dentro de límites de peso, tamaño y píxeles; rechazar formatos inseguros o archivos corruptos.
2. Decodificar imagen y aplicar orientación EXIF de manera controlada.
3. Convertir a luminancia y usar detector ArUco con parámetros documentados (`cv2.aruco.getPredefinedDictionary`, `ArucoDetector` cuando aplique).
4. Detectar los cuatro IDs del tablero. Si falta alguno, dar error `BOARD_FIDUCIAL_MISSING`, explicar cuáles faltan y ofrecer un modo experimental de 3 marcadores solo si realmente se implementa y prueba; la versión estable requiere 4.
5. Calcular centro de cada fiducial con esquinas de marcador; construir homografía al tablero canónico. Verificar geometría razonable, orientación, área y condicionamiento. Evitar homografía invertida o excesivamente degenerada.
6. Transformar centros y esquinas de las tarjetas al plano canónico.
7. Identificar ID, tipo, posición, orientación, confianza geométrica y problemas de colocación.
8. Detectar solapamientos, duplicados, tarjetas fuera de tablero y posiciones ambiguas.
9. Construir respuesta JSON de detección y renderizar imagen de overlay (marcas, centros, IDs, casillas, flechas, advertencias). El overlay **no** debe falsear las detecciones: debe provenir de la misma salida del detector.
10. Devolver `boardState` versionado más `diagnostics`, métricas por etapa y `requestId`; jamás ejecutar nada desde FastAPI.

## 5.2 Ejemplo de salida de detección (contrato orientativo)

```json
{
  "protocolVersion": "ritual-board/1",
  "requestId": "req_example_001",
  "board": {"columns": 8, "rows": 4, "calibrated": true},
  "cards": [
    {
      "markerId": 10,
      "cardInstanceId": "start-10",
      "type": "START",
      "row": 0,
      "col": 0,
      "orientation": "E",
      "quality": 0.98
    }
  ],
  "diagnostics": [],
  "overlayAssetId": "overlay_example_001"
}
```

`quality` es una heurística explícitamente definida y calibrada; no presentar como probabilidad estadística si no existe modelo calibrado. Si la API no puede estimar calidad válida, usar `null` y suministrar diagnósticos deterministas.

## 5.3 Captura con cámara

- `getUserMedia` solicita permiso con UI clara; no intenta acceder silenciosamente.
- Mostrar guía de colocación, iluminación y alineación de cámara perpendicular.
- Modo inicial: **capturar foto/snapshot** y enviar. P1: análisis en vivo con 1–2 FPS, debounce/histéresis y visualización de estabilidad.
- Al perder permiso o si el usuario no tiene cámara, permitir subir imagen.
- No guardar fotografías permanentes por defecto; si el usuario las conserva para auditoría, mostrar consentimiento y retención.
- La API solo acepta requests autenticados o sesiones demo con cuotas apropiadas.

## 5.4 Estabilización temporal (P1)

- No aprobar una configuración mientras haya marcadores intermitentes.
- Mantener histórico de N frames; considerar un `BoardState` estable si los IDs, casillas y orientaciones coinciden durante al menos K observaciones consecutivas.
- Mostrar “moviendo tarjetas / tablero inestable” en vez de compilar estados transitorios.
- Ningún movimiento produce ejecución automática; la ejecución siempre requiere un gesto digital explícito de confirmar.

## 5.5 Pruebas de visión

- Fixtures positivos: tablero perfecto, rotado 90° y 180°, perspectiva suave, brillo distinto, foto con una tarjeta movida, rama TRUE/FALSE.
- Fixtures negativos: falta esquina, ID no registrado, duplicado, tarjeta fuera de centro, marcadores ocluidos, imagen vacía, archivo corrupto.
- Generar algunas imágenes sintéticas con **marcadores ArUco dibujados realmente** y transformarlas con `warpPerspective`, blur y ruido controlado; procesar siempre los píxeles transformados.
- Conservar opcionalmente fotos físicas reales obtenidas por el equipo en `tests/fixtures/physical/`, eliminando información privada.
- Objetivos experimentales, **no garantías**: ≥95% de tarjetas correctamente identificadas en condiciones sintéticas controladas y reconocimiento correcto de los 10 nodos del tablero de ejemplo en ≥8/10 capturas físicas controladas. Reportar resultados reales y condiciones.

---

# 6. COMPILADOR DE GRAFOS — MATEMÁTICA DISCRETA Y LENGUAJE INTERMEDIO

## 6.1 Modelo formal

Representar el programa como un **multigrafo dirigido y etiquetado**:

\[
G=(V,E,\tau,\lambda), \quad E \subseteq V \times L \times V
\]

- `V`: tarjetas/instancias reconocidas.
- `L`: puertos `NEXT`, `TRUE`, `FALSE`.
- `τ(v)`: tipo de tarjeta.
- `λ(v)`: parámetros y posición física.

La relación geométrica `adjacent((r,c), direction)` determina los únicos candidatos de conexión. La lectura **no** depende del orden de detección OpenCV.

## 6.2 Normalización y determinismo

1. Validar el esquema del tablero.
2. Normalizar nodos por `cardInstanceId`, ordenados por `(row,col,markerId)`.
3. Resolver cada salida a una celda adyacente usando orientación y puertos.
4. Comprobar compatibilidad de dirección con puerto de entrada del receptor.
5. Construir aristas canónicas `fromId, port, toId`.
6. Validar cardinalidades: un START, al menos un END, 0 o 1 entrada por nodo, salidas completas, IDs únicos.
7. Verificar que todos los nodos son alcanzables desde START; detectar ciclos usando DFS o Kahn. **Los ciclos se rechazan en v1**; no permitir loops implícitos ni ejecución indefinida.
8. Verificar que todas las rutas terminales terminan en `END`, y que no hay caminos sin salida.
9. Comprobar tipos y disponibilidad de datos en **cada ruta**, no solo en un nodo de forma global. Para `CREATE_REPORT`, sus datos deben existir en todo camino que lo alcance; aplicar una aproximación conservadora de *definite assignment* / intersección de hechos de antecesores si es necesario.
10. Producir IR versionada, `diagnostics` con códigos/mensajes en español y diagrama derivado de la misma IR.
11. Canonicalizar JSON del programa, calcular `sha256` del contrato relevante, parámetros y conexiones. El hash cambia si cambia la semántica, no por orden arbitrario de propiedades JSON.

## 6.3 IR ejemplo

```json
{
  "irVersion": "ritual-ir/1",
  "startNodeId": "start-10",
  "nodes": [
    {"id": "start-10", "markerId": 10, "kind": "START", "params": {}},
    {"id": "input-11", "markerId": 11, "kind": "INPUT_FILE", "params": {"uploadedFileId": "demo_valid_pdf"}},
    {"id": "extract-12", "markerId": 12, "kind": "EXTRACT_TEXT", "params": {"language": "es"}},
    {"id": "validate-13", "markerId": 13, "kind": "VALIDATE_FIELDS", "params": {"requiredFields": ["name", "email", "workshop"]}},
    {"id": "condition-14", "markerId": 14, "kind": "CONDITION", "params": {"predicate": "allRequiredPresent"}},
    {"id": "report-15", "markerId": 15, "kind": "CREATE_REPORT", "params": {"template": "workshop-summary-v1"}},
    {"id": "save-16", "markerId": 16, "kind": "SAVE_REPORT", "params": {"baseName": "workshop-report"}},
    {"id": "end-17", "markerId": 17, "kind": "END", "params": {}},
    {"id": "review-18", "markerId": 18, "kind": "REQUEST_REVIEW", "params": {"label": "Manual review"}},
    {"id": "end-19", "markerId": 19, "kind": "END", "params": {}}
  ],
  "edges": [
    {"from": "start-10", "port": "NEXT", "to": "input-11"},
    {"from": "input-11", "port": "NEXT", "to": "extract-12"},
    {"from": "extract-12", "port": "NEXT", "to": "validate-13"},
    {"from": "validate-13", "port": "NEXT", "to": "condition-14"},
    {"from": "condition-14", "port": "TRUE", "to": "report-15"},
    {"from": "condition-14", "port": "FALSE", "to": "review-18"},
    {"from": "report-15", "port": "NEXT", "to": "save-16"},
    {"from": "save-16", "port": "NEXT", "to": "end-17"},
    {"from": "review-18", "port": "NEXT", "to": "end-19"}
  ],
  "contentHash": "sha256-of-canonical-ir"
}
```

**Importante:** JSON mostrado es ilustrativo. El hash de ejemplo NO es un hash real y debe calcularse al ejecutar, nunca almacenarse literalmente así. El IR puede añadir `dataRequirements`, `sourceBoardId`, `compilerVersion` y `metadata` con su contrato formal.

## 6.4 Diagnósticos requeridos

Implementar códigos con estructura `{code, severity, message, markerIds?, cells?, suggestion?}`. Como mínimo:

- `MISSING_START`, `MULTIPLE_STARTS`, `MISSING_END`.
- `CARD_COLLISION`, `CARD_NOT_IN_CELL`, `UNKNOWN_CARD`.
- `DANGLING_OUTPUT`, `INCOMPATIBLE_PORTS`.
- `MULTIPLE_INPUTS`, `UNREACHABLE_NODE`.
- `CYCLE_UNSUPPORTED`, `NONTERMINATING_PATH`.
- `MISSING_REQUIRED_DATA`, `INVALID_PARAMETER`.
- `BOARD_FIDUCIAL_MISSING`, `AMBIGUOUS_ORIENTATION`.
- `UNSUPPORTED_FILE_TYPE`, `UNSAFE_FILE_PATH` en ejecución.

La UI debe mostrar dónde ocurrió el error, qué significa y cómo corregirlo; nunca devolver solo “Compilation failed”.

## 6.5 Propiedades matemáticas a probar

- **Invarianza de orden:** permutar el array de marcadores detectados no altera el IR canónico.
- **Idempotencia:** compilar dos veces el mismo `BoardState` produce el mismo IR/hash.
- **Conservación de identidad:** nodos no se duplican ni desaparecen en compilación válida.
- **Conectividad:** todo nodo del IR es alcanzable desde `START`.
- **Aciclicidad:** toda IR v1 válida admite orden topológico.
- **Validez de finales:** toda ruta de salida termina en `END`.
- **Integridad de ramas:** `CONDITION` tiene exactamente una salida TRUE y otra FALSE; no coinciden en la misma tarjeta.
- **Seguridad de tipos:** no se ejecutan acciones sin precondiciones de datos.
- **Detección de cambio:** cambiar orientación, tarjeta o parámetro semántico modifica el hash.
- **No ejecución:** un grafo inválido nunca se envía al runner.

Usar Vitest y `fast-check` para property-based testing con generadores de tableros pequeños y modificaciones malformadas.

---

# 7. MOTOR DE EJECUCIÓN REAL Y SEGURO

## 7.1 Modelo de ejecución

- Un trabajo (`Run`) corresponde a **una versión inmutable** del IR, snapshot de parámetros, input seleccionado, usuario autorizado y hash.
- Flujo de estados: `DRAFT → COMPILED → AWAITING_APPROVAL → QUEUED → RUNNING → SUCCEEDED | FAILED | CANCELLED`. Si se cambia el tablero después de aprobar, requerir nueva compilación y aprobación.
- Ejecutar **solo** handlers predefinidos. No aceptar texto arbitrario como JavaScript, Python, shell, SQL o nombre de ejecutable.
- En cada nodo, emitir `NodeRunEvent` con hora, entrada resumida, estado, salida resumida, duración y errores no sensibles.
- Las ramas excluyentes ejecutan **solo** la rama elegida; registrar predicado y resultado.
- Límite por ejecución: `maxNodes=30`, `maxDuration=60s` (ajustable con pruebas), `maxInputSize=10MB`, `maxOutputSize=5MB`, `maxConcurrentRuns` configurado.
- Una invocación no debe generar efectos duplicados por reintentos. Guardar claves de idempotencia y archivos con nombres por `runId`.

## 7.2 Handlers funcionales mínimos

### START

Crea contexto de ejecución con metadatos. No modifica archivos.

### INPUT_FILE

Resuelve exclusivamente un `uploadedFileId` del workspace actual; comprueba propiedad de sesión, tamaño, tipo y ruta segura. Devuelve `DocumentRef`.

### EXTRACT_TEXT

Extrae texto real de `.txt` y PDF con capa de texto usando biblioteca local. Soporte PDF escaneado mediante OCR es **mejora opcional** si Tesseract está disponible; si no, explicar “PDF sin capa de texto; OCR no disponible”. Nunca inventar campos extraídos. Ejemplos ficticios.

### VALIDATE_FIELDS

Aplicar extractor determinista inicial para etiquetas `Nombre/Name`, `Correo/Email`, `Taller/Workshop`; normalizar whitespace y validar email con librería apropiada. Producir `{fields, missingFields, isValid, evidence}`. No usar un LLM como única fuente de validación.

### CONDITION

Predicado permitido `allRequiredPresent` a partir de `ValidationResult.isValid`. Elegir exactamente una arista TRUE/FALSE. Guardar decisión.

### CREATE_REPORT

Crear un reporte Markdown y/o JSON con datos realmente extraídos, fecha, ID de ejecución, campos y estado. Escapar valores para evitar Markdown/HTML inesperado. No incluir datos reales privados en ejemplos.

### SAVE_REPORT

Guardar resultado en `/workspace/<workspaceId>/runs/<runId>/reports/` o equivalente normalizado y seguro; registrar checksum y tamaño; ofrecer descarga mediante un endpoint autorizado.

### REQUEST_REVIEW

Crear una entrada de revisión con el resumen de campos faltantes y un estado `OPEN`. No simular envío de correos ni notificaciones externas.

### END

Finalizar camino; no hace nada irreversible.

## 7.3 Seguridad de filesystem y aislamiento

- Canonicalizar rutas y comprobar que permanecen **dentro** del sandbox real; rechazar `../`, rutas absolutas externas y symlinks que escapen.
- Los archivos subidos son datos no confiables; aislar procesamiento, limitar recursos y validar contenido/MIME, no solo extensión.
- Nada de `eval()`, `exec()`, `child_process.exec` con contenido del usuario ni `os.system` con argumentos recibidos.
- No permitir conectores de red saliente en P0. No enviar archivos de usuarios a servicios externos por defecto.
- Autorización por workspace/usuario; nunca confiar en `workspaceId` aportado por el frontend sin comprobar su relación con la sesión.
- Verificar CSRF/seguridad de cookies y límites de tasa según estrategia de autenticación.
- Proteger `DATABASE_URL`, secretos y tokens en variables de entorno; versionar solo `.env.example`.
- No persistir archivos privados indefinidamente en demo pública: establecer TTL configurable, limpieza e instrucciones visibles.
- `dry-run` debe hacer validaciones y predicción de efectos **sin escribir** archivos finales, generar revisiones ni modificar estado irreversible.
- Aprobación explícita requiere mostrar inputs, outputs, operaciones y hash del programa a ejecutar.
- Documentar modelo de amenaza: tarjetas suplantadas, fotos manipuladas, ejecución repetida, colas duplicadas, traversal, archivos corruptos, sobreconsumo de recursos y acciones sin permiso.

## 7.4 Worker y cola

- Implementar un worker **de larga duración** con lease e idempotencia sobre Postgres. Reclamaciones atómicas con `FOR UPDATE SKIP LOCKED` o una librería mantenida que implemente garantías equivalentes.
- Ejecutar trabajo con `runId` único, `attempts`, `leaseExpiresAt`, `heartbeatAt`, `status`; reintentar solo tareas seguras e idempotentes.
- Publicar eventos en BD y permitir consultar estado con polling cada 1–2 s; SSE opcional si está probado en entorno desplegado.
- Evitar afirmar exactamente-once: describir garantías reales de cola y cómo la idempotencia limita duplicados.
- Desacoplar la ejecución de un navegador abierto; cerrar pestaña no cancela necesariamente el trabajo salvo que se solicite explícitamente.

---

# 8. MODELO DE DATOS Y API

## 8.1 Entidades principales

- `User`: id, email (opcional demo), role, createdAt.
- `Workspace`: id, ownerId, name, demoMode, expiresAt.
- `BoardTemplate`: id, version, cols, rows, catalogVersion, description.
- `CardCatalogEntry`: markerId, type, version, printAssetPath, enabled.
- `BoardCapture`: id, workspaceId, imageAssetId?, detectorVersion, detectionJson, diagnostics, capturedAt.
- `Workflow`: id, workspaceId, name, activeVersionId, createdAt.
- `WorkflowVersion`: id, workflowId, boardCaptureId?, compilerVersion, irJson, contentHash, diagnostics, createdAt.
- `WorkflowParameters`: versionId, perCardInstance JSON validated.
- `UploadedDocument`: id, workspaceId, originalName, mime, bytes, sha256, sandboxPath, createdAt.
- `Run`: id, workflowVersionId, workspaceId, requestedBy, approvedAt, status, inputSnapshot, contentHash, startedAt, endedAt.
- `NodeRunEvent`: id, runId, nodeId, seq, status, safeInputSummary, safeOutputSummary, errorCode, durationMs, timestamp.
- `GeneratedArtifact`: id, runId, workspaceId, type, safeName, sandboxPath, size, sha256.
- `ReviewTask`: id, runId, workspaceId, missingFields, status, createdAt.
- `AuditEvent`: id, workspaceId, actorId?, action, entityId, metadataWithoutSecrets, createdAt.

Crear esquema Prisma real, migraciones versionadas, índices en `workspaceId`, `status`, `createdAt`, restricciones de unicidad e integridad y seeds con datos enteramente ficticios.

## 8.2 Contratos de API HTTP sugeridos

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/health` | Estado de web/API y dependencias no sensibles |
| `GET` | `/api/catalog/cards` | Tipos/instancias, compatibilidad |
| `GET` | `/api/board/kit` | Manifiesto e instrucciones de impresión |
| `GET` | `/api/board/kit/download` | ZIP o PDF/SVG imprimible |
| `POST` | `/api/board/analyze` | Foto → servicio OpenCV → detecciones |
| `POST` | `/api/workflows/compile` | BoardState+params → IR+diagnósticos |
| `POST` | `/api/workflows` | Crear versión/guardar compilación |
| `GET` | `/api/workflows/:id` | Detalle / versiones |
| `POST` | `/api/uploads` | Subir documento a workspace aislado |
| `POST` | `/api/runs/preview` | Dry-run/acciones esperadas |
| `POST` | `/api/runs` | Crear trabajo solo tras aprobación explícita |
| `GET` | `/api/runs/:id` | Estado + eventos por nodo |
| `POST` | `/api/runs/:id/cancel` | Solicitar cancelación |
| `GET` | `/api/artifacts/:id/download` | Descargar reporte autorizado |
| `GET` | `/api/demo/scenarios` | Fotos reales rasterizadas/datasets demo |
| `POST` | `/api/demo/session` | Crear sesión demo con cuotas, TTL |

- Los nombres son propuesta, no obligación textual. Si usas rutas nativas de Next.js, mantener la semántica y publicar OpenAPI o esquema equivalente.
- Validar todos los cuerpos con Zod o schema compatible, normalizar errores JSON `{error:{code,message,requestId}}`.
- No devolver rutas internas absolutas ni secretos en respuestas.
- Añadir tests de autorización cruzada entre workspaces.

## 8.3 Contrato entre Python y Node

Usar JSON Schema versionado como fuente de verdad para `BoardState` y `DetectionResult`; generar o validar modelos Zod/Pydantic para evitar divergencia silenciosa. Hacer contract tests desde ambos lados.

---

# 9. EXPERIENCIA DE USUARIO (UX/UI) — PRODUCTO COMPLETO

## 9.1 Identidad

RitualOS debe parecer una herramienta creativa y profesional, **no** un panel CRUD genérico ni una app infantil. Estética sugerida: estación de trabajo, tarjetas visuales y cableado conceptual. Paleta contenida, tipografía legible, jerarquía clara, estados semánticos y accesibilidad.

### Pantallas principales

1. **Landing:** propuesta de valor breve, animación/ilustración de concepto (no reemplaza demo real), CTAs “Probar demo” y “Cómo funciona”.
2. **Onboarding:** tres pasos: imprimir tablero → colocar tarjetas → escanear y ejecutar. Incluye compatibilidad de cámara y modo sin impresión.
3. **Board Studio:** vista de cámara o imagen subida, overlay calibrado, tarjeta detectadas, aviso de falta de marcador, botones “Capturar”, “Analizar”, “Compilar”.
4. **Workflow Studio:** diagrama derivado del reconocimiento; lista de nodos, configuración de parámetros, errores con referencias a tarjeta/fila/columna, versión/hash.
5. **Review & Run:** archivo de entrada, pasos que se ejecutarán, efectos permitidos, previsualización dry-run, confirmación explícita para iniciar.
6. **Execution Monitor:** grafo con nodos pendientes/en curso/éxito/error, línea de tiempo, rama elegida, artefactos y duración.
7. **History:** capturas, compilaciones, versiones, diffs, ejecuciones, documentos y reportes descargables.
8. **Demo Gallery:** escenarios TRUE/FALSE, tablero inválido, perspectiva; imágenes procesadas realmente por el mismo pipeline CV.
9. **Digital Board Simulator:** tablero arrastrable con cuadrícula y rotación de tarjetas, claramente marcado **«Simulador digital: no utiliza cámara»**. Utiliza el mismo compilador y runner de verdad.
10. **Help/Judges:** instrucciones breves, vídeo, GitHub, restricciones, compatibilidad, datos ficticios y enlace a versión alojada.

## 9.2 Estados y mensajes

- Sin permiso de cámara → botón para subir fotografía.
- Falta marcador de esquina → resaltarlo y mostrar guía de solución.
- Tarjeta desplazada fuera de celda → resaltarla en foto y diagrama.
- Grafo inválido → **no** permitir botón Ejecutar.
- Foto con tarjetas detectadas pero no estable → indicar necesidad de nueva captura.
- El usuario cambia parámetros tras aprobar → invalidar aprobación anterior.
- Worker no disponible → error claro, preservar trabajo y mostrar estado de sistema.
- Archivo sin texto reconocible → mostrar error y sugerir TXT/PDF con capa de texto.
- Resultado exitoso → dar acceso real a reporte descargable, historial y ruta de nodo.

## 9.3 Accesibilidad mínima

- Contraste suficiente, foco visible, labels accesibles, navegación con teclado.
- Diagrama con alternativa textual de nodos y ramas.
- Errores explicados con texto, no solo color o iconografía.
- Simulador digital usable con teclado o al menos controles alternativos ordenados.
- Soporte móvil para lectura; el editor de grafo puede optimizarse para escritorio.
- Preferencias de reducción de movimiento respetadas cuando hay animaciones.

---

# 10. SIMULADOR DIGITAL, GENERADOR Y MODO DE PRUEBA REMOTO

## 10.1 Tres modos independientes y honestos

**A. Físico:** cámara detecta impresiones reales de marcadores ArUco sobre el tablero.  
**B. Imagen:** usuario sube JPG/PNG; OpenCV analiza sus píxeles, con exactamente el mismo algoritmo que el físico.  
**C. Simulador:** usuario posiciona tarjetas virtuales. No alegar detección por cámara; compila directamente un `BoardState` construido digitalmente.

Todos consumen **el mismo compilador y motor de ejecución**, y sus eventos se registran con `sourceMode: physical | image | simulator`.

## 10.2 Dataset demostrable

Generar y versionar:

- `valid-board.png`: tabla ejemplo TRUE/FALSE con las diez tarjetas, correctamente orientadas.
- `valid-board-perspective.png`: versión rasterizada deformada con `warpPerspective`.
- `invalid-board-missing-end.png`: una terminal faltante.
- `invalid-board-ambiguous.png`: marcador con posición ambigua.
- `valid-application.pdf` y `invalid-application.pdf`: documentos ficticios con y sin campos requeridos.
- `expected-results.json`: salida esperada de CV/IR/runner para CI; jamás usarlo como shortcut del lector.

El README debe explicar si cada imagen es **sintética**, **captura física real** o **diseño de muestra**. Cualquier vídeo de funcionamiento físico debe grabarse con tarjetas y webcam de verdad si se presenta como tal.

## 10.3 Generación de board-kit

Crear `npm run board:generate` o comando equivalente que produzca PDF y SVG listos para impresión, marcadores ArUco reales, catálogo de IDs y manual de montaje.

Comprobar con test: rasterizar el PDF/SVG que genera el programa y recuperar mediante OpenCV todos los IDs previstos; si ese test falla, la salida no está lista para impresión.

---

# 11. SEGURIDAD, PRIVACIDAD Y ABUSO

Realizar threat modeling y tests explícitos. Como mínimo:

1. **Código no confiable:** nunca interpretar una tarjeta como instrucción arbitraria ejecutable; catálogo cerrado.
2. **Ejecución accidental:** no correr flujos al mover objetos ni al capturar una foto.
3. **Intercambio de imágenes:** no confiar en que una foto proviene de una cámara real; distinguir evidencia y entorno de prueba.
4. **Tampering de IR:** backend recompila o verifica hash y esquema antes de ejecutar; no confiar en un `contentHash` inventado por el cliente.
5. **Path traversal/symlinks:** workspace filesystem aislado y comprobaciones reales.
6. **Uploads maliciosos:** máximos, timeouts, inspección MIME, manejo seguro de PDF y limpieza.
7. **Escalamiento de permisos:** auth por workspace, credenciales de prueba solo en campo privado de Devpost si corresponde.
8. **Denegación de servicio:** cuota de capturas, tamaño de imagen, cantidad de marcadores, jobs simultáneos y límite de duración.
9. **Privacidad:** datos ficticios por defecto, no fotos ni archivos persistentes si no hace falta.
10. **Observabilidad segura:** logs sin documentos completos, emails reales ni tokens.
11. **Dependencias:** auditoría básica de paquetes y revisión de licencias; usar solo materiales permitidos.
12. **Control de efectos:** acciones de archivos limitadas a carpeta por sesión; si se añade agente local P1, whitelist explícita, pantalla de permisos y opt-in.

---

# 12. PLAN DE IMPLEMENTACIÓN POR FASES CON CRITERIOS DE ACEPTACIÓN

La prioridad es un **producto real**. No consumir todos los recursos creando documentos; después de redactar especificaciones iniciales, ejecutar código.

## Fase P0 — Arranque y especificaciones (día 1)

- Inicializar monorepo con pnpm, TS strict, Next.js, FastAPI, Prisma, Docker Compose, PostgreSQL.
- Crear `.kiro/` y los documentos iniciales con requisitos **EARS** o formato claro «When... the system shall...», diseño y tareas trazables.
- Crear steering por arquitectura, seguridad, UX y pruebas.
- Crear `.env.example`, README inicial, licencia OSI aprobada (por defecto MIT si el equipo no decide otra), `docs/adr`.
- Levantar web/API, vision, runner y DB; health checks.

**Aceptación:** `pnpm install`, `docker compose up --build`, migraciones y health checks documentados funcionan en un entorno limpio.

## Fase P1 — Visión y board-kit (días 2–5)

- Dibujar marcadores y tablero; imprimir mediante SVG/PDF.
- Generar fixtures raster reales con marcador ID correcto.
- Implementar `POST /analyze` FastAPI, homografía, rotación, discretización y overlays.
- Test físico opcional si hay cámara; nunca sustituir un test de imagen por lectura directa de fixture JSON.

**Aceptación:** `valid-board.png` reconoce 10 tarjetas únicas con posiciones y orientaciones idénticas al ejemplo; `invalid-board-missing-end.png` detalla el problema de visión/compilación adecuado.

## Fase P2 — Compilador discreto y pruebas (días 5–9)

- Crear contrato `BoardState`, compilador de ports/adherencia, DAG, topológico, tipos, diagnósticos.
- Implementar fixtures de la rama TRUE y FALSE, permutación de orden e invalidaciones.
- Property tests con `fast-check`; documentar causas raíz.

**Aceptación:** IR canónico correcto de 10 tarjetas, ramas correctas, hashes estables; ciclo, salida sin receptor, entrada múltiple y nodo inaccesible producen diagnósticos y bloquean ejecución.

## Fase P3 — Automatización real y persistencia (días 9–15)

- Crear Prisma schema, migrations, seed, uploads, tablas Run/Event/Artifact.
- Implementar runner aislado con handlers reales y cola confiable.
- `dry-run` + aprobación + ejecución; auditoría y descarga del reporte.
- Pruebas sobre PDF/TXT válidos e inválidos.

**Aceptación:** procesar archivo válido genera un reporte real y descargable; archivo inválido genera revisión. Ninguna prueba hace escritura fuera del sandbox. Repetir un job no duplica artefactos.

## Fase P4 — Interfaz y E2E (días 15–21)

- Landing, Board Studio, Workflow Studio, Review & Run, Execution Monitor, historial.
- Webcam con permisos, subida, overlays, diagrama y mensajes de error.
- Galería demo y simulador con indicación explícita de modo.
- Integrar API y Playwright E2E.

**Aceptación:** flujo desde imagen → grafo → aprobación → ejecución → reporte pasa E2E desde interfaz; error de tablero se muestra en español con ubicación.

## Fase P5 — Calidad de experiencia y pruebas físicas (días 21–26)

- Revisar UX, roles y accesibilidad, responsive, rendimiento, métricas.
- Realizar experimentos en mesa con impresiones reales y cámara de al menos un celular o webcam.
- Corregir iluminación, perspectiva, tamaño de impresión y tolerancias. Documentar datos y condiciones.
- Grabar evidencia física solo después de confirmar que el pipeline funcionó.

**Aceptación:** benchmark reproducible, fotos etiquetadas, errores explicados; ninguna precisión inventada. Si fallan pruebas físicas, dejar modo imagen/simulador funcional y documentar honestamente límites de captura.

## Fase P6 — Despliegue, documentación y Kiroween (días 26–30, con margen hasta cierre)

- Desplegar stack persistente en un entorno real compatible con Next + Python + runner de larga duración + PostgreSQL. No recomendar host serverless solo si no soporta workers continuos.
- Proveer URL pública y demo sin tener que comprar hardware. Proteger la demo con cuotas y TTL.
- README en inglés o bilingüe y guía de jueces, demo script, troubleshooting, métricas reales y comparación con FloBlocks/Sheets.
- Revisar licencia/README/códigos de prueba/.kiro en GitHub, credenciales privadas del formulario y vídeo público YouTube <3 min.

**Aceptación:** un evaluador sin hardware puede abrir la URL, usar `valid-board.png`, compilar, ejecutar el ejemplo y descargar resultado. Se debe documentar qué partes requieren hardware físico y cómo probarlas localmente.

## Fase P7 — Extra, solo si hay margen

- Reconocimiento continuo estable, comparador de versiones y desktop agent local allowlisted.
- Medición con dos personas realizando tareas colaborativas; registrar observaciones.
- Publicar especificación de la gramática física y guía para crear tarjetas nuevas.

---

# 13. MATRIZ DE PRUEBAS OBLIGATORIAS

| Área | Prueba | Evidencia exigida |
|---|---|---|
| Board kit | rasterizar plantilla → volver a detectar IDs | salida pytest con IDs y coordenadas esperadas |
| CV | perspectivas, rotaciones, blur, esquinas faltantes | pytest/fixtures reproducibles |
| CV | IDs únicos y celdas precisas | respuestas `DetectionResult` verificadas |
| Compilador | tablero completo v1 | IR JSON esperado + hash calculado |
| Compilador | varias configuraciones inválidas | códigos de error pertinentes |
| Propiedades | permutación, idempotencia, DAG, ramas | fast-check y semilla al fallar |
| Runner | documento válido | reporte real con contenidos conocidos |
| Runner | documento incompleto | `ReviewTask` real; sin reporte válido |
| Seguridad | `../`, symlink, oversized upload, IR falsificado | acceso bloqueado, tests negativos |
| API | aislamiento de workspaces | tests de autorización |
| Worker | doble pickup, reintento y timeout | eventos y no duplicación |
| E2E | subir tablero → compilar → ejecutar → descargar | Playwright con captura de pantalla |
| E2E | sesión remota sin cámara | usuario puede terminar demo |
| Manual | impresiones y fotos en condiciones controladas | tabla de intentos real; no falsificar |
| Docs | instalación limpia y reset de demo | comandos ejecutados y validados |

**Calidad mínima:** cero errores TS en código productivo; lint pasa; unit/integration E2E clave pasan; las pruebas faltantes o bloqueadas se informan con motivo. No imponer un porcentaje de cobertura artificial, pero priorizar cobertura sustancial del compilador, runner y seguridad.

## 13.1 Benchmark de visión a reportar

- Número de capturas por iluminación/distancia/dispositivo.
- Proporción de tableros con cuatro fiduciales encontrados.
- Exactitud de IDs, casillas y orientación (por separado).
- Latencia mediana y percentil 95 de detección en hardware indicado.
- Fallos más frecuentes y mitigaciones.
- Diferenciar resultados de fixtures sintéticos y fotos físicas.

## 13.2 Benchmark de UX / impacto (si es viable)

Con 2–3 personas invitadas y datos ficticios, medir tiempo para construir y modificar un flujo tangible, número de errores y si entienden los mensajes. Evitar afirmar que es superior a un editor digital sin una comparación metodológicamente justa. Registrar esto como evaluación exploratoria, no como evidencia científica generalizable.

---

# 14. INSTRUCCIONES PARA USO PROFUNDO Y DEMOSTRABLE DE KIRO

Kiro es **obligatorio en el concurso**, no solo un nombre que mencionar. Emplearlo de forma sustancial y documentada:

## 14.1 Specs

Crear requisitos claros y pruebas de aceptación en:

```
.kiro/specs/ritualos/requirements.md
.kiro/specs/ritualos/design.md
.kiro/specs/ritualos/tasks.md
```

Tareas numeradas con dependencias, responsable por componente, criterios `done`, tests y referencias de commits/PRs si existen. Actualizar al implementar, no dejar un spec olvidado.

## 14.2 Steering

- `.kiro/steering/product.md`: propuesta, audiencia, no-goals, escenario.
- `.kiro/steering/architecture.md`: versiones, modularidad, contratos, límites de servicio.
- `.kiro/steering/security.md`: sandbox, confirmación, no arbitrary execution.
- `.kiro/steering/testing.md`: test por cambio, fixtures de OpenCV, property tests.

La configuración que use Kiro debe seguir la documentación de la versión instalada; evitar copiar formatos obsoletos.

## 14.3 Hooks, agentes y propiedades

- Comprobar con `/guide` o documentación de la versión instalada cómo configurar hooks/agentes. Crear **al menos un hook útil y válido**, por ejemplo pruebas del compilador al modificar su paquete; si las capacidades del entorno no lo permiten, documentar la limitación y no crear archivos falsos.
- Opcional: agentes especializados CV, compilador, seguridad, UI y QA; evitar conflictos de edición en archivos compartidos. Los agentes deben reportar cambios y pruebas reales.
- Property-based testing del compilador con `fast-check`; mostrar errores interesantes detectados y cómo se resolvieron.
- Mantener `docs/kiro-usage.md` con fecha, problema, capacidad usada, resultado y evidencia (sin secretos, tokens ni texto inventado).
- Conservar `.kiro/` en raíz del repo y **nunca excluirla en `.gitignore`**.

## 14.4 Flujo de trabajo para tres desarrolladores

- **Integrante A — CV y materiales físicos:** board-kit, OpenCV, cámara, pruebas de reconocimiento.
- **Integrante B — Compilador y runner:** gramática, IR, validaciones, sistema de trabajos, seguridad.
- **Integrante C — Producto e infraestructura:** Next.js, UI, persistencia, despliegue, E2E.
- Todos comparten revisión de specs, Kiro, integración y demo. Si pueden trabajar en paralelo, usar contratos estables y ramas cortas con integración frecuente.
- No editar el mismo archivo simultáneamente entre agentes sin coordinación; PRs integrados con tests.

---

# 15. EVIDENCIA DE DIFERENCIACIÓN Y LIMITACIONES HONESTAS

## 15.1 Lo ya conocido

- La programación tangible mediante tarjetas de papel y visión artificial ya existe (FloBlocks, Sheets).
- ArUco y homografía son técnicas existentes.
- Compiladores de grafos y automatización de documentos también existen.

## 15.2 Lo que RitualOS integra de manera diferenciada

- Representación física robusta y versionada de un flujo administrativo.
- Compilación formal con diagnósticos explicados espacialmente sobre la fotografía.
- Ejecutor real de acciones permitidas, bajo revisión explícita de cambios.
- Trazabilidad de capturas, versiones físicas, compilaciones y resultados.
- Evaluación remota sin equipo especial y reproducción de experimentos.

**No afirmar novedad absoluta ni superioridad empírica sin verificar literatura y probar resultados.** Lo que importa es una integración defendible y una demo de utilidad.

---

# 16. ENTREGABLES, README Y CONCURSO

## 16.1 README obligatorio

Incluir: qué resuelve; fotos auténticas del proyecto cuando existan; arquitectura; prerequisitos; `docker compose up --build`; migraciones y seeds; uso local; galería sin cámara; impresión; compatibilidad de cámara; cómo reproducir el flujo YES/NO; pruebas; seguridad; limitaciones; licencias; URL de demo; cómo se usó Kiro; créditos a antecedentes y librerías.

## 16.2 Licencia y repositorio

- GitHub público, licencia OSI (MIT si se decide así), `LICENSE` visible y licencia reconocida en la sección About.
- `.kiro/` en la raíz exacta, rastreada por git, sin ignorar subcarpetas.
- Código, assets, fixtures, documentación, configuración y lockfiles suficientes para reproducir.
- No incluir `.env`, secretos, credenciales reales, archivos privados o binarios con licencia incompatible.
- Verificar `git ls-files .kiro` y `git check-ignore -v .kiro/steering/product.md` (el último no debe mostrar exclusión válida de .kiro).

## 16.3 Reglas de Kiroween 2026 que condicionan la entrega

- Categoría: **Frankenstein**.
- Trabajo nuevo dentro del periodo permitido: desde el **30 de octubre de 2026**; no reutilizar un proyecto previo como si fuera nuevo.
- **Deadline: 4 de diciembre de 2026, 2:00 p. m. PST**, equivalente a 5:00 p. m. en Perú. Verificar el huso al registrar entrega.
- Equipo de **máximo tres personas**, con representante del equipo en Devpost.
- Aplicación funcional accesible por URL y con instrucciones de prueba/credenciales si se requieren.
- Vídeo público en YouTube de **menos de tres minutos** mostrando funcionamiento real.
- Explicar explícitamente cómo Kiro contribuyó al trabajo y qué capacidades se usaron.
- Los jueces ponderan por igual: impacto, uso tecnológico de Kiro, diseño, innovación y presentación.
- Consultar [reglas oficiales](https://kiroween.devpost.com/rules) y [FAQ](https://kiroween.devpost.com/details/faqs) antes de enviar: cualquier novedad oficial prevalece sobre este documento.

## 16.4 Guion de vídeo de 2:40–2:55 (ajustar a cronómetro real)

| Tiempo | Contenido que debe aparecer |
|---|---|
| 0:00–0:15 | Problema: automatizar procedimientos no debería requerir programar |
| 0:15–0:35 | Mostrar tarjetas físicas reales y tablero; explicar «cada objeto es una instrucción» |
| 0:35–1:05 | Cámara reconoce marcadores; diagrama y errores de validación |
| 1:05–1:35 | Aprobar y ejecutar con archivo válido; se genera reporte real |
| 1:35–1:58 | Cambiar entrada o tarjeta; ejecutar rama de revisión o mostrar error de compilación |
| 1:58–2:15 | Historial, reportes, hash y seguridad / autorización |
| 2:15–2:35 | Captura de specs y pruebas con Kiro; cómo ayudó específicamente |
| 2:35–2:50 | Diferenciación frente a programación tangible educativa y cierre |

La cámara real no es sustituible por simulador sin aviso. No montar una escena sintética y presentarla como un experimento físico real.

## 16.5 Lista final de validación para que Kiro ejecute

```text
[ ] Web y servicios levantan desde instrucciones de README
[ ] Migraciones funcionan en base de datos limpia
[ ] Board-kit imprimible generado y raster-recognizado por OpenCV
[ ] Captura o imagen → detecciones correctas del ejemplo
[ ] 10 tarjetas / 2 ramas → IR formal correcta
[ ] Errores de grafo detienen ejecución
[ ] Simulador funciona y está etiquetado
[ ] Ejecución real produce reporte o revisión según entrada
[ ] Aprobación manual previa y dry-run funcionales
[ ] Tests unitarios, propiedades, integración y E2E relevantes pasan
[ ] Seguridad de rutas, uploads, autenticación y aislamiento verificada
[ ] Repo público con licencia y .kiro en raíz
[ ] URL de app utilizable por jueces sin hardware (o instrucciones de acceso)
[ ] Documentación bilingüe suficiente
[ ] Vídeo <3 minutos, público y demostrando el proyecto
[ ] Evidencia verdadera de uso de Kiro y limitaciones declaradas
```

---

# 17. COMANDOS INICIALES Y COMPORTAMIENTO DEL AGENTE

## 17.1 Qué debe hacer el agente al recibir este archivo

**En la primera sesión:**

1. Leer el prompt, inspeccionar `pwd`, `git status`, `node --version`, `python --version`, `docker --version` y herramientas necesarias.
2. Crear arquitectura y specs en `.kiro/` con requisitos convertibles a tests.
3. Crear esqueleto ejecutable y endpoints de salud.
4. **Implementar inmediatamente** generador de marcadores y detector mínimo con su primer test real (no terminar la sesión solo con diseño si el entorno permite más).
5. Publicar en consola resumen corto de archivos creados, tests corridos, resultados y siguiente tarea. No fabricar métricas.

**En sesiones posteriores:**

- Leer `docs/implementation-status.md`, `tasks.md` y el estado git.
- Elegir siguiente tarea bloqueante de P0/P1/P2... e implementarla.
- Correr pruebas y actualizar registro.
- Si hay errores, priorizar repararlos sobre añadir UI cosmética.
- Mantener integridad de los contratos `BoardState` e `IR`.
- No prometer trabajo en segundo plano: la ejecución ocurre durante la sesión activa.

## 17.2 Mensaje inicial para copiar en Kiro CLI

```text
Lee íntegro @RitualOS_KiroCLI_Prompt_Maestro.md como especificación contractual del proyecto RitualOS. Inspecciona el repositorio y el entorno. Implementa el producto completo por fases, comenzando hoy por P0 y el vertical slice real de visión + compilador. Crea y mantiene .kiro/ en la raíz con specs, steering y evidencia auténtica de uso de Kiro. No te quedes en planificación: crea código ejecutable y tests reales. Después de cada fase actualiza docs/implementation-status.md con comandos ejecutados, resultados honestos, bloqueos y el siguiente paso. Respeta aislamiento, ejecución explícita y datos de prueba. No afirmes que una cámara, test físico, deploy o herramienta externa funcionó si no puedes demostrarlo.
```

## 17.3 Comandos de referencia (ajustar a lo que implementaste)

```bash
# Desde la raíz del repo, con Kiro CLI instalado y autenticado
kiro-cli

# En terminal normal, una vez creados los scripts correspondientes:
pnpm install
docker compose up --build
pnpm test
pnpm lint
pnpm typecheck
pnpm test:e2e

# Control de requisito concurso:
git ls-files .kiro
```

**No copiar comandos con scripts que aún no existen como si ya funcionaran; crearlos y verificarlos durante implementación.**

---

# APÉNDICE A. PSEUDOCÓDIGO NORMATIVO DEL COMPILADOR

```text
function compile(boardState, params, cardCatalog): CompileResult
  validateSchema(boardState)
  assertBoardDimensions(boardState, 8, 4)

  cards = normalizeAndSort(boardState.cards)
  diagnostics = []
  mapByCell = new Map()
  mapByInstanceId = new Map()

  for card of cards:
    validateKnownMarkerIdAndType(card, cardCatalog, diagnostics)
    validateGridCellAndOrientation(card, diagnostics)
    if mapByCell.contains(cell(card)):
      diagnostics.add(CARD_COLLISION)
    if mapByInstanceId.contains(card.instanceId):
      diagnostics.add(DUPLICATE_INSTANCE)
    mapByCell[cell(card)] = card
    mapByInstanceId[card.instanceId] = card

  for card of cards:
    for port in outputPorts(card.type):
      direction = directionForPort(card.orientation, port)
      receiver = mapByCell[adjacent(cell(card), direction)]
      if receiver absent:
        diagnostics.add(DANGLING_OUTPUT)
      else if inputDirection(receiver) != opposite(direction):
        diagnostics.add(INCOMPATIBLE_PORTS)
      else:
        edges.add(card.instanceId, port, receiver.instanceId)

  validateSingleStart(cards, diagnostics)
  validateAtLeastOneEnd(cards, diagnostics)
  validateInputCardinalities(cards, edges, diagnostics)
  validateReachability(start, cards, edges, diagnostics)
  validateAcyclicGraph(cards, edges, diagnostics)
  validateAllPathsTerminate(cards, edges, diagnostics)
  validateParameters(params, cards, diagnostics)
  validateDataRequirementsOnEveryPath(cards, edges, diagnostics)

  if hasErrors(diagnostics):
    return {valid:false, diagnostics, ir:null}

  ir = buildCanonicalIR(cards, edges, params)
  hash = sha256(serializeCanonical(irWithoutHash))
  return {valid:true, diagnostics, ir:{...ir, contentHash:hash}}
```

La implementación es libre de usar algoritmos mejores, pero debe conservar **los invariantes**, códigos de error y reglas físicas exactas. Para `CONDITION`, los dos puertos deben generarse y tratarse diferenciadamente. `END` no tiene puertos de salida.

---

# APÉNDICE B. CRITERIOS DE SEGURIDAD DE CAMBIOS

- Un cambio en la foto no altera el flujo actual hasta `Compilar`; un cambio en el IR no altera una ejecución aprobada anteriormente.
- Guardar `WorkflowVersion` inmutable y `Run` apuntando a ella; evitar carreras entre aprobación y ejecución.
- Validar que `uploadedFileId` pertenezca al workspace justo antes de ejecutar; no confiar únicamente en la validación al compilar.
- Los nombres de archivos generados deben derivarse de IDs internos seguros, no directamente de entradas del usuario.
- Registrar el hash de cada archivo de entrada y salida para poder detectar diferencias.
- El estado `SUCCEEDED` implica que realmente existe el artefacto esperado o que la rama de revisión creó el registro correspondiente; no marcar éxito solo por alcanzar `END`.
- Si falla un nodo, la ejecución se marca `FAILED` con causa y contexto seguro; no continuar silenciosamente como si el nodo hubiera funcionado.
- Si una foto es demasiado borrosa, pedir otra; no asignar tarjetas inventadas para conseguir compilar.

---

# APÉNDICE C. COMPROBACIÓN FINAL DEL PRODUCTO ANTES DE DECLARAR «TERMINADO»

**Prueba principal:**

1. Abrir RitualOS en navegador limpio.
2. Entrar en demostración sin cámara; cargar `valid-board-perspective.png`.
3. Confirmar que el CV detectó 10 tarjetas reales desde los píxeles de esa imagen.
4. Compilar y comprobar el grafo TRUE/FALSE correcto con dos terminales.
5. Seleccionar `valid-application.pdf` y establecer campos obligatorios.
6. Ver `dry-run`, aprobar y ejecutar. Debe aparecer reporte descargable con datos ficticios correctos.
7. Crear otra ejecución con `invalid-application.pdf`; debe entrar en rama `FALSE` y crear `ReviewTask` real.
8. Subir un tablero con tarjeta fuera de posición; debe bloquear ejecución y explicar por qué.
9. Cambiar orientación de una tarjeta en simulador y ver diagnóstico que coincide con la nueva conexión.
10. Consultar historial para ver dos runs distintos, nodos ejecutados, outputs y artefactos.
11. Ejecutar tests automatizados y comprobar de nuevo que la rama física y el simulador comparten compilador.
12. Mostrar guía para imprimir, fotografiar y usar tarjetas reales, con benchmark físico honesto.

**Solo si estos pasos están verificados, documentar RitualOS como MVP completo.** Si alguno no pasa, identificarlo claramente en `docs/implementation-status.md` y corregirlo antes de afirmar que está terminado.

---

**FIN DEL PROMPT MAESTRO — RITUALOS v1.0**
