import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@xyflow/react/dist/style.css';
import './globals.css';
import { Nav } from '@/components/Nav';
import { SessionProvider } from '@/components/SessionProvider';

export const metadata: Metadata = {
  title: { default: 'Tactiloom — Build workflows with your hands', template: '%s · Tactiloom' },
  description: 'Automatización tangible: tarjetas ArUco sobre un tablero → OpenCV → grafo tipado → ejecución segura y aprobada.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 btn btn-primary">
          Saltar al contenido
        </a>
        <SessionProvider>
          <Nav />
          <main id="main" className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
            {children}
          </main>
          <footer className="mx-auto max-w-7xl px-6 pb-10 text-xs text-muted">
            Tactiloom · MIT · Datos de demostración ficticios · Antecedentes: FloBlocks (2025) y Sheets (2015) exploraron la programación con tarjetas y webcam.
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
