import Link from 'next/link';

export const metadata = { title: 'Guía para jueces' };

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Guía para jueces · Judges guide</h1>
        <p className="max-w-3xl text-muted">Evalúa RitualOS en ~5 minutos sin hardware. Each step below is also described in English in docs/judge-guide.md.</p>
      </header>

      <section className="panel space-y-3 p-6">
        <h2 className="text-xl font-bold">Recorrido sugerido</h2>
        <ol className="list-decimal space-y-2 pl-6 text-sm">
          <li>
            Abre la <Link className="underline" href="/gallery">Galería</Link> y pulsa «Analizar con OpenCV» en <em>Tablero válido en perspectiva</em>. El servidor detecta las 10 tarjetas desde los píxeles.
          </li>
          <li>Comprueba la superposición (esquinas, cuadrícula proyectada, flechas) y la tabla de tarjetas leídas.</li>
          <li>En «Programa compilado» verás el grafo con dos ramas y su contentHash. El documento de entrada por defecto es <code className="mono">valid-application.pdf</code> (ficticio).</li>
          <li>Pulsa «Guardar versión y abrir Workflow Studio» y luego «Revisar y ejecutar (dry-run)».</li>
          <li>Revisa entrada, pasos, decisión prevista y efectos; marca la casilla y pulsa «Aprobar y ejecutar». Descarga el reporte Markdown/JSON.</li>
          <li>En Workflow Studio cambia el documento a <code className="mono">invalid-application.pdf</code>, guarda (nueva versión, nuevo hash) y ejecuta: irá por la rama NO y creará una tarea de revisión.</li>
          <li>Analiza <em>Tarjeta entre dos casillas</em> o <em>Falta una tarjeta FIN</em>: no hay botón de ejecución y los errores indican tarjeta, fila y columna.</li>
          <li>En el <Link className="underline" href="/simulator">Simulador</Link> gira una tarjeta (tecla R) y observa el diagnóstico INCOMPATIBLE_PORTS en vivo.</li>
          <li>Consulta el <Link className="underline" href="/history">Historial</Link>: capturas, versiones, ejecuciones, reportes y revisiones.</li>
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel space-y-2 p-6 text-sm">
          <h2 className="text-lg font-bold">Real vs. simulado</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>Visión: real (OpenCV sobre los píxeles de cada imagen). Las imágenes de la galería son sintéticas y se etiquetan así.</li>
            <li>Cámara: real cuando la activas (getUserMedia). Las pruebas con tarjetas impresas las documenta el equipo en docs/benchmarking.md.</li>
            <li>Simulador: construye el tablero digitalmente; no usa cámara y lo indica siempre.</li>
            <li>Ejecución: real (worker separado, sandbox por workspace, PDF con capa de texto, reportes con sha256).</li>
          </ul>
        </div>
        <div className="panel space-y-2 p-6 text-sm">
          <h2 className="text-lg font-bold">Seguridad y privacidad</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>Catálogo cerrado de 9 acciones; sin shell, sin red saliente, sin plugins.</li>
            <li>Ejecutar exige dry-run + aprobación con contentHash y planHash; el servidor recompila y verifica.</li>
            <li>Workspace aislado con TTL; las fotos no se guardan; datos ficticios.</li>
            <li>
              API documentada en <a className="underline" href="/api/openapi">/api/openapi</a>; estado del sistema en <a className="underline" href="/api/health">/api/health</a>.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
