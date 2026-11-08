---
inclusion: fileMatch
fileMatchPattern: "apps/web/**"
---

# UX / UI de RitualOS

- Estética de estación de trabajo creativa: superficies oscuras cálidas, tarjetas con color por tipo, tipografía legible.
  No es un CRUD genérico ni una app infantil.
- Cada pantalla responde a un paso: imprimir → colocar → escanear → compilar → revisar → aprobar → ejecutar → historial.
- Los tres modos se etiquetan siempre: **Cámara** (física), **Imagen** (subida/galería, procesada por OpenCV),
  **Simulador digital: no utiliza cámara**.
- Errores: explicar qué pasó, dónde (tarjeta `#id`, fila/columna) y cómo corregirlo. Nunca solo color.
- El botón Ejecutar no existe mientras el grafo sea inválido o la aprobación esté invalidada.
- Diagrama (React Flow) con alternativa textual (lista ordenada de nodos y ramas).
- Teclado: todos los controles alcanzables con Tab, foco visible, `prefers-reduced-motion` respetado.
- Texto de UI en español; cadenas centralizadas para preparar i18n.
