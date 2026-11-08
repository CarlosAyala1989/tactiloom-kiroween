import type { KitTexts } from './types';

/**
 * Spanish: the reference kit at the root of assets/board-kit. These strings reproduce the published
 * kit byte for byte (the synthetic vision fixtures are rendered from it): do not reword them without
 * regenerating the fixtures.
 */
export const es: KitTexts = {
  board: {
    title: 'Tactiloom · Board v1',
    subtitle: '8 × 4 casillas · ArUco DICT_4X4_100 · fiduciales 0, 1, 2, 3 · tarjetas #10–#89',
    column: (col) => `col ${col}`,
    rowPrefix: 'F',
    scaleFull: 'Verificación: esta barra mide 100 mm si imprimiste al 100 % (A3 horizontal).',
    scaleSmall: 'Versión reducida A4 (escala 0,707): esta barra mide 70,7 mm. Usa las tarjetas reducidas.',
    placementRule: 'Una tarjeta por casilla. La flecha impresa indica el flujo; cada tarjeta recibe por su lado trasero (IN).',
    conditionRule: (condition, yes, no) =>
      `${condition}: ${yes} sigue la flecha, ${no} gira 90° a la derecha. Los 4 marcadores de esquina deben verse en la foto.`,
  },
  sheet: {
    header: (page, pages, reduced) =>
      `Tactiloom · tarjetas cards-v1 · hoja ${page}/${pages}${reduced ? ' · versión reducida' : ''} · recorta por el borde gris`,
    svgTitle: (page) => `Tactiloom cards-v1 hoja ${page}`,
  },
  tiles: {
    names: ['superior izquierdo', 'superior derecho', 'inferior izquierdo', 'inferior derecho'],
    label: (tile, name) =>
      `Tactiloom board-v1 · mosaico ${tile}/4 (${name}) · imprimir al 100 %, sin ajustar a página · recortar por las marcas`,
  },
  pdf: {
    keywords: ['Tactiloom', 'ArUco', 'DICT_4X4_100', 'board-v1', 'cards-v1'],
    boardFull: { title: 'Tactiloom Board v1 — A3 horizontal', subject: 'Imprimir al 100 % en A3 horizontal. Fiduciales ArUco 0-3.' },
    boardSmall: {
      title: 'Tactiloom Board v1 — versión reducida A4',
      subject: 'Tablero a escala 0,707 en A4 horizontal; usar con cards-v1-small-a4.pdf.',
    },
    tiles: {
      title: 'Tactiloom Board v1 — mosaico 2×2 A4',
      subject: 'Cuatro hojas A4 horizontales a escala real; recortar por las marcas y unir borde con borde.',
    },
    cards: { title: 'Tactiloom cards-v1 — tarjetas A4', subject: 'Tarjetas con marcadores ArUco DICT_4X4_100 (IDs 10-35). Imprimir al 100 %.' },
    cardsSmall: {
      title: 'Tactiloom cards-v1 — versión reducida',
      subject: 'Tarjetas con marcadores ArUco DICT_4X4_100 (IDs 10-35). Imprimir al 100 %.',
    },
  },
  files: {
    boardPdf: 'Tablero A3 horizontal, escala real',
    boardSvg: 'Tablero A3 en SVG (1 unidad = 1 mm)',
    tilesPdf: 'Tablero en 4 hojas A4 a escala real',
    smallBoardPdf: 'Tablero reducido (0,707) en una hoja A4',
    cardsPdf: (count) => `${count} tarjetas en A4 (escala real)`,
    cardsLayout: 'Posición (mm) de cada tarjeta en cards-v1-a4.pdf',
    smallCardsPdf: 'Tarjetas reducidas para el tablero A4',
    smallCardsLayout: 'Posición (mm) en cards-v1-small-a4.pdf',
    sheetSvg: (page) => `Hoja ${page} de tarjetas en SVG`,
    boardJson: 'Geometría del tablero (contrato)',
    catalogJson: 'Catálogo markerId → tipo → instancia',
    manual: 'Manual de impresión y montaje (es/en)',
    manifest: 'Manifiesto del kit',
  },
  instructions: [
    'Imprime board-v1-a3.pdf en A3 horizontal al 100 % (o el mosaico de 4 hojas A4, o la versión reducida A4).',
    'Imprime cards-v1-a4.pdf al 100 % y recorta por el borde gris (usa cards-v1-small-a4.pdf con el tablero reducido).',
    'Comprueba la barra de verificación: 100 mm en el tablero A3 / mosaico, 70,7 mm en el reducido.',
    'Coloca una tarjeta por casilla; la flecha impresa indica el flujo. Los 4 marcadores de esquina deben verse en la foto.',
  ],
};
