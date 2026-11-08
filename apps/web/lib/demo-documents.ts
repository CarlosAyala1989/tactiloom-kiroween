import type { Locale } from '@tactiloom/contracts';

/**
 * Name of the fictitious demo application in a given language (see assets/examples/documents).
 * Spanish keeps the original unsuffixed names.
 */
export function demoDocumentName(kind: 'valid' | 'invalid', locale: Locale): string {
  return locale === 'es' ? `${kind}-application.pdf` : `${kind}-application-${locale}.pdf`;
}
