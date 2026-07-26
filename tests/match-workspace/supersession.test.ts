import { describe, it, expect } from "vitest";
import { prisma } from "../setup/test-db";
import { makeRun, makeScore, isPrismaCode, captureError } from "./_helpers";

describe("append-only supersession (C-8, C-12)", () => {
  it("C-8: a candidate-input correction is a NEW superseding version, prior row untouched", async () => {
    const candidate = await prisma.candidate.create({ data: { displayName: "IV Test" } });
    const iv1 = await prisma.candidateInputVersion.create({
      data: { candidateId: candidate.id, sourceType: "intelligence_summary", sourceHash: "v1hash", capturedAt: new Date() },
    });
    const iv2 = await prisma.candidateInputVersion.create({
      data: {
        candidateId: candidate.id,
        sourceType: "intelligence_summary",
        sourceHash: "v2hash",
        capturedAt: new Date(),
        supersedesId: iv1.id,
      },
    });

    // Prior row is byte-for-byte unchanged (pure INSERT, never an in-place edit).
    const iv1After = await prisma.candidateInputVersion.findUniqueOrThrow({ where: { id: iv1.id } });
    expect(iv1After.sourceHash).toBe("v1hash");
    expect(iv1After.supersedesId).toBeNull();
    expect(iv2.supersedesId).toBe(iv1.id);

    // @unique(supersedesId): a second version cannot also supersede iv1.
    const err = await captureError(() =>
      prisma.candidateInputVersion.create({
        data: {
          candidateId: candidate.id,
          sourceType: "intelligence_summary",
          sourceHash: "v3hash",
          capturedAt: new Date(),
          supersedesId: iv1.id,
        },
      }),
    );
    expect(isPrismaCode(err, "P2002")).toBe(true);
  });

  it("C-12: decisions form an append-only chain; 'current' is derived, not stored", async () => {
    const { run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_sup" });

    const d1 = await prisma.matchDecision.create({
      data: { scoreId: score.id, state: "shortlist", actor: "a@test" },
    });
    const d2 = await prisma.matchDecision.create({
      data: { scoreId: score.id, state: "final_slate", actor: "a@test", supersedesId: d1.id },
    });

    // Prior decision is unchanged; the change is a new row.
    const d1After = await prisma.matchDecision.findUniqueOrThrow({ where: { id: d1.id } });
    expect(d1After.state).toBe("shortlist");

    // Derive the current decision = the one no other row supersedes.
    const all = await prisma.matchDecision.findMany({ where: { scoreId: score.id } });
    const supersededIds = new Set(all.map((d) => d.supersedesId).filter(Boolean));
    const current = all.filter((d) => !supersededIds.has(d.id));
    expect(current).toHaveLength(1);
    expect(current[0].id).toBe(d2.id);
    expect(current[0].state).toBe("final_slate");
  });

  it("C-12: concurrent supersession of the same row — exactly one wins (@unique race)", async () => {
    const { run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_race" });
    const base = await prisma.matchDecision.create({
      data: { scoreId: score.id, state: "shortlist", actor: "a@test" },
    });

    const attempt = (state: "final_slate" | "rejected") =>
      prisma.matchDecision.create({
        data: { scoreId: score.id, state, actor: "a@test", supersedesId: base.id },
      });

    const results = await Promise.allSettled([attempt("final_slate"), attempt("rejected")]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(isPrismaCode((rejected[0] as PromiseRejectedResult).reason, "P2002")).toBe(true);
  });

  it("KNOWN Phase-2 GAP: cross-lineage supersession is NOT yet blocked at the DB", async () => {
    // Phase 1 has no write-path service layer, and the roadmap rules out Postgres triggers,
    // so nothing prevents a decision from superseding a DIFFERENT score's decision. This test
    // documents the gap honestly (asserts it currently SUCCEEDS) so Phase 2's service layer
    // must add the same-lineage (same scoreId) invariant. TODO(Phase 2): enforce + flip this.
    const { run } = await makeRun();
    const scoreA = await makeScore(run.id, { waypointBrandId: "wpb_lineageA" });
    const scoreB = await makeScore(run.id, { waypointBrandId: "wpb_lineageB" });

    const decA = await prisma.matchDecision.create({
      data: { scoreId: scoreA.id, state: "shortlist", actor: "a@test" },
    });
    // A decision on scoreB superseding a decision on scoreA — semantically wrong, yet allowed today.
    const crossLineage = await prisma.matchDecision.create({
      data: { scoreId: scoreB.id, state: "rejected", actor: "a@test", supersedesId: decA.id },
    });
    expect(crossLineage.supersedesId).toBe(decA.id);
    expect(crossLineage.scoreId).toBe(scoreB.id);
    expect(decA.scoreId).toBe(scoreA.id); // different lineage — the invariant Phase 2 must enforce
  });
});
