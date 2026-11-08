import { FIELD_IDS, type FieldId } from '@tactiloom/contracts';
import { z } from 'zod';

export type FieldValues = Record<FieldId, string | null>;

export interface FieldEvidence {
  readonly line: number;
  readonly label: string;
}

export interface ValidationResult {
  readonly fields: FieldValues;
  readonly requiredFields: FieldId[];
  readonly missingFields: FieldId[];
  readonly invalidFields: FieldId[];
  readonly isValid: boolean;
  readonly evidence: Partial<Record<FieldId, FieldEvidence>>;
}

/**
 * Accepted labels per field, in the four supported languages (es, en, it, fr).
 * Matching is case-insensitive and applied to the cleaned label (single spaces).
 */
const LABEL_TO_FIELD: readonly (readonly [RegExp, FieldId])[] = [
  [
    /^(?:nombre(?:\s+completo)?|name|full\s+name|nome(?:\s+completo|\s+e\s+cognome)?|nom(?:\s+complet)?|nom\s+et\s+pr[ée]nom|pr[ée]nom\s+et\s+nom)$/iu,
    'name',
  ],
  [
    /^(?:correo(?:\s+electr[oó]nico)?|e-?mail(?:\s+address)?|posta\s+elettronica|indirizzo\s+e-?mail|courriel|adresse\s+e-?mail|adresse\s+[ée]lectronique)$/iu,
    'email',
  ],
  [/^(?:taller|workshop|laboratorio|atelier)$/iu, 'workshop'],
];

/**
 * "Label: value" at the start of a line (deterministic; no ML, no LLM).
 * French typography puts a (non-breaking) space before the colon: "Nom : Anne".
 */
const LINE_PATTERN = /^[ \t\u00a0\u202f]*([\p{L}][\p{L} .-]{1,30}?)[ \t\u00a0\u202f]*[:：][ \t\u00a0\u202f]*(.*)$/u;
const EMAIL = z.email();
const MAX_VALUE_LENGTH = 200;

function clean(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex -- intentionally strips control characters from untrusted text
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_VALUE_LENGTH);
}

export function extractFields(text: string): { fields: FieldValues; evidence: Partial<Record<FieldId, FieldEvidence>> } {
  const fields: FieldValues = { name: null, email: null, workshop: null };
  const evidence: Partial<Record<FieldId, FieldEvidence>> = {};
  text.split('\n').forEach((line, index) => {
    const match = LINE_PATTERN.exec(line);
    if (!match) return;
    const label = clean(match[1] ?? '');
    const field = LABEL_TO_FIELD.find(([pattern]) => pattern.test(label))?.[1];
    if (!field || fields[field] !== null) return; // first occurrence wins
    const value = clean(match[2] ?? '');
    if (value.length === 0) return;
    fields[field] = value;
    evidence[field] = { line: index + 1, label };
  });
  return { fields, evidence };
}

export function validateFields(text: string, requiredFields: readonly FieldId[]): ValidationResult {
  const { fields, evidence } = extractFields(text);
  const required = FIELD_IDS.filter((field) => requiredFields.includes(field));
  const missingFields = required.filter((field) => fields[field] === null);
  const invalidFields = required.filter((field) => field === 'email' && fields.email !== null && !EMAIL.safeParse(fields.email).success);
  return {
    fields,
    requiredFields: required,
    missingFields,
    invalidFields,
    isValid: missingFields.length === 0 && invalidFields.length === 0,
    evidence,
  };
}

/** Masks an e-mail for logs/event summaries (a***@example.org). */
export function maskEmail(email: string | null): string | null {
  if (email === null) return null;
  const at = email.indexOf('@');
  if (at <= 0) return `${email.slice(0, 1)}***`;
  return `${email.slice(0, 1)}***${email.slice(at)}`;
}
