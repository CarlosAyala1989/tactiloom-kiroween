import type { Locale, Orientation } from '@tactiloom/contracts';
import { common } from './common';

/** Board Studio, camera capture, detection panel, virtual board and simulator. Spanish is the source of truth; en/it/fr mirror every key. */

interface Cell {
  readonly row: number;
  readonly col: number;
}

/** Board coordinates as printed everywhere in the UI: "(row,col)". */
const at = (cell: Cell) => `(${cell.row},${cell.col})`;

/** "a, b and c" with the given last joiner (Spanish keeps its pre-i18n " y " between every item). */
const joinLast = (items: readonly string[], last: string) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')}${last}${items.at(-1) ?? ''}`);

/** Directions with arrows ("este →") from the shared dictionary. */
const arrows = (locale: Locale) => common[locale].orientation;

/** French needs the article before a direction: "vers l’est →", "du nord ↑". */
const FR_TOWARD: Readonly<Record<Orientation, string>> = {
  N: `vers le ${arrows('fr').N}`,
  E: `vers l’${arrows('fr').E}`,
  S: `vers le ${arrows('fr').S}`,
  W: `vers l’${arrows('fr').W}`,
};
const FR_FROM: Readonly<Record<Orientation, string>> = {
  N: `du ${arrows('fr').N}`,
  E: `de l’${arrows('fr').E}`,
  S: `du ${arrows('fr').S}`,
  W: `de l’${arrows('fr').W}`,
};

const es = {
  /** Board Studio page (app/studio). */
  page: {
    title: 'Board Studio',
    /** Intro paragraph: `before` [simulator link] `or` [gallery link] `after`. */
    intro: {
      before:
        'Fotografía el tablero impreso o sube una imagen. El servidor detecta los marcadores ArUco desde los píxeles con OpenCV, calibra la perspectiva con las 4 esquinas y asigna cada tarjeta a su casilla y orientación. ¿Sin hardware? Usa el',
      simulator: 'simulador digital',
      or: 'o la',
      gallery: 'galería',
      after: '.',
    },
    sourceTabs: 'Fuente del tablero',
    cameraTitle: 'Captura con cámara',
    imageTitle: 'Imagen del tablero',
    uploadLabel: 'Subir foto (JPG, PNG o WEBP, máx. 12 MB)',
    uploadNote: 'La imagen se procesa con exactamente el mismo algoritmo que la cámara; no se guarda.',
    scenarioLabel: 'o analiza un ejemplo de la galería (imagen sintética)',
    scenarioPlaceholder: '— elegir escenario —',
    detectionTitle: 'Lectura del tablero (OpenCV)',
    compileTitle: 'Programa compilado',
    analyzeFailed: 'No se pudo analizar la imagen.',
  },
  /** Physical changes between two consecutive captures. */
  diff: {
    noChanges: (unchanged: number) => `Sin cambios físicos respecto a la captura anterior (${unchanged === 1 ? '1 tarjeta igual' : `${unchanged} tarjetas iguales`}).`,
    title: 'Cambios desde la captura anterior',
    added: (markerId: number, cell: Cell) => `+ #${markerId} añadida en ${at(cell)}`,
    removed: (markerId: number, cell: Cell) => `− #${markerId} retirada de ${at(cell)}`,
    moved: (markerId: number, from: Cell, to: Cell) => `↦ #${markerId} movida de ${at(from)} a ${at(to)}`,
    rotated: (markerId: number, from: Orientation, to: Orientation) => `↻ #${markerId} girada de ${arrows('es')[from]} a ${arrows('es')[to]}`,
  },
  camera: {
    tips: {
      framing: 'Coloca la cámara lo más perpendicular posible al tablero, con todo el tablero en el encuadre.',
      light: 'Luz difusa, sin reflejos sobre los marcadores; las 4 esquinas (ID 0–3) deben verse completas.',
      safety: 'Mover tarjetas nunca ejecuta nada: después de capturar, compilas, revisas y apruebas.',
    },
    previewLabel: 'Vista previa de la cámara',
    off: 'La cámara está apagada.',
    errors: {
      unsupported: 'Este navegador no permite usar la cámara (se requiere HTTPS o localhost). Sube una foto en la pestaña Imagen.',
      denied: 'Permiso de cámara denegado. Puedes concederlo en el navegador o subir una foto del tablero.',
      notFound: 'No se encontró ninguna cámara. Sube una foto del tablero o usa la galería.',
      failed: 'No se pudo abrir la cámara. Sube una foto del tablero.',
    },
  },
  /** What OpenCV read from the pixels. */
  detection: {
    /** `errorMm` is already formatted for the UI language. */
    calibrated: (errorMm: string) => `Calibrado (error ${errorMm} mm)`,
    uncalibrated: 'Sin calibrar',
    cardsRecognized: (count: number) => (count === 1 ? '1 tarjeta reconocida' : `${count} tarjetas reconocidas`),
    readErrors: (count: number) => (count === 1 ? '1 error de lectura' : `${count} errores de lectura`),
    corners: (ids: string) => `Esquinas: ${ids}`,
    latencyTitle: 'Latencia total del análisis en el servidor',
    overlayAlt: (cards: number, calibrated: boolean) =>
      `Superposición de la detección: ${cards === 1 ? '1 tarjeta' : `${cards} tarjetas`}, tablero ${calibrated ? 'calibrado' : 'sin calibrar'}`,
    overlayNote:
      'La superposición se dibuja con la misma salida del detector (esquinas, cuadrícula proyectada, flechas de orientación). La foto no se guarda: solo su sha256 y el JSON de detección.',
    tableCaption: 'Tarjetas leídas desde los píxeles',
    columns: {
      marker: 'Marcador',
      kind: 'Tipo',
      cell: 'Casilla',
      orientation: 'Orientación',
      deviation: 'Desviación',
      quality: 'Calidad*',
      qualityTitle: 'Heurística geométrica (centrado, ángulo, tamaño); no es una probabilidad',
    },
    noCards: 'Ninguna tarjeta asignada a una casilla.',
    qualityNote: '*Calidad = mínimo de centrado en la casilla, alineación angular y tamaño esperado. Heurística documentada, no probabilidad.',
    rejectedTitle: 'Marcadores no asignados',
    /** `cells` are already formatted as "(row,col)". */
    candidateCells: (cells: readonly string[]) => ` · casillas candidatas ${cells.join(' y ')}`,
    noProblems: 'Lectura del tablero sin problemas.',
  },
  /** 8×4 grid shared by the simulator (accessible names of the cells and visual headers). */
  board: {
    colHeader: (col: number) => `col ${col}`,
    rowHeader: (row: number) => `F${row}`,
    emptyCell: (row: number, col: number) => `Casilla fila ${row}, columna ${col}: vacía`,
    cardCell: (row: number, col: number, markerId: number, kind: string, orientation: Orientation) =>
      `Casilla fila ${row}, columna ${col}: tarjeta #${markerId} ${kind}, apunta al ${arrows('es')[orientation]}`,
    conditionHint: '; SÍ sigue la flecha, NO gira a la derecha',
    withError: ' (con error)',
  },
  simulator: {
    title: 'Simulador del tablero',
    /** Intro paragraph: `before` <strong>`strong`</strong> `after`. */
    intro: {
      before: 'Coloca tarjetas virtuales sobre la misma cuadrícula 8×4. Este modo construye el estado del tablero digitalmente (no hay detección por cámara), pero usa ',
      strong: 'el mismo compilador y el mismo worker',
      after: ' que las fotos.',
    },
    boardTitle: 'Tablero virtual',
    officialExample: 'Ejemplo oficial (2 ramas)',
    linearExample: 'Flujo lineal',
    boardCaption: 'Tablero virtual de 8 columnas por 4 filas',
    /** Key names as printed on local keyboards (the handlers read `R`, `Delete`/`Backspace` and Shift+arrows). */
    keys: { rotate: 'R', remove: 'Supr', move: 'Mayús' },
    /** Keyboard hint: `intro` <kbd>rotate</kbd>`rotate` <kbd>remove</kbd>`remove` <kbd>move</kbd>`move`. */
    hint: {
      intro: 'Ratón: elige una tarjeta de la paleta y pulsa una casilla, o arrástrala. Teclado: Tab hasta una casilla con tarjeta · ',
      rotate: ' gira · ',
      remove: ' quita · ',
      move: '+flechas mueve.',
    },
    /** "Selected: <strong>#12</strong> details". */
    selected: {
      label: 'Seleccionada:',
      details: (kind: string, row: number, col: number, orientation: Orientation) => `${kind} en (${row},${col}), apunta al ${arrows('es')[orientation]}`,
    },
    paletteTitle: 'Paleta de tarjetas',
    paletteNote: 'Tarjetas del catálogo cards-v1 que no están en el tablero.',
    pickCard: (markerId: number, kind: string) => `Elegir tarjeta #${markerId} ${kind}`,
    compileTitle: 'Compilación en vivo',
    /** Screen-reader announcements (aria-live). */
    announce: {
      occupied: (row: number, col: number, markerId: number) => `La casilla (${row},${col}) ya tiene la tarjeta #${markerId}.`,
      placed: (markerId: number, row: number, col: number) => `Tarjeta #${markerId} colocada en (${row},${col}).`,
      rotated: (markerId: number, orientation: Orientation) => `Tarjeta #${markerId} ahora apunta al ${arrows('es')[orientation]}.`,
      removed: (markerId: number) => `Tarjeta #${markerId} retirada del tablero.`,
      selected: (markerId: number) => `Seleccionada #${markerId}. R gira, Supr quita, flechas mueven.`,
      picked: (markerId: number) => `Elegida #${markerId}. Ahora pulsa una casilla vacía.`,
    },
  },
};

export type StudioMessages = typeof es;

const en: StudioMessages = {
  page: {
    title: 'Board Studio',
    intro: {
      before:
        'Photograph the printed board or upload an image. The server detects the ArUco markers from the pixels with OpenCV, calibrates the perspective with the 4 corners and assigns each card to its cell and orientation. No hardware? Use the',
      simulator: 'digital simulator',
      or: 'or the',
      gallery: 'gallery',
      after: '.',
    },
    sourceTabs: 'Board source',
    cameraTitle: 'Camera capture',
    imageTitle: 'Board image',
    uploadLabel: 'Upload a photo (JPG, PNG or WEBP, max. 12 MB)',
    uploadNote: 'The image is processed with exactly the same algorithm as the camera; it is not stored.',
    scenarioLabel: 'or analyse a gallery example (synthetic image)',
    scenarioPlaceholder: '— choose a scenario —',
    detectionTitle: 'Board reading (OpenCV)',
    compileTitle: 'Compiled program',
    analyzeFailed: 'The image could not be analysed.',
  },
  diff: {
    noChanges: (unchanged) => `No physical changes since the previous capture (${unchanged === 1 ? '1 unchanged card' : `${unchanged} unchanged cards`}).`,
    title: 'Changes since the previous capture',
    added: (markerId, cell) => `+ #${markerId} added at ${at(cell)}`,
    removed: (markerId, cell) => `− #${markerId} removed from ${at(cell)}`,
    moved: (markerId, from, to) => `↦ #${markerId} moved from ${at(from)} to ${at(to)}`,
    rotated: (markerId, from, to) => `↻ #${markerId} rotated from ${arrows('en')[from]} to ${arrows('en')[to]}`,
  },
  camera: {
    tips: {
      framing: 'Position the camera as perpendicular to the board as possible, with the whole board in the frame.',
      light: 'Diffuse light, no glare on the markers; the 4 corners (ID 0–3) must be fully visible.',
      safety: 'Moving cards never runs anything: after capturing, you compile, review and approve.',
    },
    previewLabel: 'Camera preview',
    off: 'The camera is off.',
    errors: {
      unsupported: 'This browser does not allow camera access (HTTPS or localhost is required). Upload a photo in the Image tab.',
      denied: 'Camera permission denied. You can grant it in the browser or upload a photo of the board.',
      notFound: 'No camera was found. Upload a photo of the board or use the gallery.',
      failed: 'The camera could not be opened. Upload a photo of the board.',
    },
  },
  detection: {
    calibrated: (errorMm) => `Calibrated (error ${errorMm} mm)`,
    uncalibrated: 'Not calibrated',
    cardsRecognized: (count) => (count === 1 ? '1 card recognised' : `${count} cards recognised`),
    readErrors: (count) => (count === 1 ? '1 reading error' : `${count} reading errors`),
    corners: (ids) => `Corners: ${ids}`,
    latencyTitle: 'Total analysis latency on the server',
    overlayAlt: (cards, calibrated) => `Detection overlay: ${cards === 1 ? '1 card' : `${cards} cards`}, board ${calibrated ? 'calibrated' : 'not calibrated'}`,
    overlayNote: 'The overlay is drawn from the same detector output (corners, projected grid, orientation arrows). The photo is not stored: only its sha256 and the detection JSON are kept.',
    tableCaption: 'Cards read from the pixels',
    columns: {
      marker: 'Marker',
      kind: 'Type',
      cell: 'Cell',
      orientation: 'Orientation',
      deviation: 'Deviation',
      quality: 'Quality*',
      qualityTitle: 'Geometric heuristic (centring, angle, size); not a probability',
    },
    noCards: 'No card assigned to a cell.',
    qualityNote: '*Quality = the minimum of centring in the cell, angular alignment and expected size. A documented heuristic, not a probability.',
    rejectedTitle: 'Unassigned markers',
    candidateCells: (cells) => ` · candidate cells ${joinLast(cells, ' and ')}`,
    noProblems: 'No problems reading the board.',
  },
  board: {
    colHeader: (col) => `col ${col}`,
    rowHeader: (row) => `R${row}`,
    emptyCell: (row, col) => `Cell row ${row}, column ${col}: empty`,
    cardCell: (row, col, markerId, kind, orientation) => `Cell row ${row}, column ${col}: card #${markerId} ${kind}, points ${arrows('en')[orientation]}`,
    conditionHint: '; YES follows the arrow, NO turns right',
    withError: ' (has an error)',
  },
  simulator: {
    title: 'Board simulator',
    intro: {
      before: 'Place virtual cards on the same 8×4 grid. This mode builds the board state digitally (there is no camera detection), but it uses ',
      strong: 'the same compiler and the same worker',
      after: ' as the photos.',
    },
    boardTitle: 'Virtual board',
    officialExample: 'Official example (2 branches)',
    linearExample: 'Linear workflow',
    boardCaption: 'Virtual board of 8 columns by 4 rows',
    keys: { rotate: 'R', remove: 'Delete', move: 'Shift' },
    hint: {
      intro: 'Mouse: choose a card from the palette and click a cell, or drag it. Keyboard: Tab to a cell with a card · ',
      rotate: ' to rotate · ',
      remove: ' to remove · ',
      move: '+arrows to move.',
    },
    selected: {
      label: 'Selected:',
      details: (kind, row, col, orientation) => `${kind} at (${row},${col}), points ${arrows('en')[orientation]}`,
    },
    paletteTitle: 'Card palette',
    paletteNote: 'Cards from the cards-v1 catalogue that are not on the board.',
    pickCard: (markerId, kind) => `Choose card #${markerId} ${kind}`,
    compileTitle: 'Live compilation',
    announce: {
      occupied: (row, col, markerId) => `Cell (${row},${col}) already holds card #${markerId}.`,
      placed: (markerId, row, col) => `Card #${markerId} placed at (${row},${col}).`,
      rotated: (markerId, orientation) => `Card #${markerId} now points ${arrows('en')[orientation]}.`,
      removed: (markerId) => `Card #${markerId} removed from the board.`,
      selected: (markerId) => `Card #${markerId} selected. R rotates, Delete removes, Shift+arrows move it.`,
      picked: (markerId) => `Card #${markerId} picked. Now choose an empty cell.`,
    },
  },
};

const it: StudioMessages = {
  page: {
    title: 'Board Studio',
    intro: {
      before:
        'Fotografa il tabellone stampato o carica un’immagine. Il server rileva i marcatori ArUco dai pixel con OpenCV, calibra la prospettiva con i 4 angoli e assegna ogni carta alla sua casella e al suo orientamento. Niente hardware? Usa il',
      simulator: 'simulatore digitale',
      or: 'o la',
      gallery: 'galleria',
      after: '.',
    },
    sourceTabs: 'Origine del tabellone',
    cameraTitle: 'Acquisizione con fotocamera',
    imageTitle: 'Immagine del tabellone',
    uploadLabel: 'Carica una foto (JPG, PNG o WEBP, max. 12 MB)',
    uploadNote: 'L’immagine viene elaborata con esattamente lo stesso algoritmo della fotocamera; non viene salvata.',
    scenarioLabel: 'oppure analizza un esempio della galleria (immagine sintetica)',
    scenarioPlaceholder: '— scegli uno scenario —',
    detectionTitle: 'Lettura del tabellone (OpenCV)',
    compileTitle: 'Programma compilato',
    analyzeFailed: 'Impossibile analizzare l’immagine.',
  },
  diff: {
    noChanges: (unchanged) => `Nessuna modifica fisica rispetto all’acquisizione precedente (${unchanged === 1 ? '1 carta invariata' : `${unchanged} carte invariate`}).`,
    title: 'Modifiche rispetto all’acquisizione precedente',
    added: (markerId, cell) => `+ #${markerId} aggiunta in ${at(cell)}`,
    removed: (markerId, cell) => `− #${markerId} rimossa da ${at(cell)}`,
    moved: (markerId, from, to) => `↦ #${markerId} spostata da ${at(from)} a ${at(to)}`,
    rotated: (markerId, from, to) => `↻ #${markerId} ruotata da ${arrows('it')[from]} a ${arrows('it')[to]}`,
  },
  camera: {
    tips: {
      framing: 'Posiziona la fotocamera il più possibile perpendicolare al tabellone, con tutto il tabellone nell’inquadratura.',
      light: 'Luce diffusa, senza riflessi sui marcatori; i 4 angoli (ID 0–3) devono essere interamente visibili.',
      safety: 'Spostare le carte non esegue mai nulla: dopo l’acquisizione compili, rivedi e approvi.',
    },
    previewLabel: 'Anteprima della fotocamera',
    off: 'La fotocamera è spenta.',
    errors: {
      unsupported: 'Questo browser non consente di usare la fotocamera (serve HTTPS o localhost). Carica una foto nella scheda Immagine.',
      denied: 'Autorizzazione alla fotocamera negata. Puoi concederla nel browser oppure caricare una foto del tabellone.',
      notFound: 'Nessuna fotocamera trovata. Carica una foto del tabellone o usa la galleria.',
      failed: 'Impossibile aprire la fotocamera. Carica una foto del tabellone.',
    },
  },
  detection: {
    calibrated: (errorMm) => `Calibrato (errore ${errorMm} mm)`,
    uncalibrated: 'Non calibrato',
    cardsRecognized: (count) => (count === 1 ? '1 carta riconosciuta' : `${count} carte riconosciute`),
    readErrors: (count) => (count === 1 ? '1 errore di lettura' : `${count} errori di lettura`),
    corners: (ids) => `Angoli: ${ids}`,
    latencyTitle: 'Latenza totale dell’analisi sul server',
    overlayAlt: (cards, calibrated) => `Sovrapposizione del rilevamento: ${cards === 1 ? '1 carta' : `${cards} carte`}, tabellone ${calibrated ? 'calibrato' : 'non calibrato'}`,
    overlayNote:
      'La sovrapposizione è disegnata a partire dallo stesso output del rilevatore (angoli, griglia proiettata, frecce di orientamento). La foto non viene salvata: si conservano solo il suo sha256 e il JSON del rilevamento.',
    tableCaption: 'Carte lette dai pixel',
    columns: {
      marker: 'Marcatore',
      kind: 'Tipo',
      cell: 'Casella',
      orientation: 'Orientamento',
      deviation: 'Deviazione',
      quality: 'Qualità*',
      qualityTitle: 'Euristica geometrica (centratura, angolo, dimensione); non è una probabilità',
    },
    noCards: 'Nessuna carta assegnata a una casella.',
    qualityNote: '*Qualità = minimo tra centratura nella casella, allineamento angolare e dimensione attesa. Euristica documentata, non una probabilità.',
    rejectedTitle: 'Marcatori non assegnati',
    candidateCells: (cells) => ` · caselle candidate ${joinLast(cells, ' e ')}`,
    noProblems: 'Nessun problema nella lettura del tabellone.',
  },
  board: {
    colHeader: (col) => `col ${col}`,
    rowHeader: (row) => `R${row}`,
    emptyCell: (row, col) => `Casella riga ${row}, colonna ${col}: vuota`,
    cardCell: (row, col, markerId, kind, orientation) => `Casella riga ${row}, colonna ${col}: carta #${markerId} ${kind}, punta verso ${arrows('it')[orientation]}`,
    conditionHint: '; SÌ segue la freccia, NO gira a destra',
    withError: ' (con errore)',
  },
  simulator: {
    title: 'Simulatore del tabellone',
    intro: {
      before: 'Posiziona carte virtuali sulla stessa griglia 8×4. Questa modalità costruisce lo stato del tabellone in digitale (non c’è rilevamento con la fotocamera), ma usa ',
      strong: 'lo stesso compilatore e lo stesso worker',
      after: ' delle foto.',
    },
    boardTitle: 'Tabellone virtuale',
    officialExample: 'Esempio ufficiale (2 rami)',
    linearExample: 'Flusso lineare',
    boardCaption: 'Tabellone virtuale di 8 colonne per 4 righe',
    keys: { rotate: 'R', remove: 'Canc', move: 'Maiusc' },
    hint: {
      intro: 'Mouse: scegli una carta dalla palette e fai clic su una casella, oppure trascinala. Tastiera: Tab fino a una casella con una carta · ',
      rotate: ' per ruotare · ',
      remove: ' per rimuovere · ',
      move: '+frecce per spostare.',
    },
    selected: {
      label: 'Selezione:',
      details: (kind, row, col, orientation) => `${kind} in (${row},${col}), punta verso ${arrows('it')[orientation]}`,
    },
    paletteTitle: 'Palette delle carte',
    paletteNote: 'Carte del catalogo cards-v1 che non sono sul tabellone.',
    pickCard: (markerId, kind) => `Scegli la carta #${markerId} ${kind}`,
    compileTitle: 'Compilazione in tempo reale',
    announce: {
      occupied: (row, col, markerId) => `La casella (${row},${col}) contiene già la carta #${markerId}.`,
      placed: (markerId, row, col) => `Carta #${markerId} posizionata in (${row},${col}).`,
      rotated: (markerId, orientation) => `La carta #${markerId} ora punta verso ${arrows('it')[orientation]}.`,
      removed: (markerId) => `Carta #${markerId} rimossa dal tabellone.`,
      selected: (markerId) => `Carta #${markerId} selezionata: R la ruota, Canc la rimuove, Maiusc+frecce la spostano.`,
      picked: (markerId) => `Carta #${markerId} scelta. Ora seleziona una casella vuota.`,
    },
  },
};

const fr: StudioMessages = {
  page: {
    title: 'Board Studio',
    intro: {
      before:
        'Photographiez le plateau imprimé ou téléversez une image. Le serveur détecte les marqueurs ArUco à partir des pixels avec OpenCV, calibre la perspective grâce aux 4 coins et attribue à chaque carte sa case et son orientation. Pas de matériel ? Utilisez le',
      simulator: 'simulateur numérique',
      or: 'ou la',
      gallery: 'galerie',
      after: '.',
    },
    sourceTabs: 'Source du plateau',
    cameraTitle: 'Capture avec la caméra',
    imageTitle: 'Image du plateau',
    uploadLabel: 'Téléverser une photo (JPG, PNG ou WEBP, 12 Mo max.)',
    uploadNote: 'L’image est traitée avec exactement le même algorithme que la caméra ; elle n’est pas enregistrée.',
    scenarioLabel: 'ou analysez un exemple de la galerie (image de synthèse)',
    scenarioPlaceholder: '— choisir un scénario —',
    detectionTitle: 'Lecture du plateau (OpenCV)',
    compileTitle: 'Programme compilé',
    analyzeFailed: 'Impossible d’analyser l’image.',
  },
  diff: {
    noChanges: (unchanged) => `Aucun changement physique depuis la capture précédente (${unchanged <= 1 ? `${unchanged} carte inchangée` : `${unchanged} cartes inchangées`}).`,
    title: 'Changements depuis la capture précédente',
    added: (markerId, cell) => `+ #${markerId} ajoutée en ${at(cell)}`,
    removed: (markerId, cell) => `− #${markerId} retirée de ${at(cell)}`,
    moved: (markerId, from, to) => `↦ #${markerId} déplacée de ${at(from)} à ${at(to)}`,
    rotated: (markerId, from, to) => `↻ #${markerId} pivotée ${FR_FROM[from]} ${FR_TOWARD[to]}`,
  },
  camera: {
    tips: {
      framing: 'Placez la caméra aussi perpendiculairement que possible au plateau, avec tout le plateau dans le champ.',
      light: 'Lumière diffuse, sans reflets sur les marqueurs ; les 4 coins (ID 0–3) doivent être entièrement visibles.',
      safety: 'Déplacer des cartes n’exécute jamais rien : après la capture, vous compilez, vérifiez et approuvez.',
    },
    previewLabel: 'Aperçu de la caméra',
    off: 'La caméra est éteinte.',
    errors: {
      unsupported: 'Ce navigateur ne permet pas d’utiliser la caméra (HTTPS ou localhost requis). Téléversez une photo dans l’onglet Image.',
      denied: 'Autorisation de la caméra refusée. Vous pouvez l’accorder dans le navigateur ou téléverser une photo du plateau.',
      notFound: 'Aucune caméra trouvée. Téléversez une photo du plateau ou utilisez la galerie.',
      failed: 'Impossible d’ouvrir la caméra. Téléversez une photo du plateau.',
    },
  },
  detection: {
    calibrated: (errorMm) => `Calibré (erreur ${errorMm} mm)`,
    uncalibrated: 'Non calibré',
    cardsRecognized: (count) => (count <= 1 ? `${count} carte reconnue` : `${count} cartes reconnues`),
    readErrors: (count) => (count <= 1 ? `${count} erreur de lecture` : `${count} erreurs de lecture`),
    corners: (ids) => `Coins : ${ids}`,
    latencyTitle: 'Latence totale de l’analyse sur le serveur',
    overlayAlt: (cards, calibrated) => `Superposition de la détection : ${cards <= 1 ? `${cards} carte` : `${cards} cartes`}, plateau ${calibrated ? 'calibré' : 'non calibré'}`,
    overlayNote:
      'La superposition est dessinée à partir de la même sortie du détecteur (coins, grille projetée, flèches d’orientation). La photo n’est pas enregistrée : seuls son sha256 et le JSON de détection sont conservés.',
    tableCaption: 'Cartes lues à partir des pixels',
    columns: {
      marker: 'Marqueur',
      kind: 'Type',
      cell: 'Case',
      orientation: 'Orientation',
      deviation: 'Écart',
      quality: 'Qualité*',
      qualityTitle: 'Heuristique géométrique (centrage, angle, taille) ; ce n’est pas une probabilité',
    },
    noCards: 'Aucune carte attribuée à une case.',
    qualityNote: '*Qualité = minimum entre le centrage dans la case, l’alignement angulaire et la taille attendue. Heuristique documentée, pas une probabilité.',
    rejectedTitle: 'Marqueurs non attribués',
    candidateCells: (cells) => ` · cases candidates ${joinLast(cells, ' et ')}`,
    noProblems: 'Lecture du plateau sans problème.',
  },
  board: {
    colHeader: (col) => `col ${col}`,
    rowHeader: (row) => `L${row}`,
    emptyCell: (row, col) => `Case ligne ${row}, colonne ${col} : vide`,
    cardCell: (row, col, markerId, kind, orientation) => `Case ligne ${row}, colonne ${col} : carte #${markerId} ${kind}, pointe ${FR_TOWARD[orientation]}`,
    conditionHint: ' ; OUI suit la flèche, NON tourne à droite',
    withError: ' (en erreur)',
  },
  simulator: {
    title: 'Simulateur du plateau',
    intro: {
      before: 'Placez des cartes virtuelles sur la même grille 8×4. Ce mode construit l’état du plateau numériquement (il n’y a pas de détection par caméra), mais il utilise ',
      strong: 'le même compilateur et le même worker',
      after: ' que les photos.',
    },
    boardTitle: 'Plateau virtuel',
    officialExample: 'Exemple officiel (2 branches)',
    linearExample: 'Flux linéaire',
    boardCaption: 'Plateau virtuel de 8 colonnes sur 4 lignes',
    keys: { rotate: 'R', remove: 'Suppr', move: 'Maj' },
    hint: {
      intro: 'Souris : choisissez une carte dans la palette et cliquez sur une case, ou faites-la glisser. Clavier : Tab jusqu’à une case avec une carte · ',
      rotate: ' pour pivoter · ',
      remove: ' pour retirer · ',
      move: '+flèches pour déplacer.',
    },
    selected: {
      label: 'Sélection :',
      details: (kind, row, col, orientation) => `${kind} en (${row},${col}), pointe ${FR_TOWARD[orientation]}`,
    },
    paletteTitle: 'Palette de cartes',
    paletteNote: 'Cartes du catalogue cards-v1 qui ne sont pas sur le plateau.',
    pickCard: (markerId, kind) => `Choisir la carte #${markerId} ${kind}`,
    compileTitle: 'Compilation en direct',
    announce: {
      occupied: (row, col, markerId) => `La case (${row},${col}) contient déjà la carte #${markerId}.`,
      placed: (markerId, row, col) => `Carte #${markerId} placée en (${row},${col}).`,
      rotated: (markerId, orientation) => `La carte #${markerId} pointe maintenant ${FR_TOWARD[orientation]}.`,
      removed: (markerId) => `Carte #${markerId} retirée du plateau.`,
      selected: (markerId) => `Carte #${markerId} sélectionnée : R pour pivoter, Suppr pour retirer, Maj+flèches pour déplacer.`,
      picked: (markerId) => `Carte #${markerId} choisie. Sélectionnez maintenant une case vide.`,
    },
  },
};

export const studio: Readonly<Record<Locale, StudioMessages>> = { es, en, it, fr };
