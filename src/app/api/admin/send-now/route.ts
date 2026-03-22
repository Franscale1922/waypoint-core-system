/**
 * POST /api/admin/send-now
 *
 * Manually triggers senderProcess for a single SEQUENCED lead.
 * Used from the admin lead detail page to test-fire the Instantly
 * integration without waiting for the warmupScheduler cron.
 *
 * Body (JSON): { leadId: string }
 * Auth: NextAuth session required (admin only).
 */

import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { leadId } = (await req.json()) as { leadId?: string };

        if (!leadId) {
            return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
        }

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: { id: true, name: true, status: true, email: true, draftEmail: true },
        });

        if (!lead) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        if (lead.status !== "SEQUENCED") {
            return NextResponse.json(
                { error: `Lead is ${lead.status} — only SEQUENCED leads can be sent now` },
                { status: 400 }
            );
        }

        if (!lead.email) {
            return NextResponse.json({ error: "Lead has no email address" }, { status: 400 });
        }

        if (!lead.draftEmail) {
            return NextResponse.json(
                { error: "Lead has no draft email — regenerate first" },
                { status: 400 }
            );
        }

        await inngest.send({
            name: "workflow/lead.send.start",
            data: { leadId: lead.id },
        });

        console.log(`[send-now] Queued ${lead.name} (${leadId}) for immediate send`);

        return NextResponse.json({ queued: true, leadId, name: lead.name });
    } catch (err) {
        console.error("[send-now]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
