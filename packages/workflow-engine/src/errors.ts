import type { DiagnosticCode } from '@tactiloom/contracts';

/** Error with a contract diagnostic code and a Spanish message safe to show to the user. */
export class EngineError extends Error {
  constructor(
    readonly code: DiagnosticCode,
    message: string,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

export function asEngineError(error: unknown): EngineError {
  if (error instanceof EngineError) return error;
  return new EngineError('INTERNAL_ERROR', 'Error interno del motor de ejecución.');
}
