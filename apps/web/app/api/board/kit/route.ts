import { kitTexts } from '@tactiloom/board-kit/browser';
import { kitZipName } from '@tactiloom/board-kit/manifest';
import { DEFAULT_LOCALE } from '@tactiloom/contracts';
import { localeFromRequest } from '@/lib/i18n/server';
import { kitDownloadUrl, kitFiles, kitIndex, type KitIndexEntry } from '@/lib/server/assets';
import { handler, ok } from '@/lib/server/http';

/** The kit in the language of the request (cookie, then Accept-Language): files, ZIP and instructions. */
export const GET = handler(async (request, _context: unknown, requestId) => {
  const locale = localeFromRequest(request);
  const [{ kitVersion }, files] = await Promise.all([kitIndex(), kitFiles(locale)]);
  const view = (file: KitIndexEntry) => ({
    path: file.name,
    locale: file.locale,
    description: file.description,
    bytes: file.bytes,
    sha256: file.sha256,
    url: kitDownloadUrl(locale, file.name),
  });
  return ok(
    {
      kitVersion,
      locale,
      files: files.filter((file) => !file.name.startsWith('cards/')).map(view),
      cards: files.filter((file) => file.name.startsWith('cards/')).map(view),
      zipUrl: kitDownloadUrl(locale, kitZipName(locale)),
      instructions: kitTexts(locale).instructions,
      // Deprecated: Spanish copy kept for clients typed against the previous response; use `instructions`.
      instructionsEs: kitTexts(DEFAULT_LOCALE).instructions,
    },
    requestId,
  );
});
