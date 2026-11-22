# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Principal: equipos reales que procesan documentos repetitivos.** Personal administrativo, coordinadores de
  talleres o cursos y estudiantes que prototipan procesos de documentos. Diseñan y discuten el procedimiento
  juntos, sobre una mesa, moviendo tarjetas, y después lo ejecutan con sus propios documentos. Confirmado por el
  equipo el 2026-11-20: el producto se diseña ya para estos equipos, no solo para la demo.
- **Facilitadores:** imprimen el kit y guían la sesión.
- **Secundario: jueces de Kiroween 2026,** que evalúan en remoto sin hardware (galería de imágenes sintéticas y
  simulador). Si sus necesidades chocan con las de los equipos, prevalecen los equipos.

## Product Purpose

Tactiloom convierte un tablero impreso de 8×4 casillas con tarjetas físicas en un flujo de trabajo de documentos
que se ejecuta en una computadora. Se fotografía o se sube la imagen del tablero; OpenCV reconoce cada tarjeta,
su casilla y su orientación desde los píxeles; un compilador la traduce a un grafo tipado (`tactiloom-ir/1`) con
`contentHash` sha256; y un worker aislado ejecuta un catálogo cerrado de acciones, solo después de una vista
previa (dry-run) revisada y una aprobación ligada a `contentHash` y `planHash`.

Existe para que un equipo diseñe y discuta un procedimiento documental en una mesa, lo vea ejecutarse y conserve
la traza: capturas, versiones, ejecuciones, reportes y tareas de revisión.

Éxito, según los objetivos documentados (todavía sin medir): las personas construyen el flujo, corrigen los
errores y entienden la aprobación (`docs/funcionamiento.md` §8), y el ejemplo oficial se reconoce completo en al
menos 8 de 10 capturas físicas controladas (`docs/benchmarking.md` §2).

## Positioning

Tactiloom no afirma haber inventado la programación tangible: FloBlocks (2025) y Sheets (2015) ya usaron tarjetas
de papel y cámara, y se citan siempre. Tampoco afirma ser mejor que ellos (no hay comparación empírica). Lo propio
es la combinación: lectura física con diagnósticos que señalan tarjeta, fila y columna sobre la propia foto; un
compilador formal con hash canónico; acciones de oficina reales en un sandbox con catálogo cerrado; y una
aprobación ligada a hashes, de modo que se ejecuta exactamente lo que se revisó. No es una herramienta para
enseñar programación a niños (`docs/frankenstein-differentiation.md`).

## Operating Context

- **Sesión en una mesa:** kit impreso (tablero A3, mosaico de 4 hojas A4 a escala real o versión reducida A4, y
  hojas de tarjetas), impreso al 100 % y comprobado con la barra de 100 mm. Una tarjeta por casilla; las cuatro
  esquinas deben verse en la foto.
- **Tres modos de entrada, siempre etiquetados:** Cámara (física), Imagen (OpenCV; la galería es sintética) y
  «Simulador digital: no utiliza cámara».
- **Recorrido:** imprimir → colocar → escanear → compilar → revisar → aprobar → ejecutar → historial.
- **Cámara:** navegador con HTTPS o `localhost`; se activa solo al pulsarla; una foto por análisis, que no se guarda.
- **Documentos:** PDF con capa de texto o TXT. Caso implementado: solicitudes de inscripción a un taller (nombre,
  correo, taller) → reporte Markdown/JSON si están completas, o tarea de revisión si falta algo.
- **Idiomas:** español (por defecto), inglés, italiano y francés en interfaz, diagnósticos, superposición de OpenCV,
  kit, documentos de demostración y reporte.
- **Despliegue actual:** local con Docker Compose. Cada visitante recibe un workspace de demostración aislado, sin
  cuentas, que se borra a las 24 h.

## Capabilities and Constraints

- **Catálogo v1:** 9 tipos de tarjeta (Inicio, Archivo de entrada, Extraer texto, Validar campos, Condición, Crear
  reporte, Guardar reporte, Solicitar revisión, Fin) y 26 instancias sembradas. Marcadores `DICT_4X4_100`: IDs 0–3
  en las esquinas, 10–89 en las tarjetas.
- **Gramática física:** la flecha impresa marca el flujo; CONDICIÓN envía SÍ en la dirección de la flecha y NO
  gira a la derecha; toda rama termina en FIN.
- **Errores:** dicen qué pasó, dónde (tarjeta `#id`, fila y columna) y cómo corregirlo. No existe botón de ejecutar
  mientras el grafo sea inválido o la aprobación esté invalidada.
- **Seguridad (no negociable, `.kiro/steering/security.md`):** una tarjeta es un `markerId` del catálogo, nunca
  código; sin shell, red saliente ni plugins; el servidor recompila y nunca acepta la IR del cliente; sandbox por
  workspace; uploads verificados por contenido.
- **Interfaz:** tema claro y oscuro (sigue al sistema; se puede fijar desde la cabecera).
- **Fuera de v1:** ejecución de código arbitrario, shell, plugins, red saliente o automatización del sistema; LLM
  obligatorio; bucles, variables o nodos `MERGE`; OCR (los PDF escaneados fallan con `PDF_NO_TEXT_LAYER`);
  cámara continua (se analiza una foto por captura).
- **Terminología:** tablero, tarjeta, casilla, rama SÍ/NO, vista previa (dry-run), aprobación, versión,
  ejecución, reporte, tarea de revisión, workspace.

**Sin decidir (necesario para equipos reales):**

- Cuentas, permisos y workspaces persistentes. Hoy solo existe el workspace de demostración de 24 h.
- Documentos reales con datos personales. La política vigente exige datos ficticios y no guardar las fotos por
  defecto; falta decidir almacenamiento, retención, acceso y privacidad antes de procesar documentos reales.
- Otros documentos y campos. VALIDAR CAMPOS solo reconoce nombre, correo y taller, y CONDICIÓN solo «todos los
  campos obligatorios presentes».
- OCR para documentos escaneados.
- Despliegue público con HTTPS.

## Brand Commitments

- **Nombre:** Tactiloom. El nombre provisional *RitualOS* del brief original no se usa.
- **Lema:** «Build workflows with your hands. Run them on your computer.»; en español, «Construye flujos con tus
  manos. Ejecútalos en tu computadora.» Versiones oficiales en los cuatro idiomas en
  `apps/web/lib/i18n/dictionaries/common.ts`.
- **Voz:** directa y honesta. Lo sintético y lo simulado se etiquetan siempre, se citan los antecedentes y nunca
  se afirman resultados que no se han medido.
- **El kit impreso es la referencia de identidad:** las tarjetas en pantalla usan los mismos títulos impresos y el
  mismo color por tipo (`packages/contracts/src/cards.ts`).
- **Logotipo:** SVG en `apps/web/components/Nav.tsx`.
- **Contexto:** entrega de Kiroween 2026, categoría Frankenstein. Licencia MIT.

## Evidence on Hand

- Kit imprimible PDF/SVG con marcadores reales en `assets/board-kit/` (español y `en`/`it`/`fr`); una prueba
  rasteriza los PDF y recupera todos los IDs con OpenCV.
- 8 escenarios de galería en `assets/examples/boards/`: **imágenes sintéticas** renderizadas desde el kit, no fotos.
- Documentos ficticios en `assets/examples/documents/`: una solicitud válida y otra inválida por idioma, más un
  PDF escaneado.
- Benchmark **sintético** de visión (120 escenas, semilla 7): 120/120 tableros calibrados, recall de tarjetas 1,0
  (`docs/benchmark-results/`). Usa un renderizado idealizado y no predice el resultado con una cámara real.
- Pruebas automatizadas (unitarias, de propiedades, integración y E2E con Playwright y axe); estado y comandos en
  `docs/implementation-status.md`.

**No existe todavía (confirmado el 2026-11-20); ningún trabajo debe darlo por hecho ni inventarlo:**

- Pruebas físicas con tarjetas impresas y cámara real (tabla vacía en `docs/benchmarking.md`).
- Evaluación con personas.
- URL pública, repositorio público y vídeo.
- Equipos que usen el producto, testimonios o métricas de uso.

## Product Principles

1. **Leer y validar → revisar → ejecutar con aprobación explícita.** Mover, capturar o compilar nunca ejecuta nada.
2. **Transparencia:** mostrar qué se reconoció, qué se compiló y qué ocurrió.
3. **Determinismo:** la misma imagen normalizada con los mismos parámetros produce la misma IR y el mismo
   `contentHash`.
4. **Honestidad:** cada modo y cada evidencia se etiquetan por lo que son; el simulador nunca se presenta como
   cámara.
5. **Accesibilidad:** teclado, foco visible, alternativa textual al diagrama y errores con texto, en los cuatro
   idiomas.

## Accessibility & Inclusion

- Sin violaciones axe graves o críticas (WCAG 2 A/AA), en tema claro y oscuro, en las ocho páginas que cubre
  `tests/e2e/a11y.spec.ts` (inicio, cómo funciona, galería, estudio, simulador, kit, ayuda e historial). Las
  páginas de versión y de ejecución no tienen esa prueba todavía.
- Todos los controles se alcanzan con Tab y tienen foco visible; se respeta `prefers-reduced-motion`. El simulador
  se maneja con teclado (`R` gira, `Supr` quita, `Mayús`+flechas mueve).
- El diagrama tiene alternativa textual (lista ordenada de nodos y ramas).
- Los errores y los estados nunca dependen solo del color.
- Interfaz completa en español, inglés, italiano y francés; toda cadena nueva va en los cuatro idiomas.
