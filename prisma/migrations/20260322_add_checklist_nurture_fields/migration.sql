-- AlterTable: add nurture sequence tracking fields to ChecklistDownload
-- These fields support the 5-email post-download nurture sequence
-- implemented in src/inngest/functions.ts (checklistNurtureProcess).

ALTER TABLE "ChecklistDownload"
  ADD COLUMN "unsubscribed"       BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN "unsubscribedAt"     TIMESTAMP(3),
  ADD COLUMN "nurtureStep"        INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN "nurtureCompletedAt" TIMESTAMP(3);
