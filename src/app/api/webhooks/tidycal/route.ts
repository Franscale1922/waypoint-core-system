import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyQuerySecret } from "@/app/lib/webhook-auth";

// Accepts the TidyCal booking webhook payload
// TidyCal doesn't support custom auth headers on outbound webhooks,
// so we verify via ?secret= query parameter instead.
// Webhook URL: https://www.waypointfranchise.com/api/webhooks/tidycal?secret=TIDYCAL_WEBHOOK_SECRET
export async function POST(req: Request) {
    const authError = verifyQuerySecret(req, process.env.TIDYCAL_WEBHOOK_SECRET);
    if (authError) return authError;

    try {

        const body = await req.json();
        const { invitee, event_type, start_time, booking_id } = body;

        if (!invitee || !invitee.email) {
            return NextResponse.json(
                { success: false, reason: "Missing invitee email" },
                { status: 400 }
            );
        }

        // Attempt to match the booking to an existing lead by email
        const lead = await prisma.lead.findFirst({
            where: { email: invitee.email },
            orderBy: { updatedAt: "desc" },
        });

        if (!lead) {
            // No matching lead found — log it but don't error.
            // This could be a direct website visitor who was never in the outbound pipeline.
            console.log(
                `[TidyCal] Booking received for unknown lead: ${invitee.email} | Event: ${event_type}`
            );
            return NextResponse.json({
                success: true,
                message: "Booking logged but no matching lead found in pipeline",
                booking_id,
            });
        }

        // Update the lead status to reflect the booked meeting
        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                status: "REPLIED", // Meeting booked is the highest-intent signal
            },
        });

        console.log(
            `[TidyCal] Meeting booked: ${invitee.name} (${invitee.email}) | ${event_type} | ${start_time}`
        );

        return NextResponse.json({
            success: true,
            leadId: lead.id,
            event_type,
            start_time,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
