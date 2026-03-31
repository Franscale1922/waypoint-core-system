import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
}
