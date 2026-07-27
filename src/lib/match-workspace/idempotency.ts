/**
 * The idempotency key for a match run, and the canonicalization it depends on.
 *
 * [C-11] re-importing the SAME package must create no duplicate run, scores, decisions, or
 * outcome events. [C-5] re-RUNNING a candidate must create a NEW run. Those two rules pull in
 * opposite directions, so what the key covers matters more than the hash function does.
 *
 * WHAT THE KEY COVERS, AND WHY NOT THE WHOLE PACKAGE
 * -------------------------------------------------
 * Hashing the entire package would be wrong in both directions:
 *   * Stage-5 prose is LLM-authored and rewords between runs. A re-import of the same
 *     analysis with reworded talking points would mint a second "new" run that is not one.
 *   * Conversely nothing about prose identifies a run, so including it adds no dedup value.
 * The key is therefore the run's actual identity: which candidate, scored from which frozen
 * inputs, under which config, against which BrandDB snapshot, producing which scores. A
 * genuine re-run changes the scores (or the inputs), so it hashes differently and becomes a
 * new run, exactly as [C-5] requires. A re-import of the same file hashes identically.
 *
 * WHY CANONICALIZATION IS EXPLICIT
 * --------------------------------
 * `JSON.stringify` is not a canonical form. Three concrete hazards, all reachable here:
 *   1. Key order follows insertion order, so two logically identical objects hash differently.
 *   2. Number formatting is lossy in the other direction: the matcher writes `.87` and `0.82`,
 *      and `JSON.stringify(0.80)` yields `"0.8"`. Left alone, 0.8 and 0.80 are the same hash
 *      but 0.1+0.2 and 0.3 are not. Scores are therefore serialized as fixed 4-dp decimal
 *      STRINGS, matching the precision the scoring rubric actually carries.
 *   3. Unicode: the same brand name can arrive NFC or NFD composed (an accented character from
 *      a spreadsheet paste), which is invisible on screen and fatal to a byte hash.
 */
import { createHash } from "node:crypto";
import type { MatchPackage } from "./package-schema";

/** Fixed 4-dp decimal string. Null stays null so "absent" never collides with "zero". */
function num(n: number | null | undefined): string | null {
  if (n == null) return null;
  if (!Number.isFinite(n)) throw new Error(`Non-finite number cannot be canonicalized: ${n}`);
  // toFixed(4) normalizes 0.8, 0.80 and 0.7999999999 to the same "0.8000".
  // Negative zero would render "-0.0000"; fold it to positive so 0 and -0 agree.
  const fixed = (n === 0 ? 0 : n).toFixed(4);
  return fixed === "-0.0000" ? "0.0000" : fixed;
}

/** NFC-normalize and trim a string so visually identical text hashes identically. */
function str(s: string): string {
  return s.normalize("NFC").trim();
}

/** Deterministic JSON: keys sorted at every level, arrays order-preserved. */
export function canonicalJson(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string") return str(v);
    if (typeof v === "number") return num(v);
    if (typeof v === "boolean") return v;
    if (Array.isArray(v)) return v.map(walk);
    if (typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(v as Record<string, unknown>).sort()) {
        out[key] = walk((v as Record<string, unknown>)[key]);
      }
      return out;
    }
    throw new Error(`Unsupported type in canonicalization: ${typeof v}`);
  };
  return JSON.stringify(walk(value));
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * The per-brand identity contributing to the run hash: the brand and every scoring value the
 * matcher produced for it. Deliberately EXCLUDES `detail` (free-text rationale that can be
 * reworded without the scoring changing) and includes nothing candidate-facing.
 *
 * Brands are sorted by name so a package whose array order differs but whose content matches
 * still hashes identically. Rank is included as a value, so a genuine re-ordering does change
 * the hash.
 */
function brandsFingerprint(pkg: MatchPackage): unknown[] {
  return [...pkg.brands]
    .sort((a, b) => str(a.brandName).localeCompare(str(b.brandName)))
    .map((b) => ({
      brandName: b.brandName,
      rank: b.rank,
      maturity: b.maturity,
      scoringStage: b.scoringStage,
      fitRaw: b.fitRaw ?? null,
      fitScore: b.fitScore,
      i19Score: b.i19Score ?? null,
      i20Score: b.i20Score ?? null,
      i19DisclosureLevel: b.i19DisclosureLevel ?? null,
      preMsaScore: b.preMsaScore ?? null,
      msaModifier: b.msaModifier ?? null,
      finalScore: b.finalScore ?? null,
      scoreCapApplied: b.scoreCapApplied ?? null,
      confidence: b.confidence,
      flags: [...b.flags].sort(),
      exclusions: [...b.exclusions].sort(),
    }));
}

/**
 * Build the idempotency key.
 *
 * @param pkg           the validated package
 * @param inputHashes   hashes THIS APP computed over the actual uploaded input artifacts,
 *                      in the same order as `pkg.inputVersions`. Passed in rather than read
 *                      from the package because a matcher-declared hash is unverified. See [C-6].
 */
export function buildIdempotencyKey(pkg: MatchPackage, inputHashes: string[]): string {
  if (inputHashes.length !== pkg.inputVersions.length) {
    throw new Error(
      `inputHashes length ${inputHashes.length} does not match inputVersions length ${pkg.inputVersions.length}`,
    );
  }
  const identity = {
    packageVersion: pkg.packageVersion,
    candidateExternalRef: pkg.candidate.externalRef,
    scoringConfigVersion: pkg.scoringConfigVersion,
    brandDbVersionRef: pkg.brandDbVersionRef,
    // Sorted so input ordering is not part of the identity.
    inputHashes: [...inputHashes].sort(),
    brands: brandsFingerprint(pkg),
  };
  return sha256Hex(canonicalJson(identity));
}
