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
 * REVISED 2026-07-27 after an adversarial review found the first version both POROUS and
 * OVER-FIRING, which is the worst of both worlds. Seventeen of twenty smuggling attempts walked
 * through (hyphenated "Item-19", camelCase `finalScore`, single-digit `0.9`, bare `.86`, "4 of 5",
 * "four out of five", title-case "High"), while ordinary franchise copy was rejected: "$1.25
 * million" and "6.75%" both tripped the score rule, because its `0?` was optional and its own
 * comment claiming otherwise was simply wrong. A validator that rejects real copy gets worked
 * around, which the docblock below already named as the failure mode.
 *
 * THE CALIBRATION RULE THIS NOW FOLLOWS
 * ------------------------------------
 * Numbers are judged by VALUE and CONTEXT, not by shape alone. An internal score is a bare fraction
 * in [0,1] with no currency or unit attached. "$1.25 million", "6.75%", "2.5x" and "180,000" are
 * ordinary and must pass. Vocabulary that is genuinely ambiguous in advisory prose ("red flags in
 * their litigation history", "the exclusions in the territory rider", "MED spa") is only caught in
 * a scoring context or in its snake_case form, never bare.
 *
 * Where a trade remains, it stays fail-closed: a false positive costs one rewrite and names the
 * span, a false negative puts an internal score in front of a prospect.
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
  /** Character offset of the match in the submitted text. `text.slice(index, index+span.length)` is the span. */
  index: number;
  why: string;
};

type Rule = {
  leakClass: LeakClass;
  pattern: RegExp;
  why: string;
  /** Optional second stage: return false to discard a syntactic match on semantic grounds. */
  accept?: (m: RegExpExecArray, text: string) => boolean;
};

/** The internal column names this domain actually uses, in the casing they appear in. */
const INTERNAL_FIELDS = [
  "fitRaw",
  "fitScore",
  "i19Score",
  "i20Score",
  "i19DisclosureLevel",
  "preMsaScore",
  "msaModifier",
  "finalScore",
  "scoreCapApplied",
  "scoringStage",
  "waypointBrandId",
  "brandDbVersionRef",
  "idempotencyKey",
];

const RULES: Rule[] = [
  {
    leakClass: "SCORE_DECIMAL",
    // Any decimal, captured WHOLE (with a leading currency symbol and a trailing unit if present),
    // then judged by value and context in `accept`. Capturing the whole number is what stopped
    // "$1.25 million" being read as the score ".25".
    pattern: /(\$|£|€)?\s*(\d[\d,]*)?\.(\d+)\s*(%|percent|percentage|million|billion|thousand|[kmbx]\b|miles?|hours?|years?|stars?)?/gi,
    why: "reads like an internal 0-to-1 score (fit, pre-MSA, final, or a cap)",
    accept: (m) => {
      const [, currency, intPart, frac, unit] = m;
      if (currency || unit) return false; // money, a percentage, or a measured quantity
      const value = Number(`${(intPart ?? "0").replace(/,/g, "")}.${frac}`);
      // Only a bare fraction in [0,1] looks like a score. 1.25, 6.75 and 14.5 do not.
      return Number.isFinite(value) && value >= 0 && value <= 1;
    },
  },
  {
    leakClass: "ITEM_SCALE",
    // Digits and words, "out of"/"of"/"/", and the five-point-scale phrasing.
    pattern:
      /\b(?:[1-5]|one|two|three|four|five)\s*(?:out\s+of|of|\/)\s*(?:5|five)\b|\b(?:[1-5]|one|two|three|four|five)\s+on\s+(?:a|my|the)\s+(?:five[\s-]point|1[\s-]?(?:to|-)[\s-]?5)\b|\bfive[\s-]point\s+scale\b/gi,
    why: "reads like an Item-19 or Item-20 score on the internal 1-to-5 scale",
  },
  {
    leakClass: "FDD_ITEM_REFERENCE",
    // Hyphen, en dash and em dash separators, plus the spelled-out numbers. The first version
    // matched only a space, so the hyphenated "Item-19" that the CONTRACT itself uses walked through.
    pattern: /\b(?:items?[\s\-–—]*(?:19|20|nineteen|twenty)|i[\s\-]?19|i[\s\-]?20)\b/gi,  // emdash-allow: the literal em dash is a separator this detector must match, not prose
    why: "names an FDD item this domain scores internally",
  },
  {
    leakClass: "CONFIDENCE_TOKEN",
    // CASE-SENSITIVE on purpose (no `i` flag). An ALL-CAPS label was copied out of a scoring table;
    // lowercase "high demand" is ordinary prose and must pass. Getting this wrong in the first
    // version, by putting `i` on a combined pattern, rejected "there is high demand in your market".
    // "MED" is deliberately absent: "MED spa" is ordinary copy. It is caught contextually below.
    pattern: /\b(?:HIGH|MEDIUM|LOW|COMPREHENSIVE|MODERATE|MINIMAL)\b/g,
    why: "an internal confidence or disclosure label, copied verbatim from a scoring table",
  },
  {
    leakClass: "CONFIDENCE_TOKEN",
    // Any casing, but only in an explicit confidence or disclosure context.
    // A short bounded gap, so "my confidence here is High" is caught while a label mentioned two
    // sentences later is not. The gap cannot cross sentence punctuation.
    pattern:
      /\bconfidence\b[^.!?]{0,24}?\b(?:high|medium|med|low)\b|\bdisclosure\b[^.!?]{0,24}?\b(?:comprehensive|moderate|minimal)\b/gi,
    why: "states an internal confidence or disclosure level",
  },
  {
    leakClass: "INTERNAL_FLAG",
    // The snake_case forms always, and the prose forms only in a scoring context. "no red flags in
    // their litigation history" is exactly what a good advisor writes and must survive.
    pattern:
      /\b(?:red_flags?|data_gaps?|msa_flag|thin_fit)\b|\b(?:red[\s-]flags?|data[\s-]gaps?)\b(?=[^.!?]{0,40}\b(?:scor\w*|rat\w*|cap\w*|overrid\w*|flagg\w*|penal\w*)\b)|\b(?:scor\w+|rat\w+|cap\w+|overrid\w+)\b(?=[^.!?]{0,40}\b(?:red[\s-]flags?|data[\s-]gaps?)\b)/gi,
    why: "internal flag vocabulary used in a scoring sense",
  },
  {
    leakClass: "MSA_TERM",
    pattern: /\b(?:pre[\s-]?msa|msa\s*(?:modifier|score|adjust\w*)|msa)\b|\bmarket\s+service\s+area\b/gi,
    why: "market-viability scoring vocabulary that is internal to the matcher",
  },
  {
    leakClass: "DATABASE_FIELD",
    // snake_case is a column name essentially without exception; the explicit list covers this
    // domain's camelCase columns, which no generic shape rule can distinguish from prose.
    pattern: new RegExp(
      `\\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\\b|\\b(?:${INTERNAL_FIELDS.join("|")})\\b`,
      "g",
    ),
    why: "a database or scoring field name rather than prose",
  },
  {
    leakClass: "RANK_OR_SCORE",
    pattern:
      /\b(?:ranked?|rank(?:ing|ed)?)\s*(?:#\s*)?(?:\d+|first|second|third|top|highest|number\s+\d+)\b|\b(?:my|the)\s+(?:top|highest|best)\s+(?:score|scoring|rank\w*)\b|\b(?:fit|final|combined|overall|pre-?msa)\s+scores?\b|\bscored?\s+(?:\d+(?:\.\d+)?|highest|lowest|first)\b|\bweight\s+row\b|\bnumber\s+\d+\s+of\s+the\s+\w+\s+I\s+scored\b|\b\d{1,3}\s*(?:%|percent)\s+(?:on|for)\s+(?:fit|the\s+fit)\b/gi,
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

const WORD_RE = /[a-z0-9']+/gi;

/** Tokens plus each token's character offset, so a window can report where it really is. */
function tokensWithOffsets(s: string): { word: string; index: number }[] {
  const out: { word: string; index: number }[] = [];
  const re = new RegExp(WORD_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) out.push({ word: m[0].toLowerCase(), index: m.index });
  return out;
}

/** Window size for verbatim-overlap detection. Long enough that shared phrasing is not a match. */
export const SHINGLE = 8;

function shingleSet(words: string[], n = SHINGLE): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
}

/**
 * Verbatim overlap with the run's own evidence.
 *
 * This is the leak class most likely to actually happen and the one no regex catches: an intro
 * script quoting the candidate's transcript back at them, or lifting a franchisee quote out of the
 * Item-19 analysis. [C-15] names "raw quote/evidence body" explicitly.
 *
 * Reports EVERY distinct overlapping window with its true character offset. The first version
 * returned on the first match and computed the offset with `indexOf` on the window's first WORD,
 * which pointed at the wrong place whenever that word appeared earlier in the text.
 */
export function findEvidenceOverlap(text: string, evidenceStrings: string[]): LeakFinding[] {
  const evidence = new Set<string>();
  for (const s of evidenceStrings) {
    for (const sh of shingleSet(tokensWithOffsets(s).map((t) => t.word))) evidence.add(sh);
  }
  if (evidence.size === 0) return [];

  const toks = tokensWithOffsets(text);
  const findings: LeakFinding[] = [];
  let i = 0;
  while (i + SHINGLE <= toks.length) {
    const slice = toks.slice(i, i + SHINGLE);
    const window = slice.map((t) => t.word).join(" ");
    if (evidence.has(window)) {
      const start = slice[0].index;
      const last = slice[SHINGLE - 1];
      findings.push({
        leakClass: "EVIDENCE_QUOTE",
        span: text.slice(start, last.index + last.word.length),
        index: start,
        why: `repeats ${SHINGLE} or more words verbatim from this run's internal evidence`,
      });
      i += SHINGLE; // skip past this window rather than reporting every overlapping shift of it
      continue;
    }
    i++;
  }
  return findings;
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

  const findings: LeakFinding[] = [];
  for (const rule of RULES) {
    // Fresh regex per call: /g patterns carry lastIndex between uses.
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++; // guard against a zero-width match looping forever
        continue;
      }
      if (rule.accept && !rule.accept(m, text)) continue;
      findings.push({
        leakClass: rule.leakClass,
        span: m[0].trim(),
        index: m.index + (m[0].length - m[0].trimStart().length),
        why: rule.why,
      });
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
