import { describe, it, expect } from "vitest";
import { prisma } from "../setup/test-db";
import { makeRun, makeScore, isPrismaCode, captureError } from "./_helpers";

describe("immutability & idempotency (C-10, C-11)", () => {
  it("C-10: allows exactly one MatchScore per (runId, waypointBrandId)", async () => {
    const { run } = await makeRun();
    await makeScore(run.id, { waypointBrandId: "wpb_alpha" });

    // A second score for the same run+brand violates @@unique([runId, waypointBrandId]).
    const err = await captureError(() => makeScore(run.id, { waypointBrandId: "wpb_alpha" }));
    expect(isPrismaCode(err, "P2002")).toBe(true);

    // A different brand in the same run is fine.
    await expect(makeScore(run.id, { waypointBrandId: "wpb_beta" })).resolves.toBeTruthy();

    const count = await prisma.matchScore.count({ where: { runId: run.id } });
    expect(count).toBe(2);
  });

  it("C-11: a duplicate import (same idempotencyKey) creates NO new run", async () => {
    const key = "idem-shared-key-001";
    const first = await makeRun({ idempotencyKey: key });
    await makeScore(first.run.id, { waypointBrandId: "wpb_gamma" });

    // Re-importing the same frozen package = same idempotencyKey → the run insert is refused.
    const candidate2 = await prisma.candidate.create({ data: { displayName: "Other" } });
    const iv2 = await prisma.candidateInputVersion.create({
      data: {
        candidateId: candidate2.id,
        sourceType: "questionnaire",
        sourceHash: "h2",
        capturedAt: new Date(),
      },
    });

    const err = await captureError(() =>
      prisma.matchRun.create({
        data: {
          candidateId: candidate2.id,
          candidateInputVersionId: iv2.id,
          scoringConfigId: first.config.id,
          brandDbVersionRef: "branddb-v3",
          idempotencyKey: key, // same key
          status: "completed",
          actor: "advisor@example.test",
          brandRegistrySha256: "0".repeat(64),
          brandIdentityMapHash: "0".repeat(64),
        },
      }),
    );
    expect(isPrismaCode(err, "P2002")).toBe(true);

    // Exactly one run and one score exist for that key's lineage — no duplicates.
    const runs = await prisma.matchRun.count({ where: { idempotencyKey: key } });
    expect(runs).toBe(1);
    const scores = await prisma.matchScore.count({ where: { runId: first.run.id } });
    expect(scores).toBe(1);
  });
});
