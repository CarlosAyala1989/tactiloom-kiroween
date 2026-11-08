import type { CardKind, Locale } from '@tactiloom/contracts';

/** Home, how it works, judges guide, gallery and history pages. Spanish is the source of truth; en/it/fr mirror every key. */

const esCards = (n: number) => (n === 1 ? '1 tarjeta' : `${n} tarjetas`);

const es = {
  home: {
    conceptLabel: 'Ilustración conceptual: tablero con tarjetas encadenadas y una rama de revisión',
    /** `no` = label of the FALSE branch. */
    conceptFalseTurn: (no: string) => `${no} ↓ gira a la derecha`,
    conceptCaption: 'Ilustración conceptual — la demo real procesa fotos con OpenCV',
    intro:
      'Tactiloom convierte tarjetas físicas con marcadores ArUco, colocadas sobre un tablero, en un programa real: la cámara lee el tablero, un compilador lo traduce a un grafo tipado y un worker aislado lo ejecuta sobre documentos de prueba —solo después de que lo apruebes.',
    tryDemo: 'Probar demo (sin hardware)',
    howItWorks: 'Cómo funciona',
    printKit: 'Imprimir el kit',
    stepsLabel: 'Tres pasos',
    steps: [
      { title: '1 · Imprime', text: 'Tablero 8×4 con 4 marcadores de esquina y tarjetas con marcadores ArUco reales (A3, mosaico A4 o versión reducida).' },
      { title: '2 · Coloca', text: 'Una tarjeta por casilla. La flecha impresa es el flujo; CONDICIÓN envía SÍ hacia adelante y NO a la derecha.' },
      { title: '3 · Escanea y ejecuta', text: 'OpenCV lee el tablero, el compilador valida el grafo, revisas el dry-run y apruebas. Solo entonces corre el worker.' },
    ],
    realTitle: 'Qué es real en esta demo',
    real: [
      '✓ Los marcadores se detectan desde los píxeles (OpenCV 5, DICT_4X4_100, homografía con 16 esquinas).',
      '✓ El grafo se compila con reglas geométricas públicas y diagnósticos en español.',
      '✓ El worker extrae texto real del PDF, valida campos y escribe un reporte descargable en un sandbox.',
      '✓ Nada se ejecuta sin un dry-run revisado y una aprobación explícita con hash.',
      '✓ Interfaz, kit imprimible, reportes y superposición de OpenCV en español, inglés, italiano y francés.',
      '• Las imágenes de la galería son sintéticas (renderizadas desde el kit) y así se etiquetan.',
      '• El simulador construye el tablero digitalmente y está marcado «no utiliza cámara».',
    ],
    priorArt:
      'Tactiloom no inventó la programación tangible: FloBlocks (2025) y Sheets (2015) ya usaron tarjetas y webcam. Aquí la integramos con un motor seguro de automatización documental, trazabilidad y aprobación.',
  },
  howItWorks: {
    title: 'Cómo funciona',
    intro: 'Tres pasos físicos, un compilador formal y un ejecutor que solo hace lo que aprobaste.',
    print: {
      title: '1. Imprime el tablero y las tarjetas',
      kitBefore: 'Descarga el ',
      kitLink: 'kit imprimible',
      kitAfter: ': tablero A3 (o 4 hojas A4, o versión reducida A4) y tarjetas. Imprime al 100 % y verifica la barra de 100 mm.',
      noPrinter: '¿Sin impresora? Usa la galería (fotos sintéticas analizadas por OpenCV) o el simulador digital.',
    },
    place: {
      title: '2. Coloca las tarjetas',
      rules: [
        'Una tarjeta por casilla de la cuadrícula 8×4.',
        'La flecha impresa es la dirección de avance F. Cada tarjeta recibe por su lado trasero y envía a la casilla vecina en F.',
        'CONDICIÓN: SÍ sigue F; NO gira 90° a la derecha.',
        'Toda rama termina en FIN. Las casillas vacías no conectan nada.',
      ],
    },
    scan: {
      title: '3. Escanea, revisa y aprueba',
      items: [
        'OpenCV detecta los 4 marcadores de esquina, calibra la perspectiva y asigna cada tarjeta a su casilla y orientación.',
        'El compilador genera la IR tactiloom-ir/1 con su hash sha256, o explica cada error con fila y columna.',
        'El worker hace un dry-run; tú revisas entrada, pasos y efectos; apruebas con el hash; el worker ejecuta.',
      ],
    },
    cards: {
      title: 'Las tarjetas v1',
      card: 'Tarjeta',
      needs: 'Necesita',
      produces: 'Produce / efecto',
      needsByKind: {
        START: '—',
        INPUT_FILE: '—',
        EXTRACT_TEXT: 'documento',
        VALIDATE_FIELDS: 'texto',
        CONDITION: 'validación',
        CREATE_REPORT: 'texto + validación',
        SAVE_REPORT: 'reporte',
        REQUEST_REVIEW: 'validación',
        END: '—',
      } satisfies Record<CardKind, string>,
      producesByKind: {
        START: 'comienza el flujo',
        INPUT_FILE: 'documento del workspace (solo lectura)',
        EXTRACT_TEXT: 'texto real del PDF (capa de texto) o TXT',
        VALIDATE_FIELDS: 'Nombre, Correo (formato) y Taller presentes',
        CONDITION: 'una sola rama: SÍ / NO',
        CREATE_REPORT: 'reporte Markdown/JSON en memoria',
        SAVE_REPORT: 'archivo descargable en runs/<id>/reports/',
        REQUEST_REVIEW: 'tarea de revisión OPEN (sin correos)',
        END: 'termina la rama',
      } satisfies Record<CardKind, string>,
      note: 'El compilador comprueba que cada dato exista en todo camino que llega a una tarjeta (no solo que haya flechas).',
    },
    camera: {
      title: 'Cámara y compatibilidad',
      /** `button` = label of the enable-camera button. */
      secureContext: (button: string) => `La cámara funciona en navegadores modernos con HTTPS o en localhost, y solo tras pulsar «${button}».`,
      onePhoto: 'Se envía una única foto por análisis; la foto no se almacena.',
      fallback: 'Sin permiso o sin cámara, puedes subir una foto del tablero o usar la galería.',
      toStudio: 'Ir al Board Studio',
      toSimulator: 'Abrir el simulador',
    },
  },
  help: {
    metaTitle: 'Guía para jueces',
    title: 'Guía para jueces · Judges guide',
    intro: 'Evalúa Tactiloom en ~5 minutos sin hardware. Each step below is also described in English in docs/judge-guide.md.',
    tourTitle: 'Recorrido sugerido',
    tour: {
      /** before + link (gallery) + middle(analyze button) + <em>scenario</em> + after */
      gallery: {
        before: 'Abre la ',
        link: 'Galería',
        middle: (button: string) => ` y pulsa «${button}» en `,
        after: '. El servidor detecta las 10 tarjetas desde los píxeles.',
      },
      overlay: 'Comprueba la superposición (esquinas, cuadrícula proyectada, flechas) y la tabla de tarjetas leídas.',
      /** before(Studio section title) + <code>default document</code> + after */
      compiled: {
        before: (section: string) => `En «${section}» verás el grafo con dos ramas y su contentHash. El documento de entrada por defecto es `,
        after: ' (ficticio).',
      },
      /** `save` = full label of the Studio save button, `review` = review button. */
      save: (save: string, review: string) => `Pulsa «${save}» y luego «${review}».`,
      approve: (button: string) => `Revisa entrada, pasos, decisión prevista y efectos; marca la casilla y pulsa «${button}». Descarga el reporte Markdown/JSON.`,
      /** before + <code>invalid document</code> + after(FALSE branch label) */
      invalid: {
        before: 'En Workflow Studio cambia el documento a ',
        after: (no: string) => `, guarda (nueva versión, nuevo hash) y ejecuta: irá por la rama ${no} y creará una tarea de revisión.`,
      },
      /** before + <em>scenario</em> + or + <em>scenario</em> + after */
      broken: {
        before: 'Analiza ',
        or: ' o ',
        after: ': no hay botón de ejecución y los errores indican tarjeta, fila y columna.',
      },
      simulator: {
        before: 'En el ',
        link: 'Simulador',
        after: ' gira una tarjeta (tecla R) y observa el diagnóstico INCOMPATIBLE_PORTS en vivo.',
      },
      history: {
        before: 'Consulta el ',
        link: 'Historial',
        after: ': capturas, versiones, ejecuciones, reportes y revisiones.',
      },
      language:
        'Cambia de idioma con el selector 🌐 de la cabecera (español, inglés, italiano o francés) y repite el recorrido: la interfaz y la superposición de OpenCV siguen el idioma elegido, y el reporte también, porque el parámetro «Idioma del reporte» de CREAR REPORTE toma por defecto el idioma de la interfaz.',
    },
    real: {
      title: 'Real vs. simulado',
      items: [
        'Visión: real (OpenCV sobre los píxeles de cada imagen). Las imágenes de la galería son sintéticas y se etiquetan así.',
        'Cámara: real cuando la activas (getUserMedia). Las pruebas con tarjetas impresas las documenta el equipo en docs/benchmarking.md.',
        'Simulador: construye el tablero digitalmente; no usa cámara y lo indica siempre.',
        'Ejecución: real (worker separado, sandbox por workspace, PDF con capa de texto, reportes con sha256).',
      ],
    },
    security: {
      title: 'Seguridad y privacidad',
      items: [
        'Catálogo cerrado de 9 acciones; sin shell, sin red saliente, sin plugins.',
        'Ejecutar exige dry-run + aprobación con contentHash y planHash; el servidor recompila y verifica.',
        'Workspace aislado con TTL; las fotos no se guardan; datos ficticios.',
      ],
      /** before + <a>/api/openapi</a> + middle + <a>/api/health</a> + after */
      api: { before: 'API documentada en ', middle: '; estado del sistema en ', after: '.' },
    },
  },
  gallery: {
    title: 'Galería de demostración',
    /** Shown until the scenario list (and its note) arrives. */
    intro: 'Imágenes de tableros para probar Tactiloom sin cámara ni impresora.',
    provenance: 'Procedencia: sintéticas — renderizadas desde los PDF reales del kit y «fotografiadas» por software. No son capturas físicas.',
    imageAlt: (title: string) => `Tablero de ejemplo: ${title}`,
    expected: 'Esperado:',
    compiles: (cards: number) => `compila (${esCards(cards)})`,
    /** `codes` = distinct diagnostic codes, comma separated. */
    doesNotCompile: (codes: string) => `no compila · ${codes}`,
    loadError: 'No se pudo cargar la galería.',
  },
  history: {
    title: 'Historial',
    loading: 'Cargando historial…',
    loadError: 'No se pudo cargar el historial.',
    expires: (date: string) => `Workspace de demostración · se elimina automáticamente el ${date}.`,
    runs: (n: number) => `Ejecuciones (${n})`,
    /** `label` = branch label (SÍ / NO). */
    branch: (label: string) => `rama ${label}`,
    noRuns: 'Aún no hay ejecuciones.',
    artifacts: (n: number) => `Reportes generados (${n})`,
    noArtifacts: 'Sin reportes todavía.',
    reviews: (n: number) => `Tareas de revisión (${n})`,
    /** Raw field ids, comma separated, or «—». */
    reviewFields: (missing: string, invalid: string) => `faltan ${missing} · inválidos ${invalid}`,
    noReviews: 'Sin tareas de revisión.',
    versions: (n: number) => `Versiones compiladas (${n})`,
    captures: (n: number) => `Capturas analizadas (${n})`,
    cards: esCards,
    calibrated: 'calibrado',
    notCalibrated: 'sin calibrar',
    photosNote: 'Las fotos no se conservan; solo el resultado de la detección y el sha256 de la imagen.',
    documents: (n: number) => `Documentos (${n})`,
  },
};

export type PagesMessages = typeof es;

const enCards = (n: number) => (n === 1 ? '1 card' : `${n} cards`);

const en: PagesMessages = {
  home: {
    conceptLabel: 'Concept illustration: a board with chained cards and a review branch',
    conceptFalseTurn: (no: string) => `${no} ↓ turns right`,
    conceptCaption: 'Concept illustration — the real demo processes photos with OpenCV',
    intro:
      'Tactiloom turns physical cards with ArUco markers, laid out on a board, into a real program: the camera reads the board, a compiler translates it into a typed graph and an isolated worker runs it on test documents — only after you approve it.',
    tryDemo: 'Try the demo (no hardware)',
    howItWorks: 'How it works',
    printKit: 'Print the kit',
    stepsLabel: 'Three steps',
    steps: [
      { title: '1 · Print', text: 'An 8×4 board with 4 corner markers and cards carrying real ArUco markers (A3, A4 tiles or reduced version).' },
      { title: '2 · Place', text: 'One card per cell. The printed arrow is the flow; CONDITION sends YES forward and NO to the right.' },
      { title: '3 · Scan and run', text: 'OpenCV reads the board, the compiler validates the graph, you review the dry run and approve. Only then does the worker run.' },
    ],
    realTitle: 'What is real in this demo',
    real: [
      '✓ Markers are detected from the pixels (OpenCV 5, DICT_4X4_100, homography with 16 corners).',
      '✓ The graph is compiled with public geometric rules, with diagnostics in English.',
      '✓ The worker extracts the real text of the PDF, validates fields and writes a downloadable report in a sandbox.',
      '✓ Nothing runs without a reviewed dry run and an explicit approval bound to a hash.',
      '✓ Interface, printable kit, reports and OpenCV overlay in Spanish, English, Italian and French.',
      '• Gallery images are synthetic (rendered from the kit) and labelled as such.',
      '• The simulator builds the board digitally and is labelled “does not use a camera”.',
    ],
    priorArt:
      'Tactiloom did not invent tangible programming: FloBlocks (2025) and Sheets (2015) already used cards and a webcam. Here we combine it with a safe document-automation engine, traceability and approval.',
  },
  howItWorks: {
    title: 'How it works',
    intro: 'Three physical steps, a formal compiler and an executor that only does what you approved.',
    print: {
      title: '1. Print the board and the cards',
      kitBefore: 'Download the ',
      kitLink: 'printable kit',
      kitAfter: ': A3 board (or 4 A4 sheets, or the reduced A4 version) and cards. Print at 100% and check the 100 mm bar.',
      noPrinter: 'No printer? Use the gallery (synthetic photos analysed by OpenCV) or the digital simulator.',
    },
    place: {
      title: '2. Place the cards',
      rules: [
        'One card per cell of the 8×4 grid.',
        'The printed arrow is the forward direction F. Each card receives through its back side and sends to the neighbouring cell in direction F.',
        'CONDITION: YES follows F; NO turns 90° to the right.',
        'Every branch ends at END. Empty cells connect nothing.',
      ],
    },
    scan: {
      title: '3. Scan, review and approve',
      items: [
        'OpenCV detects the 4 corner markers, calibrates the perspective and assigns each card to its cell and orientation.',
        'The compiler produces the tactiloom-ir/1 IR with its sha256 hash, or explains each error with its row and column.',
        'The worker performs a dry run; you review input, steps and effects; you approve with the hash; the worker runs it.',
      ],
    },
    cards: {
      title: 'The v1 cards',
      card: 'Card',
      needs: 'Needs',
      produces: 'Produces / effect',
      needsByKind: {
        START: '—',
        INPUT_FILE: '—',
        EXTRACT_TEXT: 'document',
        VALIDATE_FIELDS: 'text',
        CONDITION: 'validation',
        CREATE_REPORT: 'text + validation',
        SAVE_REPORT: 'report',
        REQUEST_REVIEW: 'validation',
        END: '—',
      },
      producesByKind: {
        START: 'starts the workflow',
        INPUT_FILE: 'workspace document (read-only)',
        EXTRACT_TEXT: 'real text of the PDF (text layer) or TXT',
        VALIDATE_FIELDS: 'Name, Email (format) and Workshop present',
        CONDITION: 'a single branch: YES / NO',
        CREATE_REPORT: 'Markdown/JSON report in memory',
        SAVE_REPORT: 'downloadable file in runs/<id>/reports/',
        REQUEST_REVIEW: 'OPEN review task (no e-mails)',
        END: 'ends the branch',
      },
      note: 'The compiler checks that every piece of data exists on every path that reaches a card (not just that there are arrows).',
    },
    camera: {
      title: 'Camera and compatibility',
      secureContext: (button: string) => `The camera works in modern browsers over HTTPS or on localhost, and only after you press “${button}”.`,
      onePhoto: 'A single photo is sent per analysis; the photo is not stored.',
      fallback: 'Without permission or without a camera, you can upload a photo of the board or use the gallery.',
      toStudio: 'Go to Board Studio',
      toSimulator: 'Open the simulator',
    },
  },
  help: {
    metaTitle: 'Judges guide',
    title: 'Judges guide',
    intro: 'Evaluate Tactiloom in ~5 minutes without hardware. Each step below is also described in docs/judge-guide.md.',
    tourTitle: 'Suggested walkthrough',
    tour: {
      gallery: {
        before: 'Open the ',
        link: 'Gallery',
        middle: (button: string) => ` and press “${button}” on `,
        after: '. The server detects the 10 cards from the pixels.',
      },
      overlay: 'Check the overlay (corners, projected grid, arrows) and the table of detected cards.',
      compiled: {
        before: (section: string) => `In “${section}” you will see the two-branch graph and its contentHash. The default input document is `,
        after: ' (fictitious).',
      },
      save: (save: string, review: string) => `Press “${save}” and then “${review}”.`,
      approve: (button: string) => `Review the input, steps, predicted decision and effects; tick the box and press “${button}”. Download the Markdown/JSON report.`,
      invalid: {
        before: 'In Workflow Studio, switch the document to ',
        after: (no: string) => `, save (new version, new hash) and run: it takes the ${no} branch and creates a review task.`,
      },
      broken: {
        before: 'Analyse ',
        or: ' or ',
        after: ': there is no run button, and the errors name the card, row and column.',
      },
      simulator: {
        before: 'In the ',
        link: 'Simulator',
        after: ', rotate a card (R key) and watch the INCOMPATIBLE_PORTS diagnostic appear live.',
      },
      history: {
        before: 'Check the ',
        link: 'History',
        after: ': captures, versions, runs, reports and reviews.',
      },
      language:
        'Switch language with the 🌐 selector in the header (Spanish, English, Italian or French) and repeat the walkthrough: the interface and the OpenCV overlay follow the chosen language, and so does the report, because the “Report language” parameter of CREATE REPORT defaults to the interface language.',
    },
    real: {
      title: 'Real vs. simulated',
      items: [
        'Vision: real (OpenCV on the pixels of each image). Gallery images are synthetic and labelled as such.',
        'Camera: real when you turn it on (getUserMedia). The team documents tests with printed cards in docs/benchmarking.md.',
        'Simulator: builds the board digitally; it does not use a camera and always says so.',
        'Execution: real (separate worker, sandbox per workspace, PDF with a text layer, reports with sha256).',
      ],
    },
    security: {
      title: 'Security and privacy',
      items: [
        'Closed catalogue of 9 actions; no shell, no outbound network, no plugins.',
        'Running requires a dry run + approval with contentHash and planHash; the server recompiles and verifies.',
        'Isolated workspace with a TTL; photos are not stored; fictitious data.',
      ],
      api: { before: 'API documented at ', middle: '; system status at ', after: '.' },
    },
  },
  gallery: {
    title: 'Demo gallery',
    intro: 'Board images to try Tactiloom without a camera or a printer.',
    provenance: 'Provenance: synthetic — rendered from the real kit PDFs and “photographed” by software. These are not physical captures.',
    imageAlt: (title: string) => `Example board: ${title}`,
    expected: 'Expected:',
    compiles: (cards: number) => `compiles (${enCards(cards)})`,
    doesNotCompile: (codes: string) => `does not compile · ${codes}`,
    loadError: 'The gallery could not be loaded.',
  },
  history: {
    title: 'History',
    loading: 'Loading history…',
    loadError: 'The history could not be loaded.',
    expires: (date: string) => `Demo workspace · deleted automatically on ${date}.`,
    runs: (n: number) => `Runs (${n})`,
    branch: (label: string) => `${label} branch`,
    noRuns: 'No runs yet.',
    artifacts: (n: number) => `Generated reports (${n})`,
    noArtifacts: 'No reports yet.',
    reviews: (n: number) => `Review tasks (${n})`,
    reviewFields: (missing: string, invalid: string) => `missing: ${missing} · invalid: ${invalid}`,
    noReviews: 'No review tasks.',
    versions: (n: number) => `Compiled versions (${n})`,
    captures: (n: number) => `Analysed captures (${n})`,
    cards: enCards,
    calibrated: 'calibrated',
    notCalibrated: 'not calibrated',
    photosNote: 'Photos are not kept; only the detection result and the sha256 of the image.',
    documents: (n: number) => `Documents (${n})`,
  },
};

const itCards = (n: number) => (n === 1 ? '1 carta' : `${n} carte`);

const it: PagesMessages = {
  home: {
    conceptLabel: 'Illustrazione concettuale: tabellone con carte concatenate e un ramo di revisione',
    conceptFalseTurn: (no: string) => `${no} ↓ gira a destra`,
    conceptCaption: 'Illustrazione concettuale — la demo reale elabora foto con OpenCV',
    intro:
      'Tactiloom trasforma carte fisiche con marcatori ArUco, disposte su un tabellone, in un programma reale: la fotocamera legge il tabellone, un compilatore lo traduce in un grafo tipizzato e un worker isolato lo esegue su documenti di prova, ma solo dopo che lo hai approvato.',
    tryDemo: 'Prova la demo (senza hardware)',
    howItWorks: 'Come funziona',
    printKit: 'Stampa il kit',
    stepsLabel: 'Tre passaggi',
    steps: [
      { title: '1 · Stampa', text: 'Tabellone 8×4 con 4 marcatori d’angolo e carte con veri marcatori ArUco (A3, mosaico A4 o versione ridotta).' },
      { title: '2 · Disponi', text: 'Una carta per casella. La freccia stampata è il flusso; CONDIZIONE manda SÌ in avanti e NO a destra.' },
      { title: '3 · Scansiona ed esegui', text: 'OpenCV legge il tabellone, il compilatore convalida il grafo, rivedi il dry-run e approvi. Solo allora parte il worker.' },
    ],
    realTitle: 'Che cosa è reale in questa demo',
    real: [
      '✓ I marcatori vengono rilevati dai pixel (OpenCV 5, DICT_4X4_100, omografia con 16 angoli).',
      '✓ Il grafo viene compilato con regole geometriche pubbliche e diagnostica in italiano.',
      '✓ Il worker estrae il testo reale del PDF, convalida i campi e scrive un report scaricabile in una sandbox.',
      '✓ Niente viene eseguito senza un dry-run rivisto e un’approvazione esplicita legata a un hash.',
      '✓ Interfaccia, kit stampabile, report e sovrapposizione di OpenCV in spagnolo, inglese, italiano e francese.',
      '• Le immagini della galleria sono sintetiche (generate dal kit) e sono etichettate come tali.',
      '• Il simulatore costruisce il tabellone in digitale ed è contrassegnato con «non usa la fotocamera».',
    ],
    priorArt:
      'Tactiloom non ha inventato la programmazione tangibile: FloBlocks (2025) e Sheets (2015) usavano già carte e webcam. Qui la integriamo con un motore sicuro di automazione documentale, tracciabilità e approvazione.',
  },
  howItWorks: {
    title: 'Come funziona',
    intro: 'Tre passaggi fisici, un compilatore formale e un esecutore che fa solo ciò che hai approvato.',
    print: {
      title: '1. Stampa il tabellone e le carte',
      kitBefore: 'Scarica il ',
      kitLink: 'kit stampabile',
      kitAfter: ': tabellone A3 (o 4 fogli A4, o versione ridotta A4) e carte. Stampa al 100% e controlla la barra da 100 mm.',
      noPrinter: 'Niente stampante? Usa la galleria (foto sintetiche analizzate da OpenCV) o il simulatore digitale.',
    },
    place: {
      title: '2. Disponi le carte',
      rules: [
        'Una carta per casella della griglia 8×4.',
        'La freccia stampata è la direzione di avanzamento F. Ogni carta riceve dal lato posteriore e invia alla casella vicina in direzione F.',
        'CONDIZIONE: SÌ segue F; NO gira di 90° a destra.',
        'Ogni ramo termina con FINE. Le caselle vuote non collegano nulla.',
      ],
    },
    scan: {
      title: '3. Scansiona, rivedi e approva',
      items: [
        'OpenCV rileva i 4 marcatori d’angolo, calibra la prospettiva e assegna a ogni carta la sua casella e il suo orientamento.',
        'Il compilatore genera l’IR tactiloom-ir/1 con il suo hash sha256, oppure spiega ogni errore indicando riga e colonna.',
        'Il worker effettua un dry-run; tu rivedi input, passaggi ed effetti; approvi con l’hash; il worker esegue.',
      ],
    },
    cards: {
      title: 'Le carte v1',
      card: 'Carta',
      needs: 'Richiede',
      produces: 'Produce / effetto',
      needsByKind: {
        START: '—',
        INPUT_FILE: '—',
        EXTRACT_TEXT: 'documento',
        VALIDATE_FIELDS: 'testo',
        CONDITION: 'convalida',
        CREATE_REPORT: 'testo + convalida',
        SAVE_REPORT: 'report',
        REQUEST_REVIEW: 'convalida',
        END: '—',
      },
      producesByKind: {
        START: 'avvia il flusso',
        INPUT_FILE: 'documento del workspace (sola lettura)',
        EXTRACT_TEXT: 'testo reale del PDF (livello di testo) o TXT',
        VALIDATE_FIELDS: 'Nome, E-mail (formato) e Laboratorio presenti',
        CONDITION: 'un solo ramo: SÌ / NO',
        CREATE_REPORT: 'report Markdown/JSON in memoria',
        SAVE_REPORT: 'file scaricabile in runs/<id>/reports/',
        REQUEST_REVIEW: 'attività di revisione OPEN (senza e-mail)',
        END: 'termina il ramo',
      },
      note: 'Il compilatore verifica che ogni dato esista su ogni percorso che raggiunge una carta (non solo che ci siano frecce).',
    },
    camera: {
      title: 'Fotocamera e compatibilità',
      secureContext: (button: string) => `La fotocamera funziona nei browser moderni con HTTPS o su localhost, e solo dopo aver premuto «${button}».`,
      onePhoto: 'Viene inviata una sola foto per analisi; la foto non viene conservata.',
      fallback: 'Senza autorizzazione o senza fotocamera, puoi caricare una foto del tabellone o usare la galleria.',
      toStudio: 'Vai al Board Studio',
      toSimulator: 'Apri il simulatore',
    },
  },
  help: {
    metaTitle: 'Guida per la giuria',
    title: 'Guida per la giuria',
    intro: 'Valuta Tactiloom in ~5 minuti senza hardware. Ogni passaggio qui sotto è descritto anche in inglese in docs/judge-guide.md.',
    tourTitle: 'Percorso consigliato',
    tour: {
      gallery: {
        before: 'Apri la ',
        link: 'Galleria',
        middle: (button: string) => ` e premi «${button}» su `,
        after: '. Il server rileva le 10 carte dai pixel.',
      },
      overlay: 'Controlla la sovrapposizione (angoli, griglia proiettata, frecce) e la tabella delle carte lette.',
      compiled: {
        before: (section: string) => `In «${section}» vedrai il grafo con due rami e il suo contentHash. Il documento di input predefinito è `,
        after: ' (fittizio).',
      },
      save: (save: string, review: string) => `Premi «${save}» e poi «${review}».`,
      approve: (button: string) => `Rivedi input, passaggi, decisione prevista ed effetti; spunta la casella e premi «${button}». Scarica il report Markdown/JSON.`,
      invalid: {
        before: 'In Workflow Studio cambia il documento in ',
        after: (no: string) => `, salva (nuova versione, nuovo hash) ed esegui: seguirà il ramo ${no} e creerà un’attività di revisione.`,
      },
      broken: {
        before: 'Analizza ',
        or: ' o ',
        after: ': non c’è alcun pulsante di esecuzione e gli errori indicano carta, riga e colonna.',
      },
      simulator: {
        before: 'Nel ',
        link: 'Simulatore',
        after: ' ruota una carta (tasto R) e guarda comparire in tempo reale la diagnostica INCOMPATIBLE_PORTS.',
      },
      history: {
        before: 'Consulta la ',
        link: 'Cronologia',
        after: ': acquisizioni, versioni, esecuzioni, report e revisioni.',
      },
      language:
        'Cambia lingua con il selettore 🌐 nell’intestazione (spagnolo, inglese, italiano o francese) e ripeti il percorso: l’interfaccia e la sovrapposizione di OpenCV seguono la lingua scelta, e così anche il report, perché il parametro «Lingua del report» di CREA REPORT usa per impostazione predefinita la lingua dell’interfaccia.',
    },
    real: {
      title: 'Reale o simulato',
      items: [
        'Visione: reale (OpenCV sui pixel di ogni immagine). Le immagini della galleria sono sintetiche e sono etichettate come tali.',
        'Fotocamera: reale quando la attivi (getUserMedia). I test con carte stampate sono documentati dal team in docs/benchmarking.md.',
        'Simulatore: costruisce il tabellone in digitale; non usa la fotocamera e lo indica sempre.',
        'Esecuzione: reale (worker separato, sandbox per workspace, PDF con livello di testo, report con sha256).',
      ],
    },
    security: {
      title: 'Sicurezza e privacy',
      items: [
        'Catalogo chiuso di 9 azioni; niente shell, niente rete in uscita, niente plugin.',
        'L’esecuzione richiede dry-run + approvazione con contentHash e planHash; il server ricompila e verifica.',
        'Workspace isolato con TTL; le foto non vengono salvate; dati fittizi.',
      ],
      api: { before: 'API documentata in ', middle: '; stato del sistema in ', after: '.' },
    },
  },
  gallery: {
    title: 'Galleria dimostrativa',
    intro: 'Immagini di tabelloni per provare Tactiloom senza fotocamera né stampante.',
    provenance: 'Provenienza: sintetiche — generate dai PDF reali del kit e «fotografate» via software. Non sono acquisizioni fisiche.',
    imageAlt: (title: string) => `Tabellone di esempio: ${title}`,
    expected: 'Esito atteso:',
    compiles: (cards: number) => `si compila (${itCards(cards)})`,
    doesNotCompile: (codes: string) => `non si compila · ${codes}`,
    loadError: 'Impossibile caricare la galleria.',
  },
  history: {
    title: 'Cronologia',
    loading: 'Caricamento della cronologia…',
    loadError: 'Impossibile caricare la cronologia.',
    expires: (date: string) => `Workspace dimostrativo · viene eliminato automaticamente il ${date}.`,
    runs: (n: number) => `Esecuzioni (${n})`,
    branch: (label: string) => `ramo ${label}`,
    noRuns: 'Ancora nessuna esecuzione.',
    artifacts: (n: number) => `Report generati (${n})`,
    noArtifacts: 'Ancora nessun report.',
    reviews: (n: number) => `Attività di revisione (${n})`,
    reviewFields: (missing: string, invalid: string) => `mancanti: ${missing} · non validi: ${invalid}`,
    noReviews: 'Nessuna attività di revisione.',
    versions: (n: number) => `Versioni compilate (${n})`,
    captures: (n: number) => `Acquisizioni analizzate (${n})`,
    cards: itCards,
    calibrated: 'calibrato',
    notCalibrated: 'non calibrato',
    photosNote: 'Le foto non vengono conservate; solo l’esito del rilevamento e lo sha256 dell’immagine.',
    documents: (n: number) => `Documenti (${n})`,
  },
};

/** French uses the singular for 0 and 1. */
const frCards = (n: number) => (n <= 1 ? `${n} carte` : `${n} cartes`);

const fr: PagesMessages = {
  home: {
    conceptLabel: 'Illustration conceptuelle : plateau avec des cartes enchaînées et une branche de révision',
    conceptFalseTurn: (no: string) => `${no} ↓ tourne à droite`,
    conceptCaption: 'Illustration conceptuelle — la vraie démo traite des photos avec OpenCV',
    intro:
      'Tactiloom transforme des cartes physiques à marqueurs ArUco, posées sur un plateau, en un vrai programme : la caméra lit le plateau, un compilateur le traduit en graphe typé et un worker isolé l’exécute sur des documents de test — uniquement après votre approbation.',
    tryDemo: 'Essayer la démo (sans matériel)',
    howItWorks: 'Comment ça marche',
    printKit: 'Imprimer le kit',
    stepsLabel: 'Trois étapes',
    steps: [
      { title: '1 · Imprimez', text: 'Un plateau 8×4 avec 4 marqueurs de coin et des cartes portant de vrais marqueurs ArUco (A3, mosaïque A4 ou version réduite).' },
      { title: '2 · Placez', text: 'Une carte par case. La flèche imprimée indique le flux ; CONDITION envoie OUI tout droit et NON à droite.' },
      { title: '3 · Scannez et exécutez', text: 'OpenCV lit le plateau, le compilateur valide le graphe, vous vérifiez le dry-run et vous approuvez. Ce n’est qu’alors que le worker exécute le flux.' },
    ],
    realTitle: 'Ce qui est réel dans cette démo',
    real: [
      '✓ Les marqueurs sont détectés à partir des pixels (OpenCV 5, DICT_4X4_100, homographie sur 16 coins).',
      '✓ Le graphe est compilé selon des règles géométriques publiques, avec des diagnostics en français.',
      '✓ Le worker extrait le vrai texte du PDF, valide les champs et écrit un rapport téléchargeable dans un sandbox.',
      '✓ Rien ne s’exécute sans un dry-run vérifié et une approbation explicite liée à un hash.',
      '✓ Interface, kit imprimable, rapports et superposition OpenCV en espagnol, anglais, italien et français.',
      '• Les images de la galerie sont de synthèse (rendues à partir du kit) et signalées comme telles.',
      '• Le simulateur construit le plateau numériquement et porte la mention « n’utilise pas de caméra ».',
    ],
    priorArt:
      'Tactiloom n’a pas inventé la programmation tangible : FloBlocks (2025) et Sheets (2015) utilisaient déjà des cartes et une webcam. Ici, nous l’associons à un moteur sûr d’automatisation documentaire, à la traçabilité et à l’approbation.',
  },
  howItWorks: {
    title: 'Comment ça marche',
    intro: 'Trois étapes physiques, un compilateur formel et un exécuteur qui ne fait que ce que vous avez approuvé.',
    print: {
      title: '1. Imprimez le plateau et les cartes',
      kitBefore: 'Téléchargez le ',
      kitLink: 'kit imprimable',
      kitAfter: ' : plateau A3 (ou 4 feuilles A4, ou version réduite A4) et cartes. Imprimez à 100 % et vérifiez la barre de 100 mm.',
      noPrinter: 'Pas d’imprimante ? Utilisez la galerie (photos de synthèse analysées par OpenCV) ou le simulateur numérique.',
    },
    place: {
      title: '2. Placez les cartes',
      rules: [
        'Une carte par case de la grille 8×4.',
        'La flèche imprimée est la direction d’avancement F. Chaque carte reçoit par son côté arrière et transmet à la case voisine dans la direction F.',
        'CONDITION : OUI suit F ; NON tourne de 90° vers la droite.',
        'Chaque branche se termine par FIN. Les cases vides ne relient rien.',
      ],
    },
    scan: {
      title: '3. Scannez, vérifiez et approuvez',
      items: [
        'OpenCV détecte les 4 marqueurs de coin, calibre la perspective et attribue à chaque carte sa case et son orientation.',
        'Le compilateur produit l’IR tactiloom-ir/1 avec son hash sha256, ou explique chaque erreur avec sa ligne et sa colonne.',
        'Le worker effectue un dry-run ; vous vérifiez l’entrée, les étapes et les effets ; vous approuvez avec le hash ; le worker exécute.',
      ],
    },
    cards: {
      title: 'Les cartes v1',
      card: 'Carte',
      needs: 'Nécessite',
      produces: 'Produit / effet',
      needsByKind: {
        START: '—',
        INPUT_FILE: '—',
        EXTRACT_TEXT: 'document',
        VALIDATE_FIELDS: 'texte',
        CONDITION: 'validation',
        CREATE_REPORT: 'texte + validation',
        SAVE_REPORT: 'rapport',
        REQUEST_REVIEW: 'validation',
        END: '—',
      },
      producesByKind: {
        START: 'démarre le flux',
        INPUT_FILE: 'document de l’espace de travail (lecture seule)',
        EXTRACT_TEXT: 'vrai texte du PDF (couche texte) ou du TXT',
        VALIDATE_FIELDS: 'Nom, Courriel (format) et Atelier présents',
        CONDITION: 'une seule branche : OUI / NON',
        CREATE_REPORT: 'rapport Markdown/JSON en mémoire',
        SAVE_REPORT: 'fichier téléchargeable dans runs/<id>/reports/',
        REQUEST_REVIEW: 'tâche de révision OPEN (sans courriel)',
        END: 'termine la branche',
      },
      note: 'Le compilateur vérifie que chaque donnée existe sur tous les chemins qui mènent à une carte (pas seulement qu’il y a des flèches).',
    },
    camera: {
      title: 'Caméra et compatibilité',
      secureContext: (button: string) => `La caméra fonctionne dans les navigateurs récents en HTTPS ou sur localhost, et uniquement après avoir appuyé sur « ${button} ».`,
      onePhoto: 'Une seule photo est envoyée par analyse ; elle n’est pas conservée.',
      fallback: 'Sans autorisation ou sans caméra, vous pouvez téléverser une photo du plateau ou utiliser la galerie.',
      toStudio: 'Aller au Board Studio',
      toSimulator: 'Ouvrir le simulateur',
    },
  },
  help: {
    metaTitle: 'Guide du jury',
    title: 'Guide du jury',
    intro: 'Évaluez Tactiloom en ~5 minutes sans matériel. Chaque étape ci-dessous est aussi décrite en anglais dans docs/judge-guide.md.',
    tourTitle: 'Parcours suggéré',
    tour: {
      gallery: {
        before: 'Ouvrez la ',
        link: 'Galerie',
        middle: (button: string) => ` et appuyez sur « ${button} » pour `,
        after: '. Le serveur détecte les 10 cartes à partir des pixels.',
      },
      overlay: 'Vérifiez la superposition (coins, grille projetée, flèches) et le tableau des cartes lues.',
      compiled: {
        before: (section: string) => `Dans « ${section} », vous verrez le graphe à deux branches et son contentHash. Le document d’entrée par défaut est `,
        after: ' (fictif).',
      },
      save: (save: string, review: string) => `Appuyez sur « ${save} », puis sur « ${review} ».`,
      approve: (button: string) => `Vérifiez l’entrée, les étapes, la décision prévue et les effets ; cochez la case et appuyez sur « ${button} ». Téléchargez le rapport Markdown/JSON.`,
      invalid: {
        before: 'Dans Workflow Studio, remplacez le document par ',
        after: (no: string) => `, enregistrez (nouvelle version, nouveau hash) et exécutez : le flux prend la branche ${no} et crée une tâche de révision.`,
      },
      broken: {
        before: 'Analysez ',
        or: ' ou ',
        after: ' : aucun bouton d’exécution n’apparaît et les erreurs indiquent la carte, la ligne et la colonne.',
      },
      simulator: {
        before: 'Dans le ',
        link: 'Simulateur',
        after: ', faites pivoter une carte (touche R) et observez le diagnostic INCOMPATIBLE_PORTS en direct.',
      },
      history: {
        before: 'Consultez l’',
        link: 'Historique',
        after: ' : captures, versions, exécutions, rapports et révisions.',
      },
      language:
        'Changez de langue avec le sélecteur 🌐 de l’en-tête (espagnol, anglais, italien ou français) et refaites le parcours : l’interface et la superposition OpenCV suivent la langue choisie, de même que le rapport, car le paramètre « Langue du rapport » de CRÉER RAPPORT reprend par défaut la langue de l’interface.',
    },
    real: {
      title: 'Réel ou simulé',
      items: [
        'Vision : réelle (OpenCV sur les pixels de chaque image). Les images de la galerie sont de synthèse et signalées comme telles.',
        'Caméra : réelle quand vous l’activez (getUserMedia). L’équipe documente les tests avec des cartes imprimées dans docs/benchmarking.md.',
        'Simulateur : construit le plateau numériquement ; il n’utilise pas de caméra et l’indique toujours.',
        'Exécution : réelle (worker séparé, sandbox par espace de travail, PDF avec couche texte, rapports avec sha256).',
      ],
    },
    security: {
      title: 'Sécurité et confidentialité',
      items: [
        'Catalogue fermé de 9 actions ; pas de shell, pas de réseau sortant, pas de plugins.',
        'L’exécution exige un dry-run + une approbation avec contentHash et planHash ; le serveur recompile et vérifie.',
        'Espace de travail isolé avec TTL ; les photos ne sont pas conservées ; données fictives.',
      ],
      api: { before: 'API documentée sur ', middle: ' ; état du système sur ', after: '.' },
    },
  },
  gallery: {
    title: 'Galerie de démonstration',
    intro: 'Des images de plateaux pour essayer Tactiloom sans caméra ni imprimante.',
    provenance: 'Provenance : synthétiques — rendues à partir des vrais PDF du kit et « photographiées » par logiciel. Ce ne sont pas des captures physiques.',
    imageAlt: (title: string) => `Plateau d’exemple : ${title}`,
    expected: 'Résultat attendu :',
    compiles: (cards: number) => `compile (${frCards(cards)})`,
    doesNotCompile: (codes: string) => `ne compile pas · ${codes}`,
    loadError: 'Impossible de charger la galerie.',
  },
  history: {
    title: 'Historique',
    loading: 'Chargement de l’historique…',
    loadError: 'Impossible de charger l’historique.',
    expires: (date: string) => `Espace de démonstration · supprimé automatiquement le ${date}.`,
    runs: (n: number) => `Exécutions (${n})`,
    branch: (label: string) => `branche ${label}`,
    noRuns: 'Aucune exécution pour l’instant.',
    artifacts: (n: number) => `Rapports générés (${n})`,
    noArtifacts: 'Aucun rapport pour l’instant.',
    reviews: (n: number) => `Tâches de révision (${n})`,
    reviewFields: (missing: string, invalid: string) => `manquants : ${missing} · invalides : ${invalid}`,
    noReviews: 'Aucune tâche de révision.',
    versions: (n: number) => `Versions compilées (${n})`,
    captures: (n: number) => `Captures analysées (${n})`,
    cards: frCards,
    calibrated: 'calibré',
    notCalibrated: 'non calibré',
    photosNote: 'Les photos ne sont pas conservées ; seuls le résultat de la détection et le sha256 de l’image le sont.',
    documents: (n: number) => `Documents (${n})`,
  },
};

export const pages: Readonly<Record<Locale, PagesMessages>> = { es, en, it, fr };
