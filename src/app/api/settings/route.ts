import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/** Returns a masked version of an API key for display, never the real value. */
function maskKey(key: string | null | undefined): string {
    if (!key || key.length < 8) return "";
    return `${key.slice(0, 3)}...${key.slice(-4)}`;
}

export async function GET() {
    const settings = await prisma.systemSettings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { maxSendsPerDay: 15 } // Warmup phase default — raise to 30–50 after 4+ weeks clean metrics
    });

    // ⚠️  Never return raw API keys — send masked values only
    return NextResponse.json({
        id: settings.id,
        openAiApiKey: maskKey(settings.openAiApiKey),
        resendApiKey: maskKey(settings.resendApiKey),
        maxSendsPerDay: settings.maxSendsPerDay,
    });
}

export async function POST(req: Request) {
    const body = await req.json();
    const update: Record<string, string | number> = {
        maxSendsPerDay: parseInt(body.maxSendsPerDay) || 50,
    };

    // Only update key fields if a real (non-masked) value was submitted
    if (body.openAiApiKey && !body.openAiApiKey.includes("...")) {
        update.openAiApiKey = body.openAiApiKey;
    }
    if (body.resendApiKey && !body.resendApiKey.includes("...")) {
        update.resendApiKey = body.resendApiKey;
    }

    const settings = await prisma.systemSettings.upsert({
        where: { id: "singleton" },
        update,
        create: {
            openAiApiKey: body.openAiApiKey || null,
            resendApiKey: body.resendApiKey || null,
            maxSendsPerDay: parseInt(body.maxSendsPerDay) || 50,
        }
    });

    return NextResponse.json({
        id: settings.id,
        openAiApiKey: maskKey(settings.openAiApiKey),
        resendApiKey: maskKey(settings.resendApiKey),
        maxSendsPerDay: settings.maxSendsPerDay,
    });
}

