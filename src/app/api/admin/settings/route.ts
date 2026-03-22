/**
 * GET  /api/admin/settings  — read current SystemSettings
 * PATCH /api/admin/settings  — update one or more SystemSettings fields
 *
 * Body (PATCH, JSON):
 *   { maxSendsPerDay?: number }
 *
 * Auth: NextAuth session required.
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const settings = await prisma.systemSettings.findUnique({
            where: { id: "singleton" },
        });
        return NextResponse.json({ settings: settings ?? { id: "singleton", maxSendsPerDay: 15 } });
    } catch (err) {
        console.error("[admin/settings GET]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = (await req.json()) as { maxSendsPerDay?: number };

        if (body.maxSendsPerDay !== undefined) {
            const cap = Number(body.maxSendsPerDay);
            if (!Number.isInteger(cap) || cap < 1 || cap > 200) {
                return NextResponse.json(
                    { error: "maxSendsPerDay must be an integer between 1 and 200" },
                    { status: 400 }
                );
            }
        }

        const updated = await prisma.systemSettings.upsert({
            where: { id: "singleton" },
            update: { ...(body.maxSendsPerDay !== undefined && { maxSendsPerDay: body.maxSendsPerDay }) },
            create: { id: "singleton", maxSendsPerDay: body.maxSendsPerDay ?? 15 },
        });

        console.log("[admin/settings] Updated:", updated);
        return NextResponse.json({ success: true, settings: updated });
    } catch (err) {
        console.error("[admin/settings PATCH]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
