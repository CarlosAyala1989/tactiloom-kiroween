import type { Locale } from '@tactiloom/contracts';

export interface ScenarioText {
  readonly title: string;
  readonly description: string;
}

/**
 * Gallery scenarios (ids from assets/examples/boards/scenarios.json). Spanish equals the JSON
 * `titleEs`/`descriptionEs`; card names follow the printed titles of each language.
 */
export interface ScenarioMessages {
  readonly note: string;
  readonly items: Readonly<Record<string, ScenarioText>>;
}

const es: ScenarioMessages = {
  note: 'Imágenes sintéticas renderizadas desde los PDF del kit y fotografiadas por software; el servidor las analiza con OpenCV píxel a píxel.',
  items: {
    'valid-board': { title: 'Tablero válido (dos ramas)', description: 'Las 10 tarjetas del ejemplo oficial: rama SÍ crea y guarda un reporte, rama NO pide revisión.' },
    'valid-board-perspective': { title: 'Tablero válido en perspectiva', description: 'Mismo flujo fotografiado en ángulo, con desenfoque, ruido y tarjetas ligeramente desalineadas.' },
    'valid-board-linear': { title: 'Flujo lineal alternativo', description: 'Segundo flujo válido con el juego B (#20–#27): siempre genera un reporte con el estado de validación.' },
    'invalid-board-missing-end': { title: 'Falta una tarjeta FIN', description: 'Se retiró FIN #19: la rama NO (PEDIR REVISIÓN #18) queda sin salida y no compila.' },
    'invalid-board-ambiguous': { title: 'Tarjeta entre dos casillas', description: 'CREAR REPORTE #15 quedó entre las casillas (0,5) y (1,5): la lectura se bloquea con AMBIGUOUS_POSITION.' },
    'invalid-board-moved-card': { title: 'Tarjeta movida', description: 'CREAR REPORTE #15 se movió a (1,5): la rama SÍ queda sin receptor y GUARDAR/FIN quedan inalcanzables.' },
    'invalid-board-missing-corner': { title: 'Esquina tapada', description: 'Una mano tapa el marcador de esquina 2: sin las 4 esquinas no se calibra la perspectiva.' },
    'invalid-board-tilted-card': { title: 'Tarjeta girada en diagonal', description: 'CONDICIÓN #14 está girada ~35°: no se puede decidir hacia dónde apunta (AMBIGUOUS_ORIENTATION).' },
  },
};

const en: ScenarioMessages = {
  note: 'Synthetic images rendered from the kit PDFs and photographed by software; the server analyses them with OpenCV, pixel by pixel.',
  items: {
    'valid-board': { title: 'Valid board (two branches)', description: 'The 10 cards of the official example: the YES branch creates and saves a report, the NO branch requests a review.' },
    'valid-board-perspective': { title: 'Valid board in perspective', description: 'Same workflow photographed at an angle, with blur, noise and slightly misaligned cards.' },
    'valid-board-linear': { title: 'Alternative linear workflow', description: 'Second valid workflow with set B (#20–#27): it always produces a report with the validation status.' },
    'invalid-board-missing-end': { title: 'An END card is missing', description: 'END #19 was removed: the NO branch (REQUEST REVIEW #18) has no exit and does not compile.' },
    'invalid-board-ambiguous': { title: 'Card between two cells', description: 'CREATE REPORT #15 ended up between cells (0,5) and (1,5): reading is blocked with AMBIGUOUS_POSITION.' },
    'invalid-board-moved-card': { title: 'Moved card', description: 'CREATE REPORT #15 was moved to (1,5): the YES branch has no receiver and SAVE/END become unreachable.' },
    'invalid-board-missing-corner': { title: 'Covered corner', description: 'A hand covers corner marker 2: without the 4 corners the perspective cannot be calibrated.' },
    'invalid-board-tilted-card': { title: 'Card rotated diagonally', description: 'CONDITION #14 is rotated ~35°: its direction cannot be decided (AMBIGUOUS_ORIENTATION).' },
  },
};

const it: ScenarioMessages = {
  note: 'Immagini sintetiche generate dai PDF del kit e fotografate via software; il server le analizza con OpenCV, pixel per pixel.',
  items: {
    'valid-board': { title: 'Tabellone valido (due rami)', description: 'Le 10 carte dell’esempio ufficiale: il ramo SÌ crea e salva un report, il ramo NO richiede una revisione.' },
    'valid-board-perspective': { title: 'Tabellone valido in prospettiva', description: 'Stesso flusso fotografato di sbieco, con sfocatura, rumore e carte leggermente disallineate.' },
    'valid-board-linear': { title: 'Flusso lineare alternativo', description: 'Secondo flusso valido con il set B (#20–#27): genera sempre un report con l’esito della convalida.' },
    'invalid-board-missing-end': { title: 'Manca una carta FINE', description: 'È stata rimossa FINE #19: il ramo NO (CHIEDI REVISIONE #18) resta senza uscita e non si compila.' },
    'invalid-board-ambiguous': { title: 'Carta tra due caselle', description: 'CREA REPORT #15 è rimasta tra le caselle (0,5) e (1,5): la lettura si blocca con AMBIGUOUS_POSITION.' },
    'invalid-board-moved-card': { title: 'Carta spostata', description: 'CREA REPORT #15 è stata spostata in (1,5): il ramo SÌ resta senza ricevente e SALVA/FINE diventano irraggiungibili.' },
    'invalid-board-missing-corner': { title: 'Angolo coperto', description: 'Una mano copre il marcatore d’angolo 2: senza i 4 angoli non si calibra la prospettiva.' },
    'invalid-board-tilted-card': { title: 'Carta ruotata in diagonale', description: 'CONDIZIONE #14 è ruotata di ~35°: non si può stabilire verso dove punta (AMBIGUOUS_ORIENTATION).' },
  },
};

const fr: ScenarioMessages = {
  note: 'Images de synthèse rendues à partir des PDF du kit et photographiées par logiciel ; le serveur les analyse avec OpenCV, pixel par pixel.',
  items: {
    'valid-board': { title: 'Plateau valide (deux branches)', description: 'Les 10 cartes de l’exemple officiel : la branche OUI crée et enregistre un rapport, la branche NON demande une révision.' },
    'valid-board-perspective': { title: 'Plateau valide en perspective', description: 'Même flux photographié en biais, avec flou, bruit et cartes légèrement décalées.' },
    'valid-board-linear': { title: 'Flux linéaire alternatif', description: 'Deuxième flux valide avec le jeu B (#20–#27) : il produit toujours un rapport avec l’état de la validation.' },
    'invalid-board-missing-end': { title: 'Une carte FIN manque', description: 'FIN #19 a été retirée : la branche NON (DEMANDER RÉVISION #18) n’a pas de sortie et ne compile pas.' },
    'invalid-board-ambiguous': { title: 'Carte entre deux cases', description: 'CRÉER RAPPORT #15 se trouve entre les cases (0,5) et (1,5) : la lecture est bloquée par AMBIGUOUS_POSITION.' },
    'invalid-board-moved-card': { title: 'Carte déplacée', description: 'CRÉER RAPPORT #15 a été déplacée en (1,5) : la branche OUI n’a plus de récepteur et ENREGISTRER/FIN deviennent injoignables.' },
    'invalid-board-missing-corner': { title: 'Coin masqué', description: 'Une main masque le marqueur de coin 2 : sans les 4 coins, la perspective ne peut pas être calibrée.' },
    'invalid-board-tilted-card': { title: 'Carte tournée en diagonale', description: 'CONDITION #14 est tournée d’environ 35° : impossible de décider vers où elle pointe (AMBIGUOUS_ORIENTATION).' },
  },
};

export const scenarios: Readonly<Record<Locale, ScenarioMessages>> = { es, en, it, fr };
