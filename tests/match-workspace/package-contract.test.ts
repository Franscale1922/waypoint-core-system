import { describe, it, expect } from "vitest";
import { MatchPackageSchema, BrandScoreSchema } from "@/lib/match-workspace/package-schema";
import { buildIdempotencyKey, canonicalJson } from "@/lib/match-workspace/idempotency";

/** A minimal valid stage_4c brand; override to build each case. */
function brand(over: Record<string, unknown> = {}) {
  return {
    brandName: "Alpha Brand",
    rank: 1,
    maturity: "EST",
    scoringStage: "stage_4c",
    fitRaw: 0.8,
    fitScore: 0.8,
    i19Score: 4,
    i20Score: 5,
    i19DisclosureLevel: "COMPREHENSIVE",
    preMsaScore: 0.85,
    msaModifier: -0.05,
    finalScore: 0.8,
    confidence: "HIGH",
    flags: [],
    exclusions: [],
    detail: {},
    ...over,
  };
}

function pkg(over: Record<string, unknown> = {}) {
  return {
    packageVersion: "1.0",
    scoringConfigVersion: "matcher-2026-07",
    brandDbVersionRef: "branddb-2026-07-22",
    candidate: { externalRef: "cand-001", displayName: "Test Candidate" },
    inputVersions: [{ sourceType: "intelligence_summary", capturedAt: "2026-07-01T00:00:00Z" }],
    brands: [brand()],
    confirmedSlate: [],
    ...over,
  };
}

describe("package schema: per-brand validation", () => {
  it("accepts a well-formed stage_4c brand", () => {
    expect(BrandScoreSchema.safeParse(brand()).success).toBe(true);
  });

  it("normalizes the three confidence spellings the skill uses interchangeably", () => {
    for (const [input, expected] of [["MED", "MEDIUM"], ["M", "MEDIUM"], ["medium", "MEDIUM"], ["H", "HIGH"], ["L", "LOW"]]) {
      const r = BrandScoreSchema.safeParse(brand({ confidence: input }));
      expect(r.success, input).toBe(true);
      if (r.success) expect(r.data.confidence).toBe(expected);
    }
  });

  it("accepts both long and abbreviated maturity spellings", () => {
    for (const [input, expected] of [["ESTABLISHED", "EST"], ["GROWING", "GROW"], ["EMERGING", "EMRG"], ["EMRG", "EMRG"]]) {
      const r = BrandScoreSchema.safeParse(brand({ maturity: input }));
      expect(r.success, input).toBe(true);
      if (r.success) expect(r.data.maturity).toBe(expected);
    }
  });

  it("REJECTS a finalScore that does not reconcile with preMsa + msaMod", () => {
    const r = BrandScoreSchema.safeParse(brand({ finalScore: 0.99 }));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/does not reconcile/);
  });

  it("accepts a red-flag-capped brand where the arithmetic alone would be wrong", () => {
    // 0.615 + 0.10 = 0.715, capped to 0.70. Without scoreCapApplied this must fail.
    const capped = brand({
      preMsaScore: 0.615,
      msaModifier: 0.1,
      finalScore: 0.7,
      scoreCapApplied: 0.7,
      flags: ["red_flag"],
      i19Score: 2,
      i20Score: 1,
      i19DisclosureLevel: "MODERATE",
      confidence: "LOW",
    });
    expect(BrandScoreSchema.safeParse(capped).success).toBe(true);

    const uncapped = { ...capped, scoreCapApplied: undefined };
    expect(BrandScoreSchema.safeParse(uncapped).success).toBe(false);
  });

  it("REJECTS a cap declared without the red_flag flag", () => {
    const r = BrandScoreSchema.safeParse(
      brand({ preMsaScore: 0.615, msaModifier: 0.1, finalScore: 0.7, scoreCapApplied: 0.7, flags: [] }),
    );
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/red_flag flag is absent/);
  });

  it("REJECTS I19/I20 present without the disclosure level that selects the weight row", () => {
    const r = BrandScoreSchema.safeParse(brand({ i19DisclosureLevel: null }));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/selects the weight row/);
  });

  it("accepts a stage_3c brand with only a fit score", () => {
    const r = BrandScoreSchema.safeParse(
      brand({
        scoringStage: "stage_3c",
        i19Score: null,
        i20Score: null,
        i19DisclosureLevel: null,
        preMsaScore: null,
        msaModifier: null,
        finalScore: null,
      }),
    );
    expect(r.success).toBe(true);
  });

  it("REJECTS a stage_3c brand carrying downstream fields (a truncated package must not pose as scored)", () => {
    const r = BrandScoreSchema.safeParse(brand({ scoringStage: "stage_3c" }));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/must not carry/);
  });

  it("accepts a null fitScore (Foundation B support floor emits UNDEFINED, never 0 or 1)", () => {
    const r = BrandScoreSchema.safeParse(
      brand({
        scoringStage: "stage_3c",
        fitScore: null,
        fitRaw: null,
        flags: ["thin_fit"],
        i19Score: null,
        i20Score: null,
        i19DisclosureLevel: null,
        preMsaScore: null,
        msaModifier: null,
        finalScore: null,
      }),
    );
    expect(r.success).toBe(true);
  });

  it("PRESERVES unknown keys in detail (Zod strips by default, which would break round-trip)", () => {
    const detail = { alignments: ["a"], somethingNew: { nested: [1, 2] }, evidenceRefs: ["rag://x"] };
    const r = BrandScoreSchema.safeParse(brand({ detail }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.detail).toEqual(detail);
  });

  it("REJECTS an out-of-range MSA modifier and an unknown flag", () => {
    expect(BrandScoreSchema.safeParse(brand({ msaModifier: -0.5 })).success).toBe(false);
    expect(BrandScoreSchema.safeParse(brand({ flags: ["made_up"] })).success).toBe(false);
  });
});

describe("package schema: whole-package validation", () => {
  it("accepts a well-formed package", () => {
    expect(MatchPackageSchema.safeParse(pkg()).success).toBe(true);
  });

  it("REJECTS duplicate brand names", () => {
    const r = MatchPackageSchema.safeParse(pkg({ brands: [brand(), brand({ rank: 2 })] }));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/duplicate brand/);
  });

  it("REJECTS non-contiguous ranks (a dropped brand must not pass silently)", () => {
    const r = MatchPackageSchema.safeParse(
      pkg({ brands: [brand({ rank: 1 }), brand({ brandName: "Beta", rank: 3 })] }),
    );
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/contiguous/);
  });

  it("REJECTS a confirmed slate naming a brand that was never scored through 4C", () => {
    const b3c = brand({
      brandName: "Beta",
      rank: 2,
      scoringStage: "stage_3c",
      i19Score: null,
      i20Score: null,
      i19DisclosureLevel: null,
      preMsaScore: null,
      msaModifier: null,
      finalScore: null,
    });
    const r = MatchPackageSchema.safeParse(pkg({ brands: [brand(), b3c], confirmedSlate: ["Beta"] }));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/never scored through Stage 4C/);
  });

  it("accepts a confirmed slate naming a fully scored brand", () => {
    expect(MatchPackageSchema.safeParse(pkg({ confirmedSlate: ["Alpha Brand"] })).success).toBe(true);
  });

  it("REJECTS a duplicated brand in the confirmed slate", () => {
    const r = MatchPackageSchema.safeParse(
      pkg({ confirmedSlate: ["Alpha Brand", "Alpha Brand"] }),
    );
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/duplicate brand/);
  });

  it("carries NO candidate-facing text: July moved that to the brand-introduction-scripts skill", () => {
    // The July matcher removed its Stage 5 outright. Any candidate-facing prose arriving in a
    // match package would mean the emitter is following the stale June spec, so it is dropped
    // rather than silently stored where the projection boundary [C-16] cannot govern it.
    const r = MatchPackageSchema.safeParse(
      pkg({ confirmedSlate: ["Alpha Brand"], stage5: { "Alpha Brand": "two paragraphs..." } }),
    );
    expect(r.success).toBe(true);
    expect(r.success && "stage5" in r.data).toBe(false);
  });
});

/**
 * The July skill publishes four worked rows under the assertion "Every row reproduces from the
 * formulas", with the arithmetic written out. Using the skill's own numbers is a stronger test
 * than any fixture I could invent: if our understanding of the scoring drifts from the skill,
 * these fail.
 *
 *   1 | EST  | .86 | 4   | 4   | 0.83 | +0.05 | 0.88 | HIGH | (COMPREHENSIVE)
 *   2 | EMRG | .91 | N/A | N/A | 0.91 |  0.00 | 0.91 | LOW  | data_gap
 *   3 | GROW | .84 | 3   | 5   | 0.85 | -0.05 | 0.80 | MED  | msa_flag (MODERATE)
 *   4 | EST  | .82 | 1   | 2   | 0.56 | -0.03 | 0.53 | LOW  | red_flag (COMPREHENSIVE)
 */
describe("the skill's own four worked rows validate", () => {
  const WORKED = [
    { brandName: "R1", rank: 1, maturity: "EST", fitScore: 0.86, i19Score: 4, i20Score: 4, i19DisclosureLevel: "COMPREHENSIVE", preMsaScore: 0.83, msaModifier: 0.05, finalScore: 0.88, confidence: "HIGH", flags: [] },
    { brandName: "R2", rank: 2, maturity: "EMRG", fitScore: 0.91, i19Score: null, i20Score: null, i19DisclosureLevel: null, preMsaScore: 0.91, msaModifier: 0.0, finalScore: 0.91, confidence: "LOW", flags: ["data_gap"] },
    { brandName: "R3", rank: 3, maturity: "GROW", fitScore: 0.84, i19Score: 3, i20Score: 5, i19DisclosureLevel: "MODERATE", preMsaScore: 0.85, msaModifier: -0.05, finalScore: 0.8, confidence: "MED", flags: ["msa_flag"] },
    { brandName: "R4", rank: 4, maturity: "EST", fitScore: 0.82, i19Score: 1, i20Score: 2, i19DisclosureLevel: "COMPREHENSIVE", preMsaScore: 0.56, msaModifier: -0.03, finalScore: 0.53, confidence: "LOW", flags: ["red_flag"], scoreCapApplied: 0.7 },
  ].map((b) => ({ ...b, scoringStage: "stage_4c", exclusions: [], detail: {} }));

  it("all four rows pass validation as a single package", () => {
    const r = MatchPackageSchema.safeParse(pkg({ brands: WORKED }));
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });

  it("R4's red-flag cap is expressed as min(sum, 0.70) even where it does not bind", () => {
    // The skill writes "red-flag cap min(.53,.70)=.53". The cap is declared but not binding,
    // which the reconciliation must accept rather than treat as a contradiction.
    const r = BrandScoreSchema.safeParse(WORKED[3]);
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });

  it("R2 pins the rule that pre-MSA equals fit when neither Item is scorable", () => {
    expect(BrandScoreSchema.safeParse(WORKED[1]).success).toBe(true);
    // Move pre-MSA off fit and it must be refused.
    const drifted = { ...WORKED[1], preMsaScore: 0.75, finalScore: 0.75 };
    const r = BrandScoreSchema.safeParse(drifted);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/must equal fitScore/);
  });

  it("each row's pre-MSA reproduces from the published weight rows", () => {
    const W = {
      COMPREHENSIVE: { fit: 0.5, i19: 0.25, i20: 0.25 },
      MODERATE: { fit: 0.55, i19: 0.15, i20: 0.3 },
      MINIMAL: { fit: 0.6, i19: 0.1, i20: 0.3 },
    } as const;
    // The published table rounds to 2dp (R3 computes to .852 and is printed .85), so the
    // tolerance here is half a display unit rather than full float precision.
    const TWO_DP = 0.005 + 1e-9;
    for (const b of WORKED) {
      if (b.i19Score == null || b.i20Score == null) {
        expect(b.preMsaScore, b.brandName).toBeCloseTo(b.fitScore, 6); // R2 rule
        continue;
      }
      const w = W[b.i19DisclosureLevel as keyof typeof W];
      const computed = b.fitScore * w.fit + (b.i19Score / 5) * w.i19 + (b.i20Score / 5) * w.i20;
      expect(Math.abs(computed - b.preMsaScore), `${b.brandName}: ${computed}`).toBeLessThan(TWO_DP);
    }
  });
});

describe("idempotency key", () => {
  const hashes = ["input-hash-1"];
  const parse = (p: unknown) => MatchPackageSchema.parse(p);

  it("is stable across key order and array order", () => {
    const a = parse(pkg({ brands: [brand({ rank: 1 }), brand({ brandName: "Beta", rank: 2 })] }));
    const b = parse(pkg({ brands: [brand({ brandName: "Beta", rank: 2 }), brand({ rank: 1 })] }));
    expect(buildIdempotencyKey(a, hashes)).toBe(buildIdempotencyKey(b, hashes));
  });

  it("treats 0.8 and 0.80 as identical (JSON.stringify would too, but 4dp makes it explicit)", () => {
    const a = parse(pkg({ brands: [brand({ fitScore: 0.8 })] }));
    const b = parse(pkg({ brands: [brand({ fitScore: 0.8000000001 })] }));
    expect(buildIdempotencyKey(a, hashes)).toBe(buildIdempotencyKey(b, hashes));
  });

  it("is stable across unicode normalization of a brand name (NFC vs NFD)", () => {
    const nfc = "Café Brand".normalize("NFC");
    const nfd = "Café Brand".normalize("NFD");
    expect(nfc).not.toBe(nfd); // genuinely different bytes
    const a = parse(pkg({ brands: [brand({ brandName: nfc })] }));
    const b = parse(pkg({ brands: [brand({ brandName: nfd })] }));
    expect(buildIdempotencyKey(a, hashes)).toBe(buildIdempotencyKey(b, hashes));
  });

  it("IGNORES Stage-5 prose (rewording talking points is not a new run) [C-11]", () => {
    const base = { confirmedSlate: ["Alpha Brand"] };
    const a = parse(pkg({ ...base, stage5: { "Alpha Brand": "First wording." } }));
    const b = parse(pkg({ ...base, stage5: { "Alpha Brand": "Completely different wording." } }));
    expect(buildIdempotencyKey(a, hashes)).toBe(buildIdempotencyKey(b, hashes));
  });

  it("IGNORES detail rationale text (free-text, not scoring identity)", () => {
    const a = parse(pkg({ brands: [brand({ detail: { alignments: ["one phrasing"] } })] }));
    const b = parse(pkg({ brands: [brand({ detail: { alignments: ["another phrasing"] } })] }));
    expect(buildIdempotencyKey(a, hashes)).toBe(buildIdempotencyKey(b, hashes));
  });

  it("CHANGES when any score changes (a genuine re-run is a new run) [C-5]", () => {
    const a = parse(pkg());
    const b = parse(pkg({ brands: [brand({ preMsaScore: 0.86, finalScore: 0.81 })] }));
    expect(buildIdempotencyKey(a, hashes)).not.toBe(buildIdempotencyKey(b, hashes));
  });

  it("CHANGES when rank order, config, BrandDB snapshot, candidate, or inputs change", () => {
    const base = buildIdempotencyKey(parse(pkg()), hashes);
    const swapped = parse(pkg({ brands: [brand({ rank: 1 }), brand({ brandName: "Beta", rank: 2 })] }));
    expect(buildIdempotencyKey(swapped, hashes)).not.toBe(base);
    expect(buildIdempotencyKey(parse(pkg({ scoringConfigVersion: "matcher-2026-08" })), hashes)).not.toBe(base);
    expect(buildIdempotencyKey(parse(pkg({ brandDbVersionRef: "branddb-2026-08" })), hashes)).not.toBe(base);
    expect(
      buildIdempotencyKey(parse(pkg({ candidate: { externalRef: "cand-002", displayName: "Other" } })), hashes),
    ).not.toBe(base);
    expect(buildIdempotencyKey(parse(pkg()), ["different-input-hash"])).not.toBe(base);
  });

  it("refuses a mismatched inputHashes length rather than hashing something wrong", () => {
    expect(() => buildIdempotencyKey(parse(pkg()), [])).toThrow(/does not match/);
  });

  it("canonicalJson sorts keys at every level and folds negative zero", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(
      '{"a":{"c":"3.0000","d":"2.0000"},"b":"1.0000"}',
    );
    expect(canonicalJson({ z: -0 })).toBe('{"z":"0.0000"}');
  });
});
