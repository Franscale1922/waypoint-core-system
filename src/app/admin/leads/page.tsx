import { PrismaClient, LeadStatus } from "@prisma/client";
import Link from "next/link";
import { ImportLeadForm } from "@/components/ImportLeadForm";
import { RegenerateButton } from "@/components/RegenerateButton";
import { DeleteLeadButton, BulkDeleteButton } from "@/components/DeleteLeadButton";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

const STATUS_STYLES: Record<string, string> = {
    PENDING_CLAY: "bg-yellow-100 text-yellow-800",
    RAW:          "bg-slate-100 text-slate-700",
    ENRICHED:     "bg-blue-100 text-blue-800",
    SEQUENCED:    "bg-indigo-100 text-indigo-800",
    SENT:         "bg-green-100 text-green-800",
    REPLIED:      "bg-purple-100 text-purple-800",
    BOOKED:       "bg-emerald-100 text-emerald-800",
    SUPPRESSED:   "bg-red-100 text-red-800",
};

const ALL_STATUSES = ["SENT", "SEQUENCED", "ENRICHED", "PENDING_CLAY", "SUPPRESSED", "REPLIED", "BOOKED", "RAW"];

// Map status → pill style for the filter buttons
const FILTER_ACTIVE: Record<string, string> = {
    SENT:         "bg-green-600 text-white border-green-600",
    SEQUENCED:    "bg-indigo-600 text-white border-indigo-600",
    ENRICHED:     "bg-blue-600 text-white border-blue-600",
    PENDING_CLAY: "bg-yellow-500 text-white border-yellow-500",
    SUPPRESSED:   "bg-red-600 text-white border-red-600",
    REPLIED:      "bg-purple-600 text-white border-purple-600",
    BOOKED:       "bg-emerald-600 text-white border-emerald-600",
    RAW:          "bg-slate-600 text-white border-slate-600",
};

interface Props {
    searchParams: Promise<{ status?: string }>;
}

export default async function LeadsManager({ searchParams }: Props) {
    const { status } = await searchParams;
    const activeStatus = ALL_STATUSES.includes(status ?? "") ? (status as LeadStatus) : undefined;

    const leads = await prisma.lead.findMany({
        where: activeStatus ? { status: activeStatus } : undefined,
        orderBy: { createdAt: "desc" },
        // When filtered by status, return up to 500 so SENT leads are all visible.
        // Unfiltered view keeps the original 200 cap to avoid slow loads on 1000+ rows.
        take: activeStatus ? 500 : 200,
    });

    const pendingClayCount = leads.filter(l => l.status === "PENDING_CLAY").length;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                        Leads Manager
                    </h1>
                    <p className="text-slate-500 mt-2">Click any lead to view score, draft email, and enrichment signals.</p>
                </div>
                <div className="flex items-center gap-3">
                    {pendingClayCount > 0 && (
                        <BulkDeleteButton
                            status="PENDING_CLAY"
                            label={`Delete ${pendingClayCount} PENDING_CLAY`}
                        />
                    )}
                    <RegenerateButton mode="all" />
                    <ImportLeadForm />
                </div>
            </div>

            {/* ── Status filter bar ─────────────────────────────────────────────── */}
            {/* Click a status to filter; click "All" to clear. Persists in URL so  */}
            {/* you can bookmark /admin/leads?status=SENT for recurring audits.      */}
            <div className="flex flex-wrap items-center gap-2">
                <Link
                    href="/admin/leads"
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        !activeStatus
                            ? "bg-slate-800 text-white border-slate-800"
                            : "bg-white text-slate-600 border-slate-300 hover:border-slate-500"
                    }`}
                >
                    All ({leads.length}{activeStatus ? "" : " shown"})
                </Link>
                {ALL_STATUSES.map(s => (
                    <Link
                        key={s}
                        href={`/admin/leads?status=${s}`}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                            activeStatus === s
                                ? FILTER_ACTIVE[s]
                                : "bg-white text-slate-600 border-slate-300 hover:border-slate-500"
                        }`}
                    >
                        {s === activeStatus ? `✓ ${s}` : s}
                    </Link>
                ))}
                {activeStatus && (
                    <span className="ml-2 text-xs text-slate-500">
                        Showing {leads.length} {activeStatus} leads — <Link href="/admin/leads" className="underline">clear filter</Link>
                    </span>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Company</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Score</th>
                            <th className="px-6 py-4 text-right">Added</th>
                            <th className="px-6 py-4 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {leads.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                    No leads found{activeStatus ? ` with status ${activeStatus}` : " in the database"}.
                                </td>
                            </tr>
                        ) : leads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-blue-50 transition-colors cursor-pointer group">
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    <Link href={`/admin/leads/${lead.id}`} className="block w-full">
                                        <span className="group-hover:text-blue-700 transition-colors">{lead.name}</span>
                                        <div className="text-xs text-slate-400 font-normal">{lead.title}</div>
                                    </Link>
                                </td>
                                <td className="px-6 py-4">
                                    <Link href={`/admin/leads/${lead.id}`} className="block w-full">{lead.company || "—"}</Link>
                                </td>
                                <td className="px-6 py-4">
                                    <Link href={`/admin/leads/${lead.id}`} className="block w-full">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[lead.status] ?? "bg-slate-100 text-slate-800"}`}>
                                            {lead.status}
                                        </span>
                                    </Link>
                                </td>
                                <td className="px-6 py-4">
                                    <Link href={`/admin/leads/${lead.id}`} className="block w-full font-mono">{lead.score}</Link>
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                    <Link href={`/admin/leads/${lead.id}`} className="block w-full">
                                        {new Date(lead.createdAt).toLocaleDateString()}
                                    </Link>
                                </td>
                                <td className="px-3 py-4">
                                    <DeleteLeadButton id={lead.id} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
