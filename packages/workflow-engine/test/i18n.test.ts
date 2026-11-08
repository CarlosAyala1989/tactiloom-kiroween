import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LOCALES, PlannedEffectSchema, type FieldId, type Locale } from '@tactiloom/contracts';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMITS, extractDocumentText, extractFields, renderReport, runWorkflow, validateFields, type ValidationResult } from '../src/index';
import { REPORT_STRINGS } from '../src/report';
import { exampleDocument, harness, officialIr, ROOT } from './helpers';

const RUN_ID = 'run_i18n_0001';
const ALL_FIELDS: FieldId[] = ['name', 'email', 'workshop'];

interface ExpectedDocument {
  readonly file: string;
  readonly mime: string;
  readonly locale?: Locale;
  readonly fields?: Record<FieldId, string | null>;
  readonly missingFields?: FieldId[];
  readonly invalidFields?: FieldId[];
  readonly isValid?: boolean;
  readonly branch?: 'TRUE' | 'FALSE';
  readonly error?: string;
}

async function expectedDocuments(): Promise<ExpectedDocument[]> {
  const manifest = JSON.parse(await readFile(join(ROOT, 'assets', 'examples', 'documents', 'expected-documents.json'), 'utf8')) as { documents: ExpectedDocument[] };
  return manifest.documents;
}

function demoFile(kind: 'valid' | 'invalid', locale: Locale): string {
  return locale === 'es' ? `${kind}-application.pdf` : `${kind}-application-${locale}.pdf`;
}

describe('field labels in es/en/it/fr', () => {
  it('every demo document (PDF text layer and TXT) yields the expected fields — the manifest is only the oracle', async () => {
    const documents = (await expectedDocuments()).filter((doc) => doc.fields !== undefined);
    expect(new Set(documents.map((doc) => doc.locale))).toEqual(new Set(LOCALES));
    expect(documents).toHaveLength(LOCALES.length * 4); // valid + invalid, PDF + TXT
    for (const doc of documents) {
      const file = doc.file.split('/').at(-1) as string;
      const resolved = await exampleDocument(file, 'doc');
      const text = await extractDocumentText(resolved.bytes, resolved.mime, DEFAULT_LIMITS.extraction);
      const validation = validateFields(text.text, ALL_FIELDS);
      expect(validation.fields, file).toEqual(doc.fields);
      expect(validation.missingFields, file).toEqual(doc.missingFields);
      expect(validation.invalidFields, file).toEqual(doc.invalidFields);
      expect(validation.isValid, file).toBe(doc.isValid);
    }
  });

  it('accepts the usual label variants and French spacing before the colon', () => {
    const cases: [string, FieldId, string][] = [
      ['Nombre completo: Ana', 'name', 'Ana'],
      ['Full name: Alice', 'name', 'Alice'],
      ['Nome e cognome: Anna', 'name', 'Anna'],
      ['Nom et prénom : Anne', 'name', 'Anne'],
      ['Prénom et nom\u00a0: Anne', 'name', 'Anne'],
      ['Nom complet\u202f: Anne', 'name', 'Anne'],
      ['Correo electrónico: a@example.org', 'email', 'a@example.org'],
      ['E-mail address: a@example.org', 'email', 'a@example.org'],
      ['Posta elettronica: a@example.org', 'email', 'a@example.org'],
      ['Indirizzo e-mail: a@example.org', 'email', 'a@example.org'],
      ['Adresse électronique : a@example.org', 'email', 'a@example.org'],
      ['ADRESSE E-MAIL : a@example.org', 'email', 'a@example.org'],
      ['Laboratorio: Carte', 'workshop', 'Carte'],
      ['  Atelier\u00a0:\u00a0Cartes', 'workshop', 'Cartes'],
    ];
    for (const [line, field, value] of cases) {
      expect(extractFields(line).fields[field], line).toBe(value);
    }
  });

  it('does not guess: unknown or partial labels are ignored', () => {
    for (const line of ['Name of the company: ACME', 'Nominativo: Anna', 'Mail: a@example.org', 'Ateliers : X', 'Nom: ', 'Nom : ']) {
      expect(Object.values(extractFields(line).fields), line).toEqual([null, null, null]);
    }
  });
});

describe('localized reports (workshop-summary-v1)', () => {
  const validation: ValidationResult = {
    fields: { name: 'Ana Ejemplo Ríos', email: 'ana.ejemplo@example.org', workshop: null },
    requiredFields: ['name', 'email', 'workshop'],
    missingFields: ['workshop'],
    invalidFields: [],
    isValid: false,
    evidence: {},
  };
  const input = {
    runId: RUN_ID,
    nodeId: 'report-15',
    generatedAt: new Date('2026-11-08T12:00:00.000Z'),
    document: { originalName: 'valid-application.pdf', sha256: 'ab'.repeat(32), mime: 'application/pdf' },
    validation,
    format: 'both' as const,
    extraction: { method: 'pdf-text-layer', pages: 1, chars: 321 },
  };

  it('keeps the pre-i18n Spanish Markdown byte for byte when no language is given', () => {
    const golden = [
      '# Reporte de solicitud de taller',
      '',
      `- **Ejecución:** \`${RUN_ID}\``,
      '- **Nodo:** `report-15`',
      '- **Generado:** 2026-11-08T12:00:00.000Z',
      `- **Documento:** valid\\-application\\.pdf (sha256 \`${'ab'.repeat(8)}…\`)`,
      '- **Extracción:** pdf-text-layer, 1 página(s), 321 caracteres',
      '- **Resultado de validación:** INCOMPLETA',
      '',
      '| Campo | Valor extraído | Estado |',
      '|---|---|---|',
      '| Nombre | Ana Ejemplo Ríos | válido |',
      '| Correo | ana\\.ejemplo@example\\.org | válido |',
      '| Taller | — | FALTA |',
      '',
      '> Generado por Tactiloom (plantilla workshop-summary-v1). Documento de demostración con datos ficticios.',
      '',
    ].join('\n');
    expect(renderReport(input).markdown).toBe(golden);
    expect(renderReport({ ...input, language: 'es' }).markdown).toBe(golden);
  });

  it('renders every language with its own strings and language-neutral JSON keys', () => {
    const jsonKeys = Object.keys(JSON.parse(renderReport(input).json ?? '{}') as object);
    for (const language of LOCALES) {
      const strings = REPORT_STRINGS[language];
      const report = renderReport({ ...input, language });
      expect(report.markdown?.startsWith(`# ${strings.title}\n`), language).toBe(true);
      expect(report.markdown).toContain(`| ${strings.fields.workshop} | — | ${strings.status.missing} |`);
      expect(report.markdown).toContain(strings.incomplete);
      expect(report.markdown).toContain(strings.footer);
      const json = JSON.parse(report.json ?? '{}') as Record<string, unknown>;
      expect(Object.keys(json)).toEqual(jsonKeys);
      expect(json.language).toBe(language);
      expect(json.missingFields).toEqual(['workshop']);
    }
  });

  it('executes the official program with an English report for the English demo document', async () => {
    const h = await harness();
    const doc = await exampleDocument(demoFile('valid', 'en'), 'doc_en');
    const ir = officialIr('doc_en', undefined, { 'report-15': { language: 'en' } });
    expect(ir.nodes.find((node) => node.id === 'report-15')?.params).toEqual({ template: 'workshop-summary-v1', format: 'both', language: 'en' });
    const outcome = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' }, h.ports({ doc_en: doc }));
    expect(outcome.status).toBe('SUCCEEDED');
    expect(outcome.decision?.port).toBe('TRUE');
    const markdown = await readFile(join(h.sandbox.root, h.workspaceId, 'runs', RUN_ID, 'reports', 'save-16.md'), 'utf8');
    expect(markdown).toContain('# Workshop application report');
    expect(markdown).toContain('Alice Sample Rivers');
    expect(markdown).toContain('VALID — all required fields present');
    expect(markdown).not.toContain('Reporte');
    const json = JSON.parse(await readFile(join(h.sandbox.root, h.workspaceId, 'runs', RUN_ID, 'reports', 'save-16.json'), 'utf8')) as Record<string, unknown>;
    expect(json.language).toBe('en');
    expect(h.events.find((event) => event.nodeId === 'report-15' && event.status === 'SUCCEEDED')?.safeInputSummary).toEqual({ format: 'both', language: 'en' });
  });

  it('takes both branches with the Italian and French demo documents', async () => {
    for (const locale of ['it', 'fr'] as const) {
      for (const [kind, branch] of [
        ['valid', 'TRUE'],
        ['invalid', 'FALSE'],
      ] as const) {
        const h = await harness();
        const ir = officialIr('doc', undefined, { 'report-15': { language: locale } });
        const outcome = await runWorkflow(
          { ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'dry-run' },
          h.ports({ doc: await exampleDocument(demoFile(kind, locale), 'doc') }),
        );
        expect(outcome.decision?.port, `${locale} ${kind}`).toBe(branch);
        if (branch === 'TRUE') expect(outcome.plan?.reportPreview).toContain(`# ${REPORT_STRINGS[locale].title}`);
      }
    }
  });
});

describe('structured effect params (localized plan rendering)', () => {
  it('WRITE_ARTIFACT carries format, size and file name; CREATE_REVIEW_TASK carries label and fields', async () => {
    const h = await harness();
    const ir = officialIr('doc');
    const valid = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'dry-run' }, h.ports({ doc: await exampleDocument('valid-application.pdf', 'doc') }));
    const written = valid.plan?.effects ?? [];
    expect(written.map((effect) => effect.params)).toEqual([
      { format: 'md', bytes: expect.any(Number), fileName: `workshop-report-${RUN_ID.slice(-8)}.md` },
      { format: 'json', bytes: expect.any(Number), fileName: `workshop-report-${RUN_ID.slice(-8)}.json` },
    ]);
    for (const effect of written) {
      expect(PlannedEffectSchema.safeParse(effect).success).toBe(true);
      expect(effect.descriptionEs).toContain(`(${String(effect.params?.bytes)} bytes)`);
    }

    const invalid = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'dry-run' }, h.ports({ doc: await exampleDocument('invalid-application.pdf', 'doc') }));
    expect(invalid.plan?.effects.map((effect) => effect.params)).toEqual([{ label: 'Revisión manual', missing: ['workshop'], invalid: ['email'] }]);
  });

  it('the report language is part of the approved plan (changing it changes contentHash and planHash)', async () => {
    const h = await harness();
    const docs = { doc: await exampleDocument('valid-application.pdf', 'doc') };
    const es = officialIr('doc');
    const fr = officialIr('doc', undefined, { 'report-15': { language: 'fr' } });
    expect(fr.contentHash).not.toBe(es.contentHash);
    const planEs = await runWorkflow({ ir: es, expectedContentHash: es.contentHash, runId: RUN_ID, mode: 'dry-run' }, h.ports(docs));
    const planFr = await runWorkflow({ ir: fr, expectedContentHash: fr.contentHash, runId: RUN_ID, mode: 'dry-run' }, h.ports(docs));
    expect(planFr.plan?.planHash).not.toBe(planEs.plan?.planHash);
  });
});
