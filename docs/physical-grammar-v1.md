# Ritual Board Grammar v1 (normativa)

Contrato entre el tablero físico y el programa. Implementación: `services/vision/ritualos_vision/detector.py`
(lectura) y `packages/compiler/src/compile.ts` + `graph.ts` (semántica). Geometría: ADR 0004.

## 1. Tablero y marcadores

- Cuadrícula de **8 columnas × 4 filas**; casilla `(row, col)` con índices desde 0, `(0,0)` arriba a la izquierda.
- Diccionario **`DICT_4X4_100`**. IDs **0, 1, 2, 3** = fiduciales de esquina (superior-izquierda,
  superior-derecha, inferior-derecha, inferior-izquierda), fuera de las casillas. IDs **10–89** = instancias de
  tarjeta (catálogo `cards-v1`: 10–35 impresas; 36–89 reservadas y rechazadas como `UNKNOWN_CARD`).
- El ID ArUco identifica una **instancia física**, no un tipo universal: `markerId → kind → cardInstanceId`
  según `packages/contracts/catalog/cards-v1.json` (p. ej. `14 → CONDITION → condition-14`).

## 2. Lectura (visión)

1. Decodificar JPG/PNG/WEBP (firma verificada, ≤ 12 MB, ≤ 40 MP, ≥ 320 px por lado), aplicar EXIF una vez.
2. Detectar marcadores ArUco (refinamiento subpíxel). Si falta algún fiducial, segunda pasada sobre una copia
   con nitidez (unsharp mask + CLAHE); solo se añaden detecciones no duplicadas.
3. Descartar cuadriláteros no plausibles (relación de lados/diagonales > 3 en imagen o > 1,35 en mm).
4. Exigir los **4 fiduciales**, exactamente uno por ID; si no: `BOARD_FIDUCIAL_MISSING` (indica cuáles) o
   `DUPLICATE_FIDUCIAL`. No hay modo de 3 esquinas.
5. Homografía imagen → mm del tablero con las **16 esquinas** de los fiduciales. Se rechaza
   (`HOMOGRAPHY_DEGENERATE`) si las esquinas forman un polígono no convexo o espejado, si ocupan < 1 % de la
   imagen, si la matriz es singular/mal condicionada o si el error de reproyección supera 4 mm.
6. Para cada marcador de tarjeta: proyectar sus esquinas a mm, calcular el centro de la tarjeta (corrigiendo
   la posición del marcador dentro de la tarjeta), la casilla y la orientación.
7. **Casilla:** la del centro, si la distancia al centro de la casilla es ≤ 0,32 del tamaño de celda en cada
   eje; si no, `AMBIGUOUS_POSITION` con las casillas candidatas. Fuera de la cuadrícula: `CARD_NOT_IN_CELL`.
8. **Orientación:** ángulo del eje c0→c1 del marcador (el borde superior del marcador impreso derecho, que
   coincide con la flecha de la tarjeta) cuantizado a E(0°), S(90°), W(180°), N(270°) en coordenadas del tablero
   (y hacia abajo). Desviación > 18° → `AMBIGUOUS_ORIENTATION`. No se usa OCR.
9. Salida ordenada por `(row, col, markerId)`, con `quality` = mín(centrado, alineación, tamaño) — heurística
   documentada, **no** probabilidad — y overlay dibujado con la misma salida.

## 3. Semántica de conexiones

Notación: **F** = dirección de la flecha impresa; **R(F)** = giro horario de 90°; **B(F)** = opuesta.

| Tipo | Entrada | Salidas |
|---|---|---|
| `START` | ninguna | `NEXT` hacia F |
| `INPUT_FILE`, `EXTRACT_TEXT`, `VALIDATE_FIELDS`, `CREATE_REPORT`, `SAVE_REPORT`, `REQUEST_REVIEW` | por B(F) | `NEXT` hacia F |
| `CONDITION` | por B(F) | `TRUE` hacia F, `FALSE` hacia R(F) |
| `END` | por B(F) | ninguna |

Una salida de la casilla `c` en dirección `d` conecta con la tarjeta de la casilla vecina `c + d` **si y solo si**
esa tarjeta admite entrada y su orientación es `d` (es decir, su lado B(F) mira hacia `c`). Casillas vacías no
conectan; no se infieren conexiones por cercanía ni por líneas dibujadas.

Errores de conexión: salida a casilla vacía o fuera del tablero → `DANGLING_OUTPUT`; receptor mal orientado o
sin entrada → `INCOMPATIBLE_PORTS` (con sugerencia de giro).

## 4. Reglas del grafo (v1)

- Exactamente un `START` (`MISSING_START`, `MULTIPLE_STARTS`), al menos un `END` (`MISSING_END`).
- Una tarjeta por casilla (`CARD_COLLISION`); cada instancia física una sola vez (`DUPLICATE_INSTANCE`).
- Como máximo una entrada por nodo (`MULTIPLE_INPUTS`; no existe `MERGE` en v1).
- Sin ciclos (`CYCLE_UNSUPPORTED`, componentes fuertemente conexas de Tarjan).
- Todo nodo alcanzable desde `START` (`UNREACHABLE_NODE`); todo camino termina en `END` (`NONTERMINATING_PATH`).
- Las dos ramas de `CONDITION` llegan a tarjetas distintas (`BRANCH_TARGETS_IDENTICAL`).
- **Datos en cada camino:** un nodo solo es válido si todos sus requisitos (`DocumentRef`, `ExtractedText`,
  `ValidationResult`, `Report`) están garantizados en **todos** los caminos que llegan a él (intersección de
  hechos de los predecesores) → `MISSING_REQUIRED_DATA`.
- Máximo 30 nodos (`TOO_MANY_NODES`). Los errores de visión del `BoardState` también bloquean la compilación.

## 5. Ejemplo oficial (fixture)

| Instancia | Casilla | Orientación |
|---|---|---|
| START#10 · INPUT_FILE#11 · EXTRACT_TEXT#12 · VALIDATE_FIELDS#13 · CONDITION#14 · CREATE_REPORT#15 · SAVE_REPORT#16 · END#17 | (0,0)…(0,7) | E |
| REQUEST_REVIEW#18 | (1,4) | S |
| END#19 | (2,4) | S |

CONDITION#14 (E) envía TRUE al este (#15) y FALSE al sur (#18); #18 (S) recibe por el norte y envía al sur
(#19). Resultado: 10 nodos y 9 aristas (`packages/compiler/test/compile.test.ts`).
