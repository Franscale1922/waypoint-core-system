/**
 * POST /api/admin/leads/[id]/dm-skip
 *
 * Marks a lead as skipped in the LinkedIn DM queue.
 * Sets dmStatus = "SKIPPED". No timestamp needed.
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
            // @ts-ignore — dmStatus added via manual migration
            data: { dmStatus: "SKIPPED" },
        });

        console.log(`[dm-skip] Skipped DM for ${lead.name} (${id})`);
        return NextResponse.json({ ok: true, leadId: id });

    } catch (err) {
        console.error("[dm-skip]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
