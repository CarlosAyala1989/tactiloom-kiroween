import type { CardKind, DataFact, Locale, Orientation } from '@tactiloom/contracts';

type KindText = Readonly<Record<CardKind, string>>;
type ParamTexts = Readonly<Record<string, { readonly label: string; readonly help?: string; readonly options?: Readonly<Record<string, string>> }>>;

/**
 * Closed catalog wording: card kinds, parameter forms, data facts, directions. The Spanish texts
 * match CARD_KIND_SPECS / PARAM_UI in @tactiloom/contracts (canonical); the other languages mirror them.
 */
export interface CatalogMessages {
  readonly kinds: KindText;
  /** Title printed on the virtual tiles (short form). */
  readonly short: KindText;
  readonly description: KindText;
  readonly effect: KindText;
  readonly params: Readonly<Record<CardKind, ParamTexts>>;
  readonly facts: Readonly<Record<DataFact, string>>;
  /** Board corner fiducials 0–3. */
  readonly corners: Readonly<Record<0 | 1 | 2 | 3, string>>;
  /** "north (up)": used after a preposition or alone. */
  readonly direction: Readonly<Record<Orientation, string>>;
  /** "points <toward>". */
  readonly toward: Readonly<Record<Orientation, string>>;
  /** "by its <side> side". */
  readonly side: Readonly<Record<Orientation, string>>;
  readonly port: Readonly<Record<'NEXT' | 'TRUE' | 'FALSE', string>>;
  readonly languages: Readonly<Record<Locale, string>>;
}

const LANGUAGE_OPTIONS = (names: Readonly<Record<Locale, string>>) => ({ es: names.es, en: names.en, it: names.it, fr: names.fr });

const esLanguages = { es: 'Español', en: 'Inglés', it: 'Italiano', fr: 'Francés' } as const;
const es: CatalogMessages = {
  kinds: {
    START: 'Inicio',
    INPUT_FILE: 'Archivo de entrada',
    EXTRACT_TEXT: 'Extraer texto',
    VALIDATE_FIELDS: 'Validar campos',
    CONDITION: 'Condición',
    CREATE_REPORT: 'Crear reporte',
    SAVE_REPORT: 'Guardar reporte',
    REQUEST_REVIEW: 'Solicitar revisión',
    END: 'Fin',
  },
  short: {
    START: 'INICIO',
    INPUT_FILE: 'ARCHIVO',
    EXTRACT_TEXT: 'EXTRAER',
    VALIDATE_FIELDS: 'VALIDAR',
    CONDITION: 'CONDICIÓN',
    CREATE_REPORT: 'REPORTE',
    SAVE_REPORT: 'GUARDAR',
    REQUEST_REVIEW: 'REVISIÓN',
    END: 'FIN',
  },
  description: {
    START: 'Comienzo manual del flujo.',
    INPUT_FILE: 'Incorpora un documento ya subido al workspace.',
    EXTRACT_TEXT: 'Extrae el texto de un TXT o de un PDF con capa de texto.',
    VALIDATE_FIELDS: 'Comprueba la presencia y el formato de los campos obligatorios.',
    CONDITION: '¿Están todos los campos obligatorios? SÍ sigue la flecha; NO gira a la derecha.',
    CREATE_REPORT: 'Genera un reporte Markdown/JSON con los datos extraídos.',
    SAVE_REPORT: 'Guarda el reporte en el sandbox del workspace como artefacto descargable.',
    REQUEST_REVIEW: 'Registra una tarea de revisión con los campos faltantes.',
    END: 'Termina una rama. No tiene salida.',
  },
  effect: {
    START: 'Crea el contexto de ejecución. No modifica archivos.',
    INPUT_FILE: 'Lee un documento del workspace (solo lectura).',
    EXTRACT_TEXT: 'Extrae texto en memoria (solo lectura).',
    VALIDATE_FIELDS: 'Valida campos en memoria. No modifica archivos.',
    CONDITION: 'Elige exactamente una rama (TRUE o FALSE).',
    CREATE_REPORT: 'Genera el contenido del reporte en memoria.',
    SAVE_REPORT: 'Escribe archivos dentro de runs/<runId>/reports/ del workspace.',
    REQUEST_REVIEW: 'Crea una tarea de revisión OPEN en la base de datos (sin correos ni notificaciones).',
    END: 'Finaliza el camino. No hace nada irreversible.',
  },
  params: {
    START: {},
    INPUT_FILE: { uploadedFileId: { label: 'Documento de entrada', help: 'Elige un documento ya subido a tu workspace (PDF con texto o TXT).' } },
    EXTRACT_TEXT: { language: { label: 'Idioma del documento', options: LANGUAGE_OPTIONS(esLanguages) } },
    VALIDATE_FIELDS: { requiredFields: { label: 'Campos obligatorios', options: { name: 'Nombre', email: 'Correo', workshop: 'Taller' } } },
    CONDITION: { predicate: { label: 'Predicado', help: 'v1 solo admite «todos los campos obligatorios presentes» (allRequiredPresent).' } },
    CREATE_REPORT: {
      format: { label: 'Formato del reporte', options: { both: 'Markdown + JSON', markdown: 'Solo Markdown', json: 'Solo JSON' } },
      language: { label: 'Idioma del reporte', options: LANGUAGE_OPTIONS(esLanguages) },
    },
    SAVE_REPORT: { baseName: { label: 'Nombre base de descarga', help: 'Minúsculas, números y guiones (máx. 40). Solo se usa como nombre de descarga.' } },
    REQUEST_REVIEW: { label: { label: 'Etiqueta de la revisión', help: 'Texto corto (máx. 80) que verá quien revise.' } },
    END: {},
  },
  facts: {
    DocumentRef: 'documento de entrada',
    ExtractedText: 'texto extraído',
    ValidationResult: 'resultado de validación',
    Report: 'reporte',
    SavedArtifact: 'artefacto guardado',
    ReviewTask: 'tarea de revisión',
  },
  corners: { 0: 'superior izquierda', 1: 'superior derecha', 2: 'inferior derecha', 3: 'inferior izquierda' },
  direction: { N: 'norte (arriba)', E: 'este (derecha)', S: 'sur (abajo)', W: 'oeste (izquierda)' },
  toward: { N: 'al norte (arriba)', E: 'al este (derecha)', S: 'al sur (abajo)', W: 'al oeste (izquierda)' },
  side: { N: 'norte (arriba)', E: 'este (derecha)', S: 'sur (abajo)', W: 'oeste (izquierda)' },
  port: { NEXT: 'salida', TRUE: 'salida SÍ', FALSE: 'salida NO' },
  languages: esLanguages,
};

const enLanguages = { es: 'Spanish', en: 'English', it: 'Italian', fr: 'French' } as const;
const en: CatalogMessages = {
  kinds: {
    START: 'Start',
    INPUT_FILE: 'Input file',
    EXTRACT_TEXT: 'Extract text',
    VALIDATE_FIELDS: 'Validate fields',
    CONDITION: 'Condition',
    CREATE_REPORT: 'Create report',
    SAVE_REPORT: 'Save report',
    REQUEST_REVIEW: 'Request review',
    END: 'End',
  },
  short: {
    START: 'START',
    INPUT_FILE: 'FILE',
    EXTRACT_TEXT: 'EXTRACT',
    VALIDATE_FIELDS: 'VALIDATE',
    CONDITION: 'CONDITION',
    CREATE_REPORT: 'REPORT',
    SAVE_REPORT: 'SAVE',
    REQUEST_REVIEW: 'REVIEW',
    END: 'END',
  },
  description: {
    START: 'Manual start of the workflow.',
    INPUT_FILE: 'Brings in a document already uploaded to the workspace.',
    EXTRACT_TEXT: 'Extracts the text of a TXT file or of a PDF with a text layer.',
    VALIDATE_FIELDS: 'Checks that the required fields are present and well formed.',
    CONDITION: 'Are all required fields present? YES follows the arrow; NO turns right.',
    CREATE_REPORT: 'Builds a Markdown/JSON report from the extracted data.',
    SAVE_REPORT: 'Saves the report in the workspace sandbox as a downloadable artifact.',
    REQUEST_REVIEW: 'Records a review task listing the missing fields.',
    END: 'Ends a branch. It has no output.',
  },
  effect: {
    START: 'Creates the run context. Does not modify files.',
    INPUT_FILE: 'Reads a workspace document (read-only).',
    EXTRACT_TEXT: 'Extracts text in memory (read-only).',
    VALIDATE_FIELDS: 'Validates fields in memory. Does not modify files.',
    CONDITION: 'Chooses exactly one branch (TRUE or FALSE).',
    CREATE_REPORT: 'Builds the report content in memory.',
    SAVE_REPORT: 'Writes files inside runs/<runId>/reports/ of the workspace.',
    REQUEST_REVIEW: 'Creates an OPEN review task in the database (no e-mails or notifications).',
    END: 'Ends the path. Does nothing irreversible.',
  },
  params: {
    START: {},
    INPUT_FILE: { uploadedFileId: { label: 'Input document', help: 'Choose a document already uploaded to your workspace (PDF with text or TXT).' } },
    EXTRACT_TEXT: { language: { label: 'Document language', options: LANGUAGE_OPTIONS(enLanguages) } },
    VALIDATE_FIELDS: { requiredFields: { label: 'Required fields', options: { name: 'Name', email: 'Email', workshop: 'Workshop' } } },
    CONDITION: { predicate: { label: 'Predicate', help: 'v1 only supports “all required fields present” (allRequiredPresent).' } },
    CREATE_REPORT: {
      format: { label: 'Report format', options: { both: 'Markdown + JSON', markdown: 'Markdown only', json: 'JSON only' } },
      language: { label: 'Report language', options: LANGUAGE_OPTIONS(enLanguages) },
    },
    SAVE_REPORT: { baseName: { label: 'Download base name', help: 'Lowercase letters, digits and hyphens (max. 40). Only used as the download name.' } },
    REQUEST_REVIEW: { label: { label: 'Review label', help: 'Short text (max. 80) shown to the reviewer.' } },
    END: {},
  },
  facts: {
    DocumentRef: 'an input document',
    ExtractedText: 'the extracted text',
    ValidationResult: 'a validation result',
    Report: 'a report',
    SavedArtifact: 'a saved artifact',
    ReviewTask: 'a review task',
  },
  corners: { 0: 'top left', 1: 'top right', 2: 'bottom right', 3: 'bottom left' },
  direction: { N: 'north (up)', E: 'east (right)', S: 'south (down)', W: 'west (left)' },
  toward: { N: 'north (up)', E: 'east (right)', S: 'south (down)', W: 'west (left)' },
  side: { N: 'north (top)', E: 'east (right)', S: 'south (bottom)', W: 'west (left)' },
  port: { NEXT: 'output', TRUE: 'YES output', FALSE: 'NO output' },
  languages: enLanguages,
};

const itLanguages = { es: 'Spagnolo', en: 'Inglese', it: 'Italiano', fr: 'Francese' } as const;
const it: CatalogMessages = {
  kinds: {
    START: 'Inizio',
    INPUT_FILE: 'File di input',
    EXTRACT_TEXT: 'Estrai testo',
    VALIDATE_FIELDS: 'Convalida campi',
    CONDITION: 'Condizione',
    CREATE_REPORT: 'Crea report',
    SAVE_REPORT: 'Salva report',
    REQUEST_REVIEW: 'Richiedi revisione',
    END: 'Fine',
  },
  short: {
    START: 'INIZIO',
    INPUT_FILE: 'FILE',
    EXTRACT_TEXT: 'ESTRAI',
    VALIDATE_FIELDS: 'CONVALIDA',
    CONDITION: 'CONDIZIONE',
    CREATE_REPORT: 'REPORT',
    SAVE_REPORT: 'SALVA',
    REQUEST_REVIEW: 'REVISIONE',
    END: 'FINE',
  },
  description: {
    START: 'Avvio manuale del flusso.',
    INPUT_FILE: 'Acquisisce un documento già caricato nel workspace.',
    EXTRACT_TEXT: 'Estrae il testo da un TXT o da un PDF con livello di testo.',
    VALIDATE_FIELDS: 'Verifica la presenza e il formato dei campi obbligatori.',
    CONDITION: 'Ci sono tutti i campi obbligatori? SÌ segue la freccia; NO gira a destra.',
    CREATE_REPORT: 'Genera un report Markdown/JSON con i dati estratti.',
    SAVE_REPORT: 'Salva il report nella sandbox del workspace come artefatto scaricabile.',
    REQUEST_REVIEW: 'Registra un’attività di revisione con i campi mancanti.',
    END: 'Termina un ramo. Non ha uscita.',
  },
  effect: {
    START: 'Crea il contesto di esecuzione. Non modifica file.',
    INPUT_FILE: 'Legge un documento del workspace (sola lettura).',
    EXTRACT_TEXT: 'Estrae il testo in memoria (sola lettura).',
    VALIDATE_FIELDS: 'Convalida i campi in memoria. Non modifica file.',
    CONDITION: 'Sceglie esattamente un ramo (TRUE o FALSE).',
    CREATE_REPORT: 'Genera il contenuto del report in memoria.',
    SAVE_REPORT: 'Scrive file dentro runs/<runId>/reports/ del workspace.',
    REQUEST_REVIEW: 'Crea un’attività di revisione OPEN nel database (senza e-mail né notifiche).',
    END: 'Conclude il percorso. Non fa nulla di irreversibile.',
  },
  params: {
    START: {},
    INPUT_FILE: { uploadedFileId: { label: 'Documento di input', help: 'Scegli un documento già caricato nel tuo workspace (PDF con testo o TXT).' } },
    EXTRACT_TEXT: { language: { label: 'Lingua del documento', options: LANGUAGE_OPTIONS(itLanguages) } },
    VALIDATE_FIELDS: { requiredFields: { label: 'Campi obbligatori', options: { name: 'Nome', email: 'E-mail', workshop: 'Laboratorio' } } },
    CONDITION: { predicate: { label: 'Predicato', help: 'La v1 supporta solo «tutti i campi obbligatori presenti» (allRequiredPresent).' } },
    CREATE_REPORT: {
      format: { label: 'Formato del report', options: { both: 'Markdown + JSON', markdown: 'Solo Markdown', json: 'Solo JSON' } },
      language: { label: 'Lingua del report', options: LANGUAGE_OPTIONS(itLanguages) },
    },
    SAVE_REPORT: { baseName: { label: 'Nome base del download', help: 'Lettere minuscole, cifre e trattini (max. 40). Usato solo come nome del download.' } },
    REQUEST_REVIEW: { label: { label: 'Etichetta della revisione', help: 'Testo breve (max. 80) che vedrà chi esegue la revisione.' } },
    END: {},
  },
  facts: {
    DocumentRef: 'documento di input',
    ExtractedText: 'testo estratto',
    ValidationResult: 'esito della convalida',
    Report: 'report',
    SavedArtifact: 'artefatto salvato',
    ReviewTask: 'attività di revisione',
  },
  corners: { 0: 'in alto a sinistra', 1: 'in alto a destra', 2: 'in basso a destra', 3: 'in basso a sinistra' },
  direction: { N: 'nord (in alto)', E: 'est (a destra)', S: 'sud (in basso)', W: 'ovest (a sinistra)' },
  toward: { N: 'verso nord (in alto)', E: 'verso est (a destra)', S: 'verso sud (in basso)', W: 'verso ovest (a sinistra)' },
  side: { N: 'nord (in alto)', E: 'est (a destra)', S: 'sud (in basso)', W: 'ovest (a sinistra)' },
  port: { NEXT: 'uscita', TRUE: 'uscita SÌ', FALSE: 'uscita NO' },
  languages: itLanguages,
};

const frLanguages = { es: 'Espagnol', en: 'Anglais', it: 'Italien', fr: 'Français' } as const;
const fr: CatalogMessages = {
  kinds: {
    START: 'Début',
    INPUT_FILE: 'Fichier d’entrée',
    EXTRACT_TEXT: 'Extraire le texte',
    VALIDATE_FIELDS: 'Valider les champs',
    CONDITION: 'Condition',
    CREATE_REPORT: 'Créer le rapport',
    SAVE_REPORT: 'Enregistrer le rapport',
    REQUEST_REVIEW: 'Demander une révision',
    END: 'Fin',
  },
  short: {
    START: 'DÉBUT',
    INPUT_FILE: 'FICHIER',
    EXTRACT_TEXT: 'EXTRAIRE',
    VALIDATE_FIELDS: 'VALIDER',
    CONDITION: 'CONDITION',
    CREATE_REPORT: 'RAPPORT',
    SAVE_REPORT: 'ENREGISTRER',
    REQUEST_REVIEW: 'RÉVISION',
    END: 'FIN',
  },
  description: {
    START: 'Démarrage manuel du flux.',
    INPUT_FILE: 'Intègre un document déjà téléversé dans l’espace de travail.',
    EXTRACT_TEXT: 'Extrait le texte d’un TXT ou d’un PDF doté d’une couche texte.',
    VALIDATE_FIELDS: 'Vérifie la présence et le format des champs obligatoires.',
    CONDITION: 'Tous les champs obligatoires sont-ils présents ? OUI suit la flèche ; NON tourne à droite.',
    CREATE_REPORT: 'Produit un rapport Markdown/JSON à partir des données extraites.',
    SAVE_REPORT: 'Enregistre le rapport dans le sandbox de l’espace de travail comme artefact téléchargeable.',
    REQUEST_REVIEW: 'Enregistre une tâche de révision avec les champs manquants.',
    END: 'Termine une branche. N’a pas de sortie.',
  },
  effect: {
    START: 'Crée le contexte d’exécution. Ne modifie aucun fichier.',
    INPUT_FILE: 'Lit un document de l’espace de travail (lecture seule).',
    EXTRACT_TEXT: 'Extrait le texte en mémoire (lecture seule).',
    VALIDATE_FIELDS: 'Valide les champs en mémoire. Ne modifie aucun fichier.',
    CONDITION: 'Choisit exactement une branche (TRUE ou FALSE).',
    CREATE_REPORT: 'Produit le contenu du rapport en mémoire.',
    SAVE_REPORT: 'Écrit des fichiers dans runs/<runId>/reports/ de l’espace de travail.',
    REQUEST_REVIEW: 'Crée une tâche de révision OPEN dans la base de données (sans courriel ni notification).',
    END: 'Termine le chemin. Ne fait rien d’irréversible.',
  },
  params: {
    START: {},
    INPUT_FILE: { uploadedFileId: { label: 'Document d’entrée', help: 'Choisissez un document déjà téléversé dans votre espace (PDF avec texte ou TXT).' } },
    EXTRACT_TEXT: { language: { label: 'Langue du document', options: LANGUAGE_OPTIONS(frLanguages) } },
    VALIDATE_FIELDS: { requiredFields: { label: 'Champs obligatoires', options: { name: 'Nom', email: 'Courriel', workshop: 'Atelier' } } },
    CONDITION: { predicate: { label: 'Prédicat', help: 'La v1 ne prend en charge que « tous les champs obligatoires présents » (allRequiredPresent).' } },
    CREATE_REPORT: {
      format: { label: 'Format du rapport', options: { both: 'Markdown + JSON', markdown: 'Markdown seul', json: 'JSON seul' } },
      language: { label: 'Langue du rapport', options: LANGUAGE_OPTIONS(frLanguages) },
    },
    SAVE_REPORT: { baseName: { label: 'Nom de base du téléchargement', help: 'Minuscules, chiffres et tirets (max. 40). Sert uniquement de nom de téléchargement.' } },
    REQUEST_REVIEW: { label: { label: 'Libellé de la révision', help: 'Texte court (max. 80) affiché à la personne qui révise.' } },
    END: {},
  },
  facts: {
    DocumentRef: 'document d’entrée',
    ExtractedText: 'texte extrait',
    ValidationResult: 'résultat de validation',
    Report: 'rapport',
    SavedArtifact: 'artefact enregistré',
    ReviewTask: 'tâche de révision',
  },
  corners: { 0: 'en haut à gauche', 1: 'en haut à droite', 2: 'en bas à droite', 3: 'en bas à gauche' },
  direction: { N: 'nord (haut)', E: 'est (droite)', S: 'sud (bas)', W: 'ouest (gauche)' },
  toward: { N: 'vers le nord (haut)', E: 'vers l’est (droite)', S: 'vers le sud (bas)', W: 'vers l’ouest (gauche)' },
  side: { N: 'nord (haut)', E: 'est (droite)', S: 'sud (bas)', W: 'ouest (gauche)' },
  port: { NEXT: 'sortie', TRUE: 'sortie OUI', FALSE: 'sortie NON' },
  languages: frLanguages,
};

export const catalog: Readonly<Record<Locale, CatalogMessages>> = { es, en, it, fr };
