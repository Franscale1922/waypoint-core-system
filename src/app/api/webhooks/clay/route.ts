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
 *        "recentPostSummary":  "{{recent_post_summary}}",
 *        "companyNewsEvent":   "{{company_news_event}}",
 *        "careerTrigger":      "{{career_trigger}}",
 *        "yearsInCurrentRole": "{{years_in_current_role}}"
 *      }
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

    if (email && !lead.email) updateData.email = email.trim();
    if (recentPostSummary) updateData.recentPostSummary = (recentPostSummary as string).trim();
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
