import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const settings = await prisma.systemSettings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { maxSendsPerDay: 50 }
    });
    return NextResponse.json(settings);
}

export async function POST(req: Request) {
    const body = await req.json();
    const settings = await prisma.systemSettings.upsert({
        where: { id: "singleton" },
        update: {
            openAiApiKey: body.openAiApiKey,
            resendApiKey: body.resendApiKey,
            maxSendsPerDay: parseInt(body.maxSendsPerDay) || 50,
        },
        create: {
            openAiApiKey: body.openAiApiKey,
            resendApiKey: body.resendApiKey,
            maxSendsPerDay: parseInt(body.maxSendsPerDay) || 50,
        }
    });
    return NextResponse.json(settings);
}
