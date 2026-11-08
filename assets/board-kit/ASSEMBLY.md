# RitualOS — Manual de impresión y montaje del kit (board-v1 / cards-v1)

> Archivo generado por `pnpm board:generate`. No editar a mano.

## 1. Qué imprimir

| Archivo | Uso |
|---|---|
| `board-v1-a3.pdf` | Tablero completo en **A3 horizontal** (recomendado). |
| `board-v1-a4-tiles.pdf` | El mismo tablero en **4 hojas A4 horizontales** a escala real. |
| `board-v1-small-a4.pdf` | Tablero **reducido** (escala 0,707) en una sola hoja A4, para pruebas rápidas. |
| `cards-v1-a4.pdf` | 26 tarjetas a escala real (41 × 51 mm) para el tablero A3 o el mosaico. |
| `cards-v1-small-a4.pdf` | Las mismas tarjetas reducidas para el tablero A4 reducido. |

**Imprime siempre al 100 %** («tamaño real», sin «ajustar a la página»). Comprueba la barra de verificación del
tablero: debe medir 100 mm (o 70,7 mm en la versión reducida). Papel mate y blanco reduce reflejos.

## 2. Montaje

1. **A3:** no requiere montaje. Pega el tablero sobre cartón o fíjalo a la mesa con cinta en los bordes.
2. **Mosaico A4:** recorta cada hoja por sus marcas de corte (esquinas) y une las 4 hojas **borde con borde**
   en el orden 1-2 (arriba) y 3-4 (abajo). Usa cinta por detrás. Un desalineo de 1–2 mm es tolerable porque la
   calibración usa los 4 marcadores de esquina, pero mantén la hoja plana.
3. **Tarjetas:** recorta por el borde gris redondeado. No recortes ni dobles el marcador ni su margen blanco.
   Opcional: pega cada tarjeta sobre cartulina para que no se curve.

## 3. Reglas de colocación (Ritual Board Grammar v1)

- Cuadrícula de **8 columnas × 4 filas**; casillas de 47 × 57 mm. Las coordenadas impresas
  en cada casilla son `fila,columna` (desde 0).
- Una tarjeta por casilla, centrada. Los **4 marcadores de esquina (ID 0, 1, 2, 3)** deben verse completos en la foto.
- La **flecha impresa** de la tarjeta es su dirección de avance **F**. Cuando la tarjeta está derecha (título arriba),
  F apunta al **este**. Gira la tarjeta en múltiplos de 90° para cambiar F.
- Cada tarjeta recibe el flujo por su lado trasero (**IN**, opuesto a F) y lo envía a la casilla vecina en F (**OUT**).
- **CONDICIÓN:** salida **SÍ** en F; salida **NO** girando 90° a la derecha de F (la flecha «NO» impresa).
  Las dos salidas deben llegar a tarjetas distintas.
- **FIN** no tiene salida. Todo camino debe terminar en una tarjeta FIN.
- Dejar casillas vacías **no** conecta tarjetas: las conexiones solo existen entre casillas adyacentes.

### Ejemplo de dos ramas (fixture oficial)

| Tarjeta | Casilla (fila,col) | Orientación |
|---|---|---|
| INICIO #10 | 0,0 | E |
| ARCHIVO #11 | 0,1 | E |
| EXTRAER TEXTO #12 | 0,2 | E |
| VALIDAR CAMPOS #13 | 0,3 | E |
| CONDICIÓN #14 | 0,4 | E (SÍ → este, NO → sur) |
| CREAR REPORTE #15 | 0,5 | E |
| GUARDAR REPORTE #16 | 0,6 | E |
| FIN #17 | 0,7 | E |
| PEDIR REVISIÓN #18 | 1,4 | S (girada 90° horario) |
| FIN #19 | 2,4 | S (girada 90° horario) |

## 4. Fotografía

- Cámara lo más perpendicular posible al tablero, todo el tablero dentro del encuadre, luz difusa sin sombras duras.
- Resolución mínima recomendada: 1280 × 720. Evita reflejos sobre los marcadores.
- Mover una tarjeta **nunca** ejecuta nada: hay que volver a analizar, compilar, revisar y aprobar.

## 5. Catálogo impreso (cards-v1)

| Marcador | Tipo | Título impreso | Instancia | Juego |
|---|---|---|---|---|
| #10 | START | INICIO | `start-10` | A |
| #11 | INPUT_FILE | ARCHIVO | `input-11` | A |
| #12 | EXTRACT_TEXT | EXTRAER TEXTO | `extract-12` | A |
| #13 | VALIDATE_FIELDS | VALIDAR CAMPOS | `validate-13` | A |
| #14 | CONDITION | CONDICIÓN | `condition-14` | A |
| #15 | CREATE_REPORT | CREAR REPORTE | `report-15` | A |
| #16 | SAVE_REPORT | GUARDAR REPORTE | `save-16` | A |
| #17 | END | FIN | `end-17` | A |
| #18 | REQUEST_REVIEW | PEDIR REVISIÓN | `review-18` | A |
| #19 | END | FIN | `end-19` | A |
| #20 | START | INICIO | `start-20` | B |
| #21 | INPUT_FILE | ARCHIVO | `input-21` | B |
| #22 | EXTRACT_TEXT | EXTRAER TEXTO | `extract-22` | B |
| #23 | VALIDATE_FIELDS | VALIDAR CAMPOS | `validate-23` | B |
| #24 | CONDITION | CONDICIÓN | `condition-24` | B |
| #25 | CREATE_REPORT | CREAR REPORTE | `report-25` | B |
| #26 | SAVE_REPORT | GUARDAR REPORTE | `save-26` | B |
| #27 | END | FIN | `end-27` | B |
| #28 | REQUEST_REVIEW | PEDIR REVISIÓN | `review-28` | B |
| #29 | END | FIN | `end-29` | B |
| #30 | END | FIN | `end-30` | extra |
| #31 | END | FIN | `end-31` | extra |
| #32 | REQUEST_REVIEW | PEDIR REVISIÓN | `review-32` | extra |
| #33 | CONDITION | CONDICIÓN | `condition-33` | extra |
| #34 | CREATE_REPORT | CREAR REPORTE | `report-34` | extra |
| #35 | SAVE_REPORT | GUARDAR REPORTE | `save-35` | extra |

Los IDs 0–3 están reservados a las esquinas; 36–89 están reservados para futuras tarjetas y se rechazan como
`UNKNOWN_CARD`. Diccionario: `DICT_4X4_100`.

---

## English summary

Print `board-v1-a3.pdf` on A3 landscape (or `board-v1-a4-tiles.pdf` on four A4 sheets, or the reduced
`board-v1-small-a4.pdf`) at **100 % scale**, and the matching card sheet. Cut the cards along the grey outline.
Place one card per cell; the printed arrow is the card's forward direction F (East when upright). Cards receive flow on
their back side and send it to the neighbouring cell in F. CONDITION sends YES forward and NO to the right of F.
Every path must end in an END card. Keep the four corner markers (IDs 0–3) visible when taking the photo.

Card kinds: START (Start), INPUT_FILE (Input file), EXTRACT_TEXT (Extract text), VALIDATE_FIELDS (Validate fields), CONDITION (Condition), CREATE_REPORT (Create report), SAVE_REPORT (Save report), REQUEST_REVIEW (Request review), END (End).
