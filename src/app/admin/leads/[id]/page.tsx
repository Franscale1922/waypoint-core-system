import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ArrowLeft, Mail, Briefcase, Clock, TrendingUp, FileText, Newspaper, MessageSquare } from "lucide-react";
import { EmailBlock } from "@/components/EmailBlock";
import { RegenerateButton } from "@/components/RegenerateButton";
import { SendNowButton } from "@/components/SendNowButton";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

const STATUS_STYLES: Record<string, string> = {
    PENDING_CLAY:  "bg-yellow-100 text-yellow-800",
    RAW:           "bg-slate-100 text-slate-700",
    ENRICHED:      "bg-blue-100 text-blue-800",
    SEQUENCED:     "bg-indigo-100 text-indigo-800",
    SENT:          "bg-green-100 text-green-800",
    REPLIED:       "bg-purple-100 text-purple-800",
    BOOKED:        "bg-emerald-100 text-emerald-800",
    SUPPRESSED:    "bg-red-100 text-red-800",
};

function ScoreBar({ score }: { score: number }) {
    const pct = Math.min(100, score);
    const color = score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-blue-500" : "bg-slate-300";
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-2xl font-bold text-slate-900 w-10 text-right">{score}</span>
        </div>
    );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
                {icon}
                <span>{title}</span>
            </div>
            {children}
        </div>
    );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
        where: { id },
        include: { replies: { orderBy: { createdAt: "desc" } } },
    });

    if (!lead) notFound();

    const statusStyle = STATUS_STYLES[lead.status] ?? "bg-slate-100 text-slate-700";

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">

            {/* Back nav */}
            <Link href="/admin/leads" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Leads
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{lead.name}</h1>
                    <p className="text-slate-500 mt-1">{lead.title}{lead.company ? ` · ${lead.company}` : ""}</p>
                    {lead.country && <p className="text-slate-400 text-sm mt-0.5">{lead.country}</p>}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusStyle}`}>
                        {lead.status}
                    </span>
                    {lead.linkedinUrl && (
                        <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                            LinkedIn
                        </a>
                    )}
                    <SendNowButton leadId={lead.id} status={lead.status} />
                </div>
            </div>

            {/* Score + contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section icon={<TrendingUp className="w-4 h-4 text-blue-500" />} title="ICP Score">
                    <ScoreBar score={lead.score} />
                    <p className="text-xs text-slate-400">
                        Gate threshold: 50 · {lead.score >= 50 ? "✅ Cleared — eligible to send" : "❌ Below gate — suppressed"}
                    </p>
                    {lead.yearsInCurrentRole != null && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {lead.yearsInCurrentRole} years in current role
                        </p>
                    )}
                </Section>

                <Section icon={<Mail className="w-4 h-4 text-slate-400" />} title="Contact">
                    <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {lead.email ?? <span className="text-slate-400 italic">No email found</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            {lead.company ?? <span className="text-slate-400 italic">Unknown company</span>}
                        </div>
                    </div>
                </Section>
            </div>

            {/* Draft Email */}
            {lead.draftEmail ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            <span>Generated Email</span>
                        </div>
                        <RegenerateButton mode="single" leadId={lead.id} />
                    </div>
                    <EmailBlock draftEmail={lead.draftEmail} />
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                            <FileText className="w-4 h-4 text-slate-300" />
                            <span>Generated Email</span>
                        </div>
                        {lead.score >= 50 && <RegenerateButton mode="single" leadId={lead.id} />}
                    </div>
                    <p className="text-sm text-slate-400 italic">
                        {lead.score >= 50
                            ? "Email not generated yet — personalizerProcess may still be running."
                            : "No email generated — lead did not clear the 50-point gate."}
                    </p>
                </div>
            )}

            {/* Enrichment Signals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section icon={<Newspaper className="w-4 h-4 text-orange-500" />} title="Priority A — Company News">
                    {lead.companyNewsEvent
                        ? <p className="text-sm text-slate-700 leading-relaxed">{lead.companyNewsEvent}</p>
                        : <p className="text-sm text-slate-400 italic">No company news signal captured</p>}
                </Section>

                <Section icon={<MessageSquare className="w-4 h-4 text-purple-500" />} title="Priority B — Recent Post">
                    {lead.recentPostSummary
                        ? <p className="text-sm text-slate-700 leading-relaxed">{lead.recentPostSummary}</p>
                        : <p className="text-sm text-slate-400 italic">No LinkedIn post signal captured</p>}
                </Section>
            </div>

            {lead.careerTrigger && (
                <Section icon={<TrendingUp className="w-4 h-4 text-slate-400" />} title="Career Trigger">
                    <p className="text-sm text-slate-700">{lead.careerTrigger}</p>
                </Section>
            )}

            {/* Replies */}
            {lead.replies.length > 0 && (
                <Section icon={<MessageSquare className="w-4 h-4 text-green-500" />} title={`Replies (${lead.replies.length})`}>
                    <div className="space-y-4">
                        {lead.replies.map((reply) => (
                            <div key={reply.id} className="border border-slate-100 rounded-xl p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                        reply.classification === "Interested" ? "bg-emerald-100 text-emerald-700" :
                                        reply.classification === "Curious" ? "bg-blue-100 text-blue-700" :
                                        reply.classification === "Unsubscribe" ? "bg-red-100 text-red-700" :
                                        "bg-slate-100 text-slate-600"
                                    }`}>
                                        {reply.classification ?? "Unclassified"}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(reply.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{reply.content}</p>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Metadata */}
            <div className="text-xs text-slate-400 flex gap-6 pt-2">
                <span>ID: {lead.id}</span>
                <span>Added: {new Date(lead.createdAt).toLocaleString()}</span>
                <span>Updated: {new Date(lead.updatedAt).toLocaleString()}</span>
            </div>

        </div>
    );
}
