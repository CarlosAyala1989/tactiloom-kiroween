# Judge guide · Guía para jueces

**URL pública:** _pendiente — el equipo la publicará aquí y en Devpost._ Mientras tanto: `docker compose up --build`
y abrir http://localhost:3210 (ver README). No se necesitan credenciales: cada visitante recibe un workspace
de demostración aislado que se borra a las 24 h.

## 5-minute path (no camera, no printer)

1. **Gallery → "Analizar con OpenCV"** on *Tablero válido en perspectiva*. The server detects the 10 cards from
   the image pixels (overlay with projected grid and orientation arrows; table with cell, orientation and a
   heuristic quality score).
2. **Programa compilado:** two-branch graph, `contentHash`, text version of the program. The default input
   document is `valid-application.pdf` (fictitious).
3. **"Guardar versión y abrir Workflow Studio"** → **"Revisar y ejecutar (dry-run)"**.
4. **Review & Run:** input sha256, ordered steps, predicted decision (YES), extracted fields, allowed effects.
   Tick the confirmation box → **"Aprobar y ejecutar"** → download the Markdown/JSON report.
5. Back in **Workflow Studio**, pick `invalid-application.pdf` → **"Guardar como nueva versión"** (new hash) →
   run again: NO branch, an `OPEN` review task (missing *workshop*, invalid *email*), no report.
6. **Broken boards:** *Tarjeta entre dos casillas*, *Falta una tarjeta FIN*, *Esquina tapada*, *Tarjeta girada*:
   no run button, and each error names the card, row and column, with a suggested fix.
7. **Simulator:** Tab to a card, press `R` to rotate, `Supr` to remove; diagnostics update live. It is labelled
   "Simulador digital: no utiliza cámara" and uses the same compiler and worker.
8. **History:** captures, versions (with diffs), runs, reports and review tasks.

## What is real

| | |
|---|---|
| Real | OpenCV detection from pixels · compiler · worker · PDF text extraction · reports with sha256 · review tasks · approvals bound to `contentHash` + `planHash` |
| Synthetic | Gallery images: rendered from the real printable PDFs and "photographed" by software (labelled in the UI) |
| Digital | Simulator (labelled) |
| Not yet done | Recorded physical-camera tests, public deployment, video |

## Physical test (if you have a printer and a webcam)

Print `board-v1-a3.pdf` (or the 4×A4 tiles, or the reduced A4 board with the reduced cards) at 100 % and the
card sheet; lay out the official example (`docs/physical-grammar-v1.md` §5); Board Studio → **Cámara (física)**
→ *Activar cámara* → *Capturar foto*. Keep the four corner markers visible.

## Troubleshooting

- `403 CSRF_REJECTED` when running locally: open `http://localhost:3210` (not `127.0.0.1`).
- Header shows *Worker* in red: the runner is not running; jobs stay queued and run when it is back.
- `PDF_NO_TEXT_LAYER`: the document is a scanned PDF (no OCR in v1); use a PDF with selectable text or a TXT.
- API: `/api/openapi` (OpenAPI 3.1) · health: `/api/health`.

---

## Resumen en español

Galería → «Analizar con OpenCV» → «Guardar versión» → «Revisar y ejecutar (dry-run)» → casilla de confirmación →
«Aprobar y ejecutar» → descargar reporte. Cambiar el documento a `invalid-application.pdf` para ver la rama NO.
Analizar los tableros inválidos para ver los diagnósticos con tarjeta, fila y columna. El simulador se maneja con
teclado (`R` gira, `Supr` quita, `Mayús`+flechas mueve).
