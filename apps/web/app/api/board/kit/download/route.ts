import { zipSync } from 'fflate';
import { kitManifest, readKitFile } from '@/lib/server/assets';
import { errorResponse, handler } from '@/lib/server/http';

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  svg: 'image/svg+xml',
  json: 'application/json',
  md: 'text/markdown; charset=utf-8',
  zip: 'application/zip',
};

let zipCache: Uint8Array | undefined;

async function kitZip(): Promise<Uint8Array> {
  if (zipCache) return zipCache;
  const manifest = await kitManifest();
  const entries: Record<string, Uint8Array> = {};
  for (const file of manifest.files) {
    const found = await readKitFile(file.path);
    if (found) entries[`ritualos-board-kit/${file.path}`] = new Uint8Array(found.bytes);
  }
  const manifestFile = await readKitFile('kit-manifest.json');
  if (manifestFile) entries['ritualos-board-kit/kit-manifest.json'] = new Uint8Array(manifestFile.bytes);
  zipCache = zipSync(entries, { level: 6, mtime: new Date('2026-11-01T00:00:00Z') });
  return zipCache;
}

export const GET = handler(async (request, _context: unknown, requestId) => {
  const name = new URL(request.url).searchParams.get('file') ?? '';
  if (name === 'ritualos-board-kit.zip') {
    const bytes = await kitZip();
    return new Response(new Uint8Array(bytes), {
      headers: { 'content-type': MIME.zip as string, 'content-disposition': 'attachment; filename="ritualos-board-kit.zip"', 'x-content-type-options': 'nosniff' },
    });
  }
  const file = await readKitFile(name);
  if (!file) return errorResponse(404, 'NOT_FOUND', 'Archivo del kit no encontrado.', requestId);
  const extension = name.split('.').pop() ?? '';
  const inline = new URL(request.url).searchParams.get('inline') === '1' && extension === 'svg';
  const filename = name.split('/').pop() ?? 'kit-file';
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      'content-type': MIME[extension] ?? 'application/octet-stream',
      'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'public, max-age=3600',
      // SVGs are rendered as images only; never as active documents.
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
});
