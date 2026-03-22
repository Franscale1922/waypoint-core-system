/**
 * POST /api/admin/suppress-lead
 *
 * Manually suppresses a lead — marks SUPPRESSED in leads table and
 * adds to SuppressionList. Used to handle bounces and unsubscribes
 * discovered outside of the automatic Instantly webhook flow.
 *
 * Body (JSON):
 *   { email: string; reason?: string }   — suppress by email address
 *   OR
 *   { leadId: string; reason?: string }  — suppress by lead ID
 *
 * Auth: NextAuth session required (admin only).
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as {
            email?: string;
            leadId?: string;
            reason?: string;
        };

        const reason = body.reason ?? "manual_admin";

        if (body.email) {
            const normalized = body.email.toLowerCase().trim();

            const lead = await prisma.lead.findFirst({
                where: { email: normalized },
                orderBy: { updatedAt: "desc" },
            });

            if (lead) {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { status: "SUPPRESSED" },
                });
            }

            await prisma.suppressionList.upsert({
                where: { email: normalized },
                update: { reason },
                create: { email: normalized, reason },
            });

            console.log(`[suppress-lead] Suppressed ${normalized} — reason: ${reason}`);

            return NextResponse.json({
                success: true,
                email: normalized,
                leadFound: !!lead,
                leadName: lead?.name,
                reason,
            });
        }

        if (body.leadId) {
            const lead = await prisma.lead.findUnique({
                where: { id: body.leadId },
                select: { id: true, name: true, email: true },
            });

            if (!lead) {
                return NextResponse.json({ error: "Lead not found" }, { status: 404 });
            }

            await prisma.lead.update({
                where: { id: lead.id },
                data: { status: "SUPPRESSED" },
            });

            if (lead.email) {
                const normalized = lead.email.toLowerCase().trim();
                await prisma.suppressionList.upsert({
                    where: { email: normalized },
                    update: { reason },
                    create: { email: normalized, reason },
                });
            }

            console.log(`[suppress-lead] Suppressed lead ${lead.name} (${lead.id}) — reason: ${reason}`);

            return NextResponse.json({
                success: true,
                leadId: lead.id,
                leadName: lead.name,
                reason,
            });
        }

        return NextResponse.json(
            { error: "Provide either { email } or { leadId }" },
            { status: 400 }
        );
    } catch (err) {
        console.error("[suppress-lead]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
