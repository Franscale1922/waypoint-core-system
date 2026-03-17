import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { verifyBearer } from "@/app/lib/webhook-auth";

// ─── Instantly Inbound Reply Webhook ─────────────────────────────────────────
// Receives reply-forwarding payloads from Instantly.ai when a prospect replies
// to a cold email sent from the campaign.
//
// Setup: In the Instantly dashboard → Settings → Inbound Webhooks,
// set the webhook URL to:
//   https://www.waypointfranchise.com/api/webhooks/resend
// with a Bearer token matching the INBOUND_WEBHOOK_SECRET env var (see below).
//
// Auth: Bearer token in Authorization header = INBOUND_WEBHOOK_SECRET
// (env var is named INBOUND_WEBHOOK_SECRET — not RESEND_WEBHOOK_SECRET)
//
// On success: creates a Reply DB record and fires workflow/lead.reply.received
// to trigger replyGuardianProcess (GPT-4o classification + HITL Resend + Slack).
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    const authError = verifyBearer(req, process.env.INBOUND_WEBHOOK_SECRET);
    if (authError) return authError;

    try {

        const body = await req.json();

        // Depending on Resend's exact webhook payload shape
        // Assuming standard email parsed payload structure for demonstration
        const { from, subject, text, to } = body;

        // Find lead by email
        const emailStr = typeof from === 'string' ? from : from?.address;
        if (!emailStr) {
            return NextResponse.json({ success: false, reason: "No sender email found" }, { status: 400 });
        }

        const lead = await prisma.lead.findFirst({
            where: { email: { contains: emailStr } },
            orderBy: { updatedAt: 'desc' }
        });

        if (!lead) {
            return NextResponse.json({ success: true, message: "Unrecognized lead, ignored" }, { status: 200 });
        }

        // Save reply to DB
        const reply = await prisma.reply.create({
            data: {
                leadId: lead.id,
                content: text || "(No text content)"
            }
        });

        // Trigger Reply Guardian via Inngest
        await inngest.send({
            name: "workflow/lead.reply.received",
            data: { replyId: reply.id, leadId: lead.id }
        });

        return NextResponse.json({ success: true, replyId: reply.id }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
