import { DIAGNOSTIC_TITLES_ES, type Diagnostic, type DiagnosticCode, type Locale } from '@tactiloom/contracts';

/** Thrown by param accessors when a stored diagnostic lacks the params a template needs. */
export class MissingParamError extends Error {}

/** Typed access to `diagnostic.params`; a missing/ill-typed value aborts the template (canonical fallback). */
export interface ParamReader {
  num(key: string): number;
  str(key: string): string;
  nums(key: string): number[];
  strs(key: string): string[];
  has(key: string): boolean;
  variant(): string | null;
}

/** Locale-specific building blocks shared by all templates. */
export interface TemplateHelpers {
  /** "#15 CREATE REPORT" */
  card(markerId: number, kind: string): string;
  /** "CREATE REPORT" */
  kindLabel(kind: string): string;
  cell(row: number, col: number): string;
  list(items: readonly string[]): string;
  toward(direction: string): string;
  side(direction: string): string;
  port(port: string): string;
  fact(fact: string): string;
  corner(fiducial: number): string;
  branch(port: 'TRUE' | 'FALSE'): string;
}

export interface TemplateContext {
  readonly p: ParamReader;
  readonly d: Diagnostic;
  readonly h: TemplateHelpers;
}

export interface RenderedText {
  readonly message: string;
  readonly suggestion?: string;
}

export type DiagnosticTemplate = (context: TemplateContext) => RenderedText;

export interface DiagnosticsMessages {
  readonly titles: Readonly<Record<DiagnosticCode, string>>;
  /** Empty for Spanish: the canonical `message`/`suggestion` are already Spanish. */
  readonly templates: Readonly<Partial<Record<DiagnosticCode, DiagnosticTemplate>>>;
  readonly ui: {
    readonly listLabel: string;
    readonly empty: string;
    readonly cards: string;
    readonly cells: string;
    readonly affects: (targets: string) => string;
    readonly elements: (count: number) => string;
    readonly showAll: (count: number) => string;
    /** Shown when a stored diagnostic has no params (pre-i18n data): the Spanish original is displayed. */
    readonly originalSpanish: string;
  };
}

const cellsOf = (d: Diagnostic, h: TemplateHelpers): string => {
  if (!d.cells?.length) throw new MissingParamError('cells');
  return h.list(d.cells.map((c) => h.cell(c.row, c.col)));
};
const chainOf = ({ p, h }: TemplateContext, key: 'markers'): string[] => {
  const markers = p.nums(key);
  const kinds = p.strs('kinds');
  if (kinds.length !== markers.length) throw new MissingParamError('kinds');
  return markers.map((marker, index) => h.card(marker, kinds[index] as string));
};
const at = ({ p, h }: TemplateContext): string | null => (p.has('row') && p.has('col') ? h.cell(p.num('row'), p.num('col')) : null);

const en: DiagnosticsMessages = {
  titles: {
    BOARD_FIDUCIAL_MISSING: 'A board corner marker is missing',
    DUPLICATE_FIDUCIAL: 'Repeated corner marker',
    HOMOGRAPHY_DEGENERATE: 'The perspective could not be calibrated',
    NO_MARKERS_FOUND: 'No markers found',
    TOO_MANY_MARKERS: 'Too many markers in the image',
    MARKER_SIZE_MISMATCH: 'Unexpected card size',
    AMBIGUOUS_POSITION: 'Card between two cells',
    AMBIGUOUS_ORIENTATION: 'Ambiguous orientation',
    CARD_NOT_IN_CELL: 'Card outside the grid',
    UNKNOWN_CARD: 'Unknown card',
    INVALID_BOARD_STATE: 'Invalid board state',
    BOARD_DIMENSIONS_MISMATCH: 'Wrong board dimensions',
    BOARD_NOT_CALIBRATED: 'Board not calibrated',
    CARD_COLLISION: 'Two cards in the same cell',
    DUPLICATE_INSTANCE: 'Duplicated card',
    MISSING_START: 'The START card is missing',
    MULTIPLE_STARTS: 'More than one START card',
    MISSING_END: 'An END card is missing',
    DANGLING_OUTPUT: 'Output without a receiving card',
    INCOMPATIBLE_PORTS: 'Connection with an incompatible orientation',
    MULTIPLE_INPUTS: 'Card with more than one input',
    UNREACHABLE_NODE: 'Card not reachable from START',
    CYCLE_UNSUPPORTED: 'Unsupported cycle',
    NONTERMINATING_PATH: 'Path that does not finish at END',
    BRANCH_TARGETS_IDENTICAL: 'Both branches reach the same card',
    MISSING_REQUIRED_DATA: 'Required data is missing',
    INVALID_PARAMETER: 'Invalid parameter',
    UNUSED_PARAMETER: 'Parameter without a card',
    INPUT_NOT_SELECTED: 'No input document selected',
    TOO_MANY_NODES: 'Too many cards',
    IR_INVALID: 'Invalid program',
    IR_HASH_MISMATCH: 'The program hash does not match',
    UNSUPPORTED_FILE_TYPE: 'Unsupported file type',
    UNSAFE_FILE_PATH: 'Unsafe file path',
    FILE_NOT_FOUND: 'File not found',
    FILE_TOO_LARGE: 'File too large',
    FILE_CHANGED: 'The file changed since the approval',
    PDF_NO_TEXT_LAYER: 'PDF without a text layer',
    EXTRACTION_FAILED: 'The text could not be extracted',
    OUTPUT_TOO_LARGE: 'Output too large',
    RUN_TIMEOUT: 'Maximum run time exceeded',
    RUN_CANCELLED: 'Run cancelled',
    NODE_LIMIT_EXCEEDED: 'Node limit exceeded',
    PRECONDITION_FAILED: 'Precondition not met',
    INTERNAL_ERROR: 'Internal error',
  },
  templates: {
    BOARD_FIDUCIAL_MISSING: ({ p, h }) => {
      const ids = p.nums('fiducials');
      const names = h.list(ids.map((id) => `${id} (${h.corner(id)})`));
      return {
        message: `${ids.length === 1 ? `Corner marker ${names} is` : `Corner markers ${names} are`} not visible. Without the 4 corners the perspective cannot be calibrated.`,
        suggestion: 'Make sure the four board corners (IDs 0–3) are fully visible, without shadows or glare.',
      };
    },
    DUPLICATE_FIDUCIAL: ({ p }) => ({
      message: `More than one corner marker has the same ID: ${p.nums('fiducials').join(', ')}.`,
      suggestion: 'Use a single printed board in the photo.',
    }),
    HOMOGRAPHY_DEGENERATE: ({ p }) => {
      const reason = p.str('reason');
      const detail: Record<string, () => string> = {
        mirrored: () => 'the corners appear in reverse order (mirrored image?).',
        nonconvex: () => 'the four corners do not form a convex quadrilateral.',
        small: () => 'the board covers too small an area of the image.',
        failed: () => 'the homography could not be computed.',
        degenerate: () => 'the homography is degenerate.',
        reprojection: () => `reprojection error of ${p.num('rmsMm').toFixed(1)} mm (maximum ${p.num('maxMm').toFixed(1)} mm).`,
      };
      const text = detail[reason];
      if (!text) throw new MissingParamError('reason');
      return { message: `The board could not be calibrated: ${text()}`, suggestion: 'Photograph the whole board, flat and from a more frontal angle.' };
    },
    NO_MARKERS_FOUND: () => ({
      message: 'No ArUco marker was found in the image.',
      suggestion: 'Frame the whole board in good light, without glare, and capture again.',
    }),
    TOO_MANY_MARKERS: ({ p }) => ({
      message: `${p.num('count')} markers were detected (maximum ${p.num('max')}). The image is not processed.`,
      suggestion: 'Photograph a single Tactiloom board.',
    }),
    MARKER_SIZE_MISMATCH: ({ p }) => {
      const id = p.num('markerId');
      switch (p.variant()) {
        case 'size':
          return {
            message: `Marker #${id} measures ${p.num('sideMm').toFixed(1)} mm; ${p.num('expectedMm').toFixed(0)} mm were expected. Did you mix reduced cards with the A3 board?`,
            suggestion: 'Print the board and the cards at the same scale.',
          };
        case 'sliverBoard':
          return { message: `A non-square detection of marker #${id} was discarded (probably a false positive).` };
        case 'sliverImage':
          return { message: `A distorted detection of marker #${id} was discarded (probably a false positive).` };
        default:
          throw new MissingParamError('variant');
      }
    },
    AMBIGUOUS_POSITION: ({ p, d, h }) => ({
      message: `Card #${p.num('markerId')} (${h.kindLabel(p.str('kind'))}) lies between cells ${cellsOf(d, h)}.`,
      suggestion: 'Centre it inside a single cell and capture again.',
    }),
    AMBIGUOUS_ORIENTATION: ({ p, h }) => ({
      message: `Card #${p.num('markerId')} (${h.kindLabel(p.str('kind'))}) at ${h.cell(p.num('row'), p.num('col'))} is rotated ${p.num('deviation')}° away from an axis: it is unclear whether it points ${h.toward(p.str('lower'))} or ${h.toward(p.str('upper'))}.`,
      suggestion: 'Turn it so that its arrow is parallel to the board edges.',
    }),
    CARD_NOT_IN_CELL: ({ p, h }) =>
      p.has('columns')
        ? {
            message: `${h.card(p.num('markerId'), p.str('kind'))} is outside the ${p.num('columns')}×${p.num('rows')} grid.`,
            suggestion: 'Place it inside one cell of the board.',
          }
        : {
            message: `Card #${p.num('markerId')} (${h.kindLabel(p.str('kind'))}) is outside the grid.`,
            suggestion: 'Place it completely inside one cell of the board.',
          },
    UNKNOWN_CARD: ({ p, h }) =>
      p.has('row')
        ? {
            message: `Marker #${p.num('markerId')} at ${h.cell(p.num('row'), p.num('col'))} is not a card of the ${p.str('catalogVersion')} catalogue.`,
            suggestion: 'Remove it or use a card printed with the official kit.',
          }
        : {
            message: `Marker #${p.num('markerId')} is not part of the cards-v1 catalogue.`,
            suggestion: 'Remove that card or use one printed with the official kit (IDs 10–35).',
          },
    INVALID_BOARD_STATE: ({ p }) => ({
      message: `The board state does not satisfy the tactiloom-board/1 contract: ${p.str('issues')}`,
      suggestion: 'Analyse the image again or reload the simulator.',
    }),
    BOARD_DIMENSIONS_MISMATCH: ({ p }) => ({
      message: `The board declares ${p.num('columns')}×${p.num('rows')} cells; board-v1 requires ${p.num('expectedColumns')}×${p.num('expectedRows')}.`,
    }),
    BOARD_NOT_CALIBRATED: () => ({
      message: 'The board is not calibrated: the cards cannot be assigned to cells.',
      suggestion: 'Capture again making sure the four corner markers are visible.',
    }),
    INVALID_PARAMETER: ({ p, h }) =>
      p.variant() === 'shape'
        ? { message: 'Parameters must be an object { "<instance>": { ... } } with ids such as "input-11".' }
        : { message: `Invalid parameters for ${h.card(p.num('markerId'), p.str('kind'))}: ${p.str('detail')}.`, suggestion: 'Fix the value in the parameters panel.' },
    DUPLICATE_INSTANCE: ({ p, h }) => ({
      message: `${h.card(p.num('markerId'), p.str('kind'))} appears twice: at ${h.cell(p.num('firstRow'), p.num('firstCol'))} and at ${h.cell(p.num('secondRow'), p.num('secondCol'))}.`,
      suggestion: 'Each physical card is unique: remove the copy or use another card of the same type (another number).',
    }),
    CARD_COLLISION: ({ p, h }) => ({
      message: `${h.card(p.num('markerA'), p.str('kindA'))} and ${h.card(p.num('markerB'), p.str('kindB'))} occupy the same cell ${h.cell(p.num('row'), p.num('col'))}.`,
      suggestion: 'Leave a single card per cell.',
    }),
    TOO_MANY_NODES: ({ p }) => ({ message: `There are ${p.num('count')} cards; the maximum per workflow is ${p.num('max')}.` }),
    DANGLING_OUTPUT: ({ p, h }) => {
      const card = h.card(p.num('markerId'), p.str('kind'));
      const port = h.port(p.str('port'));
      const where = h.cell(p.num('row'), p.num('col'));
      const toward = h.toward(p.str('direction'));
      if (p.variant() === 'outside') {
        return { message: `The ${port} of ${card} at ${where} points ${toward}, off the board.`, suggestion: `Rotate ${card} so that its ${port} points into the board.` };
      }
      const target = h.cell(p.num('targetRow'), p.num('targetCol'));
      return {
        message: `The ${port} of ${card} at ${where} points ${toward}, but cell ${target} is empty.`,
        suggestion: `Place the next card at ${target} with its arrow pointing ${toward}, or rotate ${card}.`,
      };
    },
    INCOMPATIBLE_PORTS: ({ p, h }) => {
      if (p.variant() === 'nodeNoInput') return { message: `${h.card(p.num('markerId'), p.str('kind'))} accepts no input.` };
      const from = h.card(p.num('fromMarker'), p.str('fromKind'));
      const to = h.card(p.num('toMarker'), p.str('toKind'));
      const port = h.port(p.str('port'));
      if (p.variant() === 'noInput') return { message: `The ${port} of ${from} reaches ${to}, which accepts no input.`, suggestion: `Move ${to} or rotate ${from}.` };
      return {
        message: `The ${port} of ${from} reaches ${to} on its ${h.side(p.str('arrivingSide'))} side, but that card receives on its ${h.side(p.str('expectedSide'))} side.`,
        suggestion: `Rotate ${to} so that its arrow points ${h.toward(p.str('direction'))}.`,
      };
    },
    INPUT_NOT_SELECTED: ({ p, h }) => ({ message: `${h.card(p.num('markerId'), p.str('kind'))} has no document yet: choose one before reviewing and running.` }),
    UNUSED_PARAMETER: ({ p }) => ({ message: `There are parameters for “${p.str('instanceId')}”, but that card is not on the board; they are ignored.` }),
    IR_INVALID: ({ p, h }) => {
      switch (p.variant()) {
        case 'edgeRefs':
          return { message: `Edge ${p.str('from')} → ${p.str('to')} references nodes that do not exist.` };
        case 'duplicatePort':
          return { message: `${h.card(p.num('markerId'), p.str('kind'))} cannot have two edges on port ${p.str('port')}.` };
        case 'undeclaredPort':
          return { message: `${h.card(p.num('markerId'), p.str('kind'))} cannot have an edge on port ${p.str('port')}.` };
        default:
          throw new MissingParamError('variant');
      }
    },
    MISSING_START: ({ h }) => ({ message: `There is no ${h.kindLabel('START')} card on the board.`, suggestion: `Place a ${h.kindLabel('START')} card at the beginning of the workflow.` }),
    MULTIPLE_STARTS: ({ p, h }) => ({
      message: `There are ${p.num('count')} ${h.kindLabel('START')} cards; a v1 workflow has exactly one.`,
      suggestion: `Remove the extra ${h.kindLabel('START')} cards.`,
    }),
    MISSING_END: ({ h }) => ({
      message: `There is no ${h.kindLabel('END')} card: every path must finish at ${h.kindLabel('END')}.`,
      suggestion: `Place an ${h.kindLabel('END')} card at the end of each branch.`,
    }),
    MULTIPLE_INPUTS: ({ p, h }) => ({ message: `${h.card(p.num('markerId'), p.str('kind'))} receives ${p.num('count')} inputs; v1 accepts only one (there is no MERGE).` }),
    BRANCH_TARGETS_IDENTICAL: ({ p, h }) => ({ message: `The ${h.branch('TRUE')} and ${h.branch('FALSE')} branches of ${h.card(p.num('markerId'), p.str('kind'))} reach the same card.` }),
    CYCLE_UNSUPPORTED: (context) => ({
      message: `Cards ${context.h.list(chainOf(context, 'markers'))} form a cycle; v1 does not support loops.`,
      suggestion: 'Break the cycle by rotating or removing one of those cards.',
    }),
    UNREACHABLE_NODE: (context) => {
      const where = at(context);
      return {
        message: `${context.h.card(context.p.num('markerId'), context.p.str('kind'))}${where ? ` at ${where}` : ''} is not connected to ${context.h.kindLabel('START')}.`,
        suggestion: 'Connect it to the chain: it must sit in the neighbouring cell the previous card points to, facing the same direction.',
      };
    },
    NONTERMINATING_PATH: (context) => ({
      message: `The path ${chainOf(context, 'markers').join(' → ')} does not finish at an ${context.h.kindLabel('END')} card.`,
      suggestion: `Complete the branch up to an ${context.h.kindLabel('END')} card.`,
    }),
    MISSING_REQUIRED_DATA: ({ p, h }) => {
      const facts = p.strs('facts');
      return {
        message: `${h.card(p.num('markerId'), p.str('kind'))} needs ${h.list(facts.map((f) => h.fact(f)))}, but no earlier step on its path provides ${facts.length === 1 ? 'it' : 'them'}.`,
        suggestion: `Place ${h.list(p.strs('producers').map((k) => h.kindLabel(k)))} earlier on the same path.`,
      };
    },
  },
  ui: {
    listLabel: 'Diagnostics',
    empty: 'No diagnostics.',
    cards: 'Cards',
    cells: 'Cells (row,col)',
    affects: (targets) => `Affects ${targets}. Usually a consequence of the errors above.`,
    elements: (count) => `${count} items`,
    showAll: (count) => `Show the ${count} messages`,
    originalSpanish: 'original text in Spanish',
  },
};

const it: DiagnosticsMessages = {
  titles: {
    BOARD_FIDUCIAL_MISSING: 'Manca un marcatore d’angolo del tabellone',
    DUPLICATE_FIDUCIAL: 'Marcatore d’angolo ripetuto',
    HOMOGRAPHY_DEGENERATE: 'Impossibile calibrare la prospettiva',
    NO_MARKERS_FOUND: 'Nessun marcatore trovato',
    TOO_MANY_MARKERS: 'Troppi marcatori nell’immagine',
    MARKER_SIZE_MISMATCH: 'Dimensione della carta inattesa',
    AMBIGUOUS_POSITION: 'Carta tra due caselle',
    AMBIGUOUS_ORIENTATION: 'Orientamento ambiguo',
    CARD_NOT_IN_CELL: 'Carta fuori dalla griglia',
    UNKNOWN_CARD: 'Carta sconosciuta',
    INVALID_BOARD_STATE: 'Stato del tabellone non valido',
    BOARD_DIMENSIONS_MISMATCH: 'Dimensioni del tabellone errate',
    BOARD_NOT_CALIBRATED: 'Tabellone non calibrato',
    CARD_COLLISION: 'Due carte nella stessa casella',
    DUPLICATE_INSTANCE: 'Carta duplicata',
    MISSING_START: 'Manca la carta INIZIO',
    MULTIPLE_STARTS: 'C’è più di una carta INIZIO',
    MISSING_END: 'Manca una carta FINE',
    DANGLING_OUTPUT: 'Uscita senza carta ricevente',
    INCOMPATIBLE_PORTS: 'Collegamento con orientamento incompatibile',
    MULTIPLE_INPUTS: 'Carta con più di un ingresso',
    UNREACHABLE_NODE: 'Carta non raggiungibile da INIZIO',
    CYCLE_UNSUPPORTED: 'Ciclo non supportato',
    NONTERMINATING_PATH: 'Percorso che non termina in FINE',
    BRANCH_TARGETS_IDENTICAL: 'I due rami arrivano alla stessa carta',
    MISSING_REQUIRED_DATA: 'Mancano dati richiesti',
    INVALID_PARAMETER: 'Parametro non valido',
    UNUSED_PARAMETER: 'Parametro senza carta',
    INPUT_NOT_SELECTED: 'Documento di input non selezionato',
    TOO_MANY_NODES: 'Troppe carte',
    IR_INVALID: 'Programma non valido',
    IR_HASH_MISMATCH: 'L’hash del programma non corrisponde',
    UNSUPPORTED_FILE_TYPE: 'Tipo di file non supportato',
    UNSAFE_FILE_PATH: 'Percorso di file non sicuro',
    FILE_NOT_FOUND: 'File non trovato',
    FILE_TOO_LARGE: 'File troppo grande',
    FILE_CHANGED: 'Il file è cambiato dopo l’approvazione',
    PDF_NO_TEXT_LAYER: 'PDF senza livello di testo',
    EXTRACTION_FAILED: 'Impossibile estrarre il testo',
    OUTPUT_TOO_LARGE: 'Output troppo grande',
    RUN_TIMEOUT: 'Superato il tempo massimo di esecuzione',
    RUN_CANCELLED: 'Esecuzione annullata',
    NODE_LIMIT_EXCEEDED: 'Superato il limite di nodi',
    PRECONDITION_FAILED: 'Precondizione non soddisfatta',
    INTERNAL_ERROR: 'Errore interno',
  },
  templates: {
    BOARD_FIDUCIAL_MISSING: ({ p, h }) => {
      const ids = p.nums('fiducials');
      const names = h.list(ids.map((id) => `${id} (${h.corner(id)})`));
      return {
        message: `${ids.length === 1 ? `Il marcatore d’angolo ${names} non è visibile` : `I marcatori d’angolo ${names} non sono visibili`}. Senza i 4 angoli non è possibile calibrare la prospettiva.`,
        suggestion: 'Assicurati che i quattro angoli del tabellone (ID 0–3) siano interamente visibili, senza ombre né riflessi.',
      };
    },
    DUPLICATE_FIDUCIAL: ({ p }) => ({
      message: `C’è più di un marcatore d’angolo con lo stesso ID: ${p.nums('fiducials').join(', ')}.`,
      suggestion: 'Usa un solo tabellone stampato nella foto.',
    }),
    HOMOGRAPHY_DEGENERATE: ({ p }) => {
      const detail: Record<string, () => string> = {
        mirrored: () => 'gli angoli appaiono in ordine invertito (immagine speculare?).',
        nonconvex: () => 'i quattro angoli non formano un quadrilatero convesso.',
        small: () => 'il tabellone occupa una superficie troppo piccola dell’immagine.',
        failed: () => 'non è stato possibile calcolare l’omografia.',
        degenerate: () => 'l’omografia è degenere.',
        reprojection: () => `errore di riproiezione di ${p.num('rmsMm').toFixed(1).replace('.', ',')} mm (massimo ${p.num('maxMm').toFixed(1).replace('.', ',')} mm).`,
      };
      const text = detail[p.str('reason')];
      if (!text) throw new MissingParamError('reason');
      return { message: `Impossibile calibrare il tabellone: ${text()}`, suggestion: 'Fotografa il tabellone intero, ben piatto e da un’angolazione più frontale.' };
    },
    NO_MARKERS_FOUND: () => ({
      message: 'Nessun marcatore ArUco trovato nell’immagine.',
      suggestion: 'Inquadra tutto il tabellone con una buona luce, senza riflessi, e acquisisci di nuovo.',
    }),
    TOO_MANY_MARKERS: ({ p }) => ({
      message: `Rilevati ${p.num('count')} marcatori (massimo ${p.num('max')}). L’immagine non viene elaborata.`,
      suggestion: 'Fotografa un solo tabellone Tactiloom.',
    }),
    MARKER_SIZE_MISMATCH: ({ p }) => {
      const id = p.num('markerId');
      switch (p.variant()) {
        case 'size':
          return {
            message: `Il marcatore #${id} misura ${p.num('sideMm').toFixed(1).replace('.', ',')} mm; ne erano attesi ${p.num('expectedMm').toFixed(0)}. Hai mescolato carte ridotte e tabellone A3?`,
            suggestion: 'Stampa tabellone e carte alla stessa scala.',
          };
        case 'sliverBoard':
          return { message: `È stato scartato un rilevamento non quadrato del marcatore #${id} (probabile falso positivo).` };
        case 'sliverImage':
          return { message: `È stato scartato un rilevamento deformato del marcatore #${id} (probabile falso positivo).` };
        default:
          throw new MissingParamError('variant');
      }
    },
    AMBIGUOUS_POSITION: ({ p, d, h }) => ({
      message: `La carta #${p.num('markerId')} (${h.kindLabel(p.str('kind'))}) si trova tra le caselle ${cellsOf(d, h)}.`,
      suggestion: 'Centrala in una sola casella e acquisisci di nuovo.',
    }),
    AMBIGUOUS_ORIENTATION: ({ p, h }) => ({
      message: `La carta #${p.num('markerId')} (${h.kindLabel(p.str('kind'))}) in ${h.cell(p.num('row'), p.num('col'))} è ruotata di ${p.num('deviation')}° rispetto a un asse: non si capisce se punta ${h.toward(p.str('lower'))} o ${h.toward(p.str('upper'))}.`,
      suggestion: 'Ruotala in modo che la freccia sia parallela ai bordi del tabellone.',
    }),
    CARD_NOT_IN_CELL: ({ p, h }) =>
      p.has('columns')
        ? { message: `${h.card(p.num('markerId'), p.str('kind'))} è fuori dalla griglia ${p.num('columns')}×${p.num('rows')}.`, suggestion: 'Posizionala dentro una casella del tabellone.' }
        : { message: `La carta #${p.num('markerId')} (${h.kindLabel(p.str('kind'))}) è fuori dalla griglia.`, suggestion: 'Posizionala completamente dentro una casella del tabellone.' },
    UNKNOWN_CARD: ({ p, h }) =>
      p.has('row')
        ? {
            message: `Il marcatore #${p.num('markerId')} in ${h.cell(p.num('row'), p.num('col'))} non è una carta del catalogo ${p.str('catalogVersion')}.`,
            suggestion: 'Rimuovila o usa una carta stampata con il kit ufficiale.',
          }
        : { message: `Il marcatore #${p.num('markerId')} non appartiene al catalogo cards-v1.`, suggestion: 'Rimuovi quella carta o usane una stampata con il kit ufficiale (ID 10–35).' },
    INVALID_BOARD_STATE: ({ p }) => ({
      message: `Lo stato del tabellone non rispetta il contratto tactiloom-board/1: ${p.str('issues')}`,
      suggestion: 'Analizza di nuovo l’immagine o ricarica il simulatore.',
    }),
    BOARD_DIMENSIONS_MISMATCH: ({ p }) => ({
      message: `Il tabellone dichiara ${p.num('columns')}×${p.num('rows')} caselle; board-v1 richiede ${p.num('expectedColumns')}×${p.num('expectedRows')}.`,
    }),
    BOARD_NOT_CALIBRATED: () => ({
      message: 'Il tabellone non è calibrato: non è possibile assegnare le carte alle caselle.',
      suggestion: 'Acquisisci di nuovo assicurandoti che si vedano i quattro marcatori d’angolo.',
    }),
    INVALID_PARAMETER: ({ p, h }) =>
      p.variant() === 'shape'
        ? { message: 'I parametri devono essere un oggetto { "<istanza>": { ... } } con id come "input-11".' }
        : { message: `Parametri non validi per ${h.card(p.num('markerId'), p.str('kind'))}: ${p.str('detail')}.`, suggestion: 'Correggi il valore nel pannello dei parametri.' },
    DUPLICATE_INSTANCE: ({ p, h }) => ({
      message: `${h.card(p.num('markerId'), p.str('kind'))} compare due volte: in ${h.cell(p.num('firstRow'), p.num('firstCol'))} e in ${h.cell(p.num('secondRow'), p.num('secondCol'))}.`,
      suggestion: 'Ogni carta fisica è unica: rimuovi la copia o usa un’altra carta dello stesso tipo (con un altro numero).',
    }),
    CARD_COLLISION: ({ p, h }) => ({
      message: `${h.card(p.num('markerA'), p.str('kindA'))} e ${h.card(p.num('markerB'), p.str('kindB'))} occupano la stessa casella ${h.cell(p.num('row'), p.num('col'))}.`,
      suggestion: 'Lascia una sola carta per casella.',
    }),
    TOO_MANY_NODES: ({ p }) => ({ message: `Ci sono ${p.num('count')} carte; il massimo per flusso è ${p.num('max')}.` }),
    DANGLING_OUTPUT: ({ p, h }) => {
      const card = h.card(p.num('markerId'), p.str('kind'));
      const port = h.port(p.str('port'));
      const where = h.cell(p.num('row'), p.num('col'));
      const toward = h.toward(p.str('direction'));
      if (p.variant() === 'outside') {
        return { message: `L’${port} di ${card} in ${where} punta ${toward}, fuori dal tabellone.`, suggestion: `Ruota ${card} in modo che la sua ${port} punti verso l’interno del tabellone.` };
      }
      const target = h.cell(p.num('targetRow'), p.num('targetCol'));
      return {
        message: `L’${port} di ${card} in ${where} punta ${toward}, ma la casella ${target} è vuota.`,
        suggestion: `Metti la carta successiva in ${target} con la freccia ${toward}, oppure ruota ${card}.`,
      };
    },
    INCOMPATIBLE_PORTS: ({ p, h }) => {
      if (p.variant() === 'nodeNoInput') return { message: `${h.card(p.num('markerId'), p.str('kind'))} non accetta ingressi.` };
      const from = h.card(p.num('fromMarker'), p.str('fromKind'));
      const to = h.card(p.num('toMarker'), p.str('toKind'));
      const port = h.port(p.str('port'));
      if (p.variant() === 'noInput') return { message: `L’${port} di ${from} arriva a ${to}, che non accetta ingressi.`, suggestion: `Sposta ${to} oppure ruota ${from}.` };
      return {
        message: `L’${port} di ${from} arriva a ${to} dal lato ${h.side(p.str('arrivingSide'))}, ma quella carta riceve dal lato ${h.side(p.str('expectedSide'))}.`,
        suggestion: `Ruota ${to} in modo che la freccia punti ${h.toward(p.str('direction'))}.`,
      };
    },
    INPUT_NOT_SELECTED: ({ p, h }) => ({ message: `${h.card(p.num('markerId'), p.str('kind'))} non ha ancora un documento: sceglilo prima di rivedere ed eseguire.` }),
    UNUSED_PARAMETER: ({ p }) => ({ message: `Ci sono parametri per «${p.str('instanceId')}», ma quella carta non è sul tabellone; vengono ignorati.` }),
    IR_INVALID: ({ p, h }) => {
      switch (p.variant()) {
        case 'edgeRefs':
          return { message: `L’arco ${p.str('from')} → ${p.str('to')} fa riferimento a nodi inesistenti.` };
        case 'duplicatePort':
          return { message: `${h.card(p.num('markerId'), p.str('kind'))} non può avere due archi sulla porta ${p.str('port')}.` };
        case 'undeclaredPort':
          return { message: `${h.card(p.num('markerId'), p.str('kind'))} non può avere un arco sulla porta ${p.str('port')}.` };
        default:
          throw new MissingParamError('variant');
      }
    },
    MISSING_START: ({ h }) => ({ message: `Non c’è nessuna carta ${h.kindLabel('START')} sul tabellone.`, suggestion: `Metti una carta ${h.kindLabel('START')} all’inizio del flusso.` }),
    MULTIPLE_STARTS: ({ p, h }) => ({
      message: `Ci sono ${p.num('count')} carte ${h.kindLabel('START')}; un flusso v1 ne ha esattamente una.`,
      suggestion: `Rimuovi le carte ${h.kindLabel('START')} in eccesso.`,
    }),
    MISSING_END: ({ h }) => ({
      message: `Non c’è nessuna carta ${h.kindLabel('END')}: ogni percorso deve terminare in ${h.kindLabel('END')}.`,
      suggestion: `Metti una carta ${h.kindLabel('END')} alla fine di ogni ramo.`,
    }),
    MULTIPLE_INPUTS: ({ p, h }) => ({ message: `${h.card(p.num('markerId'), p.str('kind'))} riceve ${p.num('count')} ingressi; la v1 ne accetta solo uno (non esiste MERGE).` }),
    BRANCH_TARGETS_IDENTICAL: ({ p, h }) => ({ message: `I rami ${h.branch('TRUE')} e ${h.branch('FALSE')} di ${h.card(p.num('markerId'), p.str('kind'))} arrivano alla stessa carta.` }),
    CYCLE_UNSUPPORTED: (context) => ({
      message: `Le carte ${context.h.list(chainOf(context, 'markers'))} formano un ciclo; la v1 non supporta i cicli.`,
      suggestion: 'Interrompi il ciclo ruotando o rimuovendo una di quelle carte.',
    }),
    UNREACHABLE_NODE: (context) => {
      const where = at(context);
      return {
        message: `${context.h.card(context.p.num('markerId'), context.p.str('kind'))}${where ? ` in ${where}` : ''} non è collegata a ${context.h.kindLabel('START')}.`,
        suggestion: 'Collegala alla catena: deve stare nella casella vicina verso cui punta la carta precedente e guardare nella stessa direzione.',
      };
    },
    NONTERMINATING_PATH: (context) => ({
      message: `Il percorso ${chainOf(context, 'markers').join(' → ')} non termina in una carta ${context.h.kindLabel('END')}.`,
      suggestion: `Completa il ramo fino a una carta ${context.h.kindLabel('END')}.`,
    }),
    MISSING_REQUIRED_DATA: ({ p, h }) => {
      const facts = p.strs('facts');
      return {
        message: `${h.card(p.num('markerId'), p.str('kind'))} ha bisogno di: ${h.list(facts.map((f) => h.fact(f)))}, ma nessun passo precedente del suo percorso fornisce ${facts.length === 1 ? 'questo dato' : 'questi dati'}.`,
        suggestion: `Metti prima ${h.list(p.strs('producers').map((k) => h.kindLabel(k)))} nello stesso percorso.`,
      };
    },
  },
  ui: {
    listLabel: 'Diagnostica',
    empty: 'Nessuna diagnostica.',
    cards: 'Carte',
    cells: 'Caselle (riga,colonna)',
    affects: (targets) => `Riguarda ${targets}. Di solito è una conseguenza degli errori precedenti.`,
    elements: (count) => `${count} elementi`,
    showAll: (count) => `Mostra i ${count} messaggi`,
    originalSpanish: 'testo originale in spagnolo',
  },
};

const fr: DiagnosticsMessages = {
  titles: {
    BOARD_FIDUCIAL_MISSING: 'Un marqueur de coin du plateau manque',
    DUPLICATE_FIDUCIAL: 'Marqueur de coin répété',
    HOMOGRAPHY_DEGENERATE: 'Impossible de calibrer la perspective',
    NO_MARKERS_FOUND: 'Aucun marqueur trouvé',
    TOO_MANY_MARKERS: 'Trop de marqueurs dans l’image',
    MARKER_SIZE_MISMATCH: 'Taille de carte inattendue',
    AMBIGUOUS_POSITION: 'Carte entre deux cases',
    AMBIGUOUS_ORIENTATION: 'Orientation ambiguë',
    CARD_NOT_IN_CELL: 'Carte hors de la grille',
    UNKNOWN_CARD: 'Carte inconnue',
    INVALID_BOARD_STATE: 'État du plateau invalide',
    BOARD_DIMENSIONS_MISMATCH: 'Dimensions du plateau incorrectes',
    BOARD_NOT_CALIBRATED: 'Plateau non calibré',
    CARD_COLLISION: 'Deux cartes dans la même case',
    DUPLICATE_INSTANCE: 'Carte en double',
    MISSING_START: 'La carte DÉBUT manque',
    MULTIPLE_STARTS: 'Plus d’une carte DÉBUT',
    MISSING_END: 'Une carte FIN manque',
    DANGLING_OUTPUT: 'Sortie sans carte réceptrice',
    INCOMPATIBLE_PORTS: 'Connexion d’orientation incompatible',
    MULTIPLE_INPUTS: 'Carte avec plus d’une entrée',
    UNREACHABLE_NODE: 'Carte injoignable depuis DÉBUT',
    CYCLE_UNSUPPORTED: 'Cycle non pris en charge',
    NONTERMINATING_PATH: 'Chemin qui ne se termine pas par FIN',
    BRANCH_TARGETS_IDENTICAL: 'Les deux branches arrivent sur la même carte',
    MISSING_REQUIRED_DATA: 'Données requises manquantes',
    INVALID_PARAMETER: 'Paramètre invalide',
    UNUSED_PARAMETER: 'Paramètre sans carte',
    INPUT_NOT_SELECTED: 'Aucun document d’entrée sélectionné',
    TOO_MANY_NODES: 'Trop de cartes',
    IR_INVALID: 'Programme invalide',
    IR_HASH_MISMATCH: 'Le hash du programme ne correspond pas',
    UNSUPPORTED_FILE_TYPE: 'Type de fichier non pris en charge',
    UNSAFE_FILE_PATH: 'Chemin de fichier non sûr',
    FILE_NOT_FOUND: 'Fichier introuvable',
    FILE_TOO_LARGE: 'Fichier trop volumineux',
    FILE_CHANGED: 'Le fichier a changé depuis l’approbation',
    PDF_NO_TEXT_LAYER: 'PDF sans couche texte',
    EXTRACTION_FAILED: 'Impossible d’extraire le texte',
    OUTPUT_TOO_LARGE: 'Sortie trop volumineuse',
    RUN_TIMEOUT: 'Durée maximale d’exécution dépassée',
    RUN_CANCELLED: 'Exécution annulée',
    NODE_LIMIT_EXCEEDED: 'Limite de nœuds dépassée',
    PRECONDITION_FAILED: 'Précondition non satisfaite',
    INTERNAL_ERROR: 'Erreur interne',
  },
  templates: {
    BOARD_FIDUCIAL_MISSING: ({ p, h }) => {
      const ids = p.nums('fiducials');
      const names = h.list(ids.map((id) => `${id} (${h.corner(id)})`));
      return {
        message: `${ids.length === 1 ? `Le marqueur de coin ${names} n’est pas visible` : `Les marqueurs de coin ${names} ne sont pas visibles`}. Sans les 4 coins, la perspective ne peut pas être calibrée.`,
        suggestion: 'Vérifiez que les quatre coins du plateau (ID 0–3) sont entièrement visibles, sans ombre ni reflet.',
      };
    },
    DUPLICATE_FIDUCIAL: ({ p }) => ({
      message: `Plusieurs marqueurs de coin portent le même ID : ${p.nums('fiducials').join(', ')}.`,
      suggestion: 'Utilisez un seul plateau imprimé sur la photo.',
    }),
    HOMOGRAPHY_DEGENERATE: ({ p }) => {
      const detail: Record<string, () => string> = {
        mirrored: () => 'les coins apparaissent dans l’ordre inverse (image en miroir ?).',
        nonconvex: () => 'les quatre coins ne forment pas un quadrilatère convexe.',
        small: () => 'le plateau occupe une surface trop petite de l’image.',
        failed: () => 'l’homographie n’a pas pu être calculée.',
        degenerate: () => 'l’homographie est dégénérée.',
        reprojection: () => `erreur de reprojection de ${p.num('rmsMm').toFixed(1).replace('.', ',')} mm (maximum ${p.num('maxMm').toFixed(1).replace('.', ',')} mm).`,
      };
      const text = detail[p.str('reason')];
      if (!text) throw new MissingParamError('reason');
      return { message: `Impossible de calibrer le plateau : ${text()}`, suggestion: 'Photographiez le plateau entier, bien à plat et sous un angle plus frontal.' };
    },
    NO_MARKERS_FOUND: () => ({
      message: 'Aucun marqueur ArUco n’a été trouvé dans l’image.',
      suggestion: 'Cadrez tout le plateau avec une bonne lumière, sans reflets, puis recommencez la capture.',
    }),
    TOO_MANY_MARKERS: ({ p }) => ({
      message: `${p.num('count')} marqueurs détectés (maximum ${p.num('max')}). L’image n’est pas traitée.`,
      suggestion: 'Photographiez un seul plateau Tactiloom.',
    }),
    MARKER_SIZE_MISMATCH: ({ p }) => {
      const id = p.num('markerId');
      switch (p.variant()) {
        case 'size':
          return {
            message: `Le marqueur #${id} mesure ${p.num('sideMm').toFixed(1).replace('.', ',')} mm ; ${p.num('expectedMm').toFixed(0)} mm étaient attendus. Avez-vous mélangé des cartes réduites et le plateau A3 ?`,
            suggestion: 'Imprimez le plateau et les cartes à la même échelle.',
          };
        case 'sliverBoard':
          return { message: `Une détection non carrée du marqueur #${id} a été écartée (probablement un faux positif).` };
        case 'sliverImage':
          return { message: `Une détection déformée du marqueur #${id} a été écartée (probablement un faux positif).` };
        default:
          throw new MissingParamError('variant');
      }
    },
    AMBIGUOUS_POSITION: ({ p, d, h }) => ({
      message: `La carte #${p.num('markerId')} (${h.kindLabel(p.str('kind'))}) se trouve entre les cases ${cellsOf(d, h)}.`,
      suggestion: 'Centrez-la dans une seule case et recommencez la capture.',
    }),
    AMBIGUOUS_ORIENTATION: ({ p, h }) => ({
      message: `La carte #${p.num('markerId')} (${h.kindLabel(p.str('kind'))}) en ${h.cell(p.num('row'), p.num('col'))} est tournée de ${p.num('deviation')}° par rapport à un axe : impossible de savoir si elle pointe ${h.toward(p.str('lower'))} ou ${h.toward(p.str('upper'))}.`,
      suggestion: 'Tournez-la pour que sa flèche soit parallèle aux bords du plateau.',
    }),
    CARD_NOT_IN_CELL: ({ p, h }) =>
      p.has('columns')
        ? { message: `${h.card(p.num('markerId'), p.str('kind'))} est hors de la grille ${p.num('columns')}×${p.num('rows')}.`, suggestion: 'Placez-la dans une case du plateau.' }
        : { message: `La carte #${p.num('markerId')} (${h.kindLabel(p.str('kind'))}) est hors de la grille.`, suggestion: 'Placez-la entièrement dans une case du plateau.' },
    UNKNOWN_CARD: ({ p, h }) =>
      p.has('row')
        ? {
            message: `Le marqueur #${p.num('markerId')} en ${h.cell(p.num('row'), p.num('col'))} n’est pas une carte du catalogue ${p.str('catalogVersion')}.`,
            suggestion: 'Retirez-la ou utilisez une carte imprimée avec le kit officiel.',
          }
        : { message: `Le marqueur #${p.num('markerId')} n’appartient pas au catalogue cards-v1.`, suggestion: 'Retirez cette carte ou utilisez-en une imprimée avec le kit officiel (ID 10–35).' },
    INVALID_BOARD_STATE: ({ p }) => ({
      message: `L’état du plateau ne respecte pas le contrat tactiloom-board/1 : ${p.str('issues')}`,
      suggestion: 'Analysez de nouveau l’image ou rechargez le simulateur.',
    }),
    BOARD_DIMENSIONS_MISMATCH: ({ p }) => ({
      message: `Le plateau déclare ${p.num('columns')}×${p.num('rows')} cases ; board-v1 exige ${p.num('expectedColumns')}×${p.num('expectedRows')}.`,
    }),
    BOARD_NOT_CALIBRATED: () => ({
      message: 'Le plateau n’est pas calibré : impossible d’affecter chaque carte à une case.',
      suggestion: 'Recommencez la capture en vérifiant que les quatre marqueurs de coin sont visibles.',
    }),
    INVALID_PARAMETER: ({ p, h }) =>
      p.variant() === 'shape'
        ? { message: 'Les paramètres doivent être un objet { "<instance>": { ... } } avec des id comme "input-11".' }
        : { message: `Paramètres invalides pour ${h.card(p.num('markerId'), p.str('kind'))} : ${p.str('detail')}.`, suggestion: 'Corrigez la valeur dans le panneau des paramètres.' },
    DUPLICATE_INSTANCE: ({ p, h }) => ({
      message: `${h.card(p.num('markerId'), p.str('kind'))} apparaît deux fois : en ${h.cell(p.num('firstRow'), p.num('firstCol'))} et en ${h.cell(p.num('secondRow'), p.num('secondCol'))}.`,
      suggestion: 'Chaque carte physique est unique : retirez la copie ou utilisez une autre carte du même type (autre numéro).',
    }),
    CARD_COLLISION: ({ p, h }) => ({
      message: `${h.card(p.num('markerA'), p.str('kindA'))} et ${h.card(p.num('markerB'), p.str('kindB'))} occupent la même case ${h.cell(p.num('row'), p.num('col'))}.`,
      suggestion: 'Laissez une seule carte par case.',
    }),
    TOO_MANY_NODES: ({ p }) => ({ message: `Il y a ${p.num('count')} cartes ; le maximum par flux est de ${p.num('max')}.` }),
    DANGLING_OUTPUT: ({ p, h }) => {
      const card = h.card(p.num('markerId'), p.str('kind'));
      const port = h.port(p.str('port'));
      const where = h.cell(p.num('row'), p.num('col'));
      const toward = h.toward(p.str('direction'));
      if (p.variant() === 'outside') {
        return { message: `La ${port} de ${card} en ${where} pointe ${toward}, hors du plateau.`, suggestion: `Tournez ${card} pour que sa ${port} pointe vers l’intérieur du plateau.` };
      }
      const target = h.cell(p.num('targetRow'), p.num('targetCol'));
      return {
        message: `La ${port} de ${card} en ${where} pointe ${toward}, mais la case ${target} est vide.`,
        suggestion: `Placez la carte suivante en ${target}, flèche ${toward}, ou tournez ${card}.`,
      };
    },
    INCOMPATIBLE_PORTS: ({ p, h }) => {
      if (p.variant() === 'nodeNoInput') return { message: `${h.card(p.num('markerId'), p.str('kind'))} n’accepte pas d’entrée.` };
      const from = h.card(p.num('fromMarker'), p.str('fromKind'));
      const to = h.card(p.num('toMarker'), p.str('toKind'));
      const port = h.port(p.str('port'));
      if (p.variant() === 'noInput') return { message: `La ${port} de ${from} arrive sur ${to}, qui n’accepte pas d’entrée.`, suggestion: `Déplacez ${to} ou tournez ${from}.` };
      return {
        message: `La ${port} de ${from} arrive sur ${to} par son côté ${h.side(p.str('arrivingSide'))}, mais cette carte reçoit par son côté ${h.side(p.str('expectedSide'))}.`,
        suggestion: `Tournez ${to} pour que sa flèche pointe ${h.toward(p.str('direction'))}.`,
      };
    },
    INPUT_NOT_SELECTED: ({ p, h }) => ({ message: `${h.card(p.num('markerId'), p.str('kind'))} n’a pas encore de document : choisissez-le avant de vérifier et d’exécuter.` }),
    UNUSED_PARAMETER: ({ p }) => ({ message: `Il existe des paramètres pour « ${p.str('instanceId')} », mais cette carte n’est pas sur le plateau ; ils sont ignorés.` }),
    IR_INVALID: ({ p, h }) => {
      switch (p.variant()) {
        case 'edgeRefs':
          return { message: `L’arête ${p.str('from')} → ${p.str('to')} référence des nœuds inexistants.` };
        case 'duplicatePort':
          return { message: `${h.card(p.num('markerId'), p.str('kind'))} ne peut pas avoir deux arêtes sur le port ${p.str('port')}.` };
        case 'undeclaredPort':
          return { message: `${h.card(p.num('markerId'), p.str('kind'))} ne peut pas avoir d’arête sur le port ${p.str('port')}.` };
        default:
          throw new MissingParamError('variant');
      }
    },
    MISSING_START: ({ h }) => ({ message: `Il n’y a aucune carte ${h.kindLabel('START')} sur le plateau.`, suggestion: `Placez une carte ${h.kindLabel('START')} au début du flux.` }),
    MULTIPLE_STARTS: ({ p, h }) => ({
      message: `Il y a ${p.num('count')} cartes ${h.kindLabel('START')} ; un flux v1 en a exactement une.`,
      suggestion: `Retirez les cartes ${h.kindLabel('START')} en trop.`,
    }),
    MISSING_END: ({ h }) => ({
      message: `Il n’y a aucune carte ${h.kindLabel('END')} : chaque chemin doit se terminer par ${h.kindLabel('END')}.`,
      suggestion: `Placez une carte ${h.kindLabel('END')} au bout de chaque branche.`,
    }),
    MULTIPLE_INPUTS: ({ p, h }) => ({ message: `${h.card(p.num('markerId'), p.str('kind'))} reçoit ${p.num('count')} entrées ; la v1 n’en accepte qu’une (MERGE n’existe pas).` }),
    BRANCH_TARGETS_IDENTICAL: ({ p, h }) => ({ message: `Les branches ${h.branch('TRUE')} et ${h.branch('FALSE')} de ${h.card(p.num('markerId'), p.str('kind'))} arrivent sur la même carte.` }),
    CYCLE_UNSUPPORTED: (context) => ({
      message: `Les cartes ${context.h.list(chainOf(context, 'markers'))} forment un cycle ; la v1 n’accepte pas les boucles.`,
      suggestion: 'Cassez le cycle en tournant ou en retirant l’une de ces cartes.',
    }),
    UNREACHABLE_NODE: (context) => {
      const where = at(context);
      return {
        message: `${context.h.card(context.p.num('markerId'), context.p.str('kind'))}${where ? ` en ${where}` : ''} n’est pas reliée à ${context.h.kindLabel('START')}.`,
        suggestion: 'Reliez-la à la chaîne : elle doit se trouver dans la case voisine vers laquelle pointe la carte précédente, orientée dans la même direction.',
      };
    },
    NONTERMINATING_PATH: (context) => ({
      message: `Le chemin ${chainOf(context, 'markers').join(' → ')} ne se termine pas par une carte ${context.h.kindLabel('END')}.`,
      suggestion: `Complétez la branche jusqu’à une carte ${context.h.kindLabel('END')}.`,
    }),
    MISSING_REQUIRED_DATA: ({ p, h }) => {
      const facts = p.strs('facts');
      return {
        message: `${h.card(p.num('markerId'), p.str('kind'))} a besoin de : ${h.list(facts.map((f) => h.fact(f)))}, mais aucune étape précédente de son chemin ne ${facts.length === 1 ? 'fournit cette donnée' : 'fournit ces données'}.`,
        suggestion: `Placez avant ${h.list(p.strs('producers').map((k) => h.kindLabel(k)))} sur le même chemin.`,
      };
    },
  },
  ui: {
    listLabel: 'Diagnostics',
    empty: 'Aucun diagnostic.',
    cards: 'Cartes',
    cells: 'Cases (ligne,colonne)',
    affects: (targets) => `Concerne ${targets}. C’est généralement une conséquence des erreurs précédentes.`,
    elements: (count) => `${count} éléments`,
    showAll: (count) => `Voir les ${count} messages`,
    originalSpanish: 'texte original en espagnol',
  },
};

const es: DiagnosticsMessages = {
  titles: DIAGNOSTIC_TITLES_ES,
  templates: {},
  ui: {
    listLabel: 'Diagnósticos',
    empty: 'Sin diagnósticos.',
    cards: 'Tarjetas',
    cells: 'Casillas (fila,col)',
    affects: (targets) => `Afecta a ${targets}. Suele ser consecuencia de los errores anteriores.`,
    elements: (count) => `${count} elementos`,
    showAll: (count) => `Ver los ${count} mensajes`,
    originalSpanish: 'texto original en español',
  },
};

export const diagnostics: Readonly<Record<Locale, DiagnosticsMessages>> = { es, en, it, fr };
