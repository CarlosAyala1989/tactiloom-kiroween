import { verifyIr } from '@ritualos/compiler';
import type { DiagnosticCode, ExecutionPlan } from '@ritualos/contracts';
import { Prisma, type Job, type PrismaClient, type Run, type WorkflowVersion } from '@ritualos/db';
import {
  DEFAULT_LIMITS,
  EngineError,
  runWorkflow,
  sha256Hex,
  type EngineLimits,
  type EnginePorts,
  type FileSandbox,
  type RunOutcome,
} from '@ritualos/workflow-engine';
import type { RunnerConfig } from './config';
import { log } from './log';

export interface RunnerContext {
  readonly prisma: PrismaClient;
  readonly sandbox: FileSandbox;
  readonly config: RunnerConfig;
}

type RunWithVersion = Run & { workflowVersion: WorkflowVersion };
type Phase = 'PREVIEW' | 'EXECUTE';

const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);

function limitsFor(config: RunnerConfig): EngineLimits {
  return { ...DEFAULT_LIMITS, maxDurationMs: config.maxDurationMs };
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function audit(ctx: RunnerContext, run: Run, action: string, metadata: Record<string, unknown>): Promise<void> {
  await ctx.prisma.auditEvent.create({
    data: { workspaceId: run.workspaceId, actorId: null, action, entityId: run.id, metadataWithoutSecrets: json(metadata) },
  });
}

async function finishRun(
  ctx: RunnerContext,
  run: Run,
  status: 'FAILED' | 'CANCELLED' | 'SUCCEEDED',
  data: { errorCode?: DiagnosticCode | string; errorMessage?: string; outcome?: unknown } = {},
): Promise<void> {
  await ctx.prisma.run.updateMany({
    where: { id: run.id, status: { notIn: ['SUCCEEDED', 'FAILED', 'CANCELLED'] } },
    data: {
      status,
      endedAt: new Date(),
      ...(data.errorCode ? { errorCode: data.errorCode } : {}),
      ...(data.errorMessage ? { errorMessage: data.errorMessage.slice(0, 500) } : {}),
      ...(data.outcome !== undefined ? { outcome: json(data.outcome) } : {}),
    },
  });
  await audit(ctx, run, `RUN_${status}`, { errorCode: data.errorCode ?? null });
}

/** Engine ports backed by Postgres + the file sandbox, scoped to the run's workspace. */
export function createPorts(ctx: RunnerContext, run: Run, job: Job, phase: Phase, limits: EngineLimits, leaseLost: () => boolean): EnginePorts {
  const { prisma, sandbox } = ctx;
  return {
    now: () => new Date(),
    async resolveDocument(uploadedFileId) {
      // Ownership is re-checked right before use: the id must belong to this run's workspace.
      const doc = await prisma.uploadedDocument.findFirst({ where: { id: uploadedFileId, workspaceId: run.workspaceId } });
      if (!doc) throw new EngineError('FILE_NOT_FOUND', 'El documento no existe en este workspace.');
      const bytes = await sandbox.readFile(run.workspaceId, doc.sandboxPath, limits.maxInputBytes);
      if (sha256Hex(bytes) !== doc.sha256) throw new EngineError('FILE_CHANGED', 'El documento cambió en el sandbox desde que se subió.');
      return { uploadedFileId: doc.id, originalName: doc.originalName, mime: doc.mime, bytes, sha256: doc.sha256 };
    },
    async saveArtifact(input) {
      if (phase !== 'EXECUTE') throw new EngineError('INTERNAL_ERROR', 'Un dry-run no puede escribir archivos.');
      const written = await sandbox.writeFileIdempotent(run.workspaceId, input.relativePath, input.bytes, limits.maxOutputBytes);
      const artifact = await prisma.generatedArtifact.upsert({
        where: { runId_nodeId_type: { runId: run.id, nodeId: input.nodeId, type: input.type } },
        create: {
          runId: run.id,
          workspaceId: run.workspaceId,
          nodeId: input.nodeId,
          type: input.type,
          safeName: input.safeName,
          sandboxPath: written.relativePath,
          mime: input.mime,
          size: written.size,
          sha256: written.sha256,
        },
        update: {},
      });
      if (artifact.sha256 !== written.sha256) throw new EngineError('FILE_CHANGED', 'El artefacto registrado no coincide con el archivo.');
      return {
        artifactId: artifact.id,
        nodeId: artifact.nodeId,
        type: input.type,
        safeName: artifact.safeName,
        relativePath: artifact.sandboxPath,
        size: artifact.size,
        sha256: artifact.sha256,
        created: written.created,
      };
    },
    async createReviewTask(input) {
      if (phase !== 'EXECUTE') throw new EngineError('INTERNAL_ERROR', 'Un dry-run no puede crear tareas.');
      const existing = await prisma.reviewTask.findUnique({ where: { runId_nodeId: { runId: run.id, nodeId: input.nodeId } } });
      if (existing) return { reviewTaskId: existing.id, nodeId: existing.nodeId, created: false };
      try {
        const created = await prisma.reviewTask.create({
          data: {
            runId: run.id,
            workspaceId: run.workspaceId,
            nodeId: input.nodeId,
            label: input.label,
            missingFields: json(input.missingFields),
            invalidFields: json(input.invalidFields),
          },
        });
        return { reviewTaskId: created.id, nodeId: created.nodeId, created: true };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const again = await prisma.reviewTask.findUniqueOrThrow({ where: { runId_nodeId: { runId: run.id, nodeId: input.nodeId } } });
          return { reviewTaskId: again.id, nodeId: again.nodeId, created: false };
        }
        throw error;
      }
    },
    async emit(event) {
      await prisma.nodeRunEvent.create({
        data: {
          runId: run.id,
          phase,
          attempt: job.attempts,
          seq: event.seq,
          nodeId: event.nodeId,
          nodeKind: event.nodeKind,
          status: event.status,
          ...(event.safeInputSummary ? { safeInputSummary: json(event.safeInputSummary) } : {}),
          ...(event.safeOutputSummary ? { safeOutputSummary: json(event.safeOutputSummary) } : {}),
          ...(event.errorCode ? { errorCode: event.errorCode } : {}),
          ...(event.durationMs !== undefined ? { durationMs: Math.round(event.durationMs) } : {}),
          timestamp: event.at,
        },
      });
    },
    async isCancelled() {
      if (leaseLost()) return true;
      const current = await prisma.run.findUnique({ where: { id: run.id }, select: { cancelRequestedAt: true } });
      return current?.cancelRequestedAt != null;
    },
  };
}

function outcomeSummary(outcome: RunOutcome, approvedPlanHash: string | null) {
  return {
    mode: outcome.mode,
    path: outcome.path,
    decision: outcome.decision,
    validation: outcome.validation
      ? { missingFields: outcome.validation.missingFields, invalidFields: outcome.validation.invalidFields, isValid: outcome.validation.isValid }
      : null,
    artifacts: outcome.artifacts.map((a) => ({ artifactId: a.artifactId, nodeId: a.nodeId, type: a.type, safeName: a.safeName, size: a.size, sha256: a.sha256 })),
    reviewTasks: outcome.reviewTasks.map((t) => t.reviewTaskId),
    planHash: outcome.plan?.planHash ?? null,
    planMatched: approvedPlanHash !== null && outcome.plan?.planHash === approvedPlanHash,
    failure: outcome.failure,
    durationMs: outcome.durationMs,
  };
}

async function processPreview(ctx: RunnerContext, job: Job, run: RunWithVersion, leaseLost: () => boolean): Promise<void> {
  if (run.status !== 'DRAFT' && run.status !== 'COMPILED') return; // already previewed (idempotent retry)
  if (run.cancelRequestedAt) return finishRun(ctx, run, 'CANCELLED');
  const verification = verifyIr(run.workflowVersion.irJson, run.contentHash);
  if (!verification.ok) {
    return finishRun(ctx, run, 'FAILED', { errorCode: 'IR_INVALID', errorMessage: verification.diagnostics[0]?.message ?? 'IR inválida' });
  }
  await ctx.prisma.run.updateMany({ where: { id: run.id, status: 'DRAFT' }, data: { status: 'COMPILED' } });
  const limits = limitsFor(ctx.config);
  const outcome = await runWorkflow(
    { ir: run.workflowVersion.irJson, expectedContentHash: run.contentHash, runId: run.id, mode: 'dry-run', limits },
    createPorts(ctx, run, job, 'PREVIEW', limits, leaseLost),
  );
  if (outcome.status === 'SUCCEEDED' && outcome.plan) {
    const plan: ExecutionPlan = outcome.plan;
    await ctx.prisma.run.updateMany({
      where: { id: run.id, status: 'COMPILED' },
      data: {
        status: 'AWAITING_APPROVAL',
        plan: json(plan),
        planHash: plan.planHash,
        previewedAt: new Date(),
        inputSnapshot: plan.input ? json(plan.input) : Prisma.JsonNull,
      },
    });
    await audit(ctx, run, 'RUN_PREVIEWED', { planHash: plan.planHash, branch: plan.decision?.port ?? null });
    return;
  }
  if (outcome.status === 'CANCELLED') return finishRun(ctx, run, 'CANCELLED');
  return finishRun(ctx, run, 'FAILED', {
    errorCode: outcome.failure?.code ?? 'INTERNAL_ERROR',
    errorMessage: `Vista previa fallida: ${outcome.failure?.messageEs ?? 'error'}`,
    outcome: { phase: 'PREVIEW', ...outcomeSummary(outcome, null) },
  });
}

async function processExecute(ctx: RunnerContext, job: Job, run: RunWithVersion, leaseLost: () => boolean): Promise<void> {
  if (TERMINAL.has(run.status)) return; // never re-execute a finished run
  if (!run.approvedAt || !run.planHash || (run.status !== 'QUEUED' && run.status !== 'RUNNING')) {
    return finishRun(ctx, run, 'FAILED', { errorCode: 'PRECONDITION_FAILED', errorMessage: 'La ejecución no tiene una aprobación válida.' });
  }
  if (run.cancelRequestedAt) return finishRun(ctx, run, 'CANCELLED');
  const snapshot = run.inputSnapshot as { uploadedFileId?: string; sha256?: string } | null;
  if (snapshot?.uploadedFileId) {
    const doc = await ctx.prisma.uploadedDocument.findFirst({ where: { id: snapshot.uploadedFileId, workspaceId: run.workspaceId } });
    if (!doc || doc.sha256 !== snapshot.sha256) {
      return finishRun(ctx, run, 'FAILED', { errorCode: 'FILE_CHANGED', errorMessage: 'El documento aprobado ya no es el mismo; repite la vista previa.' });
    }
  }
  await ctx.prisma.run.update({ where: { id: run.id }, data: { status: 'RUNNING', startedAt: run.startedAt ?? new Date() } });
  if (job.attempts === 1) await audit(ctx, run, 'RUN_STARTED', { attempt: job.attempts });
  const limits = limitsFor(ctx.config);
  const outcome = await runWorkflow(
    { ir: run.workflowVersion.irJson, expectedContentHash: run.contentHash, runId: run.id, mode: 'execute', limits },
    createPorts(ctx, run, job, 'EXECUTE', limits, leaseLost),
  );
  if (leaseLost()) throw new Error('lease perdido durante la ejecución');
  if (outcome.status === 'SUCCEEDED') {
    for (const artifact of outcome.artifacts) {
      if (!(await ctx.sandbox.exists(run.workspaceId, artifact.relativePath))) {
        return finishRun(ctx, run, 'FAILED', { errorCode: 'PRECONDITION_FAILED', errorMessage: 'Un artefacto declarado no existe en el sandbox.' });
      }
    }
    return finishRun(ctx, run, 'SUCCEEDED', { outcome: { phase: 'EXECUTE', ...outcomeSummary(outcome, run.planHash) } });
  }
  return finishRun(ctx, run, outcome.status === 'CANCELLED' ? 'CANCELLED' : 'FAILED', {
    errorCode: outcome.failure?.code ?? 'INTERNAL_ERROR',
    errorMessage: outcome.failure?.messageEs ?? 'Error',
    outcome: { phase: 'EXECUTE', ...outcomeSummary(outcome, run.planHash) },
  });
}

export async function processJob(ctx: RunnerContext, job: Job, leaseLost: () => boolean = () => false): Promise<void> {
  const run = await ctx.prisma.run.findUnique({ where: { id: job.runId }, include: { workflowVersion: true } });
  if (!run) return;
  log('info', 'job.processing', { jobId: job.id, runId: run.id, kind: job.kind, attempt: job.attempts });
  if (job.kind === 'PREVIEW') await processPreview(ctx, job, run, leaseLost);
  else await processExecute(ctx, job, run, leaseLost);
}

export async function failRunForDeadJob(ctx: RunnerContext, job: Job, reason: string): Promise<void> {
  const run = await ctx.prisma.run.findUnique({ where: { id: job.runId } });
  if (!run) return;
  await finishRun(ctx, run, 'FAILED', { errorCode: 'INTERNAL_ERROR', errorMessage: `El trabajo agotó sus reintentos: ${reason}` });
}
