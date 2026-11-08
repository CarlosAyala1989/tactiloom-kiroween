import { Worker } from 'node:worker_threads';
import { EngineError } from './errors';
import { sniffMime } from './sniff';

export { SUPPORTED_MIME, sniffMime, type SupportedMime } from './sniff';

export interface ExtractedText {
  readonly text: string;
  readonly method: 'txt' | 'pdf-text-layer';
  readonly pages: number;
  readonly chars: number;
}

/** Content sniffing lives in ./sniff (re-exported above). */

export interface ExtractionLimits {
  readonly timeoutMs: number;
  readonly maxPages: number;
  readonly maxChars: number;
}

function normalise(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').normalize('NFC');
}

function extractPdfIsolated(bytes: Uint8Array, limits: ExtractionLimits): Promise<{ text: string; totalPages: number }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./pdf-worker.mjs', import.meta.url), {
      workerData: { bytes: Buffer.from(bytes), maxPages: limits.maxPages },
      // The parser of untrusted PDFs gets no secrets (empty environment) and bounded memory.
      env: {},
      resourceLimits: { maxOldGenerationSizeMb: 192, maxYoungGenerationSizeMb: 48, stackSizeMb: 4 },
    });
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      fn();
    };
    const timer = setTimeout(
      () => finish(() => reject(new EngineError('EXTRACTION_FAILED', `La extracción del PDF superó ${limits.timeoutMs} ms.`))),
      limits.timeoutMs,
    );
    worker.once('message', (message: { ok: boolean; text?: string; totalPages?: number; code?: string; message?: string }) => {
      finish(() => {
        if (message.ok) resolve({ text: message.text ?? '', totalPages: message.totalPages ?? 0 });
        else reject(new EngineError(message.code === 'FILE_TOO_LARGE' ? 'FILE_TOO_LARGE' : 'EXTRACTION_FAILED', message.message ?? 'PDF ilegible.'));
      });
    });
    worker.once('error', () => finish(() => reject(new EngineError('EXTRACTION_FAILED', 'El PDF no pudo procesarse (límite de recursos o archivo dañado).'))));
    worker.once('exit', (code) => {
      if (code !== 0) finish(() => reject(new EngineError('EXTRACTION_FAILED', 'El proceso de extracción terminó inesperadamente.')));
    });
  });
}

/** Real text extraction: UTF-8 TXT or PDF text layer (pdf.js in an isolated worker). Never invents text. */
export async function extractDocumentText(bytes: Uint8Array, declaredMime: string, limits: ExtractionLimits): Promise<ExtractedText> {
  const sniffed = sniffMime(bytes);
  if (sniffed === null || sniffed !== declaredMime) {
    throw new EngineError('UNSUPPORTED_FILE_TYPE', 'Tipo de archivo no soportado: usa un PDF con capa de texto o un TXT (UTF-8).');
  }
  if (sniffed === 'text/plain') {
    const text = normalise(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
    if (text.length > limits.maxChars) throw new EngineError('FILE_TOO_LARGE', 'El texto supera el máximo de caracteres permitido.');
    return { text, method: 'txt', pages: 1, chars: text.length };
  }
  const { text: raw, totalPages } = await extractPdfIsolated(bytes, limits);
  const text = normalise(raw);
  if (text.replace(/\s+/g, '').length < 10) {
    throw new EngineError('PDF_NO_TEXT_LAYER', 'PDF sin capa de texto; OCR no disponible. Sube un PDF con texto seleccionable o un TXT.');
  }
  if (text.length > limits.maxChars) throw new EngineError('FILE_TOO_LARGE', 'El texto extraído supera el máximo permitido.');
  return { text, method: 'pdf-text-layer', pages: totalPages, chars: text.length };
}
