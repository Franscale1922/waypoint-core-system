import Link from "next/link";
import { Layers, User, Clock, ArrowRight } from "lucide-react";
import prisma from "@/lib/prisma";
import { Section } from "@/components/admin/Section";

export const dynamic = "force-dynamic";

/**
 * Every stored match run, newest first.
 *
 * Read-only. Runs are immutable snapshots ([C-9]), so there is deliberately no edit or delete
 * control here: a correction is a new superseding row recorded on the worksheet, never a mutation
 * of a past run.
 */
export default async function MatchWorkspaceIndex() {
  const runs = await prisma.matchRun.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      candidate: true,
      scoringConfig: { select: { version: true } },
      _count: { select: { scores: true } },
    },
    take: 100,
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Match workspace</h1>
        <p className="text-sm text-slate-500 mt-1">
          Completed match runs, kept as immutable snapshots. A correction is recorded as a new
          decision, never an edit to the run.
        </p>
      </div>

      <Section
        icon={<Layers className="w-4 h-4 text-blue-500" />}
        title="Runs"
        right={<span className="text-sm text-slate-500">{runs.length}</span>}
      >
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">
            No runs yet. A run appears here once a matcher package is imported.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {runs.map((run) => (
              <li key={run.id}>
                <Link
                  href={`/admin/match-workspace/${run.id}`}
                  className="flex items-center gap-4 py-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-900 truncate">
                        {run.candidate.redactedAt ? "[redacted]" : run.candidate.displayName}
                      </span>
                      {run.candidate.externalRef ? (
                        <span className="text-xs text-slate-400 truncate">{run.candidate.externalRef}</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {run.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                      </span>
                      <span>{run._count.scores} brands</span>
                      <span className="truncate">config {run.scoringConfig.version}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
