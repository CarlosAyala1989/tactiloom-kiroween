import Link from 'next/link';
import { es } from '@/lib/i18n/es';

const DEMO_ROW = [
  { label: 'INICIO', color: '#2f9e44' },
  { label: 'ARCHIVO', color: '#1971c2' },
  { label: 'EXTRAER', color: '#0c8599' },
  { label: 'VALIDAR', color: '#6741d9' },
  { label: 'CONDICIÓN', color: '#e67700' },
  { label: 'REPORTE', color: '#c2255c' },
  { label: 'GUARDAR', color: '#5c940d' },
  { label: 'FIN', color: '#495057' },
];

/** Concept illustration only (static SVG); the real demo is in the Studio, Gallery and Simulator. */
function ConceptBoard() {
  return (
    <svg viewBox="0 0 860 300" className="h-auto w-full" role="img" aria-label="Ilustración conceptual: tablero con tarjetas encadenadas y una rama de revisión">
      <rect x="0" y="0" width="860" height="300" rx="18" fill="#f5efe6" />
      {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4, 5, 6, 7].map((c) => <rect key={`${r}-${c}`} x={30 + c * 100} y={20 + r * 66} width="96" height="62" rx="6" fill="none" stroke="#c9bfae" />))}
      {DEMO_ROW.map((card, i) => (
        <g key={card.label} transform={`translate(${36 + i * 100} 26)`}>
          <rect width="84" height="50" rx="6" fill="#fff" stroke={card.color} strokeWidth="2.5" />
          <rect width="84" height="14" rx="5" fill={card.color} />
          <text x="42" y="11" fontSize="9" fill="#fff" textAnchor="middle" fontWeight="700">
            {card.label}
          </text>
          <rect x="30" y="18" width="24" height="24" fill="#111" />
          <path d="M60 30 h14 l-4 -4 M74 30 l-4 4" stroke={card.color} strokeWidth="2.5" fill="none" />
        </g>
      ))}
      <g transform="translate(436 92)">
        <rect width="84" height="50" rx="6" fill="#fff" stroke="#f08c00" strokeWidth="2.5" />
        <rect width="84" height="14" rx="5" fill="#f08c00" />
        <text x="42" y="11" fontSize="9" fill="#fff" textAnchor="middle" fontWeight="700">
          REVISIÓN
        </text>
        <rect x="30" y="18" width="24" height="24" fill="#111" />
      </g>
      <g transform="translate(436 158)">
        <rect width="84" height="50" rx="6" fill="#fff" stroke="#495057" strokeWidth="2.5" />
        <rect width="84" height="14" rx="5" fill="#495057" />
        <text x="42" y="11" fontSize="9" fill="#fff" textAnchor="middle" fontWeight="700">
          FIN
        </text>
        <rect x="30" y="18" width="24" height="24" fill="#111" />
      </g>
      <text x="530" y="120" fontSize="12" fill="#e67700" fontWeight="700">
        NO ↓ gira a la derecha
      </text>
      <text x="430" y="290" fontSize="12" fill="#6b5d4b" textAnchor="middle">
        Ilustración conceptual — la demo real procesa fotos con OpenCV
      </text>
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 pt-6 lg:grid-cols-2">
        <div className="space-y-5">
          <p className="chip text-amber-strong">Kiroween 2026 · Frankenstein</p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">{es.tagline}</h1>
          <p className="max-w-xl text-lg text-muted">
            Tactiloom convierte tarjetas físicas con marcadores ArUco, colocadas sobre un tablero, en un programa real: la cámara lee el tablero, un compilador lo traduce a un grafo tipado y un worker aislado lo ejecuta sobre documentos de prueba —solo después de que lo apruebes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/gallery" className="btn btn-primary">
              Probar demo (sin hardware)
            </Link>
            <Link href="/how-it-works" className="btn">
              Cómo funciona
            </Link>
            <Link href="/kit" className="btn">
              Imprimir el kit
            </Link>
          </div>
        </div>
        <div className="panel p-3">
          <ConceptBoard />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Tres pasos">
        {[
          ['1 · Imprime', 'Tablero 8×4 con 4 marcadores de esquina y tarjetas con marcadores ArUco reales (A3, mosaico A4 o versión reducida).'],
          ['2 · Coloca', 'Una tarjeta por casilla. La flecha impresa es el flujo; CONDICIÓN envía SÍ hacia adelante y NO a la derecha.'],
          ['3 · Escanea y ejecuta', 'OpenCV lee el tablero, el compilador valida el grafo, revisas el dry-run y apruebas. Solo entonces corre el worker.'],
        ].map(([title, text]) => (
          <div key={title} className="panel p-5">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>

      <section className="panel space-y-3 p-6">
        <h2 className="text-xl font-bold">Qué es real en esta demo</h2>
        <ul className="grid gap-2 text-sm md:grid-cols-2">
          <li>✓ Los marcadores se detectan desde los píxeles (OpenCV 5, DICT_4X4_100, homografía con 16 esquinas).</li>
          <li>✓ El grafo se compila con reglas geométricas públicas y diagnósticos en español.</li>
          <li>✓ El worker extrae texto real del PDF, valida campos y escribe un reporte descargable en un sandbox.</li>
          <li>✓ Nada se ejecuta sin un dry-run revisado y una aprobación explícita con hash.</li>
          <li>• Las imágenes de la galería son sintéticas (renderizadas desde el kit) y así se etiquetan.</li>
          <li>• El simulador construye el tablero digitalmente y está marcado «no utiliza cámara».</li>
        </ul>
        <p className="text-xs text-muted">
          Tactiloom no inventó la programación tangible: FloBlocks (2025) y Sheets (2015) ya usaron tarjetas y webcam. Aquí la integramos con un motor seguro de automatización documental, trazabilidad y aprobación.
        </p>
      </section>
    </div>
  );
}
