import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";
const prisma = new PrismaClient();

const STEP_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Email 1 sent",
  2: "Email 2 sent",
  3: "Complete",
};

const STEP_STYLES: Record<number, string> = {
  0: "bg-slate-100 text-slate-600",
  1: "bg-blue-100 text-blue-700",
  2: "bg-indigo-100 text-indigo-700",
  3: "bg-emerald-100 text-emerald-800",
};

export default async function ScorecardSubmissionsPage() {
  const submissions = await (prisma as any).scorecardSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const total = submissions.length;
  const highScore = submissions.filter((s: any) => s.score >= 70).length;
  const unsubscribed = submissions.filter((s: any) => s.unsubscribed).length;
  const completed = submissions.filter((s: any) => s.nurtureCompletedAt).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          Scorecard Submissions
        </h1>
        <p className="text-slate-500 mt-2">Inbound leads who completed the franchise readiness quiz.</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total submissions", value: total },
          { label: "High score (70+)", value: highScore },
          { label: "Sequence complete", value: completed },
          { label: "Unsubscribed", value: unsubscribed },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Score</th>
              <th className="px-6 py-4">Driver</th>
              <th className="px-6 py-4">Biggest Fear</th>
              <th className="px-6 py-4">Nurture</th>
              <th className="px-6 py-4 text-right">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  No scorecard submissions yet.
                </td>
              </tr>
            ) : submissions.map((s: any) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">
                  {s.name}
                  {s.unsubscribed && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-500 font-normal">
                      unsub
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-500">{s.email}</td>
                <td className="px-6 py-4">
                  <span className={`font-bold font-mono ${s.score >= 70 ? "text-emerald-700" : s.score >= 40 ? "text-amber-600" : "text-slate-600"}`}>
                    {s.score}
                  </span>
                  <span className="text-slate-400 text-xs">/100</span>
                </td>
                <td className="px-6 py-4 text-slate-500 max-w-[160px] truncate">{s.primaryDriver ?? "—"}</td>
                <td className="px-6 py-4 text-slate-500 max-w-[160px] truncate">{s.biggestFear ?? "—"}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STEP_STYLES[s.nurtureStep] ?? "bg-slate-100 text-slate-600"}`}>
                    {STEP_LABELS[s.nurtureStep] ?? `Step ${s.nurtureStep}`}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-slate-400 whitespace-nowrap text-xs">
                  {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
