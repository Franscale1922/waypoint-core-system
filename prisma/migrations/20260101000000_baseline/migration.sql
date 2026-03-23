-- Baseline migration — captures existing schema before add_pending_clay_status
-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('RAW', 'ENRICHED', 'SEQUENCED', 'SENT', 'REPLIED', 'BOOKED', 'SUPPRESSED');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "linkedinUrl" TEXT,
    "country" TEXT,
    "companyNewsEvent" TEXT,
    "recentPostSummary" TEXT,
    "careerTrigger" TEXT,
    "franchiseAngle" TEXT,
    "yearsInCurrentRole" INTEGER,
    "pulledQuoteFromPost" TEXT,
    "specificProjectOrMetric" TEXT,
    "placeOrPersonalDetail" TEXT,
    "email" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" "LeadStatus" NOT NULL DEFAULT 'RAW',
    "draftEmail" TEXT,
    "signalType" TEXT,
    "ctaUsed" TEXT,
    "sentAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "bookedAt" TIMESTAMP(3),
    "instantlyLeadId" TEXT,
    "suppressionReason" TEXT,
    "companySizeRange" TEXT,
    "industryVertical" TEXT,
    "functionArea" TEXT,
    "seniorityLevel" TEXT,
    "isOpenToWork" BOOLEAN,
    "wasRecentlyPromoted" BOOLEAN,
    "yearsAtCompany" INTEGER,
    "geoMarket" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuppressionList" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "domain" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuppressionList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reply" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "classification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "openAiApiKey" TEXT,
    "resendApiKey" TEXT,
    "maxSendsPerDay" INTEGER NOT NULL DEFAULT 15,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistDownload" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "articleSlug" TEXT,
    "checklistType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistDownload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_linkedinUrl_key" ON "Lead"("linkedinUrl");

-- CreateIndex
CREATE UNIQUE INDEX "SuppressionList_email_key" ON "SuppressionList"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SuppressionList_domain_key" ON "SuppressionList"("domain");

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
