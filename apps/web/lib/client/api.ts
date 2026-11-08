'use client';

import type { BoardState, Diagnostic, DetectionResult, ExecutionPlan, IrEdge, Locale, RunStatus, WorkflowIR } from '@tactiloom/contracts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No se pudo contactar con el servidor.');
  }
  const body = (await response.json().catch(() => null)) as { error?: { code: string; message: string; requestId?: string; details?: unknown } } | null;
  if (!response.ok) {
    throw new ApiError(response.status, body?.error?.code ?? 'HTTP_ERROR', body?.error?.message ?? `Error ${response.status}`, body?.error?.requestId, body?.error?.details);
  }
  return body as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export interface GraphNodeView {
  id: string;
  markerId: number;
  kind: WorkflowIR['nodes'][number]['kind'];
  row: number;
  col: number;
  orientation: 'N' | 'E' | 'S' | 'W';
  quality: number | null;
}

export interface CompileView {
  valid: boolean;
  diagnostics: Diagnostic[];
  ir: WorkflowIR | null;
  graph: { nodes: GraphNodeView[]; edges: IrEdge[] };
  normalizedParams: Record<string, Record<string, unknown>>;
  steps: { depth: number; text: string; nodeId: string }[];
  sourceMode: BoardState['sourceMode'] | null;
}

export interface DocumentView {
  id: string;
  originalName: string;
  mime: string;
  bytes: number;
  sha256: string;
  isDemo: boolean;
  createdAt: string;
}

export interface BoardDiffView {
  added: { markerId: number; row: number; col: number; orientation: string }[];
  removed: { markerId: number; row: number; col: number; orientation: string }[];
  moved: { markerId: number; from: { row: number; col: number }; to: { row: number; col: number } }[];
  rotated: { markerId: number; from: string; to: string }[];
  unchanged: number;
}

export interface IrDiffView {
  sameProgram: boolean;
  nodesAdded: string[];
  nodesRemoved: string[];
  edgesAdded: IrEdge[];
  edgesRemoved: IrEdge[];
  paramsChanged: { nodeId: string; before: unknown; after: unknown }[];
}

export interface VersionDetail {
  id: string;
  workflow: { id: string; name: string };
  versionNumber: number;
  sourceMode: BoardState['sourceMode'];
  boardCaptureId: string | null;
  compilerVersion: string;
  valid: boolean;
  contentHash: string | null;
  createdAt: string;
  boardState: BoardState;
  params: Record<string, Record<string, unknown>>;
  ir: WorkflowIR | null;
  view: CompileView;
  versions: { id: string; versionNumber: number; valid: boolean; contentHash: string | null; sourceMode: string; createdAt: string }[];
  diff: { previousVersionId: string; ir: IrDiffView; board: BoardDiffView } | null;
}

export interface RunEvent {
  phase: 'PREVIEW' | 'EXECUTE';
  attempt: number;
  seq: number;
  nodeId: string;
  nodeKind: string;
  status: 'STARTED' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED' | 'PREDICTED';
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  errorCode: string | null;
  durationMs: number | null;
  timestamp: string;
}

export interface RunDetail {
  id: string;
  status: RunStatus;
  sourceMode: BoardState['sourceMode'];
  contentHash: string;
  planHash: string | null;
  plan: ExecutionPlan | null;
  outcome: {
    phase: 'PREVIEW' | 'EXECUTE';
    path: { nodeId: string; kind: string }[];
    decision: ExecutionPlan['decision'];
    planMatched: boolean;
    durationMs: number;
    failure: { code: string; messageEs: string; nodeId: string | null } | null;
  } | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  previewedAt: string | null;
  approvedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  cancelRequestedAt: string | null;
  approvalExpiresAt: string | null;
  version: { id: string; workflowId: string; versionNumber: number; contentHash: string | null; ir: WorkflowIR | null };
  events: RunEvent[];
  artifacts: { id: string; nodeId: string; type: 'REPORT_MARKDOWN' | 'REPORT_JSON'; safeName: string; size: number; sha256: string; createdAt: string }[];
  reviewTasks: { id: string; nodeId: string; label: string; missingFields: string[]; invalidFields: string[]; status: string; createdAt: string }[];
  jobs: { kind: string; status: string; attempts: number; maxAttempts: number }[];
  worker: { alive: boolean; lastSeenAt: string | null };
}

export interface AnalyzeResponse {
  captureId: string;
  scenarioId: string | null;
  detection: DetectionResult;
  boardState: BoardState;
}

export interface ScenarioView {
  id: string;
  titleEs: string;
  descriptionEs: string;
  provenance: string;
  imageUrl: string;
  expected: { calibrated: boolean; cards: number; visionErrors: string[]; compileValid: boolean; compileErrors: string[] };
}

export interface HealthView {
  status: 'ok' | 'degraded';
  checks: { web: boolean; database: boolean; vision: boolean; worker: boolean };
  worker: { alive: boolean; lastSeenAt: string | null };
}

export type Params = Record<string, Record<string, unknown>>;

export const api = {
  health: () => request<HealthView>('/api/health'),
  session: () => request<{ active: boolean; workspaceId?: string; expiresAt?: string }>('/api/demo/session'),
  createSession: () => request<{ active: boolean; workspaceId: string; expiresAt: string }>('/api/demo/session', { method: 'POST' }),
  scenarios: () => request<{ note: string; scenarios: ScenarioView[] }>('/api/demo/scenarios'),
  catalog: () =>
    request<{
      catalog: { cards: { markerId: number; kind: GraphNodeView['kind']; cardInstanceId: string; set: string; enabled: boolean }[] };
      kinds: { kind: GraphNodeView['kind']; labelEs: string; color: string; descriptionEs: string; effectEs: string; params: { key: string; labelEs: string; control: string; helpEs?: string; options?: { value: string; labelEs: string }[] }[] }[];
    }>('/api/catalog/cards'),
  /** The kit of the request language (locale cookie, then Accept-Language). */
  kit: () =>
    request<{
      kitVersion: string;
      locale: Locale;
      files: { path: string; locale: Locale; description: string; bytes: number; sha256: string; url: string }[];
      cards: { path: string; url: string }[];
      zipUrl: string;
      instructions: string[];
      /** @deprecated Spanish instructions kept for older clients; use `instructions`. */
      instructionsEs: string[];
    }>('/api/board/kit'),
  analyze: (form: FormData) => request<AnalyzeResponse>('/api/board/analyze', { method: 'POST', body: form }),
  compile: (body: { captureId: string; params: Params } | { boardState: BoardState; params: Params }) => request<CompileView>('/api/workflows/compile', jsonInit('POST', body)),
  createVersion: (body: ({ captureId: string } | { boardState: BoardState }) & { params: Params; workflowId?: string; name?: string }) =>
    request<{ workflowId: string; versionId: string; versionNumber: number; valid: boolean; contentHash: string | null; diagnostics: Diagnostic[] }>('/api/workflows', jsonInit('POST', body)),
  version: (id: string) => request<VersionDetail>(`/api/versions/${encodeURIComponent(id)}`),
  documents: () => request<{ documents: DocumentView[] }>('/api/uploads'),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ document: DocumentView }>('/api/uploads', { method: 'POST', body: form });
  },
  preview: (workflowVersionId: string) => request<{ runId: string }>('/api/runs/preview', jsonInit('POST', { workflowVersionId })),
  approve: (body: { previewRunId: string; contentHash: string; planHash: string; confirm: true }) => request<{ runId: string; status: RunStatus }>('/api/runs', jsonInit('POST', body)),
  run: (id: string) => request<RunDetail>(`/api/runs/${encodeURIComponent(id)}`),
  cancel: (id: string) => request<{ runId: string }>(`/api/runs/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
  history: () =>
    request<{
      workspace: { id: string; expiresAt: string };
      captures: { id: string; sourceMode: string; cardsDetected: number; calibrated: boolean; errorCodes: string[]; capturedAt: string }[];
      versions: { id: string; workflowId: string; versionNumber: number; valid: boolean; contentHash: string | null; sourceMode: string; createdAt: string }[];
      runs: { id: string; status: RunStatus; sourceMode: string; contentHash: string; errorCode: string | null; outcome: RunDetail['outcome']; createdAt: string; endedAt: string | null }[];
      documents: DocumentView[];
      artifacts: { id: string; runId: string; type: string; safeName: string; size: number; sha256: string; createdAt: string }[];
      reviewTasks: { id: string; runId: string; label: string; missingFields: string[]; invalidFields: string[]; status: string; createdAt: string }[];
    }>('/api/history'),
};
