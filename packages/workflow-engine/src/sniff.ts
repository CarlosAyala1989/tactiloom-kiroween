export const SUPPORTED_MIME = ['application/pdf', 'text/plain'] as const;
export type SupportedMime = (typeof SUPPORTED_MIME)[number];

/**
 * Content sniffing: the declared MIME must match the bytes (extensions are never trusted).
 * TXT is accepted only if the WHOLE buffer is valid UTF-8 without NUL bytes (inputs are ≤ 10 MB).
 */
export function sniffMime(bytes: Uint8Array): SupportedMime | null {
  if (bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-') return 'application/pdf';
  if (bytes.length === 0 || bytes.includes(0)) return null;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return 'text/plain';
  } catch {
    return null;
  }
}
