/**
 * The match-package wire contract: what the candidate matcher emits and this app accepts.
 *
 * Grounded in the authoritative July 2026 matcher skill (~/Projects/candidate-matcher):
 * Foundation B (fit-score engine), Stage 3C (ranking), Stage 4M (MSA), Stage 4A/4B (Item 19 /
 * Item 20), Stage 4C (final ranking + combined-score formula), Stage 5 (candidate-facing text).
 *
 * Validation posture is FAIL-CLOSED per CONTRACT [C-3]: anything that cannot be validated,
 * resolved, or reconciled is refused rather than coerced. The one deliberate exception is
 * `detail`, which is passthrough (see below).
 */
import { z } from "zod";

/** Stage 4C abbreviations. The skill writes maturity in full at 4A/4B and abbreviated at 4C. */
export const MATURITY = ["EST", "GROW", "EMRG"] as const;

/**
 * Item-19 disclosure level. This is what selects the Stage-4C weight row (the skill emits a
 * literal "Disclosure levels used (they select the weight row)" line). NONE is deliberately
 * absent: a NONE disclosure is a hard disqualification that never reaches Stage 4C.
 */
export const DISCLOSURE_LEVEL = ["COMPREHENSIVE", "MODERATE", "MINIMAL"] as const;

/** Overall Stage-4C confidence. The skill spells this three ways; we normalize to these. */
export const CONFIDENCE = ["HIGH", "MEDIUM", "LOW"] as const;

/** Stage-4C FLAG KEY plus `thin_fit` from Foundation B's support floor. */
export const FLAGS = ["data_gap", "red_flag", "msa_flag", "thin_fit"] as const;

/** How far a brand got. Only the top 10 by fit_score carry forward into FDD/MSA scoring. */
export const SCORING_STAGE = ["stage_3c", "stage_4c"] as const;

/** Tolerance for reconciling emitted floats against recomputed ones (values carry 2-4 dp). */
const EPSILON = 1e-4;

/**
 * Normalize the confidence spellings the skill uses interchangeably (`MED` in the 4C table,
 * `M` in the 4A/4B blocks, `MEDIUM` in the assignment table) to one canonical value.
 */
const confidenceField = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .transform((s) => (s === "MED" || s === "M" ? "MEDIUM" : s === "H" ? "HIGH" : s === "L" ? "LOW" : s))
  .pipe(z.enum(CONFIDENCE));

const maturityField = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  // Accept both the long 4A/4B spelling and the abbreviated 4C spelling.
  .transform((s) =>
    s === "ESTABLISHED" ? "EST" : s === "GROWING" ? "GROW" : s === "EMERGING" ? "EMRG" : s,
  )
  .pipe(z.enum(MATURITY));

/** A score in [0,1], rounded to 4dp so emitted and recomputed values compare cleanly. */
const unitScore = z.number().min(0).max(1);

export const BrandScoreSchema = z
  .object({
    /** Brand NAME exactly as it appeared in the uploaded BrandDB subset. Resolved to a
     *  `wpb_` id fail-closed at import; the matcher never emits ids. */
    brandName: z.string().min(1),
    rank: z.number().int().positive(),
    maturity: maturityField,
    scoringStage: z.enum(SCORING_STAGE),

    fitRaw: unitScore.nullable().optional(),
    // Nullable: Foundation B's support floor emits fit_score as UNDEFINED (never 0 or 1)
    // when every soft variable is inactive or neutralized.
    fitScore: unitScore.nullable(),

    i19Score: z.number().int().min(1).max(5).nullable().optional(),
    i20Score: z.number().int().min(1).max(5).nullable().optional(),
    i19DisclosureLevel: z.enum(DISCLOSURE_LEVEL).nullable().optional(),

    preMsaScore: unitScore.nullable().optional(),
    msaModifier: z.number().min(-0.1).max(0.1).nullable().optional(),
    finalScore: unitScore.nullable().optional(),
    /** The ceiling the skill applied independently of the arithmetic (red-flag override = 0.70). */
    scoreCapApplied: unitScore.nullable().optional(),

    confidence: confidenceField,
    flags: z.array(z.enum(FLAGS)).default([]),
    exclusions: z.array(z.string()).default([]),

    /**
     * The frozen per-brand object (alignments, friction, I19/I20 blocks, MSA findings,
     * correction summary, evidence refs). PASSTHROUGH on purpose: Zod strips unknown keys by
     * default, which would silently discard matcher fields the round-trip guarantee depends
     * on. Anything the matcher emits here is stored verbatim.
     */
    detail: z.looseObject({}).default({}),
  })
  .superRefine((b, ctx) => {
    const fail = (message: string, path: string[] = []) =>
      ctx.addIssue({ code: "custom", message, path });

    if (b.scoringStage === "stage_3c") {
      // Below the FDD cut: fit only. Downstream fields must be genuinely absent, not zeroed,
      // so a truncated package can never masquerade as a fully scored one.
      for (const key of ["i19Score", "i20Score", "preMsaScore", "msaModifier", "finalScore"] as const) {
        if (b[key] != null) {
          fail(`stage_3c brand must not carry ${key} (only the top 10 reach FDD/MSA scoring)`, [key]);
        }
      }
      return;
    }

    // stage_4c: the scored fields must be present and internally consistent.
    if (b.preMsaScore == null) return fail("stage_4c brand requires preMsaScore", ["preMsaScore"]);
    if (b.msaModifier == null) return fail("stage_4c brand requires msaModifier", ["msaModifier"]);
    if (b.finalScore == null) return fail("stage_4c brand requires finalScore", ["finalScore"]);

    // [C-13] the stored identity, THROUGH the cap. A package whose final disagrees with the
    // arithmetic and declares no cap is rejected rather than silently persisted.
    const sum = b.preMsaScore + b.msaModifier;
    const expected = b.scoreCapApplied == null ? sum : Math.min(sum, b.scoreCapApplied);
    if (Math.abs(expected - b.finalScore) > EPSILON) {
      fail(
        `finalScore ${b.finalScore} does not reconcile with preMsaScore + msaModifier` +
          `${b.scoreCapApplied == null ? "" : ` capped at ${b.scoreCapApplied}`} (= ${expected})`,
        ["finalScore"],
      );
    }

    // The red-flag override is the only cap that applies at this stage, and it is 0.70.
    if (b.scoreCapApplied != null && !b.flags.includes("red_flag")) {
      fail("scoreCapApplied is set but the red_flag flag is absent", ["scoreCapApplied"]);
    }

    // A brand scored through 4C must say which weight row produced it, otherwise the score
    // is not reconstructable and [C-13] is unmet.
    if (b.i19Score != null && b.i20Score != null && b.i19DisclosureLevel == null) {
      fail(
        "i19DisclosureLevel is required when I19/I20 are present (it selects the weight row)",
        ["i19DisclosureLevel"],
      );
    }

    // When NEITHER Item is scorable the skill's own worked example states the rule outright:
    // "R2 (neither scorable): pre-MSA = fit = .91". So pre-MSA must equal the fit score, and a
    // package claiming otherwise is not reconstructable.
    if (b.i19Score == null && b.i20Score == null) {
      if (b.fitScore == null) {
        fail("a stage_4c brand with no I19/I20 requires a fitScore (pre-MSA is derived from it)", [
          "fitScore",
        ]);
      } else if (Math.abs(b.preMsaScore - b.fitScore) > EPSILON) {
        fail(
          `with neither I19 nor I20 scorable, preMsaScore must equal fitScore (got ${b.preMsaScore} vs ${b.fitScore})`,
          ["preMsaScore"],
        );
      }
    }
  });

export const CandidateRefSchema = z.object({
  /** Stable advisor-provided link key so re-runs attach to the same candidate. See [C-5]. */
  externalRef: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email().nullable().optional(),
});

export const InputVersionSchema = z.object({
  sourceType: z.enum(["intelligence_summary", "questionnaire", "transcript", "candidate_model"]),
  /** Pointer to the source artifact. The HASH is computed by this app from the actual
   *  uploaded bytes, never taken from the package: a matcher-declared hash would be an
   *  unverified assertion, and [C-6] rests on the reference being real. */
  sourceRef: z.string().min(1).nullable().optional(),
  capturedAt: z.coerce.date(),
});

export const MatchPackageSchema = z
  .object({
    packageVersion: z.literal("1.0"),
    /** Declared by the matcher; must resolve to a KNOWN, APPROVED ScoringConfig or the
     *  import is refused per [C-14]. Never auto-created. */
    scoringConfigVersion: z.string().min(1),
    /** Which BrandDB subset/snapshot the run scored against. Opaque, recorded verbatim. */
    brandDbVersionRef: z.string().min(1),
    candidate: CandidateRefSchema,
    inputVersions: z.array(InputVersionSchema).min(1),
    brands: z.array(BrandScoreSchema).min(1),
    /**
     * Brand NAMES the advisor confirmed for presentation ("4C: Final Ranking -> Top 3
     * recommendation -> [You confirm brands] -> DONE"). Subset of `brands`.
     *
     * NOTE: candidate-facing talking points are deliberately NOT part of this package. The
     * July matcher removed its Stage 5 entirely and hands that job downstream to the
     * brand-introduction-scripts skill, which consumes the confirmed slate. The
     * candidate-safe projection is therefore a SEPARATE, later capture keyed to this slate,
     * not a field the matcher emits. That split actually strengthens [C-16]: the projection
     * can only be generated from a confirmed slate, because that is its only input.
     */
    confirmedSlate: z.array(z.string().min(1)).default([]),
  })
  .superRefine((pkg, ctx) => {
    const fail = (message: string, path: string[] = []) =>
      ctx.addIssue({ code: "custom", message, path });

    const names = pkg.brands.map((b) => b.brandName);
    const seen = new Set<string>();
    for (const n of names) {
      if (seen.has(n)) fail(`duplicate brand "${n}" in brands[]`, ["brands"]);
      seen.add(n);
    }

    // Ranks must be a contiguous 1..n permutation. A gap means a brand was dropped somewhere
    // between the matcher and here, which would silently corrupt the ranked slate.
    const ranks = [...pkg.brands.map((b) => b.rank)].sort((a, b) => a - b);
    for (let i = 0; i < ranks.length; i++) {
      if (ranks[i] !== i + 1) {
        fail(`ranks must be contiguous 1..${ranks.length}; got [${ranks.join(", ")}]`, ["brands"]);
        break;
      }
    }

    // Every confirmed-slate brand must exist, and must have been scored through 4C.
    for (const slateName of pkg.confirmedSlate) {
      const brand = pkg.brands.find((b) => b.brandName === slateName);
      if (!brand) {
        fail(`confirmedSlate names "${slateName}", which is not in brands[]`, ["confirmedSlate"]);
      } else if (brand.scoringStage !== "stage_4c") {
        fail(`confirmedSlate brand "${slateName}" was never scored through Stage 4C`, [
          "confirmedSlate",
        ]);
      }
    }

    const slateSeen = new Set<string>();
    for (const n of pkg.confirmedSlate) {
      if (slateSeen.has(n)) fail(`duplicate brand "${n}" in confirmedSlate`, ["confirmedSlate"]);
      slateSeen.add(n);
    }
  });

export type MatchPackage = z.infer<typeof MatchPackageSchema>;
export type BrandScore = z.infer<typeof BrandScoreSchema>;
