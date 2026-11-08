import type { KitTexts } from './types';

/** French («vous», as in the rest of the French UI). */
export const fr: KitTexts = {
  board: {
    title: 'Tactiloom · Board v1',
    subtitle: '8 × 4 cases · ArUco DICT_4X4_100 · marqueurs de coin 0, 1, 2, 3 · cartes #10–#89',
    column: (col) => `col ${col}`,
    rowPrefix: 'L',
    scaleFull: 'Vérification : cette barre mesure 100 mm si vous avez imprimé à 100 % (A3 paysage).',
    scaleSmall: 'Version réduite A4 (échelle 0,707) : cette barre mesure 70,7 mm. Utilisez les cartes réduites.',
    placementRule: 'Une carte par case. La flèche imprimée indique le sens du flux ; chaque carte reçoit son entrée par son bord arrière (IN).',
    conditionRule: (condition, yes, no) =>
      `${condition} : ${yes} suit la flèche, ${no} tourne de 90° vers la droite. Les 4 marqueurs de coin doivent être visibles sur la photo.`,
  },
  sheet: {
    header: (page, pages, reduced) =>
      `Tactiloom · cartes cards-v1 · feuille ${page}/${pages}${reduced ? ' · version réduite' : ''} · découpez le long du bord gris`,
    svgTitle: (page) => `Tactiloom cards-v1 feuille ${page}`,
  },
  tiles: {
    names: ['en haut à gauche', 'en haut à droite', 'en bas à gauche', 'en bas à droite'],
    label: (tile, name) =>
      `Tactiloom board-v1 · mosaïque, feuille ${tile}/4 (${name}) · imprimer à 100 %, sans ajuster à la page · découper le long des traits de coupe`,
  },
  pdf: {
    keywords: ['Tactiloom', 'ArUco', 'DICT_4X4_100', 'board-v1', 'cards-v1'],
    boardFull: { title: 'Tactiloom Board v1 — A3 paysage', subject: 'Imprimer à 100 % sur A3 paysage. Marqueurs de coin ArUco 0–3.' },
    boardSmall: {
      title: 'Tactiloom Board v1 — version réduite A4',
      subject: 'Plateau à l’échelle 0,707 sur A4 paysage ; à utiliser avec cards-v1-small-a4.pdf.',
    },
    tiles: {
      title: 'Tactiloom Board v1 — mosaïque 2×2 A4',
      subject: 'Quatre feuilles A4 paysage à l’échelle réelle ; les découper le long des traits de coupe et les assembler bord à bord.',
    },
    cards: { title: 'Tactiloom cards-v1 — cartes A4', subject: 'Cartes avec marqueurs ArUco DICT_4X4_100 (ID 10–35). Imprimer à 100 %.' },
    cardsSmall: { title: 'Tactiloom cards-v1 — version réduite', subject: 'Cartes avec marqueurs ArUco DICT_4X4_100 (ID 10–35). Imprimer à 100 %.' },
  },
  files: {
    boardPdf: 'Plateau A3 paysage, échelle réelle',
    boardSvg: 'Plateau A3 en SVG (1 unité = 1 mm)',
    tilesPdf: 'Plateau sur 4 feuilles A4 à l’échelle réelle',
    smallBoardPdf: 'Plateau réduit (0,707) sur une feuille A4',
    cardsPdf: (count) => `${count} cartes sur A4 (échelle réelle)`,
    cardsLayout: 'Position (mm) de chaque carte dans cards-v1-a4.pdf',
    smallCardsPdf: 'Cartes réduites pour le plateau A4',
    smallCardsLayout: 'Positions des cartes (mm) dans cards-v1-small-a4.pdf',
    sheetSvg: (page) => `Feuille de cartes ${page} en SVG`,
    boardJson: 'Géométrie du plateau (contrat)',
    catalogJson: 'Catalogue des cartes : markerId → type → instance',
    manual: 'Manuel d’impression et d’assemblage',
    manifest: 'Manifeste du kit',
  },
  instructions: [
    'Imprimez board-v1-a3.pdf sur A3 paysage à 100 % (ou la mosaïque de 4 feuilles A4, ou la version réduite A4).',
    'Imprimez cards-v1-a4.pdf à 100 % et découpez le long du bord gris (avec le plateau réduit, utilisez cards-v1-small-a4.pdf).',
    'Vérifiez la barre de contrôle : 100 mm sur le plateau A3 ou la mosaïque, 70,7 mm sur le plateau réduit.',
    'Placez une carte par case ; la flèche imprimée indique le sens du flux. Les 4 marqueurs de coin doivent être visibles sur la photo.',
  ],
};
