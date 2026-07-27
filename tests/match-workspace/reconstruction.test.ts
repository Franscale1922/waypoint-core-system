import { describe, it, expect } from "vitest";
import { prisma } from "../setup/test-db";
import { makeRun } from "./_helpers";

/**
 * The de-risking test (C-13). A faithful SYNTHETIC matcher-output fixture, built from the
 * authoritative JULY matcher spec (~/Projects/candidate-matcher), round-trips through the
 * schema with no field dropped, and a historical score reconstructs from its frozen inputs.
 *
 * Three things this test exists to prove, each of which was a real defect found in Phase 1:
 *   1. The weight row is selected by the Item-19 DISCLOSURE LEVEL, not the overall
 *      `confidence`. The fixture includes a brand where those two diverge, and asserts that
 *      using the overall label would produce a DIFFERENT (wrong) number.
 *   2. `final = preMsa + msaMod` is not universal. The red-flag override caps final at 0.70,
 *      so the identity must go through `scoreCapApplied`.
 *   3. Brands below the top-10 FDD cut have no I19/I20/pre-MSA/final at all and must still be
 *      storable and distinguishable (`scoringStage`).
 */
const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

// SKILL.md Stage 4C "Combined Score Formula", keyed by Item-19 disclosure level.
const WEIGHTS = {
  COMPREHENSIVE: { fit: 0.5, i19: 0.25, i20: 0.25 },
  MODERATE: { fit: 0.55, i19: 0.15, i20: 0.3 },
  MINIMAL: { fit: 0.6, i19: 0.1, i20: 0.3 },
} as const;
type DisclosureLevel = keyof typeof WEIGHTS;

/** I19/I20 are normalized to 0-1 (score / 5) per SKILL.md Stage 4C. */
function recomputePreMsa(fit: number, i19: number, i20: number, level: DisclosureLevel): number {
  const w = WEIGHTS[level];
  return round4(fit * w.fit + (i19 / 5) * w.i19 + (i20 / 5) * w.i20);
}

/** The full stored identity, including the cap. */
function recomputeFinal(preMsa: number, msaMod: number, cap: number | null): number {
  const sum = round4(preMsa + msaMod);
  return cap == null ? sum : round4(Math.min(sum, cap));
}

// Stored preMsa/final values below are hand-computed LITERALS ("what the matcher emitted"),
// so the recomputation is an independent check rather than a tautology.
const FIXTURE = [
  {
    // Overall confidence (MEDIUM) DIVERGES from the disclosure level (COMPREHENSIVE):
    // GROWING maturity caps the overall label while I19 disclosure is still comprehensive.
    waypointBrandId: "wpb_diverge",
    rank: 1,
    maturity: "GROW",
    scoringStage: "stage_4c",
    fitRaw: 0.8,
    fitScore: 0.8,
    i19Score: 4,
    i20Score: 5,
    i19DisclosureLevel: "COMPREHENSIVE" as DisclosureLevel,
    confidence: "MEDIUM",
    preMsaScore: 0.85, // 0.80*0.50 + (4/5)*0.25 + (5/5)*0.25
    msaModifier: -0.05,
    finalScore: 0.8,
    scoreCapApplied: null,
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
    // RED-FLAG CAP binds: arithmetic gives 0.82, the override forces 0.70.
    // This row is precisely what the Phase-1 test would have failed on.
    waypointBrandId: "wpb_redflag",
    rank: 2,
    maturity: "EST",
    scoringStage: "stage_4c",
    fitRaw: 0.9,
    fitScore: 0.9,
    i19Score: 2,
    i20Score: 1,
    i19DisclosureLevel: "MODERATE" as DisclosureLevel,
    confidence: "LOW",
    preMsaScore: 0.615, // 0.90*0.55 + (2/5)*0.15 + (1/5)*0.30
    msaModifier: 0.1,
    finalScore: 0.7, // min(0.715, 0.70) -> the cap binds
    scoreCapApplied: 0.7,
    flags: ["red_flag"],
    exclusions: [],
    detail: { i19Block: { disclosure: "MODERATE" }, correctionSummary: "none" },
  },
  {
    // PRIDE GATE: fitRaw 0.91 capped to 0.74 before it ever enters the formula.
    waypointBrandId: "wpb_pridegate",
    rank: 3,
    maturity: "EST",
    scoringStage: "stage_4c",
    fitRaw: 0.91,
    fitScore: 0.74,
    i19Score: 3,
    i20Score: 4,
    i19DisclosureLevel: "MINIMAL" as DisclosureLevel,
    confidence: "LOW",
    preMsaScore: 0.744, // 0.74*0.60 + (3/5)*0.10 + (4/5)*0.30
    msaModifier: 0.0,
    finalScore: 0.744,
    scoreCapApplied: null,
    flags: ["data_gap"],
    exclusions: [],
    detail: { i19Block: { disclosure: "MINIMAL" }, correctionSummary: "none" },
  },
  {
    // BELOW THE FDD CUT: ranked at Stage 3C only. No I19/I20/pre-MSA/final exist.
    waypointBrandId: "wpb_belowcut",
    rank: 14,
    maturity: "EMRG",
    scoringStage: "stage_3c",
    fitRaw: 0.66,
    fitScore: 0.66,
    i19Score: null,
    i20Score: null,
    i19DisclosureLevel: null,
    confidence: "LOW",
    preMsaScore: null,
    msaModifier: null,
    finalScore: null,
    scoreCapApplied: null,
    flags: [],
    exclusions: ["outside-territory-availability"],
    detail: {
      alignments: ["candidate passion match"],
      friction: ["did not reach the FDD cut"],
      correctionSummary: "none",
      evidenceRefs: [],
    },
  },
];

describe("historical reconstruction (C-13)", () => {
  it("round-trips a matcher fixture with no field dropped, and reconstructs every score", async () => {
    const { run } = await makeRun();
    for (const b of FIXTURE) {
      await prisma.matchScore.create({ data: { runId: run.id, ...b } });
    }

    const stored = await prisma.matchScore.findMany({
      where: { runId: run.id },
      orderBy: { rank: "asc" },
    });
    expect(stored).toHaveLength(FIXTURE.length);

    for (let i = 0; i < FIXTURE.length; i++) {
      const expected = FIXTURE[i];
      const got = stored[i];

      // 1) Round-trip: every emitted field survives intact, including the frozen detail JSON.
      expect(got.waypointBrandId).toBe(expected.waypointBrandId);
      expect(got.rank).toBe(expected.rank);
      expect(got.maturity).toBe(expected.maturity);
      expect(got.scoringStage).toBe(expected.scoringStage);
      expect(got.fitRaw).toBeCloseTo(expected.fitRaw, 6);
      expect(got.fitScore).toBeCloseTo(expected.fitScore, 6);
      expect(got.i19Score).toBe(expected.i19Score);
      expect(got.i20Score).toBe(expected.i20Score);
      expect(got.i19DisclosureLevel).toBe(expected.i19DisclosureLevel);
      expect(got.confidence).toBe(expected.confidence);
      expect(got.flags).toEqual(expected.flags);
      expect(got.exclusions).toEqual(expected.exclusions);
      expect(got.detail).toEqual(expected.detail);
      expect(got.scoreCapApplied).toBe(expected.scoreCapApplied);

      if (got.scoringStage === "stage_3c") {
        // 2) A below-the-cut brand stores fit and genuinely nothing downstream.
        expect(got.i19Score).toBeNull();
        expect(got.i20Score).toBeNull();
        expect(got.preMsaScore).toBeNull();
        expect(got.msaModifier).toBeNull();
        expect(got.finalScore).toBeNull();
        continue;
      }

      // 3) Reconstruct finalScore THROUGH the cap. Plain `preMsa + msaMod` is false whenever
      //    the red-flag override binds, which is exactly what wpb_redflag exercises.
      expect(recomputeFinal(got.preMsaScore!, got.msaModifier!, got.scoreCapApplied)).toBeCloseTo(
        got.finalScore!,
        6,
      );

      // 4) Reconstruct preMsaScore from the frozen inputs, using the DISCLOSURE LEVEL.
      if (got.i19Score !== null && got.i20Score !== null && got.i19DisclosureLevel !== null) {
        const level = got.i19DisclosureLevel as DisclosureLevel;
        expect(recomputePreMsa(got.fitScore, got.i19Score, got.i20Score, level)).toBeCloseTo(
          got.preMsaScore!,
          6,
        );
      }
    }
  });

  it("the red-flag cap genuinely binds (plain preMsa + msaMod would be wrong)", async () => {
    const { run } = await makeRun();
    const rf = FIXTURE.find((b) => b.waypointBrandId === "wpb_redflag")!;
    await prisma.matchScore.create({ data: { runId: run.id, ...rf } });
    const got = await prisma.matchScore.findFirstOrThrow({
      where: { runId: run.id, waypointBrandId: "wpb_redflag" },
    });

    const uncapped = round4(got.preMsaScore! + got.msaModifier!);
    expect(uncapped).toBeCloseTo(0.715, 6);
    expect(got.finalScore).toBeCloseTo(0.7, 6); // the stored truth
    expect(uncapped).not.toBeCloseTo(got.finalScore!, 6); // the identity Phase 1 asserted is FALSE here
    expect(recomputeFinal(got.preMsaScore!, got.msaModifier!, got.scoreCapApplied)).toBeCloseTo(0.7, 6);
  });

  it("uses the disclosure level, not the overall confidence, to pick the weight row", async () => {
    const { run } = await makeRun();
    const d = FIXTURE.find((b) => b.waypointBrandId === "wpb_diverge")!;
    await prisma.matchScore.create({ data: { runId: run.id, ...d } });
    const got = await prisma.matchScore.findFirstOrThrow({
      where: { runId: run.id, waypointBrandId: "wpb_diverge" },
    });

    // The two labels really do differ on this row.
    expect(got.confidence).toBe("MEDIUM");
    expect(got.i19DisclosureLevel).toBe("COMPREHENSIVE");

    // Correct field reconstructs; the overall-confidence weight row does not.
    const correct = recomputePreMsa(got.fitScore, got.i19Score!, got.i20Score!, "COMPREHENSIVE");
    const wrong = recomputePreMsa(got.fitScore, got.i19Score!, got.i20Score!, "MODERATE");
    expect(correct).toBeCloseTo(got.preMsaScore!, 6);
    expect(wrong).not.toBeCloseTo(got.preMsaScore!, 6);
  });
});
