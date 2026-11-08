import { boardStateFromLayout, compile, describeIrEs, LINEAR_LAYOUT, OFFICIAL_TWO_BRANCH_LAYOUT, type LayoutEntry } from '@tactiloom/compiler';
import { CARD_KIND_SPECS, CARD_KINDS, LOCALE_INTL_TAGS, LOCALES, PARAM_UI, type Locale, type WorkflowIR } from '@tactiloom/contracts';
import { describe, expect, it } from 'vitest';
import { DICTIONARIES } from '../lib/i18n';
import { describeSteps } from '../lib/i18n/steps';

const OTHER_LOCALES = ['en', 'it', 'fr'] as const;

function irOf(layout: readonly LayoutEntry[]): WorkflowIR {
  const result = compile(boardStateFromLayout(layout), {});
  if (!result.ir) throw new Error(`layout does not compile: ${result.diagnostics.map((d) => d.code).join(', ')}`);
  return result.ir;
}

const stepsIn = (ir: WorkflowIR, locale: Locale) => describeSteps(ir, DICTIONARIES[locale], LOCALE_INTL_TAGS[locale]);

describe('describeSteps: textual alternative of the diagram in the UI language', () => {
  const layouts = [
    ['official two-branch', OFFICIAL_TWO_BRANCH_LAYOUT],
    ['linear', LINEAR_LAYOUT],
  ] as const;

  describe.each(layouts)('%s layout', (_name, layout) => {
    const ir = irOf(layout);
    const spanish = stepsIn(ir, 'es');

    it('Spanish is byte-identical to describeIrEs', () => {
      expect(spanish).toEqual(describeIrEs(ir));
    });

    it.each(OTHER_LOCALES)('%s keeps the walk and leaves no Spanish behind', (locale) => {
      const t = DICTIONARIES[locale];
      const tag = LOCALE_INTL_TAGS[locale];
      const steps = stepsIn(ir, locale);
      expect(steps.map(({ depth, nodeId }) => `${depth}:${nodeId}`)).toEqual(spanish.map(({ depth, nodeId }) => `${depth}:${nodeId}`));
      const nodes = new Map(ir.nodes.map((node) => [node.id, node]));
      steps.forEach((step, index) => {
        const node = nodes.get(step.nodeId);
        if (!node) throw new Error(`unknown node ${step.nodeId}`);
        const es = spanish[index]?.text ?? '';
        const prefix = es.startsWith('Si SÍ: ') ? t.workflow.steps.ifYes : es.startsWith('Si NO: ') ? t.workflow.steps.ifNo : '';
        const label = t.catalog.kinds[node.kind].toLocaleUpperCase(tag);
        expect(step.text).toBe(`${prefix}#${node.markerId} ${label}${t.workflow.steps.at}(${node.layout.row},${node.layout.col}) — ${t.catalog.description[node.kind]}`);
        expect(step.text).not.toMatch(/^Si (SÍ|NO): /);
        expect(step.text).not.toContain(CARD_KIND_SPECS[node.kind].descriptionEs);
        // Some names coincide (FIN is also French): only a differing Spanish name, as a whole word, is a leftover.
        const spanishLabel = CARD_KIND_SPECS[node.kind].labelEs.toUpperCase();
        if (label !== spanishLabel) expect(step.text).not.toMatch(new RegExp(`#${node.markerId} ${spanishLabel}(?!\\p{L})`, 'u'));
      });
    });
  });

  it('walks the official layout depth-first from START, TRUE branch before FALSE', () => {
    const spanish = stepsIn(irOf(OFFICIAL_TWO_BRANCH_LAYOUT), 'es');
    expect(spanish.map(({ depth, nodeId }) => `${depth}:${nodeId}`)).toEqual([
      '0:start-10',
      '0:input-11',
      '0:extract-12',
      '0:validate-13',
      '0:condition-14',
      '1:report-15',
      '1:save-16',
      '1:end-17',
      '1:review-18',
      '1:end-19',
    ]);
  });

  it('uses the agreed branch prefixes and connectives per language', () => {
    const ir = irOf(OFFICIAL_TWO_BRANCH_LAYOUT);
    const text = (locale: Locale, nodeId: string) => stepsIn(ir, locale).find((step) => step.nodeId === nodeId)?.text;
    expect(text('es', 'report-15')).toBe('Si SÍ: #15 CREAR REPORTE en (0,5) — Genera un reporte Markdown/JSON con los datos extraídos.');
    expect(text('en', 'start-10')).toBe('#10 START at (0,0) — Manual start of the workflow.');
    expect(text('en', 'report-15')).toBe('If YES: #15 CREATE REPORT at (0,5) — Builds a Markdown/JSON report from the extracted data.');
    expect(text('en', 'review-18')).toBe('If NO: #18 REQUEST REVIEW at (1,4) — Records a review task listing the missing fields.');
    expect(text('it', 'report-15')).toBe('Se SÌ: #15 CREA REPORT in (0,5) — Genera un report Markdown/JSON con i dati estratti.');
    expect(text('it', 'review-18')).toBe('Se NO: #18 RICHIEDI REVISIONE in (1,4) — Registra un’attività di revisione con i campi mancanti.');
    expect(text('fr', 'report-15')).toBe('Si OUI : #15 CRÉER LE RAPPORT en (0,5) — Produit un rapport Markdown/JSON à partir des données extraites.');
    expect(text('fr', 'review-18')).toBe('Si NON : #18 DEMANDER UNE RÉVISION en (1,4) — Enregistre une tâche de révision avec les champs manquants.');
  });
});

describe('Spanish texts of the workflow screens are unchanged (the Playwright suite asserts them)', () => {
  const es = DICTIONARIES.es;
  const w = es.workflow;

  it('keeps the asserted strings', () => {
    expect(w.compile.valid).toBe('✓ Programa válido');
    expect(w.compile.invalid).toBe('✕ El tablero no compila');
    expect(w.compile.saveAndOpen(es.actions.saveVersion)).toBe('Guardar versión y abrir Workflow Studio');
    expect(w.documents.label(es.catalog.short.INPUT_FILE)).toBe('Documento de entrada (tarjeta ARCHIVO)');
    expect(es.catalog.params.INPUT_FILE.uploadedFileId?.label).toBe('Documento de entrada');
    expect(w.version.valid).toBe('✓ válido');
    expect(w.version.invalid).toBe('✕ inválido');
    expect(w.version.notCompiling).toContain('no existe botón de ejecución');
    expect(w.run.review.decisionValue(es.branch.TRUE, 'TRUE')).toBe('SÍ (rama TRUE)');
    expect(w.run.review.decisionValue(es.branch.FALSE, 'FALSE')).toBe('NO (rama FALSE)');
    expect(w.run.result.planMatched).toBe('✓ La ejecución siguió exactamente el plan aprobado.');
    expect(w.run.back(2)).toBe('← Workflow Studio (v2)');
  });

  it('keeps the composed texts', () => {
    expect(w.steps.summary(w.steps.title)).toBe('Programa en texto (alternativa accesible al diagrama)');
    expect(w.steps.legend(es.catalog.kinds.CONDITION)).toBe('Leyenda: «Si SÍ» = rama TRUE (sigue la flecha); «Si NO» = rama FALSE (gira a la derecha). Condición solo ejecuta una rama.');
    expect(w.run.review.predicate(es.catalog.kinds.CONDITION.toLocaleUpperCase(LOCALE_INTL_TAGS.es))).toBe('CONDICIÓN «todos los campos obligatorios presentes» =');
    expect(w.run.review.confirm('P', 'H').join('')).toBe('He revisado la entrada, los pasos y los efectos. Autorizo ejecutar exactamente este programa (P) con este plan (H).');
    expect(w.run.result.toReport(es.branch.TRUE)).toBe('SÍ → reporte');
    expect(w.run.result.toReview(es.branch.FALSE)).toBe('NO → revisión');
    expect(w.run.result.reviewTask('OPEN', 'Revisión manual', 'workshop', '—').join('')).toBe('Tarea de revisión OPEN · «Revisión manual» · faltan: workshop · inválidos: —');
    expect(w.version.diff.added(15, '(0,5)')).toBe('+ #15 en (0,5)');
    expect(w.params.readonlyLabel('Predicado')).toBe('Predicado:');
    expect(es.catalog.short).toEqual({
      START: 'INICIO',
      INPUT_FILE: 'ARCHIVO',
      EXTRACT_TEXT: 'EXTRAER',
      VALIDATE_FIELDS: 'VALIDAR',
      CONDITION: 'CONDICIÓN',
      CREATE_REPORT: 'REPORTE',
      SAVE_REPORT: 'GUARDAR',
      REQUEST_REVIEW: 'REVISIÓN',
      END: 'FIN',
    });
  });

  it('parameter forms and effect lines read the same Spanish as the PARAM_UI / CARD_KIND_SPECS contracts', () => {
    for (const kind of CARD_KINDS) {
      expect(es.catalog.kinds[kind]).toBe(CARD_KIND_SPECS[kind].labelEs);
      expect(es.catalog.effect[kind]).toBe(CARD_KIND_SPECS[kind].effectEs);
      for (const field of PARAM_UI[kind]) {
        const text = es.catalog.params[kind][field.key];
        expect(text?.label).toBe(field.labelEs);
        expect(text?.help).toBe(field.helpEs);
        for (const option of field.options ?? []) expect(text?.options?.[option.value]).toBe(option.labelEs);
      }
    }
  });
});

describe('workflow dictionary in English, Italian and French', () => {
  /** Leaves whose text may legitimately equal the Spanish one: product names, symbols, cognates. */
  const SAME_AS_SPANISH: Readonly<Record<string, readonly Locale[]>> = {
    'params.readonlyLabel': ['en', 'it'],
    'diagram.states.predicted': ['it'],
    'diagram.states.succeeded': ['en', 'it', 'fr'],
    'steps.at': ['fr'],
    'steps.separator': ['en', 'it', 'fr'],
    'version.eyebrow': ['en', 'it', 'fr'],
    'version.diff.added': ['fr'],
    'run.back': ['en', 'it', 'fr'],
    'run.reviewTitle': ['en', 'it', 'fr'],
    'run.monitorTitle': ['en', 'it', 'fr'],
    'run.planLabel': ['en', 'fr'],
    'run.previewPhase': ['it', 'fr'],
    'run.review.fieldColumn': ['it'],
    'run.review.ok': ['en', 'it', 'fr'],
  };

  /** Every leaf as text: functions are called with sample arguments (rich-text tuples are joined). */
  function leaves(value: unknown, path = ''): [string, string][] {
    if (typeof value === 'string') return [[path, value]];
    if (typeof value === 'function') {
      const output: unknown = (value as (...args: string[]) => unknown)('A', 'B', 'C', 'D');
      return [[path, Array.isArray(output) ? output.join('') : String(output)]];
    }
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) => leaves(child, path ? `${path}.${key}` : key));
    return [];
  }

  const spanish = new Map(leaves(DICTIONARIES.es.workflow));

  it.each(OTHER_LOCALES)('%s translates every text (no Spanish copies)', (locale) => {
    const translated = leaves(DICTIONARIES[locale].workflow);
    expect(translated.map(([path]) => path)).toEqual([...spanish.keys()]);
    const copies = translated.filter(([path, text]) => text === spanish.get(path) && !SAME_AS_SPANISH[path]?.includes(locale)).map(([path]) => path);
    expect(copies).toEqual([]);
    for (const [, text] of translated) expect(text.trim()).not.toBe('');
  });

  it('keeps product names and the raw review-task status and field ids in every language', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(t.workflow.compile.saveAndOpen(t.actions.saveVersion)).toContain('Workflow Studio');
      expect(t.workflow.run.back(1)).toContain('Workflow Studio');
      const line = t.workflow.run.result.reviewTask('OPEN', 'Revisión manual', 'workshop', '—').join('');
      expect(line).toContain('OPEN');
      expect(line).toContain('workshop');
    }
  });
});
