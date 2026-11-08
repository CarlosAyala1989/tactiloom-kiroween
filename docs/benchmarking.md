# Benchmark de visión

Dos tipos de resultado que **no se mezclan**: sintéticos (reproducibles por software) y físicos (tarjetas
impresas fotografiadas por el equipo).

## 1. Sintético (real, reproducible)

`pnpm benchmark:vision` → `services/vision/ritualos_vision/benchmark.py`, semilla 7, 120 escenas. Cada escena:
4–12 tarjetas del catálogo colocadas al azar (desplazamiento ±3 mm, giro ±7°), renderizadas desde los PDF del
kit, «fotografiadas» con perspectiva aleatoria, giro de cámara ±5° y 0/90/180/270°, desenfoque, ruido,
gradiente de luz y JPEG 75–92. El detector solo ve píxeles; la verdad sale de la especificación de la escena.

Máquina: Intel i5-1155G7 (8 hilos), Ubuntu 24.04, Python 3.14.6, OpenCV 5.0.0. Latencia de `analyze_image()`
sin overlay en un hilo (excluye decodificación y red).

| Condición (20 escenas c/u) | Línea base: tableros calibrados | Línea base: recall de tarjetas | Final: calibrados | Final: recall |
|---|---|---|---|---|
| frontal-normal | 20/20 | 1,0 | 20/20 | 1,0 |
| perspective-normal | 20/20 | 1,0 | 20/20 | 1,0 |
| low-light (brillo 0,45–0,6) | 20/20 | 1,0 | 20/20 | 1,0 |
| low-resolution (960×720) | 20/20 | 1,0 | 20/20 | 1,0 |
| high-resolution (1920×1440) | 19/20 | 0,9455 | 20/20 | 1,0 |
| strong-blur (σ 1,6–2,2 px) | 14/20 | 0,6689 | 20/20 | 1,0 |
| **Total** | **113/120** | **0,9418** | **120/120** | **1,0** |

En el resultado final: precisión de casilla y de orientación 1,0 sobre las tarjetas identificadas, 0 falsos
positivos, 120/120 escenas perfectas; latencia mediana 23,8 ms, p95 40,3 ms, máx. 69,4 ms.
Archivos: `docs/benchmark-results/synthetic-2026-11-08-baseline.json` y `synthetic-2026-11-08.json`.

**Hallazgo y corrección:** en la línea base, todos los fallos (58 tarjetas) se debían a un único motivo: el
fiducial #0 no se detectaba con desenfoque fuerte, así que el tablero no se calibraba. Se añadió una segunda
pasada sobre una copia con nitidez solo cuando falta un fiducial (commit `f2687d2`) y una prueba de regresión
que falla sin el cambio (`test_strong_focus_blur_still_calibrates`).

**Límites de este benchmark:** el renderizado es idealizado (papel plano, sin reflejos especulares, sin
distorsión de lente, sombras simples). Un 100 % sintético no predice el rendimiento con una cámara real.

## 2. Físico (pendiente — lo realiza el equipo)

Objetivo experimental del prompt (no garantía): los 10 nodos del ejemplo reconocidos en ≥ 8/10 capturas
controladas. Protocolo propuesto:

1. Imprimir `board-v1-a3.pdf` (o el mosaico) y `cards-v1-a4.pdf` al 100 %; medir la barra de 100 mm.
2. Colocar el ejemplo oficial (ver `docs/physical-grammar-v1.md` §5).
3. Por cada condición, 10 fotos desde el Board Studio (pestaña Cámara) o subidas como imagen:
   luz difusa, luz lateral fuerte, cámara inclinada ~30°, distancia larga (tablero ≈ 50 % del encuadre), móvil y webcam.
4. Registrar en la tabla: dispositivo, resolución, condición, tableros calibrados, tarjetas correctas (de 10),
   códigos de error, latencia mostrada en la UI.
5. Guardar las fotos (sin personas ni datos privados) en `tests/fixtures/physical/` con un README de condiciones,
   y añadir el caso a los tests si se quiere fijar como regresión.

| Fecha | Dispositivo | Resolución | Condición | Capturas | Calibradas | Tarjetas correctas (media /10) | Errores frecuentes | Notas |
|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | Sin datos todavía |

## 3. UX (exploratorio, pendiente)

Con 2–3 personas y datos ficticios: tiempo para construir el flujo, tiempo para corregir un error inducido
(tarjeta girada), número de errores y comprensión de los mensajes. Registrar como evaluación exploratoria,
sin compararla con un editor digital sin un diseño metodológico adecuado.
