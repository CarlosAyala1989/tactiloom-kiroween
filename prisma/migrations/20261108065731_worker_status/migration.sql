-- CreateTable
CREATE TABLE "WorkerStatus" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "jobsDone" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkerStatus_pkey" PRIMARY KEY ("id")
);
