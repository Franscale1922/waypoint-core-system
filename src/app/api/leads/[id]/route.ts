import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAdmin } from "@/lib/with-admin";

export const DELETE = withAdmin(async (
    _req: Request,
    _session,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    try {
        await prisma.lead.delete({ where: { id } });
        return NextResponse.json({ status: "deleted", id });
    } catch {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
});
