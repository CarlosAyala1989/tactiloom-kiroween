# Guion del vídeo (objetivo 2:40–2:55, máximo < 3:00)

Reglas: las tomas «físicas» deben grabarse con tarjetas impresas y una cámara de verdad **después** de
comprobar que el pipeline funciona con ellas; si se usa la galería o el simulador, se dice en pantalla.
Ajustar los tiempos con cronómetro real.

| Tiempo | Imagen | Locución (ES; subtítulos EN) |
|---|---|---|
| 0:00–0:15 | Mesa con solicitudes de papel; pantalla de Tactiloom | «Revisar solicitudes es repetitivo, pero automatizarlo no debería exigir programar.» |
| 0:15–0:35 | Tablero A3 impreso; manos colocando INICIO… CONDICIÓN, la rama NO hacia abajo | «Cada tarjeta es una instrucción. La flecha es el flujo; CONDICIÓN envía SÍ hacia delante y NO a la derecha.» |
| 0:35–1:05 | Board Studio → Cámara → Capturar; overlay con la cuadrícula; diagrama; girar una tarjeta y recapturar → error con fila/columna | «OpenCV lee los marcadores desde los píxeles, calibra la perspectiva y un compilador convierte el tablero en un grafo. Si algo está mal, dice qué tarjeta y cómo arreglarlo.» |
| 1:05–1:35 | Workflow Studio → dry-run → pantalla de revisión (pasos, efectos, hashes) → aprobar → reporte descargado | «Antes de tocar nada vemos exactamente qué hará. Solo al aprobar, un worker aislado extrae el texto del PDF, valida los campos y guarda un reporte real.» |
| 1:35–1:58 | Cambiar a `invalid-application.pdf` → rama NO → tarea de revisión; o mover una tarjeta y mostrar el bloqueo | «Con un documento incompleto el flujo toma la otra rama y crea una revisión. Mover una tarjeta nunca ejecuta nada.» |
| 1:58–2:15 | Historial: versiones con diff, ejecuciones, hashes, reportes | «Todo queda trazado: qué se leyó, qué se compiló y qué ocurrió.» |
| 2:15–2:35 | `.kiro/steering`, spec con requisitos EARS, hooks, salida del agente de seguridad y el commit con las correcciones | «Construimos Tactiloom con Kiro: specs y steering guiaron el código; un agente de seguridad encontró problemas reales que corregimos con pruebas.» |
| 2:35–2:50 | Kit imprimible; galería sin hardware; cierre | «No inventamos la programación tangible —FloBlocks y Sheets abrieron el camino—; la unimos a automatización segura de documentos. Imprime el kit o prueba la demo sin cámara.» |

Checklist antes de publicar: duración < 3:00 · vídeo público en YouTube · se ve la app funcionando · las tomas
de cámara son reales · la galería/simulador se identifican · enlace en Devpost.
