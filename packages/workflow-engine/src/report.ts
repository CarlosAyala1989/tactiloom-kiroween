import { FIELD_IDS, FIELD_LABELS_ES } from '@ritualos/contracts';
import type { ValidationResult } from './fields';

export interface ReportInput {
  readonly runId: string;
  readonly nodeId: string;
  readonly generatedAt: Date;
  readonly document: { readonly originalName: string; readonly sha256: string; readonly mime: string };
  readonly validation: ValidationResult;
  readonly format: 'markdown' | 'json' | 'both';
  readonly extraction: { readonly method: string; readonly pages: number; readonly chars: number };
}

export interface RenderedReport {
  readonly markdown: string | null;
  readonly json: string | null;
}

/** Escapes Markdown/HTML-significant characters so extracted values render as plain text. */
export function escapeMarkdown(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[\\`*_{}[\]()#+\-.!|<>~=&"']/g, (char) => `\\${char}`);
}

function fieldStatus(validation: ValidationResult, field: (typeof FIELD_IDS)[number]): string {
  if (!validation.requiredFields.includes(field)) return validation.fields[field] === null ? 'no requerido' : 'presente (no requerido)';
  if (validation.missingFields.includes(field)) return 'FALTA';
  if (validation.invalidFields.includes(field)) return 'formato inválido';
  return 'válido';
}

/** workshop-summary-v1: Markdown and/or JSON built only from data actually extracted. */
export function renderReport(input: ReportInput): RenderedReport {
  const { validation } = input;
  const generatedAt = input.generatedAt.toISOString();
  const markdown =
    input.format === 'json'
      ? null
      : [
          '# Reporte de solicitud de taller',
          '',
          `- **Ejecución:** \`${input.runId}\``,
          `- **Nodo:** \`${input.nodeId}\``,
          `- **Generado:** ${generatedAt}`,
          `- **Documento:** ${escapeMarkdown(input.document.originalName)} (sha256 \`${input.document.sha256.slice(0, 16)}…\`)`,
          `- **Extracción:** ${input.extraction.method}, ${input.extraction.pages} página(s), ${input.extraction.chars} caracteres`,
          `- **Resultado de validación:** ${validation.isValid ? 'VÁLIDA — todos los campos obligatorios presentes' : 'INCOMPLETA'}`,
          '',
          '| Campo | Valor extraído | Estado |',
          '|---|---|---|',
          ...FIELD_IDS.map((field) => {
            const value = validation.fields[field];
            return `| ${FIELD_LABELS_ES[field]} | ${value === null ? '—' : escapeMarkdown(value)} | ${fieldStatus(validation, field)} |`;
          }),
          '',
          '> Generado por RitualOS (plantilla workshop-summary-v1). Documento de demostración con datos ficticios.',
          '',
        ].join('\n');
  const json =
    input.format === 'markdown'
      ? null
      : `${JSON.stringify(
          {
            reportVersion: 'workshop-summary-v1',
            runId: input.runId,
            nodeId: input.nodeId,
            generatedAt,
            document: input.document,
            extraction: input.extraction,
            fields: validation.fields,
            requiredFields: validation.requiredFields,
            missingFields: validation.missingFields,
            invalidFields: validation.invalidFields,
            isValid: validation.isValid,
          },
          null,
          2,
        )}\n`;
  return { markdown, json };
}
