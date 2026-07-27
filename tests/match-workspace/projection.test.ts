import { describe, it, expect } from "vitest";
import { prisma } from "../setup/test-db";
import { makeRun, makeScore } from "./_helpers";
import { appendDecision } from "@/lib/match-workspace/append";
import {
  appendProjection,
  candidateFacingProjections,
  redactCandidate,
  ProjectionRefused,
} from "@/lib/match-workspace/projection";

const tx = prisma as unknown as Parameters<typeof appendProjection>[0];

const SAFE_TEXT =
  "Here is why I put this brand in front of you. Owners run it as a manager-led business, the " +
  "investment runs from about $180,000 to $265,000, and they have been franchising for 14 years " +
  "with just over 300 locations open. The thing to press on when you talk to owners is hiring.";

const refusal = async (fn: () => Promise<unknown>): Promise<ProjectionRefused> => {
  try {
    await fn();
  } catch (err) {
    if (err instanceof ProjectionRefused) return err;
    throw new Error(`expected a ProjectionRefused, got: ${String(err)}`);
  }
  throw new Error("expected the projection to be refused, but it succeeded");
};

/** A run with one scored brand carrying a current final_slate decision. */
async function slatedBrand(detail: unknown = {}) {
  const { run, candidate } = await makeRun();
  const score = await makeScore(run.id, { waypointBrandId: "wpb_proj_" + Math.abs(run.id.length * 7), detail });
  const decision = await appendDecision(tx, { scoreId: score.id, state: "final_slate", actor: "a@test" });
  return { run, candidate, score, decision };
}

describe("appendProjection: slate membership is structural", () => {
  it("stores candidate-safe text for a confirmed brand", async () => {
    const { run, score, decision } = await slatedBrand();
    const p = await appendProjection(tx, {
      runId: run.id,
      waypointBrandId: score.waypointBrandId,
      matchDecisionId: decision.id,
      bodyText: SAFE_TEXT,
      sourceSkill: "brand-introduction-scripts",
      actor: "a@test",
    });
    expect(p.bodyText).toBe(SAFE_TEXT);
    expect(p.matchDecisionId).toBe(decision.id);
  });

  it("REFUSES text for a brand that is only shortlisted, not confirmed", async () => {
    const { run } = await makeRun();
    const score = await makeScore(run.id, { waypointBrandId: "wpb_shortlisted" });
    const decision = await appendDecision(tx, { scoreId: score.id, state: "shortlist", actor: "a@test" });

    const err = await refusal(() =>
      appendProjection(tx, {
        runId: run.id,
        waypointBrandId: score.waypointBrandId,
        matchDecisionId: decision.id,
        bodyText: SAFE_TEXT,
        sourceSkill: "brand-introduction-scripts",
        actor: "a@test",
      }),
    );
    expect(err.code).toBe("DECISION_NOT_FINAL_SLATE");
  });

  it("REFUSES text attached to a decision that has since been superseded", async () => {
    const { run, score, decision } = await slatedBrand();
    await appendDecision(tx, {
      scoreId: score.id,
      state: "rejected",
      actor: "a@test",
      supersedesId: decision.id,
    });

    const err = await refusal(() =>
      appendProjection(tx, {
        runId: run.id,
        waypointBrandId: score.waypointBrandId,
        matchDecisionId: decision.id, // the stale one
        bodyText: SAFE_TEXT,
        sourceSkill: "brand-introduction-scripts",
        actor: "a@test",
      }),
    );
    expect(err.code).toBe("DECISION_NOT_CURRENT");
  });

  it("REFUSES a decision belonging to a different brand", async () => {
    const a = await slatedBrand();
    const { run } = await makeRun();
    const other = await makeScore(run.id, { waypointBrandId: "wpb_other_brand" });
    const otherDecision = await appendDecision(tx, { scoreId: other.id, state: "final_slate", actor: "a@test" });

    const err = await refusal(() =>
      appendProjection(tx, {
        runId: a.run.id,
        waypointBrandId: a.score.waypointBrandId,
        matchDecisionId: otherDecision.id,
        bodyText: SAFE_TEXT,
        sourceSkill: "brand-introduction-scripts",
        actor: "a@test",
      }),
    );
    expect(err.code).toBe("DECISION_RUN_MISMATCH");
  });

  it("REFUSES text that leaks an internal score, and names what to fix", async () => {
    const { run, score, decision } = await slatedBrand();
    const err = await refusal(() =>
      appendProjection(tx, {
        runId: run.id,
        waypointBrandId: score.waypointBrandId,
        matchDecisionId: decision.id,
        bodyText: SAFE_TEXT + " Internally it scored 0.86 and I rated Item 19 a 4 out of 5.",
        sourceSkill: "brand-introduction-scripts",
        actor: "a@test",
      }),
    );
    expect(err.code).toBe("LEAK_DETECTED");
    const classes = err.findings.map((f) => f.leakClass);
    expect(classes).toContain("SCORE_DECIMAL");
    expect(classes).toContain("FDD_ITEM_REFERENCE");
    expect(classes).toContain("ITEM_SCALE");
    expect(await prisma.matchProjection.count({ where: { runId: run.id } })).toBe(0);
  });

  it("REFUSES text that quotes this run's own frozen evidence verbatim", async () => {
    const quote =
      "she was terrified of taking on debt again after the last business failed and she had to let people go";
    const { run, score, decision } = await slatedBrand({ evidence: [`The owner told me ${quote}.`] });

    const err = await refusal(() =>
      appendProjection(tx, {
        runId: run.id,
        waypointBrandId: score.waypointBrandId,
        matchDecisionId: decision.id,
        bodyText: `You mentioned ${quote}, and I kept that in mind throughout.`,
        sourceSkill: "brand-introduction-scripts",
        actor: "a@test",
      }),
    );
    expect(err.code).toBe("LEAK_DETECTED");
    expect(err.findings.map((f) => f.leakClass)).toContain("EVIDENCE_QUOTE");
  });

  it("a correction is a superseding row, and a bare second row is refused", async () => {
    const { run, score, decision } = await slatedBrand();
    const first = await appendProjection(tx, {
      runId: run.id,
      waypointBrandId: score.waypointBrandId,
      matchDecisionId: decision.id,
      bodyText: SAFE_TEXT,
      sourceSkill: "brand-introduction-scripts",
      actor: "a@test",
    });

    const err = await refusal(() =>
      appendProjection(tx, {
        runId: run.id,
        waypointBrandId: score.waypointBrandId,
        matchDecisionId: decision.id,
        bodyText: SAFE_TEXT + " One more thing worth asking about.",
        sourceSkill: "brand-introduction-scripts",
        actor: "a@test",
      }),
    );
    expect(err.code).toBe("MUST_SUPERSEDE_CURRENT_PROJECTION");

    const corrected = await appendProjection(tx, {
      runId: run.id,
      waypointBrandId: score.waypointBrandId,
      matchDecisionId: decision.id,
      bodyText: SAFE_TEXT + " One more thing worth asking about.",
      sourceSkill: "brand-introduction-scripts",
      actor: "a@test",
      supersedesId: first.id,
    });
    expect(corrected.supersedesId).toBe(first.id);
    // The prior text is kept, not overwritten.
    expect((await prisma.matchProjection.findUniqueOrThrow({ where: { id: first.id } })).bodyText).toBe(SAFE_TEXT);
  });
});

describe("candidateFacingProjections: what a candidate may see", () => {
  it("returns the confirmed brand's text", async () => {
    const { run, score, decision } = await slatedBrand();
    await appendProjection(tx, {
      runId: run.id,
      waypointBrandId: score.waypointBrandId,
      matchDecisionId: decision.id,
      bodyText: SAFE_TEXT,
      sourceSkill: "brand-introduction-scripts",
      actor: "a@test",
    });
    const visible = await candidateFacingProjections(prisma, run.id);
    expect(visible).toEqual([{ waypointBrandId: score.waypointBrandId, bodyText: SAFE_TEXT }]);
  });

  it("STOPS showing a brand the advisor later rejects, with no extra step", async () => {
    // The failure this prevents: superseding a decision to rejected while the candidate-facing text
    // stays visible, which the view cannot notice on its own because [C-16] forbids it reading
    // MatchScore. The decision link is what makes removal structural.
    const { run, score, decision } = await slatedBrand();
    await appendProjection(tx, {
      runId: run.id,
      waypointBrandId: score.waypointBrandId,
      matchDecisionId: decision.id,
      bodyText: SAFE_TEXT,
      sourceSkill: "brand-introduction-scripts",
      actor: "a@test",
    });
    expect(await candidateFacingProjections(prisma, run.id)).toHaveLength(1);

    await appendDecision(tx, {
      scoreId: score.id,
      state: "rejected",
      actor: "a@test",
      supersedesId: decision.id,
    });
    expect(await candidateFacingProjections(prisma, run.id)).toEqual([]);
  });

  it("shows only the current text after a correction", async () => {
    const { run, score, decision } = await slatedBrand();
    const first = await appendProjection(tx, {
      runId: run.id,
      waypointBrandId: score.waypointBrandId,
      matchDecisionId: decision.id,
      bodyText: SAFE_TEXT,
      sourceSkill: "brand-introduction-scripts",
      actor: "a@test",
    });
    const newer = SAFE_TEXT + " Ask them about the hiring pipeline specifically.";
    await appendProjection(tx, {
      runId: run.id,
      waypointBrandId: score.waypointBrandId,
      matchDecisionId: decision.id,
      bodyText: newer,
      sourceSkill: "brand-introduction-scripts",
      actor: "a@test",
      supersedesId: first.id,
    });
    const visible = await candidateFacingProjections(prisma, run.id);
    expect(visible).toEqual([{ waypointBrandId: score.waypointBrandId, bodyText: newer }]);
  });
});

describe("[C-7] redaction reaches the projection body", () => {
  it("nulls PII and every projection body, and preserves the immutable record", async () => {
    const { run, candidate, score, decision } = await slatedBrand();
    await appendProjection(tx, {
      runId: run.id,
      waypointBrandId: score.waypointBrandId,
      matchDecisionId: decision.id,
      bodyText: SAFE_TEXT,
      sourceSkill: "brand-introduction-scripts",
      actor: "a@test",
    });

    const result = await redactCandidate(prisma, candidate.id);
    expect(result.projectionsRedacted).toBe(1);

    const after = await prisma.candidate.findUniqueOrThrow({ where: { id: candidate.id } });
    expect(after.displayName).toBe("[redacted]");
    expect(after.email).toBeNull();
    expect(after.redactedAt).not.toBeNull();

    // Intro-script prose is written about a named person, so [C-7] has to reach it.
    const projections = await prisma.matchProjection.findMany({ where: { runId: run.id } });
    expect(projections.every((p) => p.bodyText === null)).toBe(true);
    expect(await candidateFacingProjections(prisma, run.id)).toEqual([]);

    // Anonymize, never destroy: the immutable record survives so calibration still works.
    expect(await prisma.matchRun.count({ where: { id: run.id } })).toBe(1);
    expect(await prisma.matchScore.count({ where: { runId: run.id } })).toBe(1);
    expect(await prisma.matchDecision.count({ where: { scoreId: score.id } })).toBe(1);
  });
});
