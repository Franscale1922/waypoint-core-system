import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { ImportLeadForm } from "@/components/ImportLeadForm";

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

export default async function LeadsManager() {
    const leads = await prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
    });

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                        Leads Manager
                    </h1>
                    <p className="text-slate-500 mt-2">Click any lead to view score, draft email, and enrichment signals.</p>
                </div>
                <ImportLeadForm />
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
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {leads.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                    No leads found in the database.
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
