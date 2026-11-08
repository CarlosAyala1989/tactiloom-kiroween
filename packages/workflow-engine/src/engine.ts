import { verifyIr } from '@ritualos/compiler';
import {
  canonicalHash,
  PLAN_VERSION,
  type CardKind,
  type ExecutionMode,
  type ExecutionPlan,
  type FieldId,
  type IrEdge,
  type IrNode,
  type NodeRunStatus,
  type ParamsOf,
  type PlannedEffect,
  type Port,
  type RunFailure,
  type WorkflowIR,
} from '@ritualos/contracts';
import { extractDocumentText, SUPPORTED_MIME, type ExtractedText, type ExtractionLimits } from './documents';
import { asEngineError, EngineError } from './errors';
import { maskEmail, validateFields, type ValidationResult } from './fields';
import { renderReport, type RenderedReport } from './report';

export interface EngineLimits {
  readonly maxNodes: number;
  readonly maxDurationMs: number;
  readonly maxInputBytes: number;
  readonly maxOutputBytes: number;
  readonly extraction: ExtractionLimits;
}

export const DEFAULT_LIMITS: EngineLimits = {
  maxNodes: 30,
  maxDurationMs: 60_000,
  maxInputBytes: 10 * 1024 * 1024,
  maxOutputBytes: 5 * 1024 * 1024,
  extraction: { timeoutMs: 15_000, maxPages: 50, maxChars: 500_000 },
};

export interface ResolvedDocument {
  readonly uploadedFileId: string;
  readonly originalName: string;
  readonly mime: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
}

export type ArtifactType = 'REPORT_MARKDOWN' | 'REPORT_JSON';

export interface SavedArtifactRef {
  readonly artifactId: string;
  readonly nodeId: string;
  readonly type: ArtifactType;
  readonly safeName: string;
  readonly relativePath: string;
  readonly size: number;
  readonly sha256: string;
  readonly created: boolean;
}

export interface ReviewTaskRef {
  readonly reviewTaskId: string;
  readonly nodeId: string;
  readonly created: boolean;
}

export interface NodeEvent {
  readonly seq: number;
  readonly nodeId: string;
  readonly nodeKind: CardKind;
  readonly status: NodeRunStatus;
  readonly safeInputSummary?: Record<string, unknown>;
  readonly safeOutputSummary?: Record<string, unknown>;
  readonly errorCode?: string;
  readonly durationMs?: number;
  readonly at: Date;
}

/** Side-effect ports implemented by the runner (DB + sandbox) or by tests. */
export interface EnginePorts {
  now(): Date;
  resolveDocument(uploadedFileId: string): Promise<ResolvedDocument>;
  saveArtifact(input: { nodeId: string; type: ArtifactType; safeName: string; relativePath: string; mime: string; bytes: Uint8Array }): Promise<SavedArtifactRef>;
  createReviewTask(input: { nodeId: string; label: string; missingFields: FieldId[]; invalidFields: FieldId[] }): Promise<ReviewTaskRef>;
  emit(event: NodeEvent): Promise<void>;
  isCancelled(): Promise<boolean>;
}

export interface RunRequest {
  readonly ir: unknown;
  readonly expectedContentHash: string;
  readonly runId: string;
  readonly mode: ExecutionMode;
  readonly limits?: Partial<EngineLimits>;
  /**
   * Timestamp written into generated reports. The runner passes the approval time so a retried
   * execution regenerates byte-identical files (create-only writes then stay idempotent).
   */
  readonly reportDate?: Date;
}

export interface RunOutcome {
  readonly status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  readonly mode: ExecutionMode;
  readonly contentHash: string | null;
  readonly path: { nodeId: string; kind: CardKind }[];
  readonly decision: ExecutionPlan['decision'];
  readonly validation: ExecutionPlan['validation'];
  readonly effects: PlannedEffect[];
  readonly artifacts: SavedArtifactRef[];
  readonly reviewTasks: ReviewTaskRef[];
  /** Plan of what happened/will happen; its planHash is what the user approves. */
  readonly plan: ExecutionPlan | null;
  readonly failure: RunFailure | null;
  readonly durationMs: number;
}

interface ExecState {
  document?: ResolvedDocument;
  text?: ExtractedText;
  validation?: ValidationResult;
  report?: RenderedReport;
  reportNodeId?: string;
  artifacts: SavedArtifactRef[];
  reviewTasks: ReviewTaskRef[];
}

interface HandlerResult {
  readonly port: Port | null;
  readonly input?: Record<string, unknown>;
  readonly output?: Record<string, unknown>;
  readonly effects?: PlannedEffect[];
}

interface HandlerContext {
  readonly mode: ExecutionMode;
  readonly runId: string;
  readonly limits: EngineLimits;
  readonly ports: EnginePorts;
  readonly reportDate: Date;
}

type Handler = (node: IrNode, state: ExecState, ctx: HandlerContext) => Promise<HandlerResult>;

function params<K extends CardKind>(node: IrNode, _kind: K): ParamsOf<K> {
  return node.params as ParamsOf<K>;
}

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new EngineError('PRECONDITION_FAILED', `Falta ${what} en el contexto de ejecución.`);
  return value;
}

export function artifactPath(runId: string, nodeId: string, type: ArtifactType): string {
  return `runs/${runId}/reports/${nodeId}.${type === 'REPORT_MARKDOWN' ? 'md' : 'json'}`;
}

/** Closed set of handlers: the only operations RitualOS can ever perform. */
const HANDLERS: Readonly<Record<CardKind, Handler>> = {
  START: async (_node, _state, ctx) => ({ port: 'NEXT', output: { mode: ctx.mode } }),

  INPUT_FILE: async (node, state, ctx) => {
    const { uploadedFileId } = params(node, 'INPUT_FILE');
    if (uploadedFileId === null) throw new EngineError('INPUT_NOT_SELECTED', 'La tarjeta ARCHIVO no tiene documento seleccionado.');
    const document = await ctx.ports.resolveDocument(uploadedFileId);
    if (document.bytes.byteLength > ctx.limits.maxInputBytes) throw new EngineError('FILE_TOO_LARGE', 'El documento supera el tamaño máximo.');
    if (!(SUPPORTED_MIME as readonly string[]).includes(document.mime)) {
      throw new EngineError('UNSUPPORTED_FILE_TYPE', 'Tipo de archivo no soportado: usa PDF con texto o TXT.');
    }
    state.document = document;
    return {
      port: 'NEXT',
      input: { uploadedFileId },
      output: { originalName: document.originalName, mime: document.mime, bytes: document.bytes.byteLength, sha256: document.sha256.slice(0, 16) },
    };
  },

  EXTRACT_TEXT: async (node, state, ctx) => {
    const document = need(state.document, 'DocumentRef');
    const text = await extractDocumentText(document.bytes, document.mime, ctx.limits.extraction);
    state.text = text;
    return { port: 'NEXT', input: { mime: document.mime, language: params(node, 'EXTRACT_TEXT').language }, output: { method: text.method, pages: text.pages, chars: text.chars } };
  },

  VALIDATE_FIELDS: async (node, state) => {
    const text = need(state.text, 'ExtractedText');
    const { requiredFields } = params(node, 'VALIDATE_FIELDS');
    const validation = validateFields(text.text, requiredFields);
    state.validation = validation;
    return {
      port: 'NEXT',
      input: { requiredFields },
      output: {
        isValid: validation.isValid,
        missingFields: validation.missingFields,
        invalidFields: validation.invalidFields,
        present: Object.entries(validation.fields)
          .filter(([, value]) => value !== null)
          .map(([field]) => field),
        email: maskEmail(validation.fields.email),
      },
    };
  },

  CONDITION: async (node, state) => {
    const validation = need(state.validation, 'ValidationResult');
    const { predicate } = params(node, 'CONDITION');
    const result = predicate === 'allRequiredPresent' && validation.isValid;
    return { port: result ? 'TRUE' : 'FALSE', input: { predicate }, output: { result, branch: result ? 'TRUE' : 'FALSE' } };
  },

  CREATE_REPORT: async (node, state, ctx) => {
    const document = need(state.document, 'DocumentRef');
    const text = need(state.text, 'ExtractedText');
    const validation = need(state.validation, 'ValidationResult');
    const { format } = params(node, 'CREATE_REPORT');
    const report = renderReport({
      runId: ctx.runId,
      nodeId: node.id,
      generatedAt: ctx.reportDate,
      document: { originalName: document.originalName, sha256: document.sha256, mime: document.mime },
      validation,
      format,
      extraction: { method: text.method, pages: text.pages, chars: text.chars },
    });
    const size = Buffer.byteLength(report.markdown ?? '') + Buffer.byteLength(report.json ?? '');
    if (size > ctx.limits.maxOutputBytes) throw new EngineError('OUTPUT_TOO_LARGE', 'El reporte supera el tamaño máximo.');
    state.report = report;
    state.reportNodeId = node.id;
    return { port: 'NEXT', input: { format }, output: { bytes: size, isValid: validation.isValid } };
  },

  SAVE_REPORT: async (node, state, ctx) => {
    const report = need(state.report, 'Report');
    const { baseName } = params(node, 'SAVE_REPORT');
    const outputs: { type: ArtifactType; content: string; mime: string; ext: string }[] = [];
    if (report.markdown !== null) outputs.push({ type: 'REPORT_MARKDOWN', content: report.markdown, mime: 'text/markdown; charset=utf-8', ext: 'md' });
    if (report.json !== null) outputs.push({ type: 'REPORT_JSON', content: report.json, mime: 'application/json', ext: 'json' });
    const effects: PlannedEffect[] = outputs.map((output) => ({
      nodeId: node.id,
      kind: 'WRITE_ARTIFACT',
      descriptionEs: `Guardar reporte ${output.ext === 'md' ? 'Markdown' : 'JSON'} (${Buffer.byteLength(output.content)} bytes) como «${baseName}-${ctx.runId.slice(-8)}.${output.ext}».`,
      target: artifactPath(ctx.runId, node.id, output.type),
    }));
    if (ctx.mode === 'dry-run') return { port: 'NEXT', input: { baseName }, output: { predicted: effects.length }, effects };
    const saved: SavedArtifactRef[] = [];
    for (const output of outputs) {
      saved.push(
        await ctx.ports.saveArtifact({
          nodeId: node.id,
          type: output.type,
          safeName: `${baseName}-${ctx.runId.slice(-8)}.${output.ext}`,
          relativePath: artifactPath(ctx.runId, node.id, output.type),
          mime: output.mime,
          bytes: new TextEncoder().encode(output.content),
        }),
      );
    }
    state.artifacts.push(...saved);
    return {
      port: 'NEXT',
      input: { baseName },
      output: { artifacts: saved.map((a) => ({ type: a.type, size: a.size, sha256: a.sha256.slice(0, 16), created: a.created })) },
      effects,
    };
  },

  REQUEST_REVIEW: async (node, state, ctx) => {
    const validation = need(state.validation, 'ValidationResult');
    const { label } = params(node, 'REQUEST_REVIEW');
    const effect: PlannedEffect = {
      nodeId: node.id,
      kind: 'CREATE_REVIEW_TASK',
      descriptionEs: `Crear tarea de revisión «${label}» (OPEN): faltan [${validation.missingFields.join(', ') || '—'}], inválidos [${validation.invalidFields.join(', ') || '—'}]. Sin correos ni notificaciones.`,
      target: `review-task:${node.id}`,
    };
    if (ctx.mode === 'dry-run') return { port: 'NEXT', input: { label }, output: { predicted: true }, effects: [effect] };
    const task = await ctx.ports.createReviewTask({ nodeId: node.id, label, missingFields: validation.missingFields, invalidFields: validation.invalidFields });
    state.reviewTasks.push(task);
    return { port: 'NEXT', input: { label }, output: { reviewTaskId: task.reviewTaskId, created: task.created }, effects: [effect] };
  },

  END: async () => ({ port: null }),
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new EngineError('RUN_TIMEOUT', `Se superó el tiempo máximo de ejecución.`)), Math.max(ms, 1));
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function computePlanHash(core: Omit<ExecutionPlan, 'planHash' | 'reportPreview'>): string {
  return canonicalHash(core);
}

/**
 * Executes (or dry-runs) a verified ritual-ir/1 program. Only the chosen branch runs; every node
 * emits events; SUCCEEDED requires the promised artifacts/review tasks to really exist.
 */
export async function runWorkflow(request: RunRequest, ports: EnginePorts): Promise<RunOutcome> {
  const started = Date.now();
  const limits: EngineLimits = { ...DEFAULT_LIMITS, ...request.limits, extraction: { ...DEFAULT_LIMITS.extraction, ...request.limits?.extraction } };
  const base = {
    mode: request.mode,
    path: [] as { nodeId: string; kind: CardKind }[],
    decision: null as ExecutionPlan['decision'],
    validation: null as ExecutionPlan['validation'],
    effects: [] as PlannedEffect[],
    artifacts: [] as SavedArtifactRef[],
    reviewTasks: [] as ReviewTaskRef[],
  };
  const fail = (code: RunFailure['code'], messageEs: string, nodeId: string | null, contentHash: string | null): RunOutcome => ({
    ...base,
    status: code === 'RUN_CANCELLED' ? 'CANCELLED' : 'FAILED',
    contentHash,
    plan: null,
    failure: { code, messageEs, nodeId },
    durationMs: Date.now() - started,
  });

  const verification = verifyIr(request.ir, request.expectedContentHash);
  if (!verification.ok || !verification.ir) {
    const first = verification.diagnostics.find((d) => d.severity === 'error');
    const code = first?.code === 'IR_HASH_MISMATCH' ? 'IR_HASH_MISMATCH' : 'IR_INVALID';
    return fail(code, `Programa rechazado antes de ejecutar: ${first?.message ?? 'IR inválida'}`, null, null);
  }
  const ir: WorkflowIR = verification.ir;
  if (ir.nodes.length > limits.maxNodes) return fail('NODE_LIMIT_EXCEEDED', `El programa tiene ${ir.nodes.length} nodos (máximo ${limits.maxNodes}).`, null, ir.contentHash);

  const nodes = new Map(ir.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, IrEdge[]>();
  for (const edge of ir.edges) outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
  const state: ExecState = { artifacts: base.artifacts, reviewTasks: base.reviewTasks };
  const ctx: HandlerContext = { mode: request.mode, runId: request.runId, limits, ports, reportDate: request.reportDate ?? ports.now() };
  const deadline = started + limits.maxDurationMs;
  let seq = 0;
  let currentId: string | undefined = ir.startNodeId;

  for (let step = 0; currentId !== undefined && step <= ir.nodes.length; step += 1) {
    const node = nodes.get(currentId) as IrNode;
    if (await ports.isCancelled()) return fail('RUN_CANCELLED', 'Ejecución cancelada por el usuario.', node.id, ir.contentHash);
    const remaining = deadline - Date.now();
    if (remaining <= 0) return fail('RUN_TIMEOUT', `Se superó el tiempo máximo de ${limits.maxDurationMs} ms.`, node.id, ir.contentHash);
    const t0 = Date.now();
    if (request.mode === 'execute') {
      seq += 1;
      await ports.emit({ seq, nodeId: node.id, nodeKind: node.kind, status: 'STARTED', at: ports.now() });
    }
    let result: HandlerResult;
    try {
      result = await withTimeout(HANDLERS[node.kind](node, state, ctx), remaining);
    } catch (error) {
      const engineError = asEngineError(error);
      seq += 1;
      await ports.emit({ seq, nodeId: node.id, nodeKind: node.kind, status: 'FAILED', errorCode: engineError.code, durationMs: Date.now() - t0, at: ports.now() });
      return fail(engineError.code, engineError.message, node.id, ir.contentHash);
    }
    base.path.push({ nodeId: node.id, kind: node.kind });
    if (result.effects) base.effects.push(...result.effects);
    if (node.kind === 'CONDITION') {
      const branch = result.port === 'TRUE';
      base.decision = { nodeId: node.id, predicate: 'allRequiredPresent', result: branch, port: branch ? 'TRUE' : 'FALSE' };
    }
    seq += 1;
    await ports.emit({
      seq,
      nodeId: node.id,
      nodeKind: node.kind,
      status: request.mode === 'dry-run' ? 'PREDICTED' : 'SUCCEEDED',
      ...(result.input ? { safeInputSummary: result.input } : {}),
      ...(result.output ? { safeOutputSummary: result.output } : {}),
      durationMs: Date.now() - t0,
      at: ports.now(),
    });
    if (result.port === null) {
      currentId = undefined;
      break;
    }
    const next = (outgoing.get(node.id) ?? []).find((edge) => edge.port === result.port);
    if (!next) return fail('INTERNAL_ERROR', `El nodo ${node.id} no tiene arista ${result.port}.`, node.id, ir.contentHash);
    currentId = next.to;
  }
  if (currentId !== undefined) return fail('INTERNAL_ERROR', 'El recorrido no terminó en END.', currentId, ir.contentHash);

  if (state.validation) {
    base.validation = {
      fields: state.validation.fields,
      missingFields: state.validation.missingFields,
      invalidFields: state.validation.invalidFields,
      isValid: state.validation.isValid,
    };
  }

  // Postconditions: success must be backed by real effects, not just by reaching END.
  if (request.mode === 'execute') {
    for (const step of base.path) {
      if (step.kind === 'SAVE_REPORT' && !state.artifacts.some((a) => a.nodeId === step.nodeId && a.size > 0)) {
        return fail('PRECONDITION_FAILED', 'SAVE_REPORT terminó sin artefacto verificable.', step.nodeId, ir.contentHash);
      }
      if (step.kind === 'REQUEST_REVIEW' && !state.reviewTasks.some((t) => t.nodeId === step.nodeId)) {
        return fail('PRECONDITION_FAILED', 'REQUEST_REVIEW terminó sin tarea de revisión registrada.', step.nodeId, ir.contentHash);
      }
    }
  }

  const document = state.document;
  const core = {
    planVersion: PLAN_VERSION,
    contentHash: ir.contentHash,
    input: document
      ? { uploadedFileId: document.uploadedFileId, originalName: document.originalName, mime: document.mime, bytes: document.bytes.byteLength, sha256: document.sha256 }
      : null,
    path: base.path,
    decision: base.decision,
    validation: base.validation,
    effects: base.effects,
  };
  const plan: ExecutionPlan = {
    ...core,
    reportPreview: state.report?.markdown?.slice(0, 20_000) ?? null,
    planHash: computePlanHash(core),
  };
  return { ...base, status: 'SUCCEEDED', contentHash: ir.contentHash, plan, failure: null, durationMs: Date.now() - started };
}
