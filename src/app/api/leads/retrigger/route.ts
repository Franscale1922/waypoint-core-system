import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";

export async function POST() {
    try {
        // Fetch all leads still sitting at RAW status
        const rawLeads = await prisma.lead.findMany({
            where: { status: "RAW" },
            select: { id: true },
        });

        if (rawLeads.length === 0) {
            return NextResponse.json(
                { triggered: 0, message: "No RAW leads found — nothing to retrigger." },
                { status: 200 }
            );
        }

        // Inngest's sendMany accepts up to 100 events per call, so batch accordingly
        const BATCH_SIZE = 100;
        const errors: { batchStart: number; error: string }[] = [];

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
                errors.push({ batchStart: i, error: message });
            }
        }

        return NextResponse.json(
            {
                triggered: rawLeads.length,
                leadIds: rawLeads.map((l) => l.id),
                batchErrors: errors.length > 0 ? errors : undefined,
            },
            { status: 200 }
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
