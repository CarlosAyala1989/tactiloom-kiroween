import 'server-only';
import { compile, describeIrEs, diffBoards, diffIr, type CompileResult } from '@ritualos/compiler';
import { BoardStateSchema, type BoardState, type WorkflowIR } from '@ritualos/contracts';
import { Prisma } from '@ritualos/db';
import { audit } from './audit';
import { HttpError } from './http';
import { json, prisma } from './prisma';
import type { SessionContext } from './session';

export type BoardSource = { captureId: string } | { boardState: BoardState };

export interface ResolvedBoard {
  readonly boardState: BoardState;
  readonly captureId: string | null;
}

/** Image/physical states come only from server-side captures; client states are always "simulator". */
export async function resolveBoard(session: SessionContext, source: BoardSource): Promise<ResolvedBoard> {
  if ('captureId' in source) {
    const capture = await prisma().boardCapture.findFirst({ where: { id: source.captureId, workspaceId: session.workspaceId } });
    if (!capture) throw new HttpError(404, 'NOT_FOUND', 'Captura no encontrada en tu workspace.');
    return { boardState: BoardStateSchema.parse(capture.boardStateJson), captureId: capture.id };
  }
  return { boardState: { ...source.boardState, sourceMode: 'simulator' }, captureId: null };
}

export function compileView(result: CompileResult) {
  return {
    valid: result.valid,
    diagnostics: result.diagnostics,
    ir: result.ir,
    graph: result.graph,
    normalizedParams: result.normalizedParams,
    steps: result.ir ? describeIrEs(result.ir) : [],
    sourceMode: result.sourceMode,
  };
}

export async function compileBoard(session: SessionContext, source: BoardSource, params: Record<string, Record<string, unknown>>) {
  const { boardState } = await resolveBoard(session, source);
  return compileView(compile(boardState, params));
}

/** Persists an immutable WorkflowVersion (valid or not) after compiling on the server. */
export async function createVersion(
  session: SessionContext,
  source: BoardSource,
  params: Record<string, Record<string, unknown>>,
  options: { workflowId?: string; name?: string },
  requestId: string,
) {
  const { boardState, captureId } = await resolveBoard(session, source);
  const result = compile(boardState, params);
  const db = prisma();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const created = await db.$transaction(async (tx) => {
        const workflow = options.workflowId
          ? await tx.workflow.findFirst({ where: { id: options.workflowId, workspaceId: session.workspaceId } })
          : await tx.workflow.create({ data: { workspaceId: session.workspaceId, name: options.name ?? 'Flujo de solicitudes de taller' } });
        if (!workflow) throw new HttpError(404, 'NOT_FOUND', 'Flujo no encontrado en tu workspace.');
        const previous = await tx.workflowVersion.findFirst({ where: { workflowId: workflow.id }, orderBy: { versionNumber: 'desc' } });
        const version = await tx.workflowVersion.create({
          data: {
            workflowId: workflow.id,
            workspaceId: session.workspaceId,
            versionNumber: (previous?.versionNumber ?? 0) + 1,
            boardCaptureId: captureId,
            sourceMode: boardState.sourceMode,
            compilerVersion: result.ir?.compilerVersion ?? 'ritualos-compiler/1.0.0',
            valid: result.valid,
            boardStateJson: json(boardState),
            irJson: result.ir ? json(result.ir) : Prisma.JsonNull,
            contentHash: result.ir?.contentHash ?? null,
            diagnostics: json(result.diagnostics),
            parameters: { create: { perCardInstance: json(result.normalizedParams) } },
          },
        });
        if (result.valid) await tx.workflow.update({ where: { id: workflow.id }, data: { activeVersionId: version.id } });
        const previousIr = (previous?.irJson ?? null) as WorkflowIR | null;
        const previousCards = previous ? BoardStateSchema.parse(previous.boardStateJson).cards : [];
        return {
          workflowId: workflow.id,
          versionId: version.id,
          versionNumber: version.versionNumber,
          valid: result.valid,
          contentHash: version.contentHash,
          diagnostics: result.diagnostics,
          diff: previous ? { ir: diffIr(previousIr, result.ir), board: diffBoards(previousCards, boardState.cards), previousVersionId: previous.id } : null,
        };
      });
      await audit('WORKFLOW_VERSION_CREATED', {
        workspaceId: session.workspaceId,
        actorId: session.userId,
        entityId: created.versionId,
        requestId,
        metadata: { valid: created.valid, sourceMode: boardState.sourceMode, contentHash: created.contentHash },
      });
      return created;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && attempt < 2) continue;
      throw error;
    }
  }
  throw new HttpError(409, 'CONFLICT', 'No se pudo crear la versión; inténtalo de nuevo.');
}

export async function getVersionDetail(session: SessionContext, versionId: string) {
  const version = await prisma().workflowVersion.findFirst({
    where: { id: versionId, workspaceId: session.workspaceId },
    include: { parameters: true, workflow: { select: { id: true, name: true } } },
  });
  if (!version) throw new HttpError(404, 'NOT_FOUND', 'Versión no encontrada en tu workspace.');
  const siblings = await prisma().workflowVersion.findMany({
    where: { workflowId: version.workflowId },
    orderBy: { versionNumber: 'desc' },
    select: { id: true, versionNumber: true, valid: true, contentHash: true, sourceMode: true, createdAt: true },
    take: 50,
  });
  const boardState = BoardStateSchema.parse(version.boardStateJson);
  const ir = version.irJson as WorkflowIR | null;
  const view = compileView(compile(boardState, (version.parameters?.perCardInstance ?? {}) as Record<string, Record<string, unknown>>));
  const previous = siblings.find((s) => s.versionNumber === version.versionNumber - 1);
  let diff = null;
  if (previous) {
    const prev = await prisma().workflowVersion.findUniqueOrThrow({ where: { id: previous.id } });
    diff = {
      previousVersionId: prev.id,
      ir: diffIr(prev.irJson as WorkflowIR | null, ir),
      board: diffBoards(BoardStateSchema.parse(prev.boardStateJson).cards, boardState.cards),
    };
  }
  return {
    id: version.id,
    workflow: version.workflow,
    versionNumber: version.versionNumber,
    sourceMode: version.sourceMode,
    boardCaptureId: version.boardCaptureId,
    compilerVersion: version.compilerVersion,
    valid: version.valid,
    contentHash: version.contentHash,
    createdAt: version.createdAt,
    boardState,
    params: version.parameters?.perCardInstance ?? {},
    ir,
    view,
    versions: siblings,
    diff,
  };
}
