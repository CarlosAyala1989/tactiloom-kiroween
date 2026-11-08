/**
 * `pnpm --filter @ritualos/board-kit examples` — fictitious workshop applications used by the demo.
 * PDFs are generated with a real text layer (pdf-lib), plus TXT twins and an image-only PDF
 * (no text layer) to exercise the PDF_NO_TEXT_LAYER path. All data is fictitious.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const outDir = join(root, 'assets', 'examples', 'documents');
const FIXED_DATE = new Date('2026-11-01T00:00:00.000Z');

interface ApplicationDoc {
  readonly file: string;
  readonly lines: readonly string[];
  readonly expected: {
    readonly fields: { name: string | null; email: string | null; workshop: string | null };
    readonly missingFields: readonly string[];
    readonly invalidFields: readonly string[];
    readonly isValid: boolean;
    readonly branch: 'TRUE' | 'FALSE';
  };
}

const VALID: ApplicationDoc = {
  file: 'valid-application',
  lines: [
    'Solicitud de participación - Taller RitualOS',
    'Documento ficticio para demostración (no contiene datos reales).',
    '',
    'Nombre: Ana Ejemplo Ríos',
    'Correo: ana.ejemplo@example.org',
    'Taller: Diseño de procesos con tarjetas',
    'Fecha preferida: 2026-11-20',
    'Comentarios: Me interesa automatizar la revisión de solicitudes.',
  ],
  expected: {
    fields: { name: 'Ana Ejemplo Ríos', email: 'ana.ejemplo@example.org', workshop: 'Diseño de procesos con tarjetas' },
    missingFields: [],
    invalidFields: [],
    isValid: true,
    branch: 'TRUE',
  },
};

const INVALID: ApplicationDoc = {
  file: 'invalid-application',
  lines: [
    'Solicitud de participación - Taller RitualOS',
    'Documento ficticio para demostración (no contiene datos reales).',
    '',
    'Nombre: Bruno Prueba Díaz',
    'Correo: bruno.prueba-arroba-example.org',
    'Fecha preferida: 2026-11-21',
    'Comentarios: Olvidé indicar el taller.',
  ],
  expected: {
    fields: { name: 'Bruno Prueba Díaz', email: 'bruno.prueba-arroba-example.org', workshop: null },
    missingFields: ['workshop'],
    invalidFields: ['email'],
    isValid: false,
    branch: 'FALSE',
  },
};

async function textPdf(doc: ApplicationDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create({ updateMetadata: false });
  pdf.setTitle(`RitualOS ${doc.file} (ficticio)`);
  pdf.setProducer('RitualOS examples (pdf-lib 1.17.1)');
  pdf.setCreator('RitualOS');
  pdf.setCreationDate(FIXED_DATE);
  pdf.setModificationDate(FIXED_DATE);
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 780;
  doc.lines.forEach((line, index) => {
    page.drawText(line, { x: 60, y, size: index === 0 ? 16 : 12, font: index === 0 ? bold : regular, color: rgb(0.1, 0.1, 0.12) });
    y -= index === 0 ? 30 : 22;
  });
  return pdf.save({ useObjectStreams: false });
}

function crc32(bytes: Uint8Array): number {
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Small grayscale PNG with horizontal "text-like" strokes (no real text). */
function scanLikePng(width: number, height: number): Buffer {
  const raw = Buffer.alloc((width + 1) * height, 255);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width + 1)] = 0; // filter: none
    const inLine = y % 24 >= 8 && y % 24 <= 13 && y > 30 && y < height - 30;
    for (let x = 0; x < width; x += 1) {
      const ink = inLine && x > 40 && x < width - 40 && (Math.floor(x / 9) + Math.floor(y / 24)) % 7 !== 0;
      raw[y * (width + 1) + 1 + x] = ink ? 40 : 245;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // grayscale
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array()),
  ]);
}

async function imageOnlyPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create({ updateMetadata: false });
  pdf.setTitle('RitualOS scanned-application (sin capa de texto, ficticio)');
  pdf.setProducer('RitualOS examples (pdf-lib 1.17.1)');
  pdf.setCreator('RitualOS');
  pdf.setCreationDate(FIXED_DATE);
  pdf.setModificationDate(FIXED_DATE);
  const page = pdf.addPage([595.28, 841.89]);
  const image = await pdf.embedPng(scanLikePng(480, 360));
  page.drawImage(image, { x: 57, y: 400, width: 480, height: 360 });
  return pdf.save({ useObjectStreams: false });
}

mkdirSync(outDir, { recursive: true });
const manifest = [];
for (const doc of [VALID, INVALID]) {
  writeFileSync(join(outDir, `${doc.file}.pdf`), await textPdf(doc));
  writeFileSync(join(outDir, `${doc.file}.txt`), `${doc.lines.join('\n')}\n`, 'utf8');
  manifest.push({ file: `assets/examples/documents/${doc.file}.pdf`, mime: 'application/pdf', ...doc.expected });
  manifest.push({ file: `assets/examples/documents/${doc.file}.txt`, mime: 'text/plain', ...doc.expected });
}
writeFileSync(join(outDir, 'scanned-application.pdf'), await imageOnlyPdf());
manifest.push({ file: 'assets/examples/documents/scanned-application.pdf', mime: 'application/pdf', error: 'PDF_NO_TEXT_LAYER' });
writeFileSync(
  join(outDir, 'expected-documents.json'),
  `${JSON.stringify({ note: 'Datos ficticios. Resultados esperados del motor para cada documento.', documents: manifest }, null, 2)}\n`,
  'utf8',
);
console.log(`examples: ${manifest.length} documentos en assets/examples/documents`);
