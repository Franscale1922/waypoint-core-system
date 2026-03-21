/**
 * POST /api/webhooks/clay
 *
 * Receives enriched lead data pushed by Clay after an enrichment run.
 * Updates the matching lead record in the DB with personalization signals,
 * then re-triggers the Inngest pipeline so the lead can pass the quality gate.
 *
 * Clay setup:
 *   1. In your Clay table, add an "HTTP API" action column.
 *   2. Set the URL to: https://waypoint-core-system.vercel.app/api/webhooks/clay
 *   3. Method: POST. Auth header: x-clay-secret = value of CLAY_WEBHOOK_SECRET env var.
 *   4. Map the following Clay columns to this JSON body:
 *      {
 *        "linkedinUrl":        "{{linkedin_url}}",
 *        "email":              "{{email}}",
 *        "recentPostSummary":  "{{posts}}",          ← raw posts column is fine; server extracts posts[0].text automatically
 *        "companyNewsEvent":   "{{company_news_event}}",
 *        "careerTrigger":      "{{career_trigger}}",
 *        "yearsInCurrentRole": "{{years_in_current_role}}"
 *      }
 *      NOTE: If you have a formula/text column that already extracts posts[0].text,
 *      map that instead. Either shape works — the webhook handles both.
 *   5. Trigger this action after enrichment is complete on each row.
 *
 * Security: CLAY_WEBHOOK_SECRET env var must match the x-clay-secret header.
 * If not set, the endpoint accepts all requests (dev-only behaviour).
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";

export async function POST(req: NextRequest) {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const secret = process.env.CLAY_WEBHOOK_SECRET;
    if (secret) {
        const incoming = req.headers.get("x-clay-secret");
        if (incoming !== secret) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
        linkedinUrl,
        email,
        recentPostSummary,
        companyNewsEvent,
        careerTrigger,
        yearsInCurrentRole,
    } = body as {
        linkedinUrl?: string;
        email?: string;
        recentPostSummary?: string;
        companyNewsEvent?: string;
        careerTrigger?: string;
        yearsInCurrentRole?: number | string;
    };

    if (!linkedinUrl) {
        return NextResponse.json(
            { error: "linkedinUrl is required to match the lead" },
            { status: 400 }
        );
    }

    // ── Normalise LinkedIn URL and try multiple variants ───────────────────────
    // Clay's "LinkedIn URL (Slash)" column adds a trailing slash; Evaboot may not.
    // Some exports use linkedin.com, others www.linkedin.com. Try all variants.
    function normalizeLinkedIn(url: string) {
        return url
            .trim()
            .toLowerCase()
            .replace(/\/+$/, "")                                      // strip trailing slash(es)
            .replace(/^https?:\/\/(www\.)?linkedin\.com/, "https://www.linkedin.com"); // force www
    }
    const normalized = normalizeLinkedIn(linkedinUrl);
    const variants = Array.from(new Set([
        normalized,           // https://www.linkedin.com/in/username
        normalized + "/",     // https://www.linkedin.com/in/username/
        normalized.replace("https://www.linkedin.com", "https://linkedin.com"),
        normalized.replace("https://www.linkedin.com", "https://linkedin.com") + "/",
    ]));

    // ── Match lead by LinkedIn URL ─────────────────────────────────────────────
    const lead = await prisma.lead.findFirst({
        where: { linkedinUrl: { in: variants } },
        orderBy: { updatedAt: "desc" },
    });

    if (!lead) {
        // Clay may process contacts that were never imported — silently ignore.
        return NextResponse.json({ status: "skipped", reason: "No matching lead found" });
    }

    // ── Build update payload (only overwrite if Clay provides a non-empty value) ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    // ── Post summary extraction ────────────────────────────────────────────────
    // Clay's "Recent Post Summary" column can send different shapes depending on
    // how it is configured. We handle all cases here so no Clay formula change
    // is needed on Kelsey's end.
    //
    // Shape 1 — JSON array string (raw `posts` column mapped directly):
    //   "[{\"text\":\"...\",\"date\":\"...\", ...}]"
    //   → extract posts[0].text
    //
    // Shape 2 — JSON object string (single post object):
    //   "{\"text\":\"...\",\"date\":\"...\"}"
    //   → extract .text
    //
    // Shape 3 — Plain text (correctly summarized post or bio):
    //   "Post about leadership and franchise..." or full bio text
    //   → keep if it passes the bio-detection filter below
    //
    // Bio-detection filter — discard if it looks like a LinkedIn bio:
    //   • >300 chars  →  bios are verbose; post summaries should be 1–2 sentences
    //   • Contains bio boilerplate keywords
    const BIO_BOILERPLATE = [
        "results-driven", "passionate about", "proven track record",
        "strategic leader", "dynamic professional", "highly motivated", "seasoned professional",
        "extensive experience in", "dedicated professional", "innovative leader",
        "i am a", "i'm a", "with over", "years of experience",
    ];

    function extractPostText(raw: unknown): string | undefined {
        if (!raw || typeof raw !== "string") return undefined;
        const trimmed = raw.trim();
        if (!trimmed) return undefined;

        // Try to parse as JSON (Shape 1 or 2)
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
            try {
                const parsed = JSON.parse(trimmed);
                // Shape 1: array of post objects
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const text = parsed[0]?.text ?? parsed[0]?.content ?? parsed[0]?.body ?? "";
                    if (text && typeof text === "string") return text.trim() || undefined;
                }
                // Shape 2: single post object
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    const text = parsed.text ?? parsed.content ?? parsed.body ?? "";
                    if (text && typeof text === "string") return text.trim() || undefined;
                }
                // JSON parsed but no useful text field found → discard
                return undefined;
            } catch {
                // Not valid JSON — fall through to plain-text handling
            }
        }

        // Shape 3: plain text — apply bio-detection filter
        const lower = trimmed.toLowerCase();
        const looksLikeBio =
            trimmed.length > 300 ||
            BIO_BOILERPLATE.some((kw) => lower.includes(kw));

        return looksLikeBio ? undefined : trimmed;
    }

    const cleanedPostSummary = extractPostText(recentPostSummary);

    if (email && !lead.email) updateData.email = email.trim();
    if (cleanedPostSummary) updateData.recentPostSummary = cleanedPostSummary;
    if (companyNewsEvent)   updateData.companyNewsEvent  = (companyNewsEvent as string).trim();
    if (careerTrigger)      updateData.careerTrigger      = (careerTrigger as string).trim();

    const tenure = typeof yearsInCurrentRole === "string"
        ? parseInt(yearsInCurrentRole, 10)
        : yearsInCurrentRole;
    if (tenure && !isNaN(tenure) && !lead.yearsInCurrentRole) {
        updateData.yearsInCurrentRole = tenure;
    }

    // ── Update lead and advance through the pipeline hold state ───────────────
    // PENDING_CLAY: Any Clay data (even email-only) is enough to unblock scoring.
    //              Advance to RAW and fire the pipeline immediately.
    // RAW/ENRICHED/SUPPRESSED: Only retrigger if a quality-gate signal arrived
    //              (recentPostSummary or companyNewsEvent) — same as before.
    // SENT/REPLIED/BOOKED: Update enrichment fields but never retrigger.
    const isPendingClay = lead.status === ("PENDING_CLAY" as any);
    // @ts-ignore — PENDING_CLAY added to schema; Prisma client regenerates on deploy
    const retriggerable = ["PENDING_CLAY", "RAW", "ENRICHED", "SUPPRESSED"].includes(lead.status);
    const hasNewSignal = !!(
        updateData.recentPostSummary ||
        updateData.companyNewsEvent
    );

    if (Object.keys(updateData).length > 0) {
        if (retriggerable && (isPendingClay || hasNewSignal)) {
            updateData.status = "RAW"; // Advance to RAW — pipeline will score on next step
        }

        await prisma.lead.update({
            where: { id: lead.id },
            // @ts-ignore — companyNewsEvent / yearsInCurrentRole are in schema
            data: updateData as any,
        });
    }

    // ── Re-trigger Inngest pipeline if we have a quality-gate signal ───────────
    // Check updateData.status rather than lead.status — lead is the pre-update snapshot
    // and would reflect the stale value before the DB write committed.
    if (updateData.status === "RAW") {
        await inngest.send({
            name: "workflow/lead.hunter.start",
            data: { leadId: lead.id },
        });
        return NextResponse.json({
            status: "enriched_and_retriggered",
            leadId: lead.id,
            fieldsUpdated: Object.keys(updateData),
        });
    }

    return NextResponse.json({
        status: "updated",
        leadId: lead.id,
        fieldsUpdated: Object.keys(updateData),
        note: hasNewSignal
            ? "Lead not retriggered (status prevents it — already SENT/REPLIED/BOOKED)"
            : "No quality-gate signal provided — lead not retriggered",
    });
}
