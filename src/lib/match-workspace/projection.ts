/**
 * Writing and reading the candidate-safe projection. [C-15] [C-16] [C-7]
 *
 * Three rules, all structural rather than procedural:
 *
 *   WRITE   text is refused unless it passes the leak validator, and the projection must attach to
 *           a `final_slate` decision that is still its lineage's current head. A brand the advisor
 *           has since rejected cannot acquire candidate-facing text at all.
 *   READ    the candidate-facing query joins ONLY MatchProjection and MatchDecision. [C-16] forbids
 *           joining MatchScore, and nothing here does.
 *   REDACT  right-to-be-forgotten nulls the body. Intro-script prose is written about a named
 *           person, so [C-7] has to reach it, not just the Candidate row.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { checkProjectionText, collectStrings, type LeakFinding } from "./projection-guard";
import { currentHead } from "./append";

export class ProjectionRefused extends Error {
  constructor(
    message: string,
    readonly code:
      | "LEAK_DETECTED"
      | "DECISION_NOT_FOUND"
      | "DECISION_NOT_CURRENT"
      | "DECISION_NOT_FINAL_SLATE"
      | "DECISION_RUN_MISMATCH"
      | "EMPTY_BODY"
      | "MUST_SUPERSEDE_CURRENT_PROJECTION",
    readonly findings: LeakFinding[] = [],
  ) {
    super(message);
    this.name = "ProjectionRefused";
  }
}

/**
 * Every string from the run's frozen per-brand `detail` objects, which is what the verbatim-overlap
 * check compares against. Reading MatchScore HERE is fine and is not a [C-16] violation: [C-16]
 * constrains the CANDIDATE-FACING read path, and this is the write path deciding what may be
 * stored. The candidate view never runs this.
 */
async function evidenceForRun(tx: Prisma.TransactionClient, runId: string): Promise<string[]> {
  const scores = await tx.matchScore.findMany({ where: { runId }, select: { detail: true } });
  return scores.flatMap((s) => collectStrings(s.detail));
}

export async function appendProjection(
  tx: Prisma.TransactionClient,
  input: {
    runId: string;
    waypointBrandId: string;
    matchDecisionId: string;
    bodyText: string;
    sourceSkill: string;
    actor: string;
    supersedesId?: string | null;
  },
) {
  if (!input.bodyText || !input.bodyText.trim()) {
    throw new ProjectionRefused("The projection text is empty.", "EMPTY_BODY");
  }

  // The decision must exist, belong to this run and brand, still be current, and be final_slate.
  // This is what makes slate membership structural rather than a convention.
  const decision = await tx.matchDecision.findUnique({
    where: { id: input.matchDecisionId },
    include: { score: true },
  });
  if (!decision) {
    throw new ProjectionRefused(
      `No decision ${input.matchDecisionId} to attach this text to.`,
      "DECISION_NOT_FOUND",
    );
  }
  if (decision.score.runId !== input.runId || decision.score.waypointBrandId !== input.waypointBrandId) {
    throw new ProjectionRefused(
      `Decision ${input.matchDecisionId} belongs to a different run or brand than the projection.`,
      "DECISION_RUN_MISMATCH",
    );
  }
  const lineage = await tx.matchDecision.findMany({ where: { scoreId: decision.scoreId } });
  const head = currentHead(lineage);
  if (!head || head.id !== decision.id) {
    throw new ProjectionRefused(
      `Decision ${input.matchDecisionId} is no longer the current decision for this brand. Re-read the worksheet before writing candidate-facing text.`,
      "DECISION_NOT_CURRENT",
    );
  }
  if (decision.state !== "final_slate") {
    throw new ProjectionRefused(
      `This brand's current decision is "${decision.state}", not "final_slate". Candidate-facing text exists only for a confirmed slate.`,
      "DECISION_NOT_FINAL_SLATE",
    );
  }

  // Fail-closed leak check, against this run's own evidence as well as the pattern rules.
  const check = checkProjectionText(input.bodyText, await evidenceForRun(tx, input.runId));
  if (!check.ok) {
    throw new ProjectionRefused(
      `The text contains ${check.findings.length} thing(s) a candidate must never see.`,
      "LEAK_DETECTED",
      check.findings,
    );
  }

  // One CURRENT projection per (runId, waypointBrandId). Enforced here rather than by a composite
  // unique, which would forbid the superseding row a correction requires.
  const existing = await tx.matchProjection.findMany({
    where: { runId: input.runId, waypointBrandId: input.waypointBrandId },
  });
  const projHead = currentHead(existing);
  if (projHead && input.supersedesId !== projHead.id) {
    throw new ProjectionRefused(
      `This brand already has candidate-facing text (${projHead.id}). A correction supersedes it; pass supersedesId.`,
      "MUST_SUPERSEDE_CURRENT_PROJECTION",
    );
  }
  if (!projHead && input.supersedesId) {
    throw new ProjectionRefused(
      `There is no existing projection for this brand to supersede.`,
      "MUST_SUPERSEDE_CURRENT_PROJECTION",
    );
  }

  return tx.matchProjection.create({
    data: {
      runId: input.runId,
      waypointBrandId: input.waypointBrandId,
      matchDecisionId: input.matchDecisionId,
      bodyText: input.bodyText,
      sourceSkill: input.sourceSkill,
      actor: input.actor,
      supersedesId: input.supersedesId ?? null,
    },
  });
}

export type CandidateFacingBrand = { waypointBrandId: string; bodyText: string };

/**
 * What a candidate may see for a run.
 *
 * [C-16] IN ONE PLACE: this query touches `matchProjection` and its `matchDecision` relation, and
 * NOTHING else. It never selects a score, a flag, a confidence, or a rank, and a test asserts the
 * source of this function contains no reference to `matchScore`.
 *
 * A row survives only if its projection is the current head, its body is not redacted, and the
 * decision it hangs from is still that brand's current decision AND still `final_slate`. Rejecting
 * a brand on the worksheet therefore removes its candidate-facing text with no extra step.
 */
export async function candidateFacingProjections(
  db: PrismaClient,
  runId: string,
): Promise<CandidateFacingBrand[]> {
  // Heads are derived over the UNFILTERED set, then filtered. Deriving over a pre-filtered set
  // would let a redacted successor resurrect its predecessor as a head and show text that had been
  // superseded. Not reachable today, since redaction nulls a whole run, but the ordering is free.
  const rows = await db.matchProjection.findMany({
    where: { runId },
    select: {
      id: true,
      waypointBrandId: true,
      bodyText: true,
      redactedAt: true,
      supersedesId: true,
      matchDecision: { select: { id: true, state: true, scoreId: true } },
    },
  });

  const superseded = new Set(rows.map((r) => r.supersedesId).filter(Boolean) as string[]);
  const currentProjections = rows.filter(
    (r) => !superseded.has(r.id) && r.redactedAt === null && r.bodyText !== null,
  );

  // Confirm each attached decision is still the head of its own chain. Read from MatchDecision
  // only: ids and state, never a score field.
  const scoreIds = [...new Set(currentProjections.map((r) => r.matchDecision.scoreId))];
  const decisions = await db.matchDecision.findMany({
    where: { scoreId: { in: scoreIds } },
    select: { id: true, scoreId: true, state: true, supersedesId: true },
  });
  const supersededDecisions = new Set(decisions.map((d) => d.supersedesId).filter(Boolean) as string[]);

  return currentProjections
    .filter((r) => {
      const d = r.matchDecision;
      return d.state === "final_slate" && !supersededDecisions.has(d.id);
    })
    .map((r) => ({ waypointBrandId: r.waypointBrandId, bodyText: r.bodyText! }));
}

/**
 * Right to be forgotten. [C-7]
 *
 * Anonymize, never destroy: the immutable runs, scores, decisions and outcomes all key on the
 * opaque `Candidate.id`, which carries no PII, so historical truth and future calibration survive a
 * deletion request. What must go is the PII itself, and that includes every projection body written
 * about this person, which is the part the Phase-1 test did not cover because no redaction code
 * existed then.
 */
export async function redactCandidate(
  db: PrismaClient,
  candidateId: string,
  now: Date = new Date(),
): Promise<{ candidateId: string; projectionsRedacted: number }> {
  return db.$transaction(async (tx) => {
    await tx.candidate.update({
      where: { id: candidateId },
      data: { displayName: "[redacted]", email: null, redactedAt: now },
    });
    const { count } = await tx.matchProjection.updateMany({
      where: { run: { candidateId }, redactedAt: null },
      data: { bodyText: null, redactedAt: now },
    });
    return { candidateId, projectionsRedacted: count };
  });
}
