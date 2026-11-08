import Link from 'next/link';

export const metadata = { title: 'Cómo funciona' };

export default function HowItWorksPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Cómo funciona</h1>
        <p className="max-w-3xl text-muted">Tres pasos físicos, un compilador formal y un ejecutor que solo hace lo que aprobaste.</p>
      </header>

      <ol className="grid gap-4 lg:grid-cols-3">
        <li className="panel space-y-2 p-5">
          <h2 className="text-lg font-bold">1. Imprime el tablero y las tarjetas</h2>
          <p className="text-sm text-muted">
            Descarga el <Link className="underline" href="/kit">kit imprimible</Link>: tablero A3 (o 4 hojas A4, o versión reducida A4) y tarjetas. Imprime al 100 % y verifica la barra de 100 mm.
          </p>
          <p className="text-sm text-muted">¿Sin impresora? Usa la galería (fotos sintéticas analizadas por OpenCV) o el simulador digital.</p>
        </li>
        <li className="panel space-y-2 p-5">
          <h2 className="text-lg font-bold">2. Coloca las tarjetas</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Una tarjeta por casilla de la cuadrícula 8×4.</li>
            <li>La flecha impresa es la dirección de avance F. Cada tarjeta recibe por su lado trasero y envía a la casilla vecina en F.</li>
            <li>CONDICIÓN: SÍ sigue F; NO gira 90° a la derecha.</li>
            <li>Toda rama termina en FIN. Las casillas vacías no conectan nada.</li>
          </ul>
        </li>
        <li className="panel space-y-2 p-5">
          <h2 className="text-lg font-bold">3. Escanea, revisa y aprueba</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>OpenCV detecta los 4 marcadores de esquina, calibra la perspectiva y asigna cada tarjeta a su casilla y orientación.</li>
            <li>El compilador genera la IR tactiloom-ir/1 con su hash sha256, o explica cada error con fila y columna.</li>
            <li>El worker hace un dry-run; tú revisas entrada, pasos y efectos; apruebas con el hash; el worker ejecuta.</li>
          </ul>
        </li>
      </ol>

      <section className="panel space-y-3 p-6">
        <h2 className="text-xl font-bold">Las tarjetas v1</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1">Tarjeta</th>
              <th className="py-1">Necesita</th>
              <th className="py-1">Produce / efecto</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['INICIO', '—', 'comienza el flujo'],
              ['ARCHIVO', '—', 'documento del workspace (solo lectura)'],
              ['EXTRAER TEXTO', 'documento', 'texto real del PDF (capa de texto) o TXT'],
              ['VALIDAR CAMPOS', 'texto', 'Nombre, Correo (formato) y Taller presentes'],
              ['CONDICIÓN', 'validación', 'una sola rama: SÍ / NO'],
              ['CREAR REPORTE', 'texto + validación', 'reporte Markdown/JSON en memoria'],
              ['GUARDAR REPORTE', 'reporte', 'archivo descargable en runs/<id>/reports/'],
              ['PEDIR REVISIÓN', 'validación', 'tarea de revisión OPEN (sin correos)'],
              ['FIN', '—', 'termina la rama'],
            ].map(([card, needs, effect]) => (
              <tr key={card} className="border-t border-ink-700">
                <td className="py-1 font-semibold">{card}</td>
                <td className="py-1 text-muted">{needs}</td>
                <td className="py-1 text-muted">{effect}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted">El compilador comprueba que cada dato exista en todo camino que llega a una tarjeta (no solo que haya flechas).</p>
      </section>

      <section className="panel space-y-2 p-6">
        <h2 className="text-xl font-bold">Cámara y compatibilidad</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>La cámara funciona en navegadores modernos con HTTPS o en localhost, y solo tras pulsar «Activar cámara».</li>
          <li>Se envía una única foto por análisis; la foto no se almacena.</li>
          <li>Sin permiso o sin cámara, puedes subir una foto del tablero o usar la galería.</li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/studio" className="btn btn-primary">
            Ir al Board Studio
          </Link>
          <Link href="/simulator" className="btn">
            Abrir el simulador
          </Link>
        </div>
      </section>
    </div>
  );
}
