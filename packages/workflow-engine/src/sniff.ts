export const SUPPORTED_MIME = ['application/pdf', 'text/plain'] as const;
export type SupportedMime = (typeof SUPPORTED_MIME)[number];

/** Content sniffing: the declared MIME must match the bytes (extensions are never trusted). */
export function sniffMime(bytes: Uint8Array): SupportedMime | null {
  if (bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-') return 'application/pdf';
  if (bytes.length === 0) return null;
  const sample = bytes.subarray(0, Math.min(bytes.length, 8192));
  for (const byte of sample) {
    if (byte === 0) return null; // binary
  }
  try {
    // stream: true tolerates a multi-byte sequence cut at the sample boundary.
    new TextDecoder('utf-8', { fatal: true }).decode(sample, { stream: sample.length < bytes.length });
    return 'text/plain';
  } catch {
    return null;
  }
}
