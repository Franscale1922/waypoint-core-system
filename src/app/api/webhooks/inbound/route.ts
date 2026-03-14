import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyBearer } from "@/app/lib/webhook-auth";
import { InboundWebhookSchema } from "@/app/lib/schemas";

// Accepts the Franchise Readiness Scorecard submission
// Defined in gemini.md Section 5: "The Inbound Lead Magnet Payload"
export async function POST(req: Request) {
    const authError = verifyBearer(req, process.env.INBOUND_WEBHOOK_SECRET);
    if (authError) return authError;

    try {
        const raw = await req.json();
        const parsed = InboundWebhookSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, reason: "Invalid payload", errors: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { source, lead } = parsed.data;

        // Check if this email already exists in the system
        const existing = await prisma.lead.findFirst({
            where: { email: lead.email },
        });

        if (existing) {
            // Update existing lead with scorecard data (enrich, don't duplicate)
            await prisma.lead.update({
                where: { id: existing.id },
                data: {
                    score: lead.calculatedScore ?? existing.score,
                    careerTrigger: lead.primaryDriver ?? existing.careerTrigger,
                    franchiseAngle: lead.biggestFear
                        ? `Inbound: ${lead.biggestFear}`
                        : existing.franchiseAngle,
                },
            });

            return NextResponse.json({
                success: true,
                action: "updated",
                leadId: existing.id,
                source: source || "Readiness Scorecard",
            });
        }

        // Create new inbound lead
        const newLead = await prisma.lead.create({
            data: {
                name: lead.name,
                email: lead.email,
                score: lead.calculatedScore ?? 0,
                careerTrigger: lead.primaryDriver ?? null,
                franchiseAngle: lead.biggestFear
                    ? `Inbound: ${lead.biggestFear}`
                    : null,
                status: "ENRICHED",
            },
        });

        return NextResponse.json({
            success: true,
            action: "created",
            leadId: newLead.id,
            source: source || "Readiness Scorecard",
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

