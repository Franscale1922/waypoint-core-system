import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";

// Accepts the Apify LinkedIn Scraper webhook payload
// Defined in gemini.md Section 1: "The Ingestion Payload"
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { leads } = body;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json(
                { success: false, reason: "No leads array provided or array is empty" },
                { status: 400 }
            );
        }

        // Hard gate: filter out leads missing required fields
        const validLeads = leads.filter(
            (lead: any) => lead.name && lead.linkedinUrl
        );

        const rejectedCount = leads.length - validLeads.length;

        if (validLeads.length === 0) {
            return NextResponse.json(
                { success: false, reason: "All leads rejected: missing name or linkedinUrl", rejectedCount },
                { status: 422 }
            );
        }

        // Upsert leads into the database (skip duplicates by linkedinUrl)
        const results = [];
        for (const lead of validLeads) {
            try {
                const created = await prisma.lead.upsert({
                    where: { linkedinUrl: lead.linkedinUrl },
                    update: {}, // Do not overwrite existing leads
                    create: {
                        name: lead.name,
                        title: lead.title || null,
                        company: lead.company || null,
                        linkedinUrl: lead.linkedinUrl,
                        country: lead.location || null,
                        careerTrigger: lead.careerTrigger || null,
                        recentPostSummary: lead.recentPostSummary || null,
                        pulledQuoteFromPost: lead.pulledQuoteFromPost || null,
                        specificProjectOrMetric: lead.specificProjectOrMetric || null,
                        franchiseAngle: lead.franchiseAngle || null,
                        status: "RAW",
                    },
                });

                // Fire enrichment pipeline for new leads only
                if (created.status === "RAW") {
                    await inngest.send({
                        name: "workflow/lead.hunter.start",
                        data: { leadId: created.id },
                    });
                }

                results.push({ linkedinUrl: lead.linkedinUrl, status: "accepted" });
            } catch (err: any) {
                results.push({ linkedinUrl: lead.linkedinUrl, status: "skipped", reason: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            accepted: results.filter((r) => r.status === "accepted").length,
            skipped: results.filter((r) => r.status === "skipped").length,
            rejected: rejectedCount,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
