import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Accepts the Franchise Readiness Scorecard submission
// Defined in gemini.md Section 5: "The Inbound Lead Magnet Payload"
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { source, lead, timestamp } = body;

        if (!lead || !lead.email || !lead.name) {
            return NextResponse.json(
                { success: false, reason: "Missing lead name or email" },
                { status: 400 }
            );
        }

        // Check if this email already exists in the system
        const existing = await prisma.lead.findFirst({
            where: { email: lead.email },
        });

        if (existing) {
            // Update existing lead with scorecard data (enrich, don't duplicate)
            await prisma.lead.update({
                where: { id: existing.id },
                data: {
                    score: lead.calculatedScore || existing.score,
                    careerTrigger: lead.primaryDriver || existing.careerTrigger,
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
                score: lead.calculatedScore || 0,
                careerTrigger: lead.primaryDriver || null,
                franchiseAngle: lead.biggestFear
                    ? `Inbound: ${lead.biggestFear}`
                    : null,
                status: "ENRICHED", // Inbound leads skip RAW — they gave us their email voluntarily
            },
        });

        // TODO: Fire nurture sequence via Inngest instead of cold outreach
        // await inngest.send({ name: "workflow/lead.nurture.start", data: { leadId: newLead.id } });

        return NextResponse.json({
            success: true,
            action: "created",
            leadId: newLead.id,
            source: source || "Readiness Scorecard",
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
