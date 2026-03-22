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
// with a Bearer token matching the INBOUND_WEBHOOK_SECRET env var.
//
// Auth: Bearer token in Authorization header = INBOUND_WEBHOOK_SECRET
//
// Instantly v2 webhook payload shape (event_type: "reply_received"):
//   {
//     event_type: "reply_received",
//     campaign_id: "uuid",
//     campaign_name: "Waypoint Outbound",
//     lead_email: "prospect@company.com",      ← match key
//     email_account: "kelsey@...",
//     reply_text:    "Full plain text reply",  ← content key
//     reply_html:    "<p>...</p>",
//     reply_subject: "Re: quick thought",
//     reply_text_snippet: "Short preview...",   ← fallback if reply_text is missing
//     email_subject: "quick thought",
//     step: 1, variant: 0, is_first: true,
//     unibox_url: "https://..."
//   }
//
// On success: creates a Reply DB record → fires workflow/lead.reply.received
// → triggers replyGuardianProcess (GPT-4o classification + HITL Resend + Slack).
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    const authError = verifyBearer(req, process.env.INBOUND_WEBHOOK_SECRET);
    if (authError) return authError;

    try {
        const body = await req.json();

        // Log full payload during early production — useful for verifying Instantly payload shape.
        // Remove or gate behind a DEBUG env var after confirming correctness.
        console.log("[inbound-reply] Payload received:", JSON.stringify(body).slice(0, 600));

        // ── Instantly v2 reply webhook fields ─────────────────────────────────
        const {
            event_type,
            lead_email,
            reply_text,
            reply_text_snippet,
            reply_subject,
            campaign_id,
        } = body as {
            event_type?: string;
            lead_email?: string;
            reply_text?: string;
            reply_text_snippet?: string;
            reply_subject?: string;
            campaign_id?: string;
        };

        // ── Handle bounce and unsubscribe events ──────────────────────────────
        // Instantly fires these to the same webhook URL as replies.
        // Bounce events: event_type = "lead_bounced" | "email_bounced"
        // Unsubscribe events: event_type = "lead_unsubscribed" | "unsubscribe"
        // On either: mark lead SUPPRESSED in DB + add to SuppressionList table.
        const bounceEventTypes = ["lead_bounced", "email_bounced"];
        const unsubEventTypes   = ["lead_unsubscribed", "unsubscribe"];
        const isBounce = event_type && bounceEventTypes.includes(event_type);
        const isUnsub  = event_type && unsubEventTypes.includes(event_type);

        if (isBounce || isUnsub) {
            const reason = isBounce ? "bounce" : "unsubscribe";
            console.log(`[inbound-reply] ${reason} event for: ${lead_email ?? "(unknown)"}`);

            if (lead_email) {
                const normalized = lead_email.toLowerCase().trim();

                // Suppress the lead record
                const lead = await prisma.lead.findFirst({
                    where: { email: normalized },
                    orderBy: { updatedAt: "desc" },
                });

                if (lead) {
                    await prisma.lead.update({
                        where: { id: lead.id },
                        data: { status: "SUPPRESSED" },
                    });
                    console.log(`[inbound-reply] Suppressed lead ${lead.name} (${normalized}) — reason: ${reason}`);
                }

                // Add to suppression list (upsert — safe if already present)
                await prisma.suppressionList.upsert({
                    where: { email: normalized },
                    update: { reason },
                    create: { email: normalized, reason },
                });

                console.log(`[inbound-reply] Added ${normalized} to SuppressionList — reason: ${reason}`);
            }

            return NextResponse.json({ success: true, action: `suppressed:${reason}`, email: lead_email });
        }

        // Silently ignore all other event types (e.g. email_opened, link_clicked).
        if (event_type && event_type !== "reply_received") {
            console.log(`[inbound-reply] Ignored non-reply event: ${event_type}`);
            return NextResponse.json({ success: true, message: `Ignored: ${event_type}` });
        }

        if (!lead_email) {
            console.error("[inbound-reply] Missing lead_email in payload:", JSON.stringify(body).slice(0, 200));
            return NextResponse.json(
                { success: false, reason: "Missing lead_email in Instantly payload" },
                { status: 400 }
            );
        }

        // ── Match lead by their email address ─────────────────────────────────
        const lead = await prisma.lead.findFirst({
            where: { email: lead_email.toLowerCase().trim() },
            orderBy: { updatedAt: "desc" },
        });

        if (!lead) {
            console.log(`[inbound-reply] No lead found for: ${lead_email} (campaign: ${campaign_id ?? "unknown"})`);
            // Not an error — could be a direct website contact who was never in the pipeline
            return NextResponse.json({ success: true, message: "No matching lead — ignored" });
        }

        // Use full reply text; fall back to snippet if full text is absent
        const replyContent = (reply_text || reply_text_snippet || "(No text content)").trim();

        // ── Persist reply ──────────────────────────────────────────────────────
        const reply = await prisma.reply.create({
            data: {
                leadId: lead.id,
                content: replyContent,
            },
        });

        console.log(`[inbound-reply] Saved reply for ${lead.name} <${lead_email}> | subject: "${reply_subject}"`);

        // ── Fire Reply Guardian ────────────────────────────────────────────────
        await inngest.send({
            name: "workflow/lead.reply.received",
            data: { replyId: reply.id, leadId: lead.id },
        });

        return NextResponse.json({ success: true, replyId: reply.id }, { status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[inbound-reply] Unhandled error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
