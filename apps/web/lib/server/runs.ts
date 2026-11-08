import 'server-only';
import { ExecutionPlanSchema, TERMINAL_RUN_STATUSES, type ApproveRunRequest, type RunStatus, type WorkflowIR } from '@ritualos/contracts';
import { Prisma } from '@ritualos/db';
import { audit } from './audit';
import { HttpError } from './http';
import { prisma } from './prisma';
import { assertConcurrentRuns, assertRunQuota } from './quotas';
import type { SessionContext } from './session';

export const APPROVAL_WINDOW_MS = 30 * 60 * 1000;

/** Creates a DRAFT run + PREVIEW job. Nothing is executed: the worker only performs a dry-run. */
export async function requestPreview(session: SessionContext, workflowVersionId: string, requestId: string) {
  const db = prisma();
  const version = await db.workflowVersion.findFirst({ where: { id: workflowVersionId, workspaceId: session.workspaceId } });
  if (!version) throw new HttpError(404, 'NOT_FOUND', 'Versión no encontrada en tu workspace.');
  if (!version.valid || !version.irJson || !version.contentHash) {
    throw new HttpError(422, 'IR_INVALID', 'Esta versión no compila: corrige los errores del tablero antes de ejecutar.');
  }
  const ir = version.irJson as unknown as WorkflowIR;
  for (const node of ir.nodes.filter((n) => n.kind === 'INPUT_FILE')) {
    const fileId = (node.params as { uploadedFileId: string | null }).uploadedFileId;
    if (!fileId) throw new HttpError(422, 'INPUT_NOT_SELECTED', `Elige un documento para la tarjeta ARCHIVO #${node.markerId} antes de revisar.`);
    const doc = await db.uploadedDocument.findFirst({ where: { id: fileId, workspaceId: session.workspaceId }, select: { id: true } });
    if (!doc) throw new HttpError(422, 'FILE_NOT_FOUND', 'El documento elegido no existe en tu workspace.');
  }
  await assertRunQuota(session.workspaceId);
  const run = await db.$transaction(async (tx) => {
    const created = await tx.run.create({
      data: {
        workflowVersionId: version.id,
        workspaceId: session.workspaceId,
        requestedById: session.userId,
        status: 'DRAFT',
        sourceMode: version.sourceMode,
        contentHash: version.contentHash as string,
      },
    });
    await tx.job.create({ data: { runId: created.id, kind: 'PREVIEW', idempotencyKey: `${created.id}:PREVIEW` } });
    return created;
  });
  await audit('RUN_REQUESTED', { workspaceId: session.workspaceId, actorId: session.userId, entityId: run.id, requestId, metadata: { contentHash: run.contentHash } });
  return { runId: run.id, status: run.status };
}

/**
 * Explicit approval. The client must echo the program hash and the dry-run plan hash it was shown;
 * both are compared with server-side values. Only then is an EXECUTE job enqueued (once).
 */
export async function approveRun(session: SessionContext, body: ApproveRunRequest, requestId: string) {
  const db = prisma();
  const run = await db.run.findFirst({ where: { id: body.previewRunId, workspaceId: session.workspaceId }, include: { workflowVersion: true } });
  if (!run) throw new HttpError(404, 'NOT_FOUND', 'Ejecución no encontrada en tu workspace.');
  if (run.status !== 'AWAITING_APPROVAL') throw new HttpError(409, 'INVALID_STATE', `La ejecución está en estado ${run.status}; no se puede aprobar.`);
  if (run.contentHash !== body.contentHash || run.workflowVersion.contentHash !== body.contentHash) {
    throw new HttpError(409, 'APPROVAL_INVALIDATED', 'El programa cambió desde la vista previa: vuelve a compilar y revisar.');
  }
  if (!run.planHash || run.planHash !== body.planHash) {
    throw new HttpError(409, 'APPROVAL_INVALIDATED', 'El plan aprobado no coincide con la vista previa vigente.');
  }
  if (!run.previewedAt || Date.now() - run.previewedAt.getTime() > APPROVAL_WINDOW_MS) {
    throw new HttpError(409, 'APPROVAL_EXPIRED', 'La vista previa caducó (30 min). Genera una nueva antes de aprobar.');
  }
  const plan = ExecutionPlanSchema.parse(run.plan);
  if (plan.input) {
    const doc = await db.uploadedDocument.findFirst({ where: { id: plan.input.uploadedFileId, workspaceId: session.workspaceId } });
    if (!doc || doc.sha256 !== plan.input.sha256) throw new HttpError(409, 'FILE_CHANGED', 'El documento de entrada cambió desde la vista previa.');
  }
  await assertConcurrentRuns(session.workspaceId);
  try {
    await db.$transaction(async (tx) => {
      const updated = await tx.run.updateMany({
        where: { id: run.id, status: 'AWAITING_APPROVAL', planHash: body.planHash },
        data: { status: 'QUEUED', approvedAt: new Date(), approvedById: session.userId },
      });
      if (updated.count !== 1) throw new HttpError(409, 'INVALID_STATE', 'La ejecución ya fue aprobada o cambió de estado.');
      await tx.job.create({ data: { runId: run.id, kind: 'EXECUTE', idempotencyKey: `${run.id}:EXECUTE` } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'ALREADY_QUEUED', 'Esta ejecución ya está en cola.');
    }
    throw error;
  }
  await audit('RUN_APPROVED', {
    workspaceId: session.workspaceId,
    actorId: session.userId,
    entityId: run.id,
    requestId,
    metadata: { contentHash: body.contentHash, planHash: body.planHash, inputSha256: plan.input?.sha256 ?? null },
  });
  return { runId: run.id, status: 'QUEUED' as RunStatus };
}

export async function cancelRun(session: SessionContext, runId: string, requestId: string) {
  const db = prisma();
  const run = await db.run.findFirst({ where: { id: runId, workspaceId: session.workspaceId }, include: { jobs: true } });
  if (!run) throw new HttpError(404, 'NOT_FOUND', 'Ejecución no encontrada en tu workspace.');
  if ((TERMINAL_RUN_STATUSES as readonly string[]).includes(run.status)) throw new HttpError(409, 'INVALID_STATE', 'La ejecución ya terminó.');
  const leased = run.jobs.some((job) => job.status === 'LEASED');
  if (!leased && run.status !== 'RUNNING') {
    await db.$transaction([
      db.run.update({ where: { id: run.id }, data: { status: 'CANCELLED', cancelRequestedAt: new Date(), endedAt: new Date() } }),
      db.job.updateMany({ where: { runId: run.id, status: 'PENDING' }, data: { status: 'DONE', lastError: 'cancelado antes de procesarse' } }),
    ]);
  } else {
    await db.run.update({ where: { id: run.id }, data: { cancelRequestedAt: new Date() } });
  }
  await audit('RUN_CANCEL_REQUESTED', { workspaceId: session.workspaceId, actorId: session.userId, entityId: run.id, requestId });
  return { runId: run.id, cancelRequested: true };
}

export async function getRunDetail(session: SessionContext, runId: string) {
  const db = prisma();
  const run = await db.run.findFirst({
    where: { id: runId, workspaceId: session.workspaceId },
    include: {
      workflowVersion: { select: { id: true, versionNumber: true, irJson: true, contentHash: true, workflowId: true, sourceMode: true } },
      events: { orderBy: [{ phase: 'asc' }, { attempt: 'asc' }, { seq: 'asc' }] },
      artifacts: { orderBy: { createdAt: 'asc' } },
      reviewTasks: { orderBy: { createdAt: 'asc' } },
      jobs: { orderBy: { createdAt: 'asc' }, select: { kind: true, status: true, attempts: true, maxAttempts: true, lastError: true, createdAt: true, updatedAt: true } },
    },
  });
  if (!run) throw new HttpError(404, 'NOT_FOUND', 'Ejecución no encontrada en tu workspace.');
  const worker = await db.workerStatus.findFirst({ orderBy: { lastSeenAt: 'desc' } });
  return {
    id: run.id,
    status: run.status,
    sourceMode: run.sourceMode,
    contentHash: run.contentHash,
    planHash: run.planHash,
    plan: run.plan,
    inputSnapshot: run.inputSnapshot,
    outcome: run.outcome,
    errorCode: run.errorCode,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt,
    previewedAt: run.previewedAt,
    approvedAt: run.approvedAt,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    cancelRequestedAt: run.cancelRequestedAt,
    approvalExpiresAt: run.previewedAt ? new Date(run.previewedAt.getTime() + APPROVAL_WINDOW_MS) : null,
    version: {
      id: run.workflowVersion.id,
      workflowId: run.workflowVersion.workflowId,
      versionNumber: run.workflowVersion.versionNumber,
      contentHash: run.workflowVersion.contentHash,
      ir: run.workflowVersion.irJson,
    },
    events: run.events.map((event) => ({
      phase: event.phase,
      attempt: event.attempt,
      seq: event.seq,
      nodeId: event.nodeId,
      nodeKind: event.nodeKind,
      status: event.status,
      input: event.safeInputSummary,
      output: event.safeOutputSummary,
      errorCode: event.errorCode,
      durationMs: event.durationMs,
      timestamp: event.timestamp,
    })),
    artifacts: run.artifacts.map((artifact) => ({
      id: artifact.id,
      nodeId: artifact.nodeId,
      type: artifact.type,
      safeName: artifact.safeName,
      size: artifact.size,
      sha256: artifact.sha256,
      createdAt: artifact.createdAt,
    })),
    reviewTasks: run.reviewTasks.map((task) => ({
      id: task.id,
      nodeId: task.nodeId,
      label: task.label,
      missingFields: task.missingFields,
      invalidFields: task.invalidFields,
      status: task.status,
      createdAt: task.createdAt,
    })),
    jobs: run.jobs,
    worker: worker ? { alive: Date.now() - worker.lastSeenAt.getTime() < 20_000, lastSeenAt: worker.lastSeenAt } : { alive: false, lastSeenAt: null },
  };
}
