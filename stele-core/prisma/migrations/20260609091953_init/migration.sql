-- CreateEnum
CREATE TYPE "IntegrityState" AS ENUM ('ZANSHIN', 'UNHEIMLICH', 'WABI', 'EPOCHE');

-- CreateEnum
CREATE TYPE "PostureLevel" AS ENUM ('MAX', 'HIGH', 'GUARDIAN', 'CREATIVE', 'RESEARCH', 'STANDARD');

-- CreateEnum
CREATE TYPE "VerbosityLevel" AS ENUM ('DENSE', 'STANDARD', 'EXPANDED');

-- CreateEnum
CREATE TYPE "HygieneTrigger" AS ENUM ('OFF', 'ON_COPY', 'TURN_BASED', 'MANUAL');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('SESSION_START', 'KOHAKU_EXTRACTION', 'TSUGI_APPLIED', 'KIRI_REJECTED', 'TOBIRA_FIRED', 'UTSUROI_TRANSITION', 'EPOCHE_ENTERED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "stack" TEXT NOT NULL,
    "posture" "PostureLevel" NOT NULL,
    "compliance" TEXT[],
    "hardStops" TEXT[],
    "root" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectNarrative" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "identity" TEXT,
    "philosophy" TEXT,
    "buildSequencing" TEXT,
    "unstatedConstraints" TEXT,
    "authoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refinedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectNarrative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenQuestion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tessera" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "missingHalf" TEXT NOT NULL,
    "blockedBy" TEXT,
    "buildGroup" INTEGER NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tessera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentSession" (
    "id" TEXT NOT NULL,
    "sessionMode" TEXT NOT NULL,
    "outputTarget" TEXT NOT NULL,
    "verbosity" "VerbosityLevel" NOT NULL,
    "hygieneTrigger" "HygieneTrigger" NOT NULL,
    "hygieneAfterN" INTEGER NOT NULL DEFAULT 3,
    "activeProjectIds" TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "AgentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "action" "AuditActionType" NOT NULL,
    "tobiraId" TEXT,
    "tobiraCode" TEXT,
    "fromState" "IntegrityState",
    "toState" "IntegrityState",
    "fieldsExtracted" TEXT[],
    "fieldsRejected" TEXT[],
    "secretsDetected" BOOLEAN NOT NULL DEFAULT false,
    "integrityHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateSnapshot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "integrityState" "IntegrityState" NOT NULL,
    "firedTobiraIds" TEXT[],
    "themeId" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_scope_key" ON "Project"("scope");

-- CreateIndex
CREATE INDEX "Project_posture_idx" ON "Project"("posture");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectNarrative_projectId_key" ON "ProjectNarrative"("projectId");

-- CreateIndex
CREATE INDEX "OpenQuestion_projectId_resolvedAt_idx" ON "OpenQuestion"("projectId", "resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tessera_code_key" ON "Tessera"("code");

-- CreateIndex
CREATE INDEX "Tessera_buildGroup_resolvedAt_idx" ON "Tessera"("buildGroup", "resolvedAt");

-- CreateIndex
CREATE INDEX "AgentSession_startedAt_idx" ON "AgentSession"("startedAt");

-- CreateIndex
CREATE INDEX "AuditEntry_sessionId_timestamp_idx" ON "AuditEntry"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditEntry_action_timestamp_idx" ON "AuditEntry"("action", "timestamp");

-- CreateIndex
CREATE INDEX "AuditEntry_tobiraId_idx" ON "AuditEntry"("tobiraId");

-- CreateIndex
CREATE INDEX "StateSnapshot_integrityState_capturedAt_idx" ON "StateSnapshot"("integrityState", "capturedAt");

-- AddForeignKey
ALTER TABLE "ProjectNarrative" ADD CONSTRAINT "ProjectNarrative_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenQuestion" ADD CONSTRAINT "OpenQuestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tessera" ADD CONSTRAINT "Tessera_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AgentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateSnapshot" ADD CONSTRAINT "StateSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AgentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
