import { mkdir, mkdtemp, readdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { extractDocumentText, extractFields, FileSandbox, sniffMime, validateFields } from '../src/index';
import { exampleDocument } from './helpers';

const LIMITS = { timeoutMs: 15_000, maxPages: 50, maxChars: 500_000 };

async function freshSandbox() {
  const root = await mkdtemp(join(tmpdir(), 'tactiloom-sandbox-'));
  return { root, sandbox: await FileSandbox.open(root) };
}

describe('FileSandbox', () => {
  it.each(['../etc/passwd', '/etc/passwd', 'uploads/../../x', 'a\\b', 'a//b', '.hidden', 'uploads/.', '', 'x\0y', 'ok/..'])(
    'rejects unsafe relative path %j',
    async (relative) => {
      const { sandbox } = await freshSandbox();
      await expect(sandbox.readFile('ws1', relative, 1024)).rejects.toMatchObject({ code: 'UNSAFE_FILE_PATH' });
      await expect(sandbox.writeFileIdempotent('ws1', relative, new Uint8Array([1]), 1024)).rejects.toMatchObject({ code: 'UNSAFE_FILE_PATH' });
    },
  );

  it.each(['..', '.', '', 'a/b', 'ws 1', '../ws'])('rejects unsafe workspace id %j', async (workspaceId) => {
    const { sandbox } = await freshSandbox();
    await expect(sandbox.readFile(workspaceId, 'uploads/a.txt', 1024)).rejects.toMatchObject({ code: 'UNSAFE_FILE_PATH' });
  });

  it('never follows symlinks that escape the sandbox (file or directory)', async () => {
    const { root, sandbox } = await freshSandbox();
    const outside = await mkdtemp(join(tmpdir(), 'tactiloom-outside-'));
    await writeFile(join(outside, 'secret.txt'), 'top secret');
    await mkdir(join(root, 'ws1', 'uploads'), { recursive: true });
    await symlink(join(outside, 'secret.txt'), join(root, 'ws1', 'uploads', 'link.txt'));
    await symlink(outside, join(root, 'ws1', 'escape'));
    await expect(sandbox.readFile('ws1', 'uploads/link.txt', 1024)).rejects.toMatchObject({ code: 'UNSAFE_FILE_PATH' });
    await expect(sandbox.readFile('ws1', 'escape/secret.txt', 1024)).rejects.toMatchObject({ code: 'UNSAFE_FILE_PATH' });
    await expect(sandbox.writeFileIdempotent('ws1', 'escape/new.txt', new Uint8Array([1]), 1024)).rejects.toMatchObject({ code: 'UNSAFE_FILE_PATH' });
    expect(await readdir(outside)).toEqual(['secret.txt']);
  });

  it('writes are create-only and idempotent', async () => {
    const { root, sandbox } = await freshSandbox();
    const data = new TextEncoder().encode('hola');
    const first = await sandbox.writeFileIdempotent('ws1', 'runs/r1/reports/a.md', data, 1024);
    const second = await sandbox.writeFileIdempotent('ws1', 'runs/r1/reports/a.md', data, 1024);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    await expect(sandbox.writeFileIdempotent('ws1', 'runs/r1/reports/a.md', new TextEncoder().encode('otro'), 1024)).rejects.toMatchObject({ code: 'FILE_CHANGED' });
    expect(await readdir(join(root, 'ws1', 'runs', 'r1', 'reports'))).toEqual(['a.md']); // no temp files left
  });

  it('enforces read and write size limits', async () => {
    const { sandbox } = await freshSandbox();
    await sandbox.writeFileIdempotent('ws1', 'uploads/big.txt', new Uint8Array(2048), 4096);
    await expect(sandbox.readFile('ws1', 'uploads/big.txt', 1024)).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
    await expect(sandbox.writeFileIdempotent('ws1', 'uploads/huge.txt', new Uint8Array(2048), 1024)).rejects.toMatchObject({ code: 'OUTPUT_TOO_LARGE' });
  });

  it('property: no generated relative path ever resolves outside its workspace', async () => {
    const { root, sandbox } = await freshSandbox();
    const segment = fc.oneof(fc.constantFrom('..', '.', '', '~', '%2e%2e', 'uploads', 'a.txt', '..%2f', '/'), fc.string({ maxLength: 6 }));
    await fc.assert(
      fc.asyncProperty(fc.array(segment, { minLength: 1, maxLength: 5 }), async (parts) => {
        const relative = parts.join('/');
        try {
          const resolved = await sandbox.resolve('ws1', relative);
          expect(resolved.startsWith(join(root, 'ws1') + '/')).toBe(true);
        } catch (error) {
          expect((error as { code?: string }).code).toBe('UNSAFE_FILE_PATH');
        }
      }),
      { numRuns: 400 },
    );
  });
});

describe('document extraction', () => {
  it('sniffs content, not extensions', () => {
    expect(sniffMime(new TextEncoder().encode('%PDF-1.7 ...'))).toBe('application/pdf');
    expect(sniffMime(new TextEncoder().encode('Nombre: Ana'))).toBe('text/plain');
    expect(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1]))).toBeNull();
    expect(sniffMime(new Uint8Array([0xff, 0xfe, 0xfd]))).toBeNull();
  });

  it('rejects text files that turn binary after the first 8 KB (whole-buffer check)', () => {
    const text = new TextEncoder().encode('Nombre: Ana\n'.repeat(1000)); // ~12 KB of valid UTF-8
    const withNul = new Uint8Array([...text, 0x00, 0x41]);
    const withInvalidUtf8 = new Uint8Array([...text, 0xc3, 0x28]);
    expect(sniffMime(text)).toBe('text/plain');
    expect(sniffMime(withNul)).toBeNull();
    expect(sniffMime(withInvalidUtf8)).toBeNull();
  });

  it('extracts the real text layer of the demo PDFs in an isolated worker', async () => {
    const doc = await exampleDocument('valid-application.pdf', 'd');
    const text = await extractDocumentText(doc.bytes, doc.mime, LIMITS);
    expect(text.method).toBe('pdf-text-layer');
    expect(text.pages).toBe(1);
    expect(text.text).toContain('Correo: ana.ejemplo@example.org');
  });

  it('reports PDF_NO_TEXT_LAYER for image-only PDFs', async () => {
    const doc = await exampleDocument('scanned-application.pdf', 'd');
    await expect(extractDocumentText(doc.bytes, doc.mime, LIMITS)).rejects.toMatchObject({ code: 'PDF_NO_TEXT_LAYER' });
  });

  it('rejects corrupt PDFs, MIME mismatches and binaries', async () => {
    await expect(extractDocumentText(new TextEncoder().encode('%PDF-1.7\ngarbage garbage'), 'application/pdf', LIMITS)).rejects.toMatchObject({ code: 'EXTRACTION_FAILED' });
    const pdf = await exampleDocument('valid-application.pdf', 'd');
    await expect(extractDocumentText(pdf.bytes, 'text/plain', LIMITS)).rejects.toMatchObject({ code: 'UNSUPPORTED_FILE_TYPE' });
    await expect(extractDocumentText(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0]), 'application/pdf', LIMITS)).rejects.toMatchObject({ code: 'UNSUPPORTED_FILE_TYPE' });
  });

  it('kills the extraction worker on timeout', async () => {
    const doc = await exampleDocument('valid-application.pdf', 'd');
    await expect(extractDocumentText(doc.bytes, doc.mime, { ...LIMITS, timeoutMs: 1 })).rejects.toMatchObject({ code: 'EXTRACTION_FAILED' });
  });
});

describe('field extraction and validation (deterministic, no LLM)', () => {
  it('reads Spanish and English labels', () => {
    expect(extractFields('Name: Ana\nE-mail: ana@example.org\nWorkshop: Data').fields).toEqual({ name: 'Ana', email: 'ana@example.org', workshop: 'Data' });
    expect(extractFields('Nombre completo:   Ana   María \nCorreo electrónico: a@b.co\nTaller:x').fields).toEqual({ name: 'Ana María', email: 'a@b.co', workshop: 'x' });
  });

  it('keeps the first occurrence and records evidence lines', () => {
    const { fields, evidence } = extractFields('Nombre: Ana\nNombre: Otra');
    expect(fields.name).toBe('Ana');
    expect(evidence.name?.line).toBe(1);
  });

  it('does not treat free text mentioning a label as a field', () => {
    expect(extractFields('Comentarios: Olvidé indicar el taller.').fields.workshop).toBeNull();
  });

  it('validates required presence and e-mail format', () => {
    const result = validateFields('Nombre: Bruno\nCorreo: bruno-arroba-example.org', ['name', 'email', 'workshop']);
    expect(result).toMatchObject({ missingFields: ['workshop'], invalidFields: ['email'], isValid: false });
    expect(validateFields('Nombre: Bruno', ['name']).isValid).toBe(true);
  });
});
