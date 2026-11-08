import type { KitTexts } from './types';

/** Italian (informal «tu», as in the rest of the Italian UI). */
export const it: KitTexts = {
  board: {
    title: 'Tactiloom · Board v1',
    subtitle: '8 × 4 caselle · ArUco DICT_4X4_100 · marcatori d’angolo 0, 1, 2, 3 · carte #10–#89',
    column: (col) => `col ${col}`,
    rowPrefix: 'R',
    scaleFull: 'Verifica: questa barra misura 100 mm se hai stampato al 100% (A3 orizzontale).',
    scaleSmall: 'Versione ridotta A4 (scala 0,707): questa barra misura 70,7 mm. Usa le carte ridotte.',
    placementRule: 'Una carta per casella. La freccia stampata indica la direzione del flusso; ogni carta riceve l’ingresso dal lato posteriore (IN).',
    conditionRule: (condition, yes, no) =>
      `${condition}: ${yes} segue la freccia, ${no} gira di 90° a destra. I 4 marcatori d’angolo devono essere visibili nella foto.`,
  },
  sheet: {
    header: (page, pages, reduced) =>
      `Tactiloom · carte cards-v1 · foglio ${page}/${pages}${reduced ? ' · versione ridotta' : ''} · ritaglia lungo il bordo grigio`,
    svgTitle: (page) => `Tactiloom cards-v1 foglio ${page}`,
  },
  tiles: {
    names: ['in alto a sinistra', 'in alto a destra', 'in basso a sinistra', 'in basso a destra'],
    label: (tile, name) =>
      `Tactiloom board-v1 · mosaico, foglio ${tile}/4 (${name}) · stampa al 100%, senza adattare alla pagina · ritaglia lungo i segni di taglio`,
  },
  pdf: {
    keywords: ['Tactiloom', 'ArUco', 'DICT_4X4_100', 'board-v1', 'cards-v1'],
    boardFull: { title: 'Tactiloom Board v1 — A3 orizzontale', subject: 'Stampa al 100% su A3 orizzontale. Marcatori d’angolo ArUco 0–3.' },
    boardSmall: {
      title: 'Tactiloom Board v1 — versione ridotta A4',
      subject: 'Tabellone in scala 0,707 su A4 orizzontale; da usare con cards-v1-small-a4.pdf.',
    },
    tiles: {
      title: 'Tactiloom Board v1 — mosaico 2×2 A4',
      subject: 'Quattro fogli A4 orizzontali a grandezza naturale; ritagliali lungo i segni di taglio e uniscili bordo a bordo.',
    },
    cards: { title: 'Tactiloom cards-v1 — carte A4', subject: 'Carte con marcatori ArUco DICT_4X4_100 (ID 10–35). Stampa al 100%.' },
    cardsSmall: { title: 'Tactiloom cards-v1 — versione ridotta', subject: 'Carte con marcatori ArUco DICT_4X4_100 (ID 10–35). Stampa al 100%.' },
  },
  files: {
    boardPdf: 'Tabellone A3 orizzontale, a grandezza naturale',
    boardSvg: 'Tabellone A3 in SVG (1 unità = 1 mm)',
    tilesPdf: 'Tabellone su 4 fogli A4 a grandezza naturale',
    smallBoardPdf: 'Tabellone ridotto (0,707) su un foglio A4',
    cardsPdf: (count) => `${count} carte su A4 (grandezza naturale)`,
    cardsLayout: 'Posizione (mm) di ogni carta in cards-v1-a4.pdf',
    smallCardsPdf: 'Carte ridotte per il tabellone A4',
    smallCardsLayout: 'Posizioni delle carte (mm) in cards-v1-small-a4.pdf',
    sheetSvg: (page) => `Foglio di carte ${page} in SVG`,
    boardJson: 'Geometria del tabellone (contratto)',
    catalogJson: 'Catalogo delle carte: markerId → tipo → istanza',
    manual: 'Manuale di stampa e montaggio',
    manifest: 'Manifesto del kit',
  },
  instructions: [
    'Stampa board-v1-a3.pdf su A3 orizzontale al 100% (oppure il mosaico di 4 fogli A4, o la versione ridotta A4).',
    'Stampa cards-v1-a4.pdf al 100% e ritaglia lungo il bordo grigio (con il tabellone ridotto usa cards-v1-small-a4.pdf).',
    'Controlla la barra di verifica: 100 mm sul tabellone A3 o sul mosaico, 70,7 mm su quello ridotto.',
    'Metti una carta per casella; la freccia stampata indica la direzione del flusso. I 4 marcatori d’angolo devono essere visibili nella foto.',
  ],
};
