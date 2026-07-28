import { describe, it, expect } from "vitest";
import { prisma } from "../setup/test-db";
import { makeRun, makeScore } from "./_helpers";
import {
  appendDecision,
  appendCorrection,
  appendOutcome,
  appendInputVersion,
  currentHead,
  LineageError,
} from "@/lib/match-workspace/append";

/**
 * These tests pair with the "KNOWN Phase-2 GAP" assertion in supersession.test.ts, which proves raw
 * Prisma still permits a cross-lineage write. That assertion stays: it documents that the invariant
 * is service-level, not a database constraint. What follows proves the service actually refuses
 * what the database allows, so the pair is meaningful in both directions.
 *
 * `prisma` is used directly as the TransactionClient. Every function takes one so the import path
 * can call them inside `$transaction`; the interface is identical either way.
 */
const tx = prisma as unknown as Parameters<typeof appendDecision>[0];

const captureLineageError = async (fn: () => Promise<unknown>): Promise<LineageError> => {
  try {
    await fn();
  } catch (err) {
    if (err instanceof LineageError) return err;
    throw new Error(`expected a LineageError, got: ${String(err)}`);
  }
  throw new Error("expected the append to be refused, but it succeeded");
};

describe("appendDecision", () => {
  it("appends a first decision, then supersedes it", async () => {
    const { run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_dec1" });

    const d1 = await appendDecision(tx, { scoreId: score.id, state: "shortlist", actor: "a@test" });
    const d2 = await appendDecision(tx, {
      scoreId: score.id,
      state: "final_slate",
      actor: "a@test",
      supersedesId: d1.id,
    });

    const all = await prisma.matchDecision.findMany({ where: { scoreId: score.id } });
    expect(currentHead(all)?.id).toBe(d2.id);
    // The prior row is untouched: a change is a new row, never an edit.
    expect((await prisma.matchDecision.findUniqueOrThrow({ where: { id: d1.id } })).state).toBe("shortlist");
  });

  it("REFUSES a cross-lineage supersession that raw Prisma permits", async () => {
    const { run } = await makeRun();
    const scoreA = await makeScore(run.id, { waypointBrandId: "wpb_lineage_a" });
    const scoreB = await makeScore(run.id, { waypointBrandId: "wpb_lineage_b" });

    const decA = await appendDecision(tx, { scoreId: scoreA.id, state: "shortlist", actor: "a@test" });

    const err = await captureLineageError(() =>
      appendDecision(tx, {
        scoreId: scoreB.id,
        state: "rejected",
        actor: "a@test",
        supersedesId: decA.id,
      }),
    );
    expect(err.code).toBe("CROSS_LINEAGE_SUPERSESSION");

    // And prove the database itself still allows it, so the boundary is visibly service-level.
    const raw = await prisma.matchDecision.create({
      data: { scoreId: scoreB.id, state: "rejected", actor: "a@test", supersedesId: decA.id },
    });
    expect(raw.supersedesId).toBe(decA.id);
  });

  it("REFUSES a second head: an un-superseding append beside an existing current decision", async () => {
    // This is the invariant 2G depends on. Two heads means "is this brand still on the slate" has
    // two answers, and the candidate-facing projection cannot tell which is true.
    const { run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_two_heads" });

    await appendDecision(tx, { scoreId: score.id, state: "final_slate", actor: "a@test" });
    const err = await captureLineageError(() =>
      appendDecision(tx, { scoreId: score.id, state: "rejected", actor: "a@test" }),
    );
    expect(err.code).toBe("MUST_SUPERSEDE_CURRENT_HEAD");
  });

  it("REFUSES superseding a row that already has a successor", async () => {
    const { run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_stale" });

    const d1 = await appendDecision(tx, { scoreId: score.id, state: "shortlist", actor: "a@test" });
    await appendDecision(tx, { scoreId: score.id, state: "final_slate", actor: "a@test", supersedesId: d1.id });

    const err = await captureLineageError(() =>
      appendDecision(tx, { scoreId: score.id, state: "rejected", actor: "a@test", supersedesId: d1.id }),
    );
    expect(err.code).toBe("SUPERSEDED_ROW_ALREADY_REPLACED");
  });

  it("REFUSES superseding a row that does not exist", async () => {
    const { run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_ghost" });
    const err = await captureLineageError(() =>
      appendDecision(tx, {
        scoreId: score.id,
        state: "rejected",
        actor: "a@test",
        supersedesId: "00000000-0000-0000-0000-000000000000",
      }),
    );
    expect(err.code).toBe("SUPERSEDED_ROW_NOT_FOUND");
  });
});

describe("appendCorrection", () => {
  it("treats different FIELDS on one score as independent chains", async () => {
    // Keying corrections on scoreId alone would refuse a second field's first correction.
    const { run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_corr" });

    const base = {
      scoreId: score.id,
      beforeValue: 1,
      afterValue: 2,
      reason: "advisor review",
      source: "call",
      actor: "a@test",
    };
    await appendCorrection(tx, { ...base, field: "fitScore" });
    const other = await appendCorrection(tx, { ...base, field: "msaModifier" });
    expect(other.field).toBe("msaModifier");
  });

  it("REFUSES a second correction to the SAME field that does not supersede", async () => {
    const { run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_corr2" });
    const base = {
      scoreId: score.id,
      field: "fitScore",
      beforeValue: 1,
      afterValue: 2,
      reason: "r",
      source: "s",
      actor: "a@test",
    };
    await appendCorrection(tx, base);
    const err = await captureLineageError(() => appendCorrection(tx, base));
    expect(err.code).toBe("MUST_SUPERSEDE_CURRENT_HEAD");
  });

  it("REFUSES superseding a correction to a DIFFERENT field", async () => {
    const { run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_corr3" });
    const base = {
      scoreId: score.id,
      beforeValue: 1,
      afterValue: 2,
      reason: "r",
      source: "s",
      actor: "a@test",
    };
    const fit = await appendCorrection(tx, { ...base, field: "fitScore" });
    const err = await captureLineageError(() =>
      appendCorrection(tx, { ...base, field: "msaModifier", supersedesId: fit.id }),
    );
    expect(err.code).toBe("CROSS_LINEAGE_SUPERSESSION");
  });
});

describe("appendOutcome", () => {
  it("allows a real timeline of distinct events for one candidate and brand", async () => {
    // introduced -> advanced -> placed are separate events, not corrections of one another, so the
    // second-head rule deliberately does NOT apply to outcomes.
    const { run, candidate } = await makeRun();
    const base = {
      candidateId: candidate.id,
      waypointBrandId: "wpb_timeline",
      originatingRunId: run.id,
      actor: "a@test",
    };
    await appendOutcome(tx, { ...base, type: "introduced" });
    await appendOutcome(tx, { ...base, type: "advanced" });
    const placed = await appendOutcome(tx, { ...base, type: "placed" });
    expect(placed.type).toBe("placed");

    const all = await prisma.matchOutcomeEvent.findMany({ where: { candidateId: candidate.id } });
    expect(all).toHaveLength(3);
  });

  it("REFUSES an outcome for Brand B superseding an outcome for Brand A", async () => {
    // The failure this prevents: "placed at Brand A" silently rewriting "lost at Brand B".
    const { run, candidate } = await makeRun();
    const lost = await appendOutcome(tx, {
      candidateId: candidate.id,
      waypointBrandId: "wpb_brand_a",
      originatingRunId: run.id,
      type: "lost",
      actor: "a@test",
    });
    const err = await captureLineageError(() =>
      appendOutcome(tx, {
        candidateId: candidate.id,
        waypointBrandId: "wpb_brand_b",
        originatingRunId: run.id,
        type: "placed",
        actor: "a@test",
        supersedesId: lost.id,
      }),
    );
    expect(err.code).toBe("CROSS_LINEAGE_SUPERSESSION");
  });

  it("allows correcting a mis-recorded outcome for the SAME brand", async () => {
    const { run, candidate } = await makeRun();
    const wrong = await appendOutcome(tx, {
      candidateId: candidate.id,
      waypointBrandId: "wpb_fixme",
      originatingRunId: run.id,
      type: "placed",
      actor: "a@test",
    });
    const fixed = await appendOutcome(tx, {
      candidateId: candidate.id,
      waypointBrandId: "wpb_fixme",
      originatingRunId: run.id,
      type: "withdrawn",
      actor: "a@test",
      reason: "recorded against the wrong stage",
      supersedesId: wrong.id,
    });
    expect(fixed.supersedesId).toBe(wrong.id);
  });
});

describe("appendInputVersion", () => {
  it("REFUSES a questionnaire superseding an intelligence summary", async () => {
    const candidate = await prisma.candidate.create({ data: { displayName: "Lineage IV" } });
    const summary = await appendInputVersion(tx, {
      candidateId: candidate.id,
      sourceType: "intelligence_summary",
      sourceHash: "h1",
      capturedAt: new Date(),
    });
    const err = await captureLineageError(() =>
      appendInputVersion(tx, {
        candidateId: candidate.id,
        sourceType: "questionnaire",
        sourceHash: "h2",
        capturedAt: new Date(),
        supersedesId: summary.id,
      }),
    );
    expect(err.code).toBe("CROSS_LINEAGE_SUPERSESSION");
  });

  it("allows a new version of the SAME source type, and derives the current head", async () => {
    const candidate = await prisma.candidate.create({ data: { displayName: "Lineage IV2" } });
    const v1 = await appendInputVersion(tx, {
      candidateId: candidate.id,
      sourceType: "intelligence_summary",
      sourceHash: "h1",
      capturedAt: new Date(),
    });
    const v2 = await appendInputVersion(tx, {
      candidateId: candidate.id,
      sourceType: "intelligence_summary",
      sourceHash: "h2",
      capturedAt: new Date(),
      supersedesId: v1.id,
    });
    const rows = await prisma.candidateInputVersion.findMany({
      where: { candidateId: candidate.id, sourceType: "intelligence_summary" },
    });
    expect(currentHead(rows)?.id).toBe(v2.id);
  });

  it("allows different source types to coexist as independent chains", async () => {
    const candidate = await prisma.candidate.create({ data: { displayName: "Lineage IV3" } });
    for (const sourceType of ["intelligence_summary", "questionnaire", "candidate_model"]) {
      await appendInputVersion(tx, {
        candidateId: candidate.id,
        sourceType,
        sourceHash: `h-${sourceType}`,
        capturedAt: new Date(),
      });
    }
    const rows = await prisma.candidateInputVersion.findMany({ where: { candidateId: candidate.id } });
    expect(rows).toHaveLength(3);
  });
});

describe("currentHead", () => {
  it("returns null rather than guessing when a chain has two heads", async () => {
    // Only reachable through raw Prisma, which is exactly why the append functions refuse it.
    const { run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_ambiguous" });
    await prisma.matchDecision.create({ data: { scoreId: score.id, state: "shortlist", actor: "a@test" } });
    await prisma.matchDecision.create({ data: { scoreId: score.id, state: "rejected", actor: "a@test" } });
    const rows = await prisma.matchDecision.findMany({ where: { scoreId: score.id } });
    expect(currentHead(rows)).toBeNull();
  });
});
