import { kitZipName, zipKit } from '@tactiloom/board-kit/manifest';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@tactiloom/contracts';
import { kitFiles, readKitFile } from '@/lib/server/assets';
import { errorResponse, handler } from '@/lib/server/http';

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  svg: 'image/svg+xml',
  json: 'application/json',
  md: 'text/markdown; charset=utf-8',
  zip: 'application/zip',
};

const zipCache = new Map<Locale, Uint8Array>();

/** ZIP of one kit, built only from the files kit-index.json lists for that language. */
async function kitZip(locale: Locale): Promise<Uint8Array> {
  const cached = zipCache.get(locale);
  if (cached) return cached;
  const entries: { name: string; bytes: Uint8Array }[] = [];
  for (const file of await kitFiles(locale)) {
    const found = await readKitFile(locale, file.name);
    if (found) entries.push({ name: file.name, bytes: new Uint8Array(found.bytes) });
  }
  const zip = zipKit(locale, entries);
  zipCache.set(locale, zip);
  return zip;
}

/**
 * `?locale=<es|en|it|fr>&file=<name>`: one file of that kit, or `tactiloom-board-kit-<locale>.zip`.
 * Without `locale` the Spanish kit is served (links issued before the kit was localized keep working).
 */
export const GET = handler(async (request, _context: unknown, requestId) => {
  const params = new URL(request.url).searchParams;
  const requested = params.get('locale');
  if (requested !== null && !isLocale(requested)) return errorResponse(400, 'BAD_REQUEST', 'Idioma del kit no válido.', requestId);
  const locale: Locale = requested ?? DEFAULT_LOCALE;
  const name = params.get('file') ?? '';
  if (name === kitZipName(locale)) {
    const bytes = await kitZip(locale);
    return new Response(new Uint8Array(bytes), {
      headers: { 'content-type': MIME.zip as string, 'content-disposition': `attachment; filename="${kitZipName(locale)}"`, 'x-content-type-options': 'nosniff' },
    });
  }
  const file = await readKitFile(locale, name);
  if (!file) return errorResponse(404, 'NOT_FOUND', 'Archivo del kit no encontrado.', requestId);
  const extension = file.entry.name.split('.').pop() ?? '';
  const inline = params.get('inline') === '1' && extension === 'svg';
  const filename = file.entry.name.split('/').pop() ?? 'kit-file';
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      'content-type': MIME[extension] ?? 'application/octet-stream',
      'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
      'content-language': locale,
      'x-content-type-options': 'nosniff',
      'cache-control': 'public, max-age=3600',
      // SVGs are rendered as images only; never as active documents.
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
});
