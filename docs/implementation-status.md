# Estado de implementación — RitualOS

> Registro honesto por fase. Solo se anotan comandos ejecutados de verdad y resultados observados.
> Entorno: Ubuntu 24.04.5 · i5-1155G7 · Node 24.15.0 · pnpm 11.9.0 · Python 3.14.6 · Docker 29.9.3 / Compose v5.7.0 ·
> Chrome 157 · Kiro CLI 2.34.2. Última actualización: 2026-11-08.

## Resumen

**El MVP funciona de extremo a extremo en local y en Docker Compose** (imagen → OpenCV → compilación →
dry-run → aprobación → ejecución real → reporte o revisión → historial), verificado por E2E. **No es todavía
la entrega completa del concurso**: faltan pruebas físicas con tarjetas impresas, despliegue público,
repositorio en GitHub y vídeo, que requieren al equipo (ver «Pendiente»).

## Fases

| Fase | Estado | Evidencia |
|---|---|---|
| P0 Arranque y specs | Hecha | monorepo, `.kiro/` (steering, spec, hooks, agentes), ADR 0001–0004, `.env.example`, MIT, compose con health checks |
| P1 Visión y board-kit | Hecha, **sin pruebas físicas** | kit determinista rasterizado y releído por OpenCV; 17 fixtures sintéticos; 75 tests Python |
| P2 Compilador | Hecha | 55 tests (8 propiedades fast-check × 300 casos) |
| P3 Motor, persistencia, runner | Hecha | 46 tests del motor; 21 de integración con Postgres |
| P4 Interfaz y E2E | Hecha | 11 pantallas; 16 E2E (incluye cámara **falsa** de Chrome y axe) |
| P5 Calidad y pruebas físicas | Parcial | revisión de seguridad + correcciones; benchmark **sintético**; pruebas físicas pendientes |
| P6 Despliegue y entrega | Parcial | Docker verificado en local; guía de despliegue; URL pública, GitHub y vídeo pendientes |
| P7 Extras | No iniciada | estabilización en vivo, exportación JSON, inglés |

## Comandos ejecutados y resultados (última ejecución)

| Comando | Resultado |
|---|---|
| `pnpm install` | OK (lockfile pnpm 11, `allowBuilds`) |
| `pnpm typecheck` | 0 errores (7 paquetes + scripts/tests de la raíz) |
| `pnpm lint` | ESLint 0 avisos · Ruff «All checks passed» · formato OK |
| `pnpm test` | Vitest 155 passed (contracts 16, board-kit 11, compiler 55, web 23, engine 46, runner 4) · pytest 75 passed |
| `pnpm test:integration` | 21 passed (cola 5, runner 11, hardening 5) contra `ritualos_test` |
| `pnpm test:e2e` | 16 passed contra el stack Docker (`docker compose up`) |
| `node scripts/smoke.mjs http://localhost:3210` | SMOKE OK: rama SÍ con 2 artefactos, rama NO con revisión OPEN, tablero ambiguo no compila |
| `node scripts/abuse-check.mjs http://localhost:3210` | upload chunked de 40 MB sin Content-Length → 413 en 39 ms; health 200; sin Origin → 403; Origin ajeno → 403 |
| `prisma migrate deploy` + seed en una BD vacía (`ritualos_clean_check`, luego borrada) | 3 migraciones aplicadas; 26 entradas de catálogo |
| `pnpm benchmark:vision` | sintético: 120/120 tableros, recall 1,0 (línea base 113/120, 0,9418) |
| `kiro-cli agent validate` (2 agentes) | sin errores; un agente inválido sí se rechaza |
| `docker compose up --build` | 4 servicios sanos (db, vision, web healthy; runner activo); migrate + seed OK |

## Lista de validación final (§16.5 del prompt)

- [x] Web y servicios levantan desde las instrucciones del README (Docker y local)
- [x] Migraciones funcionan en base de datos limpia
- [x] Board-kit imprimible generado y re-reconocido por OpenCV desde el raster
- [x] Imagen → detecciones correctas del ejemplo (fixtures sintéticos; **cámara física sin probar**)
- [x] 10 tarjetas / 2 ramas → IR formal correcta
- [x] Errores de grafo detienen la ejecución
- [x] Simulador funciona y está etiquetado
- [x] Ejecución real produce reporte o revisión según la entrada
- [x] Aprobación manual previa y dry-run funcionales
- [x] Tests unitarios, de propiedades, integración y E2E pasan
- [x] Seguridad de rutas, uploads, sesiones y aislamiento verificada (incluye revisión independiente)
- [ ] Repositorio público con licencia y `.kiro` en la raíz — repo local listo (`git ls-files .kiro` = 13 archivos); falta publicarlo
- [ ] URL utilizable por jueces sin hardware — guía en `docs/deployment.md`; falta servidor/dominio
- [x] Documentación bilingüe suficiente (README, guía de jueces)
- [ ] Vídeo < 3 min público — guion en `docs/demo-script.md`
- [x] Evidencia verdadera de uso de Kiro y limitaciones declaradas (`docs/kiro-usage.md`)

## Comprobación del Apéndice C

| Paso | Estado |
|---|---|
| 1–4 Demo sin cámara con `valid-board-perspective.png`, 10 tarjetas, grafo TRUE/FALSE | Verificado (E2E `demo.spec.ts`) |
| 5–6 `valid-application.pdf`, dry-run, aprobación, reporte con datos correctos | Verificado (E2E descarga y comprueba «Ana Ejemplo Ríos» y «VÁLIDA») |
| 7 `invalid-application.pdf` → rama FALSE → `ReviewTask` real | Verificado (E2E + integración) |
| 8 Tablero con tarjeta fuera de posición bloquea y explica | Verificado (E2E `AMBIGUOUS_POSITION` con `(0,5)` y `#15`) |
| 9 Girar una tarjeta en el simulador → diagnóstico coherente | Verificado (E2E, teclado `R` → `INCOMPATIBLE_PORTS #12`) |
| 10 Historial con dos runs distintos, nodos, artefactos | Verificado (E2E) |
| 11 Tests automáticos; físico y simulador comparten compilador | Verificado (mismo `compile()` en servidor para captura y simulador; mismo hash en ambos modos por test) |
| 12 Guía para imprimir y fotografiar, con benchmark físico honesto | Guía hecha (`ASSEMBLY.md`, `/kit`); **benchmark físico vacío, pendiente** |

## Problemas encontrados y resueltos (con causa raíz)

1. Falso `AMBIGUOUS_POSITION` en perspectiva: cuadrilátero degenerado detectado como #17 → filtro de forma.
2. Generador de propiedades casi sin ramas (12/400) → colocación factible elegida por programa (108/400, 66 anidados).
3. Fiducial #0 perdido con desenfoque fuerte (benchmark) → segunda pasada con nitidez → 120/120.
4. Contraste insuficiente y ARIA inválida (axe) → colores por contraste, estructura `tablist`/`tabpanel`.
5. Revisión de seguridad (agente de Kiro): cuerpos chunked, limitador, cuotas con carrera, sniffing parcial,
   reintento tras caída con `FILE_CHANGED` → corregidos en `885c463` con pruebas que fallan sin el arreglo.
6. Imagen de visión no arrancaba en el contenedor (`config.py` asumía la estructura del repo) → ruta tolerante.
7. Compose intentaba descargar la imagen compartida `ritualos-node:local` → `pull_policy: never` en web/runner (probado con un proyecto mínimo).

## Riesgos y limitaciones

- **Visión física no medida:** el 100 % sintético no predice el rendimiento con cámara (reflejos, papel curvado, lente).
- Sin OCR; CSP con `'unsafe-inline'`; interfaz solo en español.
- Sin proxy de confianza (`TRUST_PROXY_HOPS=0`) el límite de sesiones es compartido por todos los clientes.
- Disco de la máquina de desarrollo al 97–99 %: cada build Docker completo crea ~5 GB de caché (se purgó solo la caché propia).

## Pendiente (requiere al equipo)

1. Pruebas físicas: imprimir, fotografiar ≥ 10 veces por condición y rellenar `docs/benchmarking.md` §2.
2. Publicar el repositorio en GitHub (licencia visible en About; comprobar `git ls-files .kiro`).
3. Desplegar según `docs/deployment.md` y poner la URL en README, guía de jueces y Devpost.
4. Grabar el vídeo con tomas reales (`docs/demo-script.md`), subirlo a YouTube (< 3 min, público).
5. Revisar las reglas oficiales en kiroween.devpost.com (la página devolvió 403 a la consulta automática; un
   resultado de búsqueda confirma el periodo del 30 de octubre al 4 de diciembre de 2026).

## Próxima fase

P5 físico (tabla de benchmark real) y P6 (despliegue + vídeo). Opcional P1: estabilización temporal de cámara en vivo.
