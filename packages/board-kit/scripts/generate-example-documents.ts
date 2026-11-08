/**
 * `pnpm --filter @tactiloom/board-kit examples` — fictitious workshop applications used by the demo.
 * PDFs are generated with a real text layer (pdf-lib), plus TXT twins and an image-only PDF
 * (no text layer) to exercise the PDF_NO_TEXT_LAYER path. All data is fictitious.
 * One valid + one invalid application per language (es keeps the original unsuffixed file names).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import type { Locale } from '@tactiloom/contracts';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const outDir = join(root, 'assets', 'examples', 'documents');
const FIXED_DATE = new Date('2026-11-01T00:00:00.000Z');

interface ApplicationDoc {
  readonly file: string;
  readonly locale: Locale;
  readonly lines: readonly string[];
  readonly expected: {
    readonly fields: { name: string | null; email: string | null; workshop: string | null };
    readonly missingFields: readonly string[];
    readonly invalidFields: readonly string[];
    readonly isValid: boolean;
    readonly branch: 'TRUE' | 'FALSE';
  };
}

const VALID_EXPECTED = { missingFields: [], invalidFields: [], isValid: true, branch: 'TRUE' } as const;
const INVALID_EXPECTED = { missingFields: ['workshop'], invalidFields: ['email'], isValid: false, branch: 'FALSE' } as const;
/** French typography: non-breaking space before the colon ("Nom : …"). The extractor accepts it. */
const NBSP = '\u00a0';

const DOCUMENTS: readonly ApplicationDoc[] = [
  {
    file: 'valid-application',
    locale: 'es',
    lines: [
      'Solicitud de participación - Taller Tactiloom',
      'Documento ficticio para demostración (no contiene datos reales).',
      '',
      'Nombre: Ana Ejemplo Ríos',
      'Correo: ana.ejemplo@example.org',
      'Taller: Diseño de procesos con tarjetas',
      'Fecha preferida: 2026-11-20',
      'Comentarios: Me interesa automatizar la revisión de solicitudes.',
    ],
    expected: { fields: { name: 'Ana Ejemplo Ríos', email: 'ana.ejemplo@example.org', workshop: 'Diseño de procesos con tarjetas' }, ...VALID_EXPECTED },
  },
  {
    file: 'invalid-application',
    locale: 'es',
    lines: [
      'Solicitud de participación - Taller Tactiloom',
      'Documento ficticio para demostración (no contiene datos reales).',
      '',
      'Nombre: Bruno Prueba Díaz',
      'Correo: bruno.prueba-arroba-example.org',
      'Fecha preferida: 2026-11-21',
      'Comentarios: Olvidé indicar el taller.',
    ],
    expected: { fields: { name: 'Bruno Prueba Díaz', email: 'bruno.prueba-arroba-example.org', workshop: null }, ...INVALID_EXPECTED },
  },
  {
    file: 'valid-application-en',
    locale: 'en',
    lines: [
      'Application form - Tactiloom workshop',
      'Fictitious document for demonstration purposes (contains no real data).',
      '',
      'Name: Alice Sample Rivers',
      'Email: alice.sample@example.org',
      'Workshop: Process design with cards',
      'Preferred date: 2026-11-20',
      'Comments: I would like to automate the review of applications.',
    ],
    expected: { fields: { name: 'Alice Sample Rivers', email: 'alice.sample@example.org', workshop: 'Process design with cards' }, ...VALID_EXPECTED },
  },
  {
    file: 'invalid-application-en',
    locale: 'en',
    lines: [
      'Application form - Tactiloom workshop',
      'Fictitious document for demonstration purposes (contains no real data).',
      '',
      'Name: Bruno Test Diaz',
      'Email: bruno.test-at-example.org',
      'Preferred date: 2026-11-21',
      'Comments: I forgot to state which session I want to join.',
    ],
    expected: { fields: { name: 'Bruno Test Diaz', email: 'bruno.test-at-example.org', workshop: null }, ...INVALID_EXPECTED },
  },
  {
    file: 'valid-application-it',
    locale: 'it',
    lines: [
      'Domanda di partecipazione - Laboratorio Tactiloom',
      'Documento fittizio a scopo dimostrativo (non contiene dati reali).',
      '',
      'Nome: Anna Esempio Rossi',
      'E-mail: anna.esempio@example.org',
      'Laboratorio: Progettazione di processi con le carte',
      'Data preferita: 2026-11-20',
      'Commenti: Mi interessa automatizzare la revisione delle domande.',
    ],
    expected: {
      fields: { name: 'Anna Esempio Rossi', email: 'anna.esempio@example.org', workshop: 'Progettazione di processi con le carte' },
      ...VALID_EXPECTED,
    },
  },
  {
    file: 'invalid-application-it',
    locale: 'it',
    lines: [
      'Domanda di partecipazione - Laboratorio Tactiloom',
      'Documento fittizio a scopo dimostrativo (non contiene dati reali).',
      '',
      'Nome: Bruno Prova Bianchi',
      'E-mail: bruno.prova-chiocciola-example.org',
      'Data preferita: 2026-11-21',
      'Commenti: Ho dimenticato di indicare la sessione.',
    ],
    expected: { fields: { name: 'Bruno Prova Bianchi', email: 'bruno.prova-chiocciola-example.org', workshop: null }, ...INVALID_EXPECTED },
  },
  {
    file: 'valid-application-fr',
    locale: 'fr',
    lines: [
      'Demande d’inscription - Atelier Tactiloom',
      'Document fictif à des fins de démonstration (ne contient aucune donnée réelle).',
      '',
      `Nom${NBSP}: Anne Exemple Martin`,
      `Courriel${NBSP}: anne.exemple@example.org`,
      `Atelier${NBSP}: Conception de processus avec des cartes`,
      `Date souhaitée${NBSP}: 2026-11-20`,
      `Commentaires${NBSP}: Je souhaite automatiser l’examen des demandes.`,
    ],
    expected: {
      fields: { name: 'Anne Exemple Martin', email: 'anne.exemple@example.org', workshop: 'Conception de processus avec des cartes' },
      ...VALID_EXPECTED,
    },
  },
  {
    file: 'invalid-application-fr',
    locale: 'fr',
    lines: [
      'Demande d’inscription - Atelier Tactiloom',
      'Document fictif à des fins de démonstration (ne contient aucune donnée réelle).',
      '',
      `Nom${NBSP}: Bruno Essai Dubois`,
      `Courriel${NBSP}: bruno.essai-arobase-example.org`,
      `Date souhaitée${NBSP}: 2026-11-21`,
      `Commentaires${NBSP}: J’ai oublié d’indiquer la session.`,
    ],
    expected: { fields: { name: 'Bruno Essai Dubois', email: 'bruno.essai-arobase-example.org', workshop: null }, ...INVALID_EXPECTED },
  },
];

const FICTITIOUS: Readonly<Record<Locale, string>> = { es: 'ficticio', en: 'fictitious', it: 'fittizio', fr: 'fictif' };

async function textPdf(doc: ApplicationDoc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create({ updateMetadata: false });
  pdf.setTitle(`Tactiloom ${doc.file} (${FICTITIOUS[doc.locale]})`);
  pdf.setLanguage(doc.locale);
  pdf.setProducer('Tactiloom examples (pdf-lib 1.17.1)');
  pdf.setCreator('Tactiloom');
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
  pdf.setTitle('Tactiloom scanned-application (sin capa de texto, ficticio)');
  pdf.setProducer('Tactiloom examples (pdf-lib 1.17.1)');
  pdf.setCreator('Tactiloom');
  pdf.setCreationDate(FIXED_DATE);
  pdf.setModificationDate(FIXED_DATE);
  const page = pdf.addPage([595.28, 841.89]);
  const image = await pdf.embedPng(scanLikePng(480, 360));
  page.drawImage(image, { x: 57, y: 400, width: 480, height: 360 });
  return pdf.save({ useObjectStreams: false });
}

mkdirSync(outDir, { recursive: true });
const manifest = [];
for (const doc of DOCUMENTS) {
  writeFileSync(join(outDir, `${doc.file}.pdf`), await textPdf(doc));
  writeFileSync(join(outDir, `${doc.file}.txt`), `${doc.lines.join('\n')}\n`, 'utf8');
  manifest.push({ file: `assets/examples/documents/${doc.file}.pdf`, mime: 'application/pdf', locale: doc.locale, ...doc.expected });
  manifest.push({ file: `assets/examples/documents/${doc.file}.txt`, mime: 'text/plain', locale: doc.locale, ...doc.expected });
}
writeFileSync(join(outDir, 'scanned-application.pdf'), await imageOnlyPdf());
manifest.push({ file: 'assets/examples/documents/scanned-application.pdf', mime: 'application/pdf', error: 'PDF_NO_TEXT_LAYER' });
writeFileSync(
  join(outDir, 'expected-documents.json'),
  `${JSON.stringify({ note: 'Datos ficticios. Resultados esperados del motor para cada documento.', documents: manifest }, null, 2)}\n`,
  'utf8',
);
console.log(`examples: ${manifest.length} documentos en assets/examples/documents`);
