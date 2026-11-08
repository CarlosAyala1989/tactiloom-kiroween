# Diferenciación (categoría Frankenstein)

## Lo que ya existía

- **FloBlocks (2025)** — herramienta educativa de bajo costo que combina programación tangible con diagramas de
  flujo de papel y visión por computadora ([Discover Education, Springer](https://link.springer.com/article/10.1007/s44217-025-01064-7)).
- **Sheets (2015)** — tarjetas de papel con marcadores capturados por una webcam para construir programas con
  bucles y bifurcaciones que dibujan y mueven gráficos ([Tada et al., AHFE 2015](https://www.iplab.cs.tsukuba.ac.jp/paper/international/tada_ahfe2015.pdf)).
- Marcadores ArUco, homografía, compiladores de grafos y automatización de documentos son técnicas conocidas.

RitualOS **no** afirma haber inventado la programación tangible ni ser mejor que estos trabajos (no hay
comparación empírica).

## Qué integra RitualOS

| Pieza «cosida» | Qué aporta en RitualOS |
|---|---|
| Papel impreso + OpenCV (ArUco, homografía de 16 puntos) | Lectura física versionada (`ritual-board/1`) con diagnósticos espaciales (tarjeta, fila, columna) dibujados sobre la propia foto |
| Teoría de compiladores (componentes de Tarjan, orden topológico, *definite assignment*) | Un programa formal `ritual-ir/1` con hash canónico; los errores se explican antes de ejecutar |
| Cola transaccional en PostgreSQL con leases | Ejecución real fuera del ciclo HTTP, reintentos sin efectos duplicados |
| Sandbox de archivos + pdf.js aislado | Acciones de oficina reales (extraer, validar, reportar, pedir revisión) con un catálogo cerrado |
| Aprobación ligada a hashes (dry-run → `planHash`) | Lo que se ejecuta es exactamente lo que se revisó |
| Next.js + React Flow + simulador accesible | Demo remota sin hardware y uso por teclado |

El objetivo no es enseñar programación a niños, sino que un equipo administrativo diseñe y discuta en una mesa
un procedimiento documental, lo vea ejecutarse y conserve la traza (capturas, versiones, ejecuciones, reportes).

## Evidencia disponible

- Pruebas automáticas de cada pieza (ver README, sección Pruebas).
- Benchmark sintético de visión (no físico) en `docs/benchmarking.md`.
- Pendiente: pruebas físicas y evaluación exploratoria con usuarios.
