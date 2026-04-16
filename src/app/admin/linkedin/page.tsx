import { PrismaClient } from "@prisma/client";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

const SCORE_COLOR = (score: number) =>
    score >= 80 ? "bg-emerald-100 text-emerald-800" :
    score >= 65 ? "bg-blue-100 text-blue-800" :
    "bg-slate-100 text-slate-600";

const STEP_LABELS = [
    "Profile View (Day 1)",
    "Engage 1 (Day 3)",
    "Engage 2 (Day 5)",
    "Follow (Day 7)",
    "Connect (Day 10)",
    "Advancing to Sequenced",
];

export default async function LinkedInQueuePage() {
    const warmingLeads = await (prisma.lead as any).findMany({
        where: {
            status: "WARMING",
        },
        orderBy: { score: "desc" },
        select: {
            id: true,
            name: true,
            title: true,
            company: true,
            linkedinUrl: true,
            score: true,
            socialUpdatedAt: true,
            socialNurtureStep: true,
        },
    });

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                    LinkedIn Social Nurture Queue
                </h1>
                <p className="text-slate-500 mt-2">
                    Leads currently advancing through the 2-week social proof sequence. Check Slack daily at 9 AM MT for action items.
                </p>
            </div>

            {/* Queue */}
            {warmingLeads.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="text-slate-700 font-semibold text-lg">No leads warming up</p>
                    <p className="text-slate-400 text-sm mt-1">
                        High-scoring leads will automatically appear here to complete their social proof sequence before cold emails are sent.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                        {warmingLeads.length} lead{warmingLeads.length !== 1 ? "s" : ""} warming up
                    </p>
                    {warmingLeads.map((lead: any) => (
                        <LeadCard key={lead.id} lead={lead} />
                    ))}
                </div>
            )}

            <div className="text-xs text-slate-400 border-t border-slate-100 pt-6">
                Slack alerts fire Mon–Fri at 9 AM MT via the{" "}
                <span className="font-mono">social-nurture-queue</span> Inngest function.
            </div>
        </div>
    );
}

function LeadCard({ lead }: { lead: any }) {
    const stepLabel = STEP_LABELS[lead.socialNurtureStep] || STEP_LABELS[0];
    
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-base">{lead.name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SCORE_COLOR(lead.score)}`}>
                            Score {lead.score}
                        </span>
                        <span className="text-xs text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">
                            Next: {stepLabel}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {lead.title ?? "-"}{lead.company ? ` @ ${lead.company}` : ""}
                    </p>
                </div>
                {lead.linkedinUrl ? (
                    <a
                        href={lead.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-colors"
                    >
                        <ExternalLink className="w-3 h-3" />
                        LinkedIn
                    </a>
                ) : (
                    <span className="text-xs text-slate-400 italic">No LinkedIn URL</span>
                )}
            </div>
        </div>
    );
}
