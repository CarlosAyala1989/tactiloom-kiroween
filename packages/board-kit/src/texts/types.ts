/** Metadata texts of one PDF of the kit (the keywords are shared by every PDF of a language). */
export interface PdfTexts {
  readonly title: string;
  readonly subject: string;
}

/**
 * Every human text of one language of the printable kit, except the card titles and CONDITION branch
 * labels, which come from CARD_PRINTED_TITLES / BRANCH_LABELS in @tactiloom/contracts (shared with the UI).
 * Printed texts (board, sheet, tiles) must be WinAnsi-encodable: test/board-kit.test.ts checks it.
 */
export interface KitTexts {
  readonly board: {
    readonly title: string;
    readonly subtitle: string;
    /** Label above each column (0-based index). */
    readonly column: (col: number) => string;
    /** Prefix of the row labels printed left of the grid (F0…F3 in Spanish). */
    readonly rowPrefix: string;
    /** Under the 100 mm verification bar of the full-size board. */
    readonly scaleFull: string;
    /** Under the same bar on the reduced A4 board (it measures 70.7 mm there). */
    readonly scaleSmall: string;
    readonly placementRule: string;
    /** Receives the printed CONDITION title and its TRUE / FALSE branch labels. */
    readonly conditionRule: (condition: string, yes: string, no: string) => string;
  };
  readonly sheet: {
    /** Header of a card sheet; `page` is 1-based. */
    readonly header: (page: number, pages: number, reduced: boolean) => string;
    readonly svgTitle: (page: number) => string;
  };
  readonly tiles: {
    /** Names of the four A4 tiles in print order (top left, top right, bottom left, bottom right). */
    readonly names: readonly [string, string, string, string];
    /** Label printed above each tile; `tile` is 1-based. */
    readonly label: (tile: number, name: string) => string;
  };
  readonly pdf: {
    readonly keywords: readonly string[];
    readonly boardFull: PdfTexts;
    readonly boardSmall: PdfTexts;
    readonly tiles: PdfTexts;
    readonly cards: PdfTexts;
    readonly cardsSmall: PdfTexts;
  };
  /** Descriptions recorded in the manifests. */
  readonly files: {
    readonly boardPdf: string;
    readonly boardSvg: string;
    readonly tilesPdf: string;
    readonly smallBoardPdf: string;
    readonly cardsPdf: (count: number) => string;
    readonly cardsLayout: string;
    readonly smallCardsPdf: string;
    readonly smallCardsLayout: string;
    readonly sheetSvg: (page: number) => string;
    readonly boardJson: string;
    readonly catalogJson: string;
    readonly manual: string;
    readonly manifest: string;
  };
  /** Short printing steps returned by GET /api/board/kit. */
  readonly instructions: readonly string[];
}
