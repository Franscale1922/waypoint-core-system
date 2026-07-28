import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart2, FileText, Layers, User, AlertTriangle, Eye } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireAdminPage } from "@/lib/require-admin-page";
import { Section } from "@/components/admin/Section";
import { ScoreBar } from "@/components/admin/ScoreBar";
import { DecisionControls } from "@/components/admin/DecisionControls";
import { OutcomeControls } from "@/components/admin/OutcomeControls";
import { ProjectionCapture } from "@/components/admin/ProjectionCapture";
import { brandDisplayName } from "@/lib/match-workspace/brand-resolver";
import { currentHead } from "@/lib/match-workspace/append";
import { outcomesForRun } from "@/lib/match-workspace/outcomes";

export const dynamic = "force-dynamic";

const CONFIDENCE_STYLES: Record<string, string> = {
  HIGH: "bg-emerald-100 text-emerald-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  MED: "bg-blue-100 text-blue-800",
  LOW: "bg-amber-100 text-amber-800",
};

const FLAG_STYLES: Record<string, string> = {
  red_flag: "bg-red-100 text-red-800",
  data_gap: "bg-amber-100 text-amber-800",
  msa_flag: "bg-purple-100 text-purple-800",
  thin_fit: "bg-slate-100 text-slate-700",
};

const num = (v: number | null, dp = 2) => (v === null ? "-" : v.toFixed(dp));

/**
 * The worksheet for one run: every ranked brand, its frozen scores, and the advisor's decisions.
 *
 * Two things it deliberately does NOT do. It never edits a score, because scores are immutable
 * ([C-9]) and a correction is a new row. And it renders a `stage_3c` brand without the FDD and MSA
 * columns rather than showing them as zero or blank: only the top ten by fit score carry into
 * Stage-4C, so those fields are legitimately ABSENT, and printing a dash where a number never
 * existed would invite reading it as a bad score.
 */
export default async function MatchWorksheet({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  // Primary gate. Middleware also covers /admin/*, but it is defense in depth by its own
  // docblock, and the layout deliberately does not enforce. This page renders frozen scores,
  // the raw detail JSON and candidate PII, so it carries its own gate.
  await requireAdminPage();

  const run = await prisma.matchRun.findUnique({
    where: { id: runId },
    include: {
      candidate: true,
      scoringConfig: true,
      inputs: { include: { inputVersion: true } },
      scores: {
        orderBy: { rank: "asc" },
        include: {
          decisions: { orderBy: { createdAt: "asc" } },
          corrections: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!run) notFound();

  // Outcomes key on (candidate, brand), so they are fetched for the candidate and grouped per brand.
  const outcomes = await outcomesForRun(prisma, run.id);
  const outcomesByBrand = new Map<string, typeof outcomes>();
  for (const o of outcomes) {
    if (!outcomesByBrand.has(o.waypointBrandId)) outcomesByBrand.set(o.waypointBrandId, []);
    outcomesByBrand.get(o.waypointBrandId)!.push(o);
  }

  // Current candidate-facing text per brand, so the worksheet can offer an edit rather than a
  // duplicate. Heads are derived the same way as everywhere else.
  const projections = await prisma.matchProjection.findMany({ where: { runId: run.id } });
  const supersededProjections = new Set(projections.map((p) => p.supersedesId).filter(Boolean) as string[]);
  const currentProjectionByBrand = new Map(
    projections.filter((p) => !supersededProjections.has(p.id)).map((p) => [p.waypointBrandId, p]),
  );

  const scored = run.scores.filter((s) => s.scoringStage === "stage_4c");
  const rankedOnly = run.scores.filter((s) => s.scoringStage !== "stage_4c");

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Link
        href="/admin/match-workspace"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-4 h-4" /> All runs
      </Link>
      <Link
        href={`/admin/match-workspace/${run.id}/candidate-view`}
        className="ml-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <Eye className="w-4 h-4" /> Candidate view
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {run.candidate.redactedAt ? "[redacted]" : run.candidate.displayName}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Run {run.createdAt.toISOString().slice(0, 16).replace("T", " ")} by {run.actor}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Section icon={<User className="w-4 h-4 text-slate-400" />} title="Candidate">
          <dl className="text-sm space-y-1">
            <Row label="Reference" value={run.candidate.externalRef ?? "-"} />
            <Row label="Email" value={run.candidate.redactedAt ? "[redacted]" : (run.candidate.email ?? "-")} />
            <Row label="Brands scored" value={String(run.scores.length)} />
          </dl>
        </Section>

        <Section icon={<FileText className="w-4 h-4 text-slate-400" />} title="Frozen inputs">
          <dl className="text-sm space-y-1">
            <Row label="Scoring config" value={run.scoringConfig.version} />
            <Row label="BrandDB snapshot" value={run.brandDbVersionRef} />
            {run.inputs.map((link) => (
              <Row
                key={link.id}
                label={link.inputVersion.sourceType}
                value={`${link.inputVersion.sourceHash.slice(0, 12)}...`}
                mono
              />
            ))}
            <Row label="Brand map" value={`${run.brandIdentityMapHash.slice(0, 12)}...`} mono />
          </dl>
        </Section>
      </div>

      <Section
        icon={<BarChart2 className="w-4 h-4 text-blue-500" />}
        title="Scored through Stage 4C"
        right={<span className="text-sm text-slate-500">{scored.length}</span>}
      >
        {scored.length === 0 ? (
          <p className="text-sm text-slate-500">No brand in this run reached Stage-4C scoring.</p>
        ) : (
          <div className="space-y-5">
            {scored.map((score) => {
              const head = currentHead(score.decisions);
              return (
                <div key={score.id} className="border border-slate-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-slate-400 mt-1 w-6">#{score.rank}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">
                          {brandDisplayName(score.waypointBrandId)}
                        </span>
                        <Pill className="bg-slate-100 text-slate-600">{score.maturity}</Pill>
                        <Pill className={CONFIDENCE_STYLES[score.confidence] ?? "bg-slate-100 text-slate-600"}>
                          {score.confidence}
                        </Pill>
                        {score.flags.map((f) => (
                          <Pill key={f} className={FLAG_STYLES[f] ?? "bg-slate-100 text-slate-600"}>
                            {f}
                          </Pill>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{score.waypointBrandId}</p>
                    </div>
                    <div className="w-48 shrink-0">
                      <ScoreBar score={score.finalScore ?? 0} max={1} decimals={2} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-x-4 gap-y-1 text-xs text-slate-600 pl-9">
                    <Metric label="fit" value={num(score.fitScore)} />
                    <Metric label="fit raw" value={num(score.fitRaw)} />
                    <Metric label="I19" value={score.i19Score === null ? "-" : String(score.i19Score)} />
                    <Metric label="I20" value={score.i20Score === null ? "-" : String(score.i20Score)} />
                    <Metric label="pre-MSA" value={num(score.preMsaScore)} />
                    <Metric label="MSA" value={num(score.msaModifier)} />
                  </div>

                  {score.scoreCapApplied !== null ? (
                    <p className="text-xs text-red-700 pl-9 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Red-flag override: the final score was capped at {num(score.scoreCapApplied)} regardless
                      of the arithmetic.
                    </p>
                  ) : null}

                  {score.i19DisclosureLevel ? (
                    <p className="text-xs text-slate-400 pl-9">
                      Weight row selected by Item-19 disclosure level {score.i19DisclosureLevel}.
                    </p>
                  ) : null}

                  <div className="pl-9">
                    <DecisionControls
                      scoreId={score.id}
                      currentState={head?.state ?? null}
                      currentDecisionId={head?.id ?? null}
                    />
                  </div>

                  {head?.state === "final_slate" ? (
                    <div className="pl-9 space-y-2 border-t border-slate-100 pt-3">
                      {(outcomesByBrand.get(score.waypointBrandId) ?? []).length > 0 ? (
                        <ul className="text-xs text-slate-600 space-y-0.5">
                          {(outcomesByBrand.get(score.waypointBrandId) ?? []).map((o) => (
                            <li key={o.id} className={o.supersedesId ? "text-slate-400" : ""}>
                              <span className="font-medium">{o.type}</span>{" "}
                              {o.effectiveAt.toISOString().slice(0, 10)}
                              {o.reason ? `, ${o.reason}` : ""}
                              {o.supersedesId ? " (correction)" : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400">No outcome recorded yet.</p>
                      )}
                      <OutcomeControls
                        candidateId={run.candidateId}
                        waypointBrandId={score.waypointBrandId}
                        originatingRunId={run.id}
                      />
                      <ProjectionCapture
                        runId={run.id}
                        waypointBrandId={score.waypointBrandId}
                        matchDecisionId={head.id}
                        existingText={currentProjectionByBrand.get(score.waypointBrandId)?.bodyText ?? null}
                        existingProjectionId={currentProjectionByBrand.get(score.waypointBrandId)?.id ?? null}
                      />
                    </div>
                  ) : null}

                  {score.decisions.length > 1 ? (
                    <p className="text-xs text-slate-400 pl-9">
                      {score.decisions.length} decisions recorded. Earlier ones are kept, superseded not
                      overwritten.
                    </p>
                  ) : null}

                  {score.corrections.length > 0 ? (
                    <ul className="pl-9 text-xs text-slate-500 space-y-0.5">
                      {score.corrections.map((c) => (
                        <li key={c.id}>
                          <span className="font-medium">{c.field}</span> corrected by {c.actor}: {c.reason}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {rankedOnly.length > 0 ? (
        <Section
          icon={<Layers className="w-4 h-4 text-slate-400" />}
          title="Ranked only (below the FDD cut)"
          right={<span className="text-sm text-slate-500">{rankedOnly.length}</span>}
        >
          <p className="text-xs text-slate-500 mb-3">
            Only the top ten by fit score carry into FDD and MSA scoring, so these brands have a fit
            score and nothing downstream. The absence is a stated fact, not a missing value.
          </p>
          <ul className="divide-y divide-slate-100">
            {rankedOnly.map((score) => (
              <li key={score.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="text-xs font-semibold text-slate-400 w-8">#{score.rank}</span>
                <span className="flex-1 truncate text-slate-800">
                  {brandDisplayName(score.waypointBrandId)}
                </span>
                <Pill className="bg-slate-100 text-slate-600">{score.maturity}</Pill>
                <span className="text-slate-500 tabular-nums w-12 text-right">fit {num(score.fitScore)}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="text-slate-500 w-36 shrink-0">{label}</dt>
      <dd className={`text-slate-800 truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-400">{label} </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>;
}
