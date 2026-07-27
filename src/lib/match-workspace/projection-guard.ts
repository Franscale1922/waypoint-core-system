/**
 * The candidate-safe boundary, enforced at the WRITE. [C-15]
 *
 * WHY THIS IS NOT A TEST OVER A FIXTURE
 * -------------------------------------
 * The contract originally imagined asserting that a sample projection lacks a handful of strings.
 * That proves nothing. The text is LLM-authored and different every time, so a fixture that happens
 * to be clean says nothing about the next one, and a string list misses the leak that actually
 * matters: a number in prose ("scored 4 out of 5 on franchisee satisfaction"). So enforcement lives
 * here, on the write path, and the tests run adversarially AGAINST this function instead.
 *
 * FAIL-CLOSED, AND DELIBERATELY BLUNT
 * -----------------------------------
 * A false positive costs Kelsey one rewrite and shows her the exact span to change. A false
 * negative puts an internal score in front of a prospect. Those are not symmetric, so several
 * rules below will occasionally catch legitimate prose ("4 out of 5 franchisees told me...") and
 * that is the intended trade, not an oversight.
 *
 * The uppercase-only rule for confidence tokens is the one place precision is worth it: prose says
 * "high demand" constantly, while a LEAK looks like "HIGH" because it was copied out of a table.
 */

export type LeakClass =
  | "SCORE_DECIMAL"
  | "ITEM_SCALE"
  | "FDD_ITEM_REFERENCE"
  | "CONFIDENCE_TOKEN"
  | "INTERNAL_FLAG"
  | "MSA_TERM"
  | "DATABASE_FIELD"
  | "RANK_OR_SCORE"
  | "EVIDENCE_QUOTE";

export type LeakFinding = {
  leakClass: LeakClass;
  /** The exact matched text, so the operator can find and rewrite it. */
  span: string;
  /** Character offset of the match in the submitted text. */
  index: number;
  why: string;
};

type Rule = { leakClass: LeakClass; pattern: RegExp; why: string };

const RULES: Rule[] = [
  {
    leakClass: "SCORE_DECIMAL",
    // Every internal score in this domain is a 0..1 decimal: fit, pre-MSA, final, the caps.
    // Matching only a leading zero keeps ordinary figures ("$1.5 million", "6.5% royalty") clear.
    pattern: /\b0?\.\d{2,4}\b/g,
    why: "reads like an internal 0-to-1 score (fit, pre-MSA, final, or a cap)",
  },
  {
    leakClass: "ITEM_SCALE",
    pattern: /\b[1-5]\s*(?:out of|\/)\s*5\b/gi,
    why: "reads like an Item-19 or Item-20 score on the internal 1-to-5 scale",
  },
  {
    leakClass: "FDD_ITEM_REFERENCE",
    pattern: /\b(?:item\s*(?:19|20)|i19|i20)\b/gi,
    why: "names an FDD item this domain scores internally",
  },
  {
    leakClass: "CONFIDENCE_TOKEN",
    // Uppercase only, and not at the start of a sentence, so ordinary prose is unaffected.
    pattern: /\b(?:HIGH|MEDIUM|MED|LOW|COMPREHENSIVE|MODERATE|MINIMAL)\b/g,
    why: "an internal confidence or disclosure label, copied verbatim from a scoring table",
  },
  {
    leakClass: "INTERNAL_FLAG",
    pattern: /\b(?:red[ _-]?flags?|data[ _-]?gaps?|msa[ _-]?flag|thin[ _-]?fit|exclusions?)\b/gi,
    why: "an internal flag vocabulary term",
  },
  {
    leakClass: "MSA_TERM",
    pattern: /\b(?:MSA|pre-?MSA|msa[ _-]?modifier|modifier)\b/gi,
    why: "market-viability scoring vocabulary that is internal to the matcher",
  },
  {
    leakClass: "DATABASE_FIELD",
    // A snake_case token in candidate-facing prose is a database column that escaped, essentially
    // without exception. This deliberately also catches BrandDB field names we have not enumerated.
    pattern: /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g,
    why: "a snake_case identifier, which is a database field name rather than prose",
  },
  {
    leakClass: "RANK_OR_SCORE",
    pattern:
      /\b(?:ranked?\s*#?\s*\d+|rank\s*(?:of|is)?\s*\d+|(?:fit|final|combined|pre-?msa)\s+scores?|scored?\s+\d+(?:\.\d+)?|weight\s+row)\b/gi,
    why: "states a rank or a score, which the candidate-facing surface never carries",
  },
];

/** Recursively pull every string out of a frozen `detail` object. */
export function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) collectStrings(v, out);
  return out;
}

const WORD = /[a-z0-9']+/g;
const tokens = (s: string) => s.toLowerCase().match(WORD) ?? [];

/** Window size for verbatim-overlap detection. Long enough that shared phrasing is not a match. */
export const SHINGLE = 8;

function shingles(words: string[], n = SHINGLE): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
}

/**
 * Verbatim overlap with the run's own evidence.
 *
 * This is the leak class most likely to actually happen and the one no regex catches: an intro
 * script quoting the candidate's transcript back at them, or lifting a franchisee quote out of the
 * Item-19 analysis. [C-15] names "raw quote/evidence body" explicitly, and without this the class
 * would be unenforced.
 */
export function findEvidenceOverlap(text: string, evidenceStrings: string[]): LeakFinding[] {
  const evidence = new Set<string>();
  for (const s of evidenceStrings) for (const sh of shingles(tokens(s))) evidence.add(sh);
  if (evidence.size === 0) return [];

  const words = tokens(text);
  for (let i = 0; i + SHINGLE <= words.length; i++) {
    const window = words.slice(i, i + SHINGLE).join(" ");
    if (evidence.has(window)) {
      return [
        {
          leakClass: "EVIDENCE_QUOTE",
          span: window,
          index: Math.max(0, text.toLowerCase().indexOf(words[i])),
          why: `repeats ${SHINGLE} or more words verbatim from this run's internal evidence`,
        },
      ];
    }
  }
  return [];
}

export type ProjectionCheck = { ok: boolean; findings: LeakFinding[] };

/**
 * Check candidate-facing text. Returns every finding rather than the first, so one rewrite pass
 * can fix all of them.
 *
 * @param evidenceStrings every string from the run's frozen `MatchScore.detail` objects. Pass an
 *                        empty array only when there genuinely is no evidence to compare against.
 */
export function checkProjectionText(text: string, evidenceStrings: string[] = []): ProjectionCheck {
  const findings: LeakFinding[] = [];

  if (typeof text !== "string" || text.trim().length === 0) {
    return {
      ok: false,
      findings: [
        {
          leakClass: "RANK_OR_SCORE",
          span: "",
          index: 0,
          why: "the projection text is empty; there is nothing to show a candidate",
        },
      ],
    };
  }

  for (const rule of RULES) {
    // Fresh regex per call: /g patterns carry lastIndex between uses.
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({ leakClass: rule.leakClass, span: m[0], index: m.index, why: rule.why });
      if (m[0].length === 0) re.lastIndex++; // paranoia against a zero-width match looping
    }
  }

  findings.push(...findEvidenceOverlap(text, evidenceStrings));
  findings.sort((a, b) => a.index - b.index);
  return { ok: findings.length === 0, findings };
}

/** A one-line explanation per finding, for the operator. */
export function explainFindings(findings: LeakFinding[]): string[] {
  return findings.map((f) => `${f.leakClass}: "${f.span}" at character ${f.index}, ${f.why}`);
}
