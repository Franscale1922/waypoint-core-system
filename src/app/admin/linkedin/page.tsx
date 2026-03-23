import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { LinkedInDmActions } from "./LinkedInDmActions";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

const SCORE_COLOR = (score: number) =>
    score >= 80 ? "bg-emerald-100 text-emerald-800" :
    score >= 65 ? "bg-blue-100 text-blue-800" :
    "bg-slate-100 text-slate-600";

function daysSince(date: Date): number {
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

export default async function LinkedInQueuePage() {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    // Mirror the Inngest query exactly — SENT leads, stale 5+ days, capped at 20
    const allStale = await (prisma.lead as any).findMany({
        where: {
            status: "SENT",
            updatedAt: { lte: fiveDaysAgo },
        },
        orderBy: { score: "desc" },
        take: 20,
        select: {
            id: true,
            name: true,
            title: true,
            company: true,
            linkedinUrl: true,
            score: true,
            updatedAt: true,
            dmStatus: true,
            dmSentAt: true,
        },
    });

    const pending = allStale.filter((l: any) => !l.dmStatus || l.dmStatus === "QUEUED");
    const done    = allStale.filter((l: any) => l.dmStatus === "SENT" || l.dmStatus === "SKIPPED");

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                    LinkedIn DM Queue
                </h1>
                <p className="text-slate-500 mt-2">
                    SENT leads with no reply after 5+ days. Copy the script, send on LinkedIn, mark done.
                </p>
            </div>

            {/* Queue */}
            {pending.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="text-slate-700 font-semibold text-lg">Queue is clear for today</p>
                    <p className="text-slate-400 text-sm mt-1">
                        No leads have been in SENT status for 5+ days without a reply.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                        {pending.length} lead{pending.length !== 1 ? "s" : ""} to contact
                    </p>
                    {pending.map((lead: any) => (
                        <LeadCard key={lead.id} lead={lead} />
                    ))}
                </div>
            )}

            {/* Done section */}
            {done.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                        Done today ({done.length})
                    </p>
                    {done.map((lead: any) => (
                        <div
                            key={lead.id}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between opacity-60"
                        >
                            <div>
                                <span className="font-medium text-slate-700 text-sm">{lead.name}</span>
                                <span className="text-slate-400 text-xs ml-2">{lead.company}</span>
                            </div>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                lead.dmStatus === "SENT"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-500"
                            }`}>
                                {lead.dmStatus === "SENT" ? "DM Sent" : "Skipped"}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <div className="text-xs text-slate-400 border-t border-slate-100 pt-6">
                Slack alerts fire Mon–Fri at 9 AM MT via the{" "}
                <span className="font-mono">linkedin-dm-queue</span> Inngest function.
                This page mirrors that query in real time.
            </div>
        </div>
    );
}

function LeadCard({ lead }: { lead: any }) {
    const days = daysSince(lead.updatedAt);
    const firstName = lead.name?.split(" ")[0] ?? lead.name;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            {/* Lead identity */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-base">{lead.name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SCORE_COLOR(lead.score)}`}>
                            Score {lead.score}
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {days}d since email
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {lead.title ?? "—"}{lead.company ? ` @ ${lead.company}` : ""}
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

            {/* Copy-paste DM script */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    📋 Copy-paste DM script
                </p>
                <p className="text-sm text-slate-700 leading-relaxed select-all">
                    Hi {firstName} — can I send you a free copy of my guide,{" "}
                    <em>"5 Things That Actually Determine If Franchise Ownership Makes Sense For You"</em>?
                </p>
            </div>

            <LinkedInDmActions leadId={lead.id} />
        </div>
    );
}
