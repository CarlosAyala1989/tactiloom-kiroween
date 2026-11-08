import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { LINEAR_LAYOUT } from '@tactiloom/compiler';
import { describe, expect, it } from 'vitest';
import { runWorkflow, sha256Hex } from '../src/index';
import { exampleDocument, harness, officialIr } from './helpers';

const RUN_ID = 'run_test_0001';

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (current: string, prefix: string) => {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) await walk(join(current, entry.name), `${prefix}${entry.name}/`);
      else out.push(`${prefix}${entry.name}`);
    }
  };
  await walk(dir, '');
  return out.sort();
}

describe('execute mode — official two-branch program', () => {
  it('valid document → TRUE branch → real Markdown + JSON report in the sandbox', async () => {
    const h = await harness();
    const doc = await exampleDocument('valid-application.pdf', 'doc_valid');
    const ir = officialIr('doc_valid');
    const outcome = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' }, h.ports({ doc_valid: doc }));
    expect(outcome.failure).toBeNull();
    expect(outcome.status).toBe('SUCCEEDED');
    expect(outcome.path.map((p) => p.nodeId)).toEqual(['start-10', 'input-11', 'extract-12', 'validate-13', 'condition-14', 'report-15', 'save-16', 'end-17']);
    expect(outcome.decision).toEqual({ nodeId: 'condition-14', predicate: 'allRequiredPresent', result: true, port: 'TRUE' });
    expect(outcome.validation?.fields).toEqual({ name: 'Ana Ejemplo Ríos', email: 'ana.ejemplo@example.org', workshop: 'Diseño de procesos con tarjetas' });
    expect(h.reviews.size).toBe(0);

    const files = await listFiles(join(h.sandbox.root, h.workspaceId));
    expect(files).toEqual([`runs/${RUN_ID}/reports/save-16.json`, `runs/${RUN_ID}/reports/save-16.md`]);
    const markdown = await readFile(join(h.sandbox.root, h.workspaceId, 'runs', RUN_ID, 'reports', 'save-16.md'), 'utf8');
    expect(markdown).toContain('# Reporte de solicitud de taller');
    expect(markdown).toContain('Ana Ejemplo Ríos');
    expect(markdown).toContain('ana\\.ejemplo@example\\.org');
    expect(markdown).toContain('VÁLIDA');
    const json = JSON.parse(await readFile(join(h.sandbox.root, h.workspaceId, 'runs', RUN_ID, 'reports', 'save-16.json'), 'utf8'));
    expect(json).toMatchObject({ reportVersion: 'workshop-summary-v1', runId: RUN_ID, isValid: true, missingFields: [] });
    expect(json.document.sha256).toBe(doc.sha256);
    for (const artifact of outcome.artifacts) {
      const bytes = await readFile(join(h.sandbox.root, h.workspaceId, artifact.relativePath));
      expect(sha256Hex(bytes)).toBe(artifact.sha256);
    }
    // events: STARTED + SUCCEEDED for every executed node, nothing for the FALSE branch
    expect(h.events.filter((e) => e.status === 'SUCCEEDED').map((e) => e.nodeId)).toEqual(outcome.path.map((p) => p.nodeId));
    expect(h.events.some((e) => e.nodeId === 'review-18')).toBe(false);
    expect(JSON.stringify(h.events)).not.toContain('ana.ejemplo@example.org'); // masked in summaries
  });

  it('invalid document → FALSE branch → real ReviewTask, no report', async () => {
    const h = await harness();
    const doc = await exampleDocument('invalid-application.pdf', 'doc_invalid');
    const ir = officialIr('doc_invalid');
    const outcome = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' }, h.ports({ doc_invalid: doc }));
    expect(outcome.status).toBe('SUCCEEDED');
    expect(outcome.path.map((p) => p.nodeId).slice(-2)).toEqual(['review-18', 'end-19']);
    expect(outcome.validation).toMatchObject({ missingFields: ['workshop'], invalidFields: ['email'], isValid: false });
    expect([...h.reviews.values()].map((r) => [r.nodeId, r.missingFields, r.invalidFields])).toEqual([['review-18', ['workshop'], ['email']]]);
    expect(await listFiles(join(h.sandbox.root, h.workspaceId))).toEqual([]);
  });

  it('TXT input follows the same path as the PDF', async () => {
    const h = await harness();
    const ir = officialIr('doc_txt');
    const outcome = await runWorkflow(
      { ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' },
      h.ports({ doc_txt: await exampleDocument('valid-application.txt', 'doc_txt') }),
    );
    expect(outcome.decision?.result).toBe(true);
  });

  it('retrying the same run does not duplicate artifacts or review tasks (idempotency)', async () => {
    const h = await harness();
    const docs = { doc_valid: await exampleDocument('valid-application.pdf', 'doc_valid') };
    const ir = officialIr('doc_valid');
    const first = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' }, h.ports(docs));
    const second = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' }, h.ports(docs));
    expect(second.status).toBe('SUCCEEDED');
    expect(first.artifacts.every((a) => a.created)).toBe(true);
    expect(second.artifacts.every((a) => !a.created)).toBe(true);
    expect(second.artifacts.map((a) => a.sha256)).toEqual(first.artifacts.map((a) => a.sha256));
    expect(await listFiles(join(h.sandbox.root, h.workspaceId))).toHaveLength(2);
  });

  it('linear flow always produces a report, marked INCOMPLETA for an invalid document', async () => {
    const h = await harness();
    const ir = officialIr('doc_invalid', LINEAR_LAYOUT);
    const outcome = await runWorkflow(
      { ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' },
      h.ports({ doc_invalid: await exampleDocument('invalid-application.txt', 'doc_invalid') }),
    );
    expect(outcome.status).toBe('SUCCEEDED');
    const markdown = await readFile(join(h.sandbox.root, h.workspaceId, 'runs', RUN_ID, 'reports', 'save-26.md'), 'utf8');
    expect(markdown).toContain('INCOMPLETA');
    expect(markdown).toContain('FALTA');
  });
});

describe('dry-run mode', () => {
  it('predicts effects without writing files or creating review tasks; plan hash is deterministic', async () => {
    for (const [file, branch] of [
      ['valid-application.pdf', 'TRUE'],
      ['invalid-application.pdf', 'FALSE'],
    ] as const) {
      const h = await harness();
      const docs = { doc: await exampleDocument(file, 'doc') };
      const ir = officialIr('doc');
      const a = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'dry-run' }, h.ports(docs));
      const b = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'dry-run' }, h.ports(docs));
      expect(a.status).toBe('SUCCEEDED');
      expect(a.plan?.decision?.port).toBe(branch);
      expect(a.plan?.planHash).toBe(b.plan?.planHash);
      expect(await listFiles(h.sandbox.root)).toEqual([]);
      expect(h.reviews.size).toBe(0);
      expect(h.events.every((e) => e.status === 'PREDICTED')).toBe(true);
      if (branch === 'TRUE') {
        expect(a.plan?.effects.map((e) => [e.kind, e.target])).toEqual([
          ['WRITE_ARTIFACT', `runs/${RUN_ID}/reports/save-16.md`],
          ['WRITE_ARTIFACT', `runs/${RUN_ID}/reports/save-16.json`],
        ]);
        expect(a.plan?.reportPreview).toContain('Ana Ejemplo Ríos');
      } else {
        expect(a.plan?.effects.map((e) => e.kind)).toEqual(['CREATE_REVIEW_TASK']);
      }
      // Executing after the dry-run follows exactly the predicted path.
      const executed = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' }, h.ports(docs));
      expect(executed.plan?.planHash).toBe(a.plan?.planHash);
    }
  });

  it('changing the input document changes the plan hash', async () => {
    const h = await harness();
    const ir = officialIr('doc');
    const valid = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'dry-run' }, h.ports({ doc: await exampleDocument('valid-application.pdf', 'doc') }));
    const txt = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'dry-run' }, h.ports({ doc: await exampleDocument('valid-application.txt', 'doc') }));
    expect(valid.plan?.planHash).not.toBe(txt.plan?.planHash);
  });
});

describe('safety and failure modes', () => {
  it('rejects a tampered IR before running any node', async () => {
    const h = await harness();
    const ir = structuredClone(officialIr('doc'));
    (ir.nodes.find((n) => n.id === 'validate-13')!.params as { requiredFields: string[] }).requiredFields = ['name'];
    const outcome = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' }, h.ports({}));
    expect(outcome.status).toBe('FAILED');
    expect(outcome.failure?.code).toBe('IR_HASH_MISMATCH');
    expect(h.events).toEqual([]);
  });

  it('rejects an IR that is not the approved version', async () => {
    const h = await harness();
    const ir = officialIr('doc');
    const outcome = await runWorkflow({ ir, expectedContentHash: `sha256:${'a'.repeat(64)}`, runId: RUN_ID, mode: 'execute' }, h.ports({}));
    expect(outcome.failure?.code).toBe('IR_HASH_MISMATCH');
    expect(h.events).toEqual([]);
  });

  it('rejects arbitrary objects as programs', async () => {
    const h = await harness();
    const outcome = await runWorkflow({ ir: { nodes: [{ kind: 'SHELL', command: 'rm -rf /' }] }, expectedContentHash: 'x', runId: RUN_ID, mode: 'execute' }, h.ports({}));
    expect(outcome.failure?.code).toBe('IR_INVALID');
  });

  it('fails at INPUT_FILE when no document is selected', async () => {
    const h = await harness();
    const ir = officialIr(null);
    const outcome = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' }, h.ports({}));
    expect(outcome.failure).toMatchObject({ code: 'INPUT_NOT_SELECTED', nodeId: 'input-11' });
  });

  it('fails clearly on a PDF without text layer (never invents fields)', async () => {
    const h = await harness();
    const ir = officialIr('doc');
    const outcome = await runWorkflow(
      { ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' },
      h.ports({ doc: await exampleDocument('scanned-application.pdf', 'doc') }),
    );
    expect(outcome.status).toBe('FAILED');
    expect(outcome.failure).toMatchObject({ code: 'PDF_NO_TEXT_LAYER', nodeId: 'extract-12' });
    expect(outcome.validation).toBeNull();
    expect(h.events.at(-1)).toMatchObject({ status: 'FAILED', errorCode: 'PDF_NO_TEXT_LAYER' });
  });

  it('honours cancellation between nodes', async () => {
    const h = await harness();
    const ir = officialIr('doc');
    let calls = 0;
    const outcome = await runWorkflow(
      { ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' },
      h.ports({ doc: await exampleDocument('valid-application.pdf', 'doc') }, { isCancelled: async () => ++calls > 3 }),
    );
    expect(outcome.status).toBe('CANCELLED');
    expect(outcome.path).toHaveLength(3);
  });

  it('enforces the maximum run duration', async () => {
    const h = await harness();
    const ir = officialIr('doc');
    const slow = h.ports({}, { resolveDocument: () => new Promise((resolve) => setTimeout(resolve, 2_000)) as never });
    const outcome = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute', limits: { maxDurationMs: 200 } }, slow);
    expect(outcome.failure?.code).toBe('RUN_TIMEOUT');
  });

  it('does not report SUCCEEDED when the promised artifact does not exist', async () => {
    const h = await harness();
    const ir = officialIr('doc');
    const ports = h.ports(
      { doc: await exampleDocument('valid-application.pdf', 'doc') },
      {
        saveArtifact: async (input) => ({ artifactId: 'x', nodeId: input.nodeId, type: input.type, safeName: input.safeName, relativePath: input.relativePath, size: 0, sha256: '', created: true }),
      },
    );
    const outcome = await runWorkflow({ ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' }, ports);
    expect(outcome.status).toBe('FAILED');
    expect(outcome.failure?.code).toBe('PRECONDITION_FAILED');
  });

  it('escapes Markdown/HTML from extracted values in the report', async () => {
    const h = await harness();
    const hostile = new TextEncoder().encode('Nombre: <script>alert(1)</script> **x** [l](http://evil)\nCorreo: a@example.org\nTaller: T\n');
    const ir = officialIr('doc');
    await runWorkflow(
      { ir, expectedContentHash: ir.contentHash, runId: RUN_ID, mode: 'execute' },
      h.ports({ doc: { uploadedFileId: 'doc', originalName: 'h.txt', mime: 'text/plain', bytes: hostile, sha256: sha256Hex(hostile) } }),
    );
    const markdown = await readFile(join(h.sandbox.root, h.workspaceId, 'runs', RUN_ID, 'reports', 'save-16.md'), 'utf8');
    expect(markdown).not.toContain('<script>');
    expect(markdown).toContain('\\<script\\>');
    expect(markdown).not.toContain('](http');
  });
});
