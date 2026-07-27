/**
 * Real-world outcome capture, and the unlabeled queue derived from it.
 *
 * WHY THE QUEUE IS A QUERY AND NOT A TABLE
 * ----------------------------------------
 * [C-1] permanently excludes a pipeline, journey stages, tasks and reminders. The moment this
 * queue gained an `assignee`, a `dueAt`, a `snoozedUntil` or a `dismissed` flag it would BE a task
 * list, whatever it was called, and the exclusion would be gone. So "unlabeled" is computed from
 * facts already recorded (a confirmed slate with no outcome yet) and nothing about the queue is
 * stored. There is nothing to dismiss, because there is no row.
 *
 * The one number that could have become configuration, the staleness threshold, is a parameter with
 * a stated default rather than a stored setting, for the same reason.
 */
import type { PrismaClient } from "@prisma/client";
import { currentHead } from "./append";

/**
 * How long a confirmed brand may sit without an outcome before it is worth surfacing. Not a
 * deadline and not stored anywhere: it only decides what a read-only view chooses to show.
 */
export const DEFAULT_STALE_AFTER_DAYS = 30;

export type UnlabeledSlateBrand = {
  runId: string;
  candidateId: string;
  candidateDisplayName: string;
  waypointBrandId: string;
  /** When the brand was confirmed onto the slate. */
  confirmedAt: Date;
  daysSinceConfirmed: number;
};

/**
 * Confirmed-slate brands with no current outcome event, older than the threshold.
 *
 * Derived entirely from `MatchDecision` and `MatchOutcomeEvent`. Reading `MatchScore` here is fine:
 * this is an internal advisor view, not the candidate-facing surface [C-16] constrains.
 */
export async function unlabeledSlateBrands(
  db: PrismaClient,
  opts: { staleAfterDays?: number; now?: Date } = {},
): Promise<UnlabeledSlateBrand[]> {
  const staleAfterDays = opts.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS;
  const now = opts.now ?? new Date();

  const decisions = await db.matchDecision.findMany({
    include: { score: { select: { runId: true, waypointBrandId: true, run: { select: { candidateId: true } } } } },
  });

  // "Current" is the row nothing supersedes. Sound because the append service refuses second heads.
  const byScore = new Map<string, typeof decisions>();
  for (const d of decisions) {
    if (!byScore.has(d.scoreId)) byScore.set(d.scoreId, []);
    byScore.get(d.scoreId)!.push(d);
  }

  const confirmed = [...byScore.values()]
    .map((lineage) => ({ head: currentHead(lineage), lineage }))
    .filter((x) => x.head?.state === "final_slate")
    .map((x) => x.head!);

  if (confirmed.length === 0) return [];

  const candidateIds = [...new Set(confirmed.map((d) => d.score.run.candidateId))];
  const [outcomes, candidates] = await Promise.all([
    db.matchOutcomeEvent.findMany({ where: { candidateId: { in: candidateIds } } }),
    db.candidate.findMany({ where: { id: { in: candidateIds } }, select: { id: true, displayName: true, redactedAt: true } }),
  ]);

  const outcomesByPair = new Map<string, typeof outcomes>();
  for (const o of outcomes) {
    const key = `${o.candidateId}::${o.waypointBrandId}`;
    if (!outcomesByPair.has(key)) outcomesByPair.set(key, []);
    outcomesByPair.get(key)!.push(o);
  }
  const nameById = new Map(candidates.map((c) => [c.id, c.redactedAt ? "[redacted]" : c.displayName]));

  const out: UnlabeledSlateBrand[] = [];
  for (const d of confirmed) {
    const candidateId = d.score.run.candidateId;
    const key = `${candidateId}::${d.score.waypointBrandId}`;
    const lineage = outcomesByPair.get(key) ?? [];
    // Any outcome at all means this brand is labeled. A superseded-only chain cannot happen,
    // because a supersession always adds a newer row.
    if (lineage.length > 0) continue;

    const ageMs = now.getTime() - d.effectiveAt.getTime();
    const days = Math.floor(ageMs / 86_400_000);
    if (days < staleAfterDays) continue;

    out.push({
      runId: d.score.runId,
      candidateId,
      candidateDisplayName: nameById.get(candidateId) ?? "[unknown]",
      waypointBrandId: d.score.waypointBrandId,
      confirmedAt: d.effectiveAt,
      daysSinceConfirmed: days,
    });
  }

  return out.sort((a, b) => b.daysSinceConfirmed - a.daysSinceConfirmed);
}

/** Every outcome recorded for a run's candidate, newest first, for the worksheet. */
export async function outcomesForRun(db: PrismaClient, runId: string) {
  const run = await db.matchRun.findUnique({ where: { id: runId }, select: { candidateId: true } });
  if (!run) return [];
  return db.matchOutcomeEvent.findMany({
    where: { candidateId: run.candidateId },
    orderBy: { effectiveAt: "desc" },
  });
}
