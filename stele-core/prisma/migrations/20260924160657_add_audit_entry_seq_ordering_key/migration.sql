-- DropIndex
DROP INDEX "AuditEntry_sessionId_timestamp_idx";

-- AlterTable
ALTER TABLE "AuditEntry" ADD COLUMN     "seq" SERIAL NOT NULL;

-- CreateIndex
CREATE INDEX "AuditEntry_sessionId_seq_idx" ON "AuditEntry"("sessionId", "seq");
