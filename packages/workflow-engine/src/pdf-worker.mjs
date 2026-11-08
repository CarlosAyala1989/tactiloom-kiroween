// Isolated PDF text extraction (worker thread with resource limits; killed on timeout).
// Plain JavaScript on purpose: it must load without the TypeScript toolchain.
import { parentPort, workerData } from 'node:worker_threads';
import { extractText, getDocumentProxy } from 'unpdf';

const { bytes, maxPages } = workerData;

try {
  // isEvalSupported: false hardens pdf.js against font-program code execution (CVE-2024-4367 class).
  const pdf = await getDocumentProxy(new Uint8Array(bytes), {
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    stopAtErrors: true,
    // Text extraction does not need glyph rendering; silence font-data warnings (errors still surface).
    verbosity: 0,
  });
  if (pdf.numPages > maxPages) {
    parentPort.postMessage({ ok: false, code: 'FILE_TOO_LARGE', message: `El PDF tiene ${pdf.numPages} páginas (máximo ${maxPages}).` });
  } else {
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    parentPort.postMessage({ ok: true, totalPages, text });
  }
} catch (error) {
  const message = error && typeof error === 'object' && 'name' in error ? String(error.name) : 'error';
  parentPort.postMessage({ ok: false, code: 'EXTRACTION_FAILED', message: `PDF ilegible o dañado (${message}).` });
}
