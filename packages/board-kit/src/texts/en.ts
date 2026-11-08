import type { KitTexts } from './types';

/** English (British spelling, as in the rest of the English UI). */
export const en: KitTexts = {
  board: {
    title: 'Tactiloom · Board v1',
    subtitle: '8 × 4 cells · ArUco DICT_4X4_100 · corner markers 0, 1, 2, 3 · cards #10–#89',
    column: (col) => `col ${col}`,
    rowPrefix: 'R',
    scaleFull: 'Check: this bar measures 100 mm if you printed at 100% (A3 landscape).',
    scaleSmall: 'Reduced A4 version (scale 0.707): this bar measures 70.7 mm. Use the reduced cards.',
    placementRule: 'One card per cell. The printed arrow shows the direction of the workflow; each card takes its input from its rear edge (IN).',
    conditionRule: (condition, yes, no) =>
      `${condition}: ${yes} follows the arrow, ${no} turns 90° to the right. All 4 corner markers must be visible in the photo.`,
  },
  sheet: {
    header: (page, pages, reduced) =>
      `Tactiloom · card set cards-v1 · sheet ${page}/${pages}${reduced ? ' · reduced size' : ''} · cut along the grey border`,
    svgTitle: (page) => `Tactiloom cards-v1 sheet ${page}`,
  },
  tiles: {
    names: ['top left', 'top right', 'bottom left', 'bottom right'],
    label: (tile, name) => `Tactiloom board-v1 · tile ${tile}/4 (${name}) · print at 100%, do not scale to fit · cut along the crop marks`,
  },
  pdf: {
    keywords: ['Tactiloom', 'ArUco', 'DICT_4X4_100', 'board-v1', 'cards-v1'],
    boardFull: { title: 'Tactiloom Board v1 — A3 landscape', subject: 'Print at 100% on A3 landscape. ArUco corner markers 0–3.' },
    boardSmall: {
      title: 'Tactiloom Board v1 — reduced A4 version',
      subject: 'Board at 0.707 scale on A4 landscape; use it with cards-v1-small-a4.pdf.',
    },
    tiles: {
      title: 'Tactiloom Board v1 — 2×2 A4 tiles',
      subject: 'Four A4 landscape sheets at full scale; trim them at the crop marks and join them edge to edge.',
    },
    cards: { title: 'Tactiloom cards-v1 — A4 cards', subject: 'Cards with ArUco DICT_4X4_100 markers (IDs 10–35). Print at 100%.' },
    cardsSmall: { title: 'Tactiloom cards-v1 — reduced version', subject: 'Cards with ArUco DICT_4X4_100 markers (IDs 10–35). Print at 100%.' },
  },
  files: {
    boardPdf: 'A3 landscape board, full scale',
    boardSvg: 'A3 board as SVG (1 unit = 1 mm)',
    tilesPdf: 'Board on 4 A4 sheets at full scale',
    smallBoardPdf: 'Reduced board (0.707) on one A4 sheet',
    cardsPdf: (count) => `${count} cards on A4 (full scale)`,
    cardsLayout: 'Position (mm) of each card in cards-v1-a4.pdf',
    smallCardsPdf: 'Reduced cards for the A4 board',
    smallCardsLayout: 'Card positions (mm) in cards-v1-small-a4.pdf',
    sheetSvg: (page) => `Card sheet ${page} as SVG`,
    boardJson: 'Board geometry (contract)',
    catalogJson: 'Card catalogue: markerId → kind → instance',
    manual: 'Printing and assembly manual',
    manifest: 'Kit manifest',
  },
  instructions: [
    'Print board-v1-a3.pdf on A3 landscape at 100% (or the 4-sheet A4 tiles, or the reduced A4 version).',
    'Print cards-v1-a4.pdf at 100% and cut along the grey border (use cards-v1-small-a4.pdf with the reduced board).',
    'Check the verification bar: 100 mm on the A3 board or the tiles, 70.7 mm on the reduced board.',
    'Place one card per cell; the printed arrow shows the direction of the workflow. All 4 corner markers must be visible in the photo.',
  ],
};
