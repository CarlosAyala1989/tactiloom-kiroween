-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DEMO', 'MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SourceMode" AS ENUM ('physical', 'image', 'simulator');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('DRAFT', 'COMPILED', 'AWAITING_APPROVAL', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobKind" AS ENUM ('PREVIEW', 'EXECUTE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'LEASED', 'DONE', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "NodeRunStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'PREDICTED');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('REPORT_MARKDOWN', 'REPORT_JSON');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'DEMO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "demoMode" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardTemplate" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "cols" INTEGER NOT NULL,
    "rows" INTEGER NOT NULL,
    "catalogVersion" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardCatalogEntry" (
    "markerId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "cardInstanceId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "set" TEXT NOT NULL,
    "printAssetPath" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CardCatalogEntry_pkey" PRIMARY KEY ("markerId")
);

-- CreateTable
CREATE TABLE "BoardCapture" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourceMode" "SourceMode" NOT NULL,
    "requestId" TEXT NOT NULL,
    "imageAssetId" TEXT,
    "imageSha256" TEXT,
    "detectorVersion" TEXT NOT NULL,
    "detectionJson" JSONB NOT NULL,
    "boardStateJson" JSONB NOT NULL,
    "diagnostics" JSONB NOT NULL,
    "cardsDetected" INTEGER NOT NULL,
    "calibrated" BOOLEAN NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardCapture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activeVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowVersion" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "boardCaptureId" TEXT,
    "sourceMode" "SourceMode" NOT NULL,
    "compilerVersion" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "boardStateJson" JSONB NOT NULL,
    "irJson" JSONB,
    "contentHash" TEXT,
    "diagnostics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowParameters" (
    "versionId" TEXT NOT NULL,
    "perCardInstance" JSONB NOT NULL,

    CONSTRAINT "WorkflowParameters_pkey" PRIMARY KEY ("versionId")
);

-- CreateTable
CREATE TABLE "UploadedDocument" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "sandboxPath" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "workflowVersionId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestedById" TEXT,
    "approvedById" TEXT,
    "status" "RunStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceMode" "SourceMode" NOT NULL,
    "contentHash" TEXT NOT NULL,
    "inputSnapshot" JSONB,
    "plan" JSONB,
    "planHash" TEXT,
    "previewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "cancelRequestedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "outcome" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "kind" "JobKind" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeRunEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "phase" "JobKind" NOT NULL,
    "attempt" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeKind" TEXT NOT NULL,
    "status" "NodeRunStatus" NOT NULL,
    "safeInputSummary" JSONB,
    "safeOutputSummary" JSONB,
    "errorCode" TEXT,
    "durationMs" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeRunEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedArtifact" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "safeName" TEXT NOT NULL,
    "sandboxPath" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewTask" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "missingFields" JSONB NOT NULL,
    "invalidFields" JSONB NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "requestId" TEXT,
    "metadataWithoutSecrets" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_workspaceId_idx" ON "Session"("workspaceId");

-- CreateIndex
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

-- CreateIndex
CREATE INDEX "Workspace_expiresAt_idx" ON "Workspace"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CardCatalogEntry_cardInstanceId_key" ON "CardCatalogEntry"("cardInstanceId");

-- CreateIndex
CREATE INDEX "BoardCapture_workspaceId_capturedAt_idx" ON "BoardCapture"("workspaceId", "capturedAt");

-- CreateIndex
CREATE INDEX "Workflow_workspaceId_createdAt_idx" ON "Workflow"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowVersion_workspaceId_createdAt_idx" ON "WorkflowVersion"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowVersion_contentHash_idx" ON "WorkflowVersion"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowVersion_workflowId_versionNumber_key" ON "WorkflowVersion"("workflowId", "versionNumber");

-- CreateIndex
CREATE INDEX "UploadedDocument_workspaceId_createdAt_idx" ON "UploadedDocument"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Run_workspaceId_createdAt_idx" ON "Run"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Run_status_idx" ON "Run"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Job_idempotencyKey_key" ON "Job"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Job_status_availableAt_idx" ON "Job"("status", "availableAt");

-- CreateIndex
CREATE INDEX "Job_status_leaseExpiresAt_idx" ON "Job"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "Job_runId_idx" ON "Job"("runId");

-- CreateIndex
CREATE INDEX "NodeRunEvent_runId_timestamp_idx" ON "NodeRunEvent"("runId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "NodeRunEvent_runId_phase_attempt_seq_key" ON "NodeRunEvent"("runId", "phase", "attempt", "seq");

-- CreateIndex
CREATE INDEX "GeneratedArtifact_workspaceId_createdAt_idx" ON "GeneratedArtifact"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedArtifact_runId_nodeId_type_key" ON "GeneratedArtifact"("runId", "nodeId", "type");

-- CreateIndex
CREATE INDEX "ReviewTask_workspaceId_createdAt_idx" ON "ReviewTask"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewTask_runId_nodeId_key" ON "ReviewTask"("runId", "nodeId");

-- CreateIndex
CREATE INDEX "AuditEvent_workspaceId_createdAt_idx" ON "AuditEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardCapture" ADD CONSTRAINT "BoardCapture_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_boardCaptureId_fkey" FOREIGN KEY ("boardCaptureId") REFERENCES "BoardCapture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowParameters" ADD CONSTRAINT "WorkflowParameters_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeRunEvent" ADD CONSTRAINT "NodeRunEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedArtifact" ADD CONSTRAINT "GeneratedArtifact_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedArtifact" ADD CONSTRAINT "GeneratedArtifact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
