import { describe, it, expect } from "vitest";
import { prisma } from "../setup/test-db";
import { makeRun } from "./_helpers";

/**
 * The de-risking test (C-13). A faithful SYNTHETIC matcher-output fixture (built from the
 * Stage-4C output spec in the franchise-candidate-matcher SKILL.md — no real captured run
 * was available) round-trips through the 8 models with no field dropped, and a historical
 * score reconstructs from its own frozen inputs + config.
 *
 * The Stage-4C combined-score formula (SKILL.md §"Combined Score Formula") keys the weight
 * set off the Item-19 DISCLOSURE-tier confidence, NOT the overall run confidence — the two
 * genuinely diverge. This test recomputes using the stored i19DisclosureConfidence and
 * proves that using the overall `confidence` instead would give a DIFFERENT, wrong answer.
 */
const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

const WEIGHTS = {
  HIGH: { fit: 0.5, i19: 0.25, i20: 0.25 },
  MEDIUM: { fit: 0.55, i19: 0.15, i20: 0.3 },
  LOW: { fit: 0.6, i19: 0.1, i20: 0.3 },
} as const;
type Tier = keyof typeof WEIGHTS;

function recomputePreMsa(fit: number, i19: number, i20: number, tier: Tier): number {
  const w = WEIGHTS[tier];
  // I19/I20 scores are normalized to 0-1 (score ÷ 5) per SKILL.md §4C.
  return round4(fit * w.fit + (i19 / 5) * w.i19 + (i20 / 5) * w.i20);
}

// Three synthetic brands. Stored preMsa/final are LITERALS ("what the matcher emitted"),
// hand-computed, so the recomputation below is an independent check, not a tautology.
const FIXTURE = [
  {
    // EST: overall confidence (MEDIUM) DIVERGES from I19 disclosure tier (HIGH).
    waypointBrandId: "wpb_est",
    rank: 1,
    maturity: "EST",
    fitScore: 0.8,
    i19Score: 4,
    i20Score: 5,
    i19DisclosureConfidence: "HIGH" as Tier,
    confidence: "MEDIUM",
    preMsaScore: 0.85, // 0.80*0.50 + (4/5)*0.25 + (5/5)*0.25
    msaModifier: -0.05,
    finalScore: 0.8,
    flags: ["msa_flag"],
    exclusions: [],
    detail: {
      alignments: ["hands-on owner-operator", "recurring revenue"],
      friction: ["seasonal demand"],
      i19Block: { disclosure: "COMPREHENSIVE", dataYear: 2025 },
      i20Block: { netUnitGrowth: 12, terminationRate: 0.02 },
      msaFindings: { pricePointFit: "good", saturation: "moderate" },
      correctionSummary: "none",
      evidenceRefs: ["rag://doc/123#p4"],
    },
  },
  {
    waypointBrandId: "wpb_grow",
    rank: 2,
    maturity: "GROW",
    fitScore: 0.9,
    i19Score: 3,
    i20Score: 4,
    i19DisclosureConfidence: "MEDIUM" as Tier,
    confidence: "MEDIUM",
    preMsaScore: 0.825, // 0.90*0.55 + (3/5)*0.15 + (4/5)*0.30
    msaModifier: 0.06,
    finalScore: 0.885,
    flags: [],
    exclusions: ["over-territory-cap-in-msa"],
    detail: {
      alignments: ["low overhead"],
      friction: [],
      i19Block: { disclosure: "MODERATE", dataYear: 2025 },
      i20Block: { netUnitGrowth: 5 },
      msaFindings: { trajectory: "growing" },
      correctionSummary: "structural: reclassified from retail to service",
      evidenceRefs: [],
    },
  },
  {
    // EMERGING: no Item-19/20 scores; only the branch-independent final = preMsa + msaMod holds.
    waypointBrandId: "wpb_emrg",
    rank: 3,
    maturity: "EMRG",
    fitScore: 0.88,
    i19Score: null,
    i20Score: null,
    i19DisclosureConfidence: null,
    confidence: "LOW",
    preMsaScore: 0.87,
    msaModifier: 0.0,
    finalScore: 0.87,
    flags: ["data_gap"],
    exclusions: [],
    detail: {
      alignments: ["candidate passion match"],
      friction: ["limited FDD history"],
      i19Block: null,
      i20Block: null,
      msaFindings: { note: "fit-driven ranking" },
      correctionSummary: "none",
      evidenceRefs: ["rag://doc/999#p1"],
    },
  },
];

describe("historical reconstruction (C-13)", () => {
  it("round-trips a matcher-output fixture with no field dropped, and reconstructs scores", async () => {
    const { run } = await makeRun();

    for (const b of FIXTURE) {
      await prisma.matchScore.create({ data: { runId: run.id, ...b } });
    }

    const stored = await prisma.matchScore.findMany({
      where: { runId: run.id },
      orderBy: { rank: "asc" },
    });
    expect(stored).toHaveLength(3);

    for (let i = 0; i < FIXTURE.length; i++) {
      const expected = FIXTURE[i];
      const got = stored[i];

      // 1) Round-trip: every emitted field is stored intact (scalars + the frozen detail JSON).
      expect(got.waypointBrandId).toBe(expected.waypointBrandId);
      expect(got.rank).toBe(expected.rank);
      expect(got.maturity).toBe(expected.maturity);
      expect(got.fitScore).toBeCloseTo(expected.fitScore, 6);
      expect(got.i19Score).toBe(expected.i19Score);
      expect(got.i20Score).toBe(expected.i20Score);
      expect(got.i19DisclosureConfidence).toBe(expected.i19DisclosureConfidence);
      expect(got.confidence).toBe(expected.confidence);
      expect(got.flags).toEqual(expected.flags);
      expect(got.exclusions).toEqual(expected.exclusions);
      expect(got.detail).toEqual(expected.detail);

      // 2) Reconstruct final = preMsa + msaModifier — branch-independent, holds for ALL brands.
      expect(round4(got.preMsaScore + got.msaModifier)).toBeCloseTo(got.finalScore, 6);

      // 3) For EST/GROW, reconstruct preMsa from frozen inputs using the I19-DISCLOSURE tier.
      if (got.i19Score !== null && got.i20Score !== null && got.i19DisclosureConfidence !== null) {
        const tier = got.i19DisclosureConfidence as Tier;
        const recomputed = recomputePreMsa(got.fitScore, got.i19Score, got.i20Score, tier);
        expect(recomputed).toBeCloseTo(got.preMsaScore, 6);
      }
    }

    // 4) Discrimination check: the EST brand's overall confidence (MEDIUM) DIFFERS from its
    //    I19 disclosure tier (HIGH), and using the wrong one yields a different pre-MSA —
    //    proving the separate i19DisclosureConfidence field is load-bearing, not decorative.
    const est = stored.find((s) => s.waypointBrandId === "wpb_est")!;
    expect(est.confidence).not.toBe(est.i19DisclosureConfidence);
    const withWrongField = recomputePreMsa(est.fitScore, est.i19Score!, est.i20Score!, est.confidence as Tier);
    expect(withWrongField).not.toBeCloseTo(est.preMsaScore, 6);
  });
});
