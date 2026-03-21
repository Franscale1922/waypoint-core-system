/**
 * POST /api/admin/regenerate-emails
 *
 * Clears draftEmail on one or all SEQUENCED leads and re-fires
 * the personalizerProcess Inngest event so new emails are generated
 * with the latest prompt programming.
 *
 * Body (JSON):
 *   { leadId: string }          — regenerate a single lead
 *   { all: true }               — regenerate ALL SEQUENCED leads
 *
 * Auth: NextAuth session required (admin only — same protection as admin pages).
 */

import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const body = await req.json() as { leadId?: string; all?: boolean };

        if (body.all) {
            // ── Bulk: all SEQUENCED leads ──────────────────────────────────────
            // 1. Clear draftEmail on all SEQUENCED leads
            const leads = await prisma.lead.findMany({
                where: { status: "SEQUENCED" },
                select: { id: true },
            });

            if (leads.length === 0) {
                return NextResponse.json({ regenerated: 0, message: "No SEQUENCED leads found." });
            }

            await prisma.lead.updateMany({
                where: { status: "SEQUENCED" },
                data: { draftEmail: null },
            });

            // 2. Fire personalizerProcess event for each lead
            // Inngest batches up to 512 events per send call
            const events = leads.map((lead) => ({
                name: "workflow/lead.personalize.start" as const,
                data: { leadId: lead.id },
            }));

            await inngest.send(events);

            return NextResponse.json({
                regenerated: leads.length,
                message: `Queued ${leads.length} leads for regeneration.`,
            });
        }

        if (body.leadId) {
            // ── Single lead ───────────────────────────────────────────────────
            const lead = await prisma.lead.findUnique({
                where: { id: body.leadId },
                select: { id: true, status: true, score: true },
            });

            if (!lead) {
                return NextResponse.json({ error: "Lead not found" }, { status: 404 });
            }
            if (lead.score < 50) {
                return NextResponse.json(
                    { error: "Lead did not clear the 50-point gate — cannot generate email." },
                    { status: 400 }
                );
            }

            // Clear the draft so the page shows "generating..." state immediately
            await prisma.lead.update({
                where: { id: body.leadId },
                data: { draftEmail: null },
            });

            // Fire the personalizer
            await inngest.send({
                name: "workflow/lead.personalize.start",
                data: { leadId: body.leadId },
            });

            return NextResponse.json({ regenerated: 1, message: "Queued for regeneration." });
        }

        return NextResponse.json(
            { error: "Provide either { leadId } or { all: true }" },
            { status: 400 }
        );
    } catch (err) {
        console.error("[regenerate-emails]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
