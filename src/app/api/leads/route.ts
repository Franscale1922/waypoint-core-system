import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { LeadSchema } from "@/app/lib/schemas";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const rawLeads = Array.isArray(body) ? body : [body];

        const results = [];

        for (const rawLead of rawLeads) {
            const parsed = LeadSchema.safeParse(rawLead);
            if (!parsed.success) {
                results.push({
                    success: false,
                    error: "Validation failed",
                    errors: parsed.error.flatten(),
                    raw: rawLead,
                });
                continue;
            }

            const leadData = parsed.data;

            // Upsert lead so we don't duplicate on same linkedin
            const lead = await prisma.lead.upsert({
                where: { linkedinUrl: leadData.linkedinUrl },
                update: {
                    title: leadData.title,
                    company: leadData.company,
                    country: leadData.country,
                    recentPostSummary: leadData.recentPostSummary,
                    pulledQuoteFromPost: leadData.pulledQuoteFromPost,
                    specificProjectOrMetric: leadData.specificProjectOrMetric,
                    placeOrPersonalDetail: leadData.placeOrPersonalDetail,
                    franchiseAngle: leadData.franchiseAngle,
                    careerTrigger: leadData.careerTrigger,
                },
                create: {
                    name: leadData.name,
                    linkedinUrl: leadData.linkedinUrl,
                    title: leadData.title,
                    company: leadData.company,
                    country: leadData.country,
                    recentPostSummary: leadData.recentPostSummary,
                    pulledQuoteFromPost: leadData.pulledQuoteFromPost,
                    specificProjectOrMetric: leadData.specificProjectOrMetric,
                    placeOrPersonalDetail: leadData.placeOrPersonalDetail,
                    franchiseAngle: leadData.franchiseAngle,
                    careerTrigger: leadData.careerTrigger,
                    status: "RAW"
                }
            });

            // trigger the main orchestration workflow for this lead if it hasn't been sequenced
            if (lead.status === "RAW") {
                await inngest.send({
                    name: "workflow/lead.hunter.start",
                    data: { leadId: lead.id }
                });
            }

            results.push({ success: true, id: lead.id });
        }

        return NextResponse.json({ processed: results.length, results }, { status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
