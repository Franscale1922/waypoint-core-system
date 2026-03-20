import { z } from "zod";

// ── Lead ingestion (POST /api/leads & /api/webhooks/apify) ───────────────────

export const LeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  linkedinUrl: z.string().url("Must be a valid URL"),
  email: z.string().email().optional(),              // Captured from Evaboot CSV when available
  title: z.string().optional(),
  company: z.string().optional(),
  country: z.string().optional(),
  // ── Personalization signals (research-backed model, March 2026) ──────────
  companyNewsEvent: z.string().optional(),       // Priority A: WARN Act, 8-K, reorg, layoffs
  recentPostSummary: z.string().optional(),      // Priority B: paraphrase of post topic only
  careerTrigger: z.string().optional(),          // Signal type: layoff / burnout / opentowork
  franchiseAngle: z.string().optional(),         // Internal framing context — not sent in email
  // Legacy blacklisted fields — kept for existing rows, not populated going forward
  pulledQuoteFromPost: z.string().optional(),
  specificProjectOrMetric: z.string().optional(),
  placeOrPersonalDetail: z.string().optional(),
});

export const LeadBatchSchema = z.union([LeadSchema, z.array(LeadSchema)]);

// ── Scorecard submission (POST /api/scorecard-complete) ──────────────────────

export const ScorecardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
  score: z.number().int().min(0).max(100),
  primaryDriver: z.string().optional(),
  biggestFear: z.string().optional(),
});

// ── Archetype quiz submission (POST /api/archetype-complete) ─────────────────

export const ArchetypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
  archetype: z.string().min(1),
  archetypeName: z.string().min(1),
  strongFits: z.array(z.string()),
  weakFits: z.array(z.string()),
});

// ── Inbound webhook (POST /api/webhooks/inbound) ─────────────────────────────

export const InboundWebhookSchema = z.object({
  source: z.string().optional(),
  timestamp: z.string().optional(),
  lead: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    calculatedScore: z.number().optional(),
    primaryDriver: z.string().optional(),
    biggestFear: z.string().optional(),
  }),
});

// ── TidyCal booking (POST /api/webhooks/tidycal) ─────────────────────────────

export const TidyCalSchema = z.object({
  booking_id: z.string().optional(),
  event_type: z.string().optional(),
  start_time: z.string().optional(),
  invitee: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
});
