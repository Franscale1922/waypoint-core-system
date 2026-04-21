import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";

export async function POST(req: NextRequest) {
    // Simple secret-header guard — set RETRIGGER_SECRET in Vercel env vars
    const secret = process.env.RETRIGGER_SECRET;
    if (secret && req.headers.get("x-retrigger-secret") !== secret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
        // RAW leads — re-run leadHunterProcess (scoring + personalization)
        const rawLeads = await prisma.lead.findMany({
            where: { status: "RAW" },
            select: { id: true },
        });

        // ENRICHED leads — personalizerProcess crashed before they reached WARMING.
        // Skip leadHunterProcess (score is already set) and drive directly into personalizer.
        const enrichedLeads = await prisma.lead.findMany({
            where: { status: "ENRICHED" },
            select: { id: true },
        });

        const total = rawLeads.length + enrichedLeads.length;

        if (total === 0) {
            return NextResponse.json(
                { triggered: 0, message: "No RAW or ENRICHED leads found — nothing to retrigger." },
                { status: 200 }
            );
        }

        const BATCH_SIZE = 100;
        const errors: { stage: string; batchStart: number; error: string }[] = [];

        // Fire leadHunterProcess for RAW leads
        for (let i = 0; i < rawLeads.length; i += BATCH_SIZE) {
            const batch = rawLeads.slice(i, i + BATCH_SIZE);
            try {
                await inngest.send(
                    batch.map((lead) => ({
                        name: "workflow/lead.hunter.start" as const,
                        data: { leadId: lead.id },
                    }))
                );
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Unknown error";
                errors.push({ stage: "RAW→hunter", batchStart: i, error: message });
            }
        }

        // Fire personalizerProcess for ENRICHED leads
        for (let i = 0; i < enrichedLeads.length; i += BATCH_SIZE) {
            const batch = enrichedLeads.slice(i, i + BATCH_SIZE);
            try {
                await inngest.send(
                    batch.map((lead) => ({
                        name: "workflow/lead.personalize.start" as const,
                        data: { leadId: lead.id },
                    }))
                );
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Unknown error";
                errors.push({ stage: "ENRICHED→personalizer", batchStart: i, error: message });
            }
        }

        return NextResponse.json(
            {
                triggered: total,
                raw: rawLeads.length,
                enriched: enrichedLeads.length,
                batchErrors: errors.length > 0 ? errors : undefined,
            },
            { status: 200 }
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
