import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

export type CanonicalJson =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJson[]
  | { readonly [key: string]: CanonicalJson };

/**
 * Deterministic JSON serialisation (subset of RFC 8785 / JCS): object keys sorted by
 * UTF-16 code units, no whitespace, arrays keep their order (callers sort them canonically).
 * Rejects undefined, functions, non-finite numbers and non-plain objects so the hash cannot
 * silently depend on lossy conversions.
 */
export function canonicalStringify(value: unknown): string {
  return serialize(value, '$');
}

function serialize(value: unknown, path: string): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError(`Número no finito en ${path}`);
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
    case 'string':
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) {
        return `[${value.map((item, index) => serialize(item, `${path}[${index}]`)).join(',')}]`;
      }
      const prototype = Object.getPrototypeOf(value) as unknown;
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(`Objeto no plano en ${path}`);
      }
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort();
      return `{${keys.map((key) => `${JSON.stringify(key)}:${serialize(record[key], `${path}.${key}`)}`).join(',')}}`;
    }
    default:
      throw new TypeError(`Tipo no serializable (${typeof value}) en ${path}`);
  }
}

export function sha256Hex(text: string): string {
  return bytesToHex(sha256(utf8ToBytes(text)));
}

export function sha256HexBytes(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}

/** `sha256:<hex>` of the canonical serialisation. */
export function canonicalHash(value: unknown): string {
  return `sha256:${sha256Hex(canonicalStringify(value))}`;
}

export const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;
