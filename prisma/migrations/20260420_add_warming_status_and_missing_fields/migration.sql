-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_warming_status_and_missing_fields
-- Date: 2026-04-20
--
-- Adds the WARMING enum value to LeadStatus and three missing columns to Lead:
--   • emailStatus      — Evaboot verification tier ("safe" | "riskier" | null)
--   • socialNurtureStep — LinkedIn sequence position (0–6)
--   • socialUpdatedAt  — When Kelsey last processed a social nurture step
--
-- Root cause: personalizerProcess sets status = 'WARMING' after email generation,
-- but WARMING was never added to the enum via a migration. This caused every
-- personalizerProcess run to crash with:
--   "invalid input value for enum "LeadStatus": "WARMING""
-- socialNurtureQueue also crashed querying WHERE status = 'WARMING'.
-- senderProcess crashed reading emailStatus (column didn't exist).
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Add WARMING to the LeadStatus enum
-- PostgreSQL does not support removing enum values, so WARMING goes between
-- ENRICHED and SEQUENCED to match the pipeline order.
ALTER TYPE "LeadStatus" ADD VALUE 'WARMING' AFTER 'ENRICHED';

-- Step 2: Add emailStatus column (Evaboot tier gating in senderProcess)
ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "emailStatus" TEXT;

-- Step 3: Add socialNurtureStep column (LinkedIn sequence position)
ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "socialNurtureStep" INTEGER NOT NULL DEFAULT 0;

-- Step 4: Add socialUpdatedAt column (timestamp of last social nurture action)
ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "socialUpdatedAt" TIMESTAMP(3);

-- Step 5: Create ScorecardSubmission table (required by scorecardNurtureProcess)
CREATE TABLE IF NOT EXISTS "ScorecardSubmission" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "primaryDriver" TEXT,
    "biggestFear" TEXT,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" TIMESTAMP(3),
    "nurtureStep" INTEGER NOT NULL DEFAULT 0,
    "nurtureCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScorecardSubmission_pkey" PRIMARY KEY ("id")
);

-- Step 6: Create EscapeKitDownload table (required by escapeKitNurtureProcess)
CREATE TABLE IF NOT EXISTS "EscapeKitDownload" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "articleSlug" TEXT,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" TIMESTAMP(3),
    "nurtureStep" INTEGER NOT NULL DEFAULT 0,
    "nurtureCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscapeKitDownload_pkey" PRIMARY KEY ("id")
);
