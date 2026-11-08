import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Diagnostic } from '@tactiloom/contracts';
import { describe, expect, it } from 'vitest';
import { compile } from '../src/index';

interface ExpectedBoard {
  id: string;
  vision: { calibrated: boolean; cards: { markerId: number; row: number; col: number; orientation: 'N' | 'E' | 'S' | 'W' }[]; errorCodes: string[] };
  compile: { valid: boolean; errorCodes: string[] };
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const expected = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', 'expected-results.json'), 'utf8')) as { boards: ExpectedBoard[] };

describe('compile expectations of every board fixture (ground-truth board states)', () => {
  it.each(expected.boards.map((board) => [board.id, board] as const))('%s', (_id, board) => {
    const visionDiagnostics: Diagnostic[] = board.vision.errorCodes.map((code) => ({
      code: code as Diagnostic['code'],
      severity: 'error',
      stage: 'vision',
      message: `Diagnóstico de visión ${code}`,
    }));
    const result = compile({
      protocolVersion: 'tactiloom-board/1',
      sourceMode: 'image',
      board: { templateId: 'board-v1', columns: 8, rows: 4, calibrated: board.vision.calibrated },
      cards: board.vision.cards,
      diagnostics: visionDiagnostics,
    });
    expect(result.valid).toBe(board.compile.valid);
    const codes = new Set(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code));
    for (const code of board.compile.errorCodes) expect(codes).toContain(code);
  });
});
