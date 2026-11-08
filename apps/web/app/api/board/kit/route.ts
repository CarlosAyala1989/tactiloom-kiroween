import { kitManifest } from '@/lib/server/assets';
import { handler, ok } from '@/lib/server/http';

export const GET = handler(async (_request, _context: unknown, requestId) => {
  const manifest = await kitManifest();
  return ok(
    {
      kitVersion: manifest.kitVersion,
      files: manifest.files.filter((file) => !file.path.startsWith('cards/')).map((file) => ({
        ...file,
        url: `/api/board/kit/download?file=${encodeURIComponent(file.path)}`,
      })),
      cards: manifest.files.filter((file) => file.path.startsWith('cards/')).map((file) => ({
        ...file,
        url: `/api/board/kit/download?file=${encodeURIComponent(file.path)}`,
      })),
      zipUrl: '/api/board/kit/download?file=tactiloom-board-kit.zip',
      instructionsEs: [
        'Imprime board-v1-a3.pdf en A3 horizontal al 100 % (o el mosaico de 4 hojas A4, o la versión reducida A4).',
        'Imprime cards-v1-a4.pdf al 100 % y recorta por el borde gris (usa cards-v1-small-a4.pdf con el tablero reducido).',
        'Comprueba la barra de verificación: 100 mm en el tablero A3 / mosaico, 70,7 mm en el reducido.',
        'Coloca una tarjeta por casilla; la flecha impresa indica el flujo. Los 4 marcadores de esquina deben verse en la foto.',
      ],
    },
    requestId,
  );
});
