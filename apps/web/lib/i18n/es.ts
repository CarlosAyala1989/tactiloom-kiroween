/**
 * Central Spanish UI strings (i18n-ready: a future `en.ts` mirrors these keys).
 * Long page copy lives next to each page; shared labels live here.
 */
export const es = {
  appName: 'RitualOS',
  tagline: 'Construye flujos con tus manos. Ejecútalos en tu computadora.',
  nav: {
    studio: 'Estudio',
    simulator: 'Simulador',
    gallery: 'Galería',
    history: 'Historial',
    kit: 'Kit imprimible',
    howItWorks: 'Cómo funciona',
    help: 'Jueces / Ayuda',
  },
  modes: {
    physical: 'Cámara (física)',
    image: 'Imagen (OpenCV)',
    simulator: 'Simulador digital: no utiliza cámara',
  },
  runStatus: {
    DRAFT: 'Borrador — en cola para vista previa',
    COMPILED: 'Verificado — calculando vista previa',
    AWAITING_APPROVAL: 'Esperando tu aprobación',
    QUEUED: 'Aprobado — en cola',
    RUNNING: 'Ejecutando',
    SUCCEEDED: 'Completado',
    FAILED: 'Falló',
    CANCELLED: 'Cancelado',
  },
  severity: { error: 'Error', warning: 'Aviso', info: 'Info' },
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
  orientation: { N: 'norte ↑', E: 'este →', S: 'sur ↓', W: 'oeste ←' },
  fields: { name: 'Nombre', email: 'Correo', workshop: 'Taller' },
  actions: {
    analyze: 'Analizar con OpenCV',
    capture: 'Capturar foto',
    enableCamera: 'Activar cámara',
    stopCamera: 'Detener cámara',
    compile: 'Compilar',
    saveVersion: 'Guardar versión',
    openWorkflow: 'Abrir en Workflow Studio',
    review: 'Revisar y ejecutar (dry-run)',
    approve: 'Aprobar y ejecutar',
    cancel: 'Cancelar',
    download: 'Descargar',
    rotate: 'Girar 90°',
    remove: 'Quitar',
    clear: 'Vaciar tablero',
    upload: 'Subir documento',
    copy: 'Copiar',
  },
  system: {
    vision: 'Visión',
    worker: 'Worker',
    database: 'Base de datos',
    workerDown: 'El worker no está disponible: tu trabajo queda guardado en cola y se procesará cuando vuelva.',
  },
} as const;

export type Dictionary = typeof es;
