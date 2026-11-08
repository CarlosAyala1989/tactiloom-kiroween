# Uso de Kiro en RitualOS (registro con evidencias)

Registro honesto: solo se anotan usos que ocurrieron y su evidencia verificable en el repositorio.
Todo el código de esta primera iteración se escribió en una sesión de **Kiro CLI 2.34.2** (agente de Kiro)
siguiendo `RitualOS_KiroCLI_Prompt_Maestro.md` como especificación.

| Fecha | Problema | Capacidad de Kiro | Resultado | Evidencia |
|---|---|---|---|---|
| 2026-11-08 | ¿Qué formato de hooks/agentes/steering admite la versión instalada? | Subagente **introspect** (documentación oficial de kiro.dev) | Se confirmó: steering con front-matter (`always`, `fileMatch`, `manual`, `auto`), spec en `.kiro/specs/<feature>/`, hooks v3 independientes (`.kiro/hooks/*.json`, `"version": "v1"`, triggers PascalCase) y agentes v3 con `permissions` | Archivos en `.kiro/`; fuentes citadas por el subagente: kiro.dev/docs/steering, /hooks, /custom-agents/configuration-reference, /cli/2x-reference |
| 2026-11-08 | Mantener las reglas del proyecto presentes en cada paso | **Steering** (`product`, `architecture`, `security`, `testing` = always; `ux` = fileMatch `apps/web/**`) | Kiro inyectó las reglas en la sesión; la regla `ux` apareció al empezar a editar archivos de `apps/web` (comportamiento fileMatch observado) | `.kiro/steering/*.md` |
| 2026-11-08 | Requisitos trazables a pruebas y commits | **Spec**: `requirements.md` (EARS), `design.md`, `tasks.md` | 14 requisitos con su verificación; tareas con commits | `.kiro/specs/ritualos/` |
| 2026-11-08 | Ejecutar pruebas al cambiar el compilador, los contratos o la visión | **Hooks** `PostFileSave` creados con la herramienta de hooks de Kiro | 3 hooks; el comando del hook del compilador se ejecutó a mano: 55 passed. Los hooks se activan al iniciar la siguiente sesión: **todavía no se ha observado un disparo automático** | `.kiro/hooks/compiler-tests-on-save.json`, `contracts-drift-check.json`, `vision-tests-on-save.json` |
| 2026-11-08 | Agentes especializados | **Agentes personalizados** v3 | `kiro-cli agent validate` sin errores para ambos; un JSON inválido sí se rechaza; `kiro-cli agent list` los muestra como «Workspace (v3 format)» | `.kiro/agents/ritualos-security-reviewer.json`, `ritualos-vision.json` |
| 2026-11-08 | Revisión de seguridad independiente antes de entregar | Agente **ritualos-security-reviewer** (solo lectura) | 4 problemas confirmados: cuerpos chunked sin límite (DoS de memoria), limitador de sesiones global/IP falsificable, cuotas con carrera check-then-act, sniffing de TXT solo en 8 KB. Sugerencias: plan fail-closed, transiciones condicionadas, errores internos expuestos, entorno del worker PDF, token antes del multipart, `__Host-`. Y un **bug no de seguridad**: un reintento tras caída después de escribir el reporte fallaría con `FILE_CHANGED` porque el reporte llevaba la hora del reloj | Corregido en `885c463`. La prueba `crash after the report files were written…` falla sin el arreglo (`expected 'FILE_CHANGED' to be null`) y pasa con él. `scripts/abuse-check.mjs`: cuerpo chunked de 40 MB → 413 en 39 ms |
| 2026-11-08 | ¿Las pruebas de propiedades exploran grafos interesantes? | Property-based testing (fast-check) + prueba de cobertura del generador | El primer generador producía solo 12/400 programas con CONDICIÓN y 0 anidados (pruebas casi vacías). Rediseño: elegir una colocación factible por programa → 108/400 con CONDICIÓN y 66/400 anidados. Las 8 propiedades no encontraron defectos del compilador | `packages/compiler/test/generators-coverage.test.ts` |
| 2026-11-08 | Robustez de la visión | Benchmark sintético ejecutado por el agente | Línea base 113/120 tableros calibrados (fallo único: fiducial #0 con desenfoque fuerte) → segunda pasada con nitidez → 120/120 | `docs/benchmarking.md`, `docs/benchmark-results/` |
| 2026-11-08 | Falso positivo en perspectiva | Prueba manual del agente sobre la primera imagen en perspectiva | Un cuadrilátero degenerado del marcador #17 provocaba `AMBIGUOUS_POSITION`; se añadió un filtro de forma (imagen y mm) | `services/vision/ritualos_vision/detector.py` (`_plausible_quad`) |
| 2026-11-08 | Accesibilidad | E2E con axe-core | Contraste insuficiente en etiquetas de tarjetas y `tablist` con hijos inválidos → color de EXTRAER TEXTO `#0b7285`, texto elegido por contraste (≥ 4,5:1, con prueba unitaria) y estructura ARIA corregida | `tests/e2e/a11y.spec.ts`, `apps/web/test/client.test.ts` |
| 2026-11-08 | Primer render con aviso falso | Capturas de pantalla del E2E revisadas por el agente | La primera compilación salía sin documento (aviso `INPUT_NOT_SELECTED` con documento ya elegido); ahora los nodos ARCHIVO se derivan del catálogo antes de compilar | `apps/web/components/CompilePanel.tsx` |

## Cómo reproducir

- Agentes: `kiro-cli agent list` (desde la raíz del repo) y `kiro-cli --agent ritualos-security-reviewer`.
- Hooks: `/hooks` dentro de una sesión de Kiro CLI muestra los hooks activos.
- Steering / contexto: `/context show`.

## Pendiente de registrar por el equipo

- Disparos automáticos de los hooks en sesiones posteriores.
- Uso de `/spec run` o del agente `ritualos-vision` durante las pruebas físicas.
