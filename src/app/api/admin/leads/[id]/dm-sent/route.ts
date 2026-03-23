/**
 * POST /api/admin/leads/[id]/dm-sent
 *
 * Marks a lead's LinkedIn DM as manually sent.
 * Sets dmStatus = "SENT" and dmSentAt = now().
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const lead = await prisma.lead.findUnique({
            where: { id },
            select: { id: true, name: true },
        });

        if (!lead) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        await prisma.lead.update({
            where: { id },
            // @ts-ignore — dmStatus/dmSentAt added via manual migration; Prisma client picks up on next generate
            data: { dmStatus: "SENT", dmSentAt: new Date() },
        });

        console.log(`[dm-sent] Marked DM sent for ${lead.name} (${id})`);
        return NextResponse.json({ ok: true, leadId: id });

    } catch (err) {
        console.error("[dm-sent]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
