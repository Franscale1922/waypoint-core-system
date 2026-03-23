-- AlterTable: add LinkedIn DM queue tracking fields to Lead
-- These fields support the LinkedIn DM Queue admin page (/admin/linkedin)
-- and the linkedInDmQueue Inngest function in src/inngest/functions.ts.

ALTER TABLE "Lead"
  ADD COLUMN "dmStatus"  TEXT,
  ADD COLUMN "dmSentAt"  TIMESTAMP(3);
