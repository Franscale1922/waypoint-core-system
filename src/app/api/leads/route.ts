import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { LeadSchema } from "@/app/lib/schemas";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const rawLeads = Array.isArray(body) ? body : [body];

        const results = [];

        for (const rawLead of rawLeads) {
            const parsed = LeadSchema.safeParse(rawLead);
            if (!parsed.success) {
                results.push({
                    success: false,
                    error: "Validation failed",
                    errors: parsed.error.flatten(),
                    raw: rawLead,
                });
                continue;
            }

            const leadData = parsed.data;

            // Upsert lead so we don't duplicate on same linkedin
            const lead = await prisma.lead.upsert({
                where: { linkedinUrl: leadData.linkedinUrl },
                update: {
                    title: leadData.title,
                    company: leadData.company,
                    country: leadData.country,
                    // Only overwrite email if we have one and the lead doesn't yet
                    ...(leadData.email && { email: leadData.email.toLowerCase().trim() }),
                    // ── Personalization signals ──────────────────────────────
                    companyNewsEvent: leadData.companyNewsEvent,         // Priority A
                    recentPostSummary: leadData.recentPostSummary,       // Priority B
                    careerTrigger: leadData.careerTrigger,
                    franchiseAngle: leadData.franchiseAngle,
                    // Legacy blacklisted fields — kept for existing rows
                    pulledQuoteFromPost: leadData.pulledQuoteFromPost,
                    specificProjectOrMetric: leadData.specificProjectOrMetric,
                    placeOrPersonalDetail: leadData.placeOrPersonalDetail,
                },
                create: {
                    name: leadData.name,
                    linkedinUrl: leadData.linkedinUrl,
                    email: leadData.email ? leadData.email.toLowerCase().trim() : undefined,
                    title: leadData.title,
                    company: leadData.company,
                    country: leadData.country,
                    // ── Personalization signals ──────────────────────────────
                    companyNewsEvent: leadData.companyNewsEvent,         // Priority A
                    recentPostSummary: leadData.recentPostSummary,       // Priority B
                    careerTrigger: leadData.careerTrigger,
                    franchiseAngle: leadData.franchiseAngle,
                    // Legacy blacklisted fields — kept for existing rows
                    pulledQuoteFromPost: leadData.pulledQuoteFromPost,
                    specificProjectOrMetric: leadData.specificProjectOrMetric,
                    placeOrPersonalDetail: leadData.placeOrPersonalDetail,
                    // Hold at PENDING_CLAY — Clay enrichment must arrive before scoring.
                    // The Clay webhook (/api/webhooks/clay) triggers the pipeline once
                    // enrichment signals are received. A fallback cron (pendingClayFallback)
                    // advances leads after 24h if Clay never sends enrichment.
                    // @ts-ignore — PENDING_CLAY added to schema; Prisma client regenerates on deploy
                    status: "PENDING_CLAY",
                }
            });

            // Do NOT trigger Inngest here — scoring waits for Clay enrichment.
            // Pipeline entry point is now: Clay webhook → leadHunterProcess.

            results.push({ success: true, id: lead.id });
        }

        return NextResponse.json({ processed: results.length, results }, { status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
