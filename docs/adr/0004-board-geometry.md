# ADR 0004 — Geometría física del tablero y las tarjetas

- **Estado:** aceptada · **Fecha:** 2026-11-08 · Fuente: `packages/contracts/catalog/board-v1.json`

| Elemento | Valor (mm) | Nota |
|---|---|---|
| Página | A3 horizontal 420 × 297 | También mosaico 4×A4 (escala 1:1) y versión reducida A4 (escala 0,707) |
| Cuadrícula | origen (22, 34,5); 8 × 47 = 376 de ancho; 4 × **57** = 228 de alto | El prompt sugería 47 × 58 (232 de alto). Con 58 mm no cabían título, coordenadas, barra de escala e instrucciones con márgenes de impresión en 297 mm. Se eligió 57 mm |
| Fiduciales 0–3 | 20 × 20, centros (20,20), (400,20), (400,277), (20,277) | Fuera de las casillas (verificado por test) |
| Tarjeta | 41 × 51, radio 2,5 | Menor que la casilla: ~3 mm de holgura por lado |
| Marcador de tarjeta | 22 × 22, centro (20,5; 24) en la tarjeta | 4×4 bits + borde = 6 módulos de 3,67 mm |
| Plano canónico | 1600 × 800 (cuadrícula) | Solo para coordenadas normalizadas de salida |

## Tolerancias

- Centro de tarjeta a ≤ 0,32 del ancho/alto de celda por eje desde el centro de la casilla; si no,
  `AMBIGUOUS_POSITION` (con las casillas candidatas) o `CARD_NOT_IN_CELL`.
- Orientación: eje c0→c1 del marcador en mm; desviación > 18° del eje más cercano → `AMBIGUOUS_ORIENTATION`.
- Tamaño del marcador ±35 % → aviso `MARKER_SIZE_MISMATCH` (p. ej., tarjetas reducidas sobre tablero A3).
- Error de reproyección de la homografía ≤ 4 mm; cuadrilátero convexo y no espejado.

El centro de la tarjeta se calcula desde el marcador corrigiendo su desplazamiento dentro de la tarjeta
(el marcador no está centrado verticalmente), en los ejes del propio marcador.

## Validación

- `services/vision/tests/test_board_kit_raster.py`: los PDF (A3 a 2,5 y 4 px/mm, A4 reducido, mosaico) y el SVG
  rasterizado calibran; cada hoja de tarjetas contiene cada ID del catálogo exactamente una vez.
- **Pendiente:** medir una impresión real con regla y fotografiarla (ver `docs/benchmarking.md`).
