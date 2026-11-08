---
inclusion: always
---

# Producto: Tactiloom

**Tactiloom — Build workflows with your hands. Run them on your computer.**

Plataforma de automatización tangible: tarjetas físicas con marcadores ArUco sobre un tablero de 8×4 casillas
se fotografían, OpenCV las reconoce desde los píxeles, un compilador las traduce a un grafo dirigido tipado
(IR `tactiloom-ir/1`) y un worker aislado ejecuta acciones permitidas sobre documentos de prueba.

## Audiencia
- Coordinadores de talleres, personal administrativo y estudiantes que prototipan procesos de documentos.
- Facilitadores que imprimen el kit y guían la sesión.
- Jueces remotos que evalúan sin hardware (galería de imágenes reales procesadas por OpenCV + simulador).

## Caso de demostración (no cambiar sin actualizar fixtures)
`START → INPUT_FILE → EXTRACT_TEXT → VALIDATE_FIELDS → CONDITION → (TRUE) CREATE_REPORT → SAVE_REPORT → END`
y `(FALSE) REQUEST_REVIEW → END`. Documentos ficticios `valid-application.pdf` / `invalid-application.pdf`.

## Principios
1. Leer y validar → revisar → ejecutar con aprobación explícita. Mover una tarjeta nunca ejecuta nada.
2. Transparencia: mostrar qué se reconoció, qué se compiló y qué ocurrió.
3. Determinismo: misma imagen normalizada + mismos parámetros = misma IR y mismo `contentHash`.
4. Honestidad: tres modos etiquetados (`physical`, `image`, `simulator`). El simulador nunca se presenta como cámara.
5. Accesibilidad: teclado, foco visible, alternativa textual al diagrama, errores con texto.

## No-goals (v1)
- Ejecución de código arbitrario, shell, plugins, red saliente o automatización del SO.
- LLM obligatorio para leer, compilar o ejecutar.
- Bucles, variables o nodos `MERGE` (P2).
- Afirmar novedad absoluta: FloBlocks (2025) y Sheets (2015) son antecedentes y se citan.

## Idioma
- UI en español por defecto y completa en inglés, italiano y francés (ADR 0005). Los diagnósticos llevan `message`
  canónico en español + `params`; la web los redacta en el idioma elegido. Toda cadena nueva va en los cuatro idiomas.
- Código, APIs, nombres de tipos y clases en inglés. Documentación de especificación en español.
