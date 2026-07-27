import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkProjectionText, findEvidenceOverlap, SHINGLE } from "@/lib/match-workspace/projection-guard";

/**
 * These run ADVERSARIALLY against the validator rather than over a fixture.
 *
 * The baseline is a realistic brand-introduction script: the length, register and numeric content
 * of what the `brand-introduction-scripts` skill actually produces, including money figures,
 * percentages, counts and years. If the validator rejects that, it is useless in practice. Each
 * mutation then embeds exactly one forbidden class into that same baseline, so a failure is
 * attributable to the class and not to some other property of the text.
 */

// Deliberately numeric: investment ranges, unit counts, years, percentages, a decimal price. All of
// this is legitimate in candidate-facing copy and must survive.
const CLEAN = `
Here is what stood out to me about this brand, and why I put it in front of you.

You told me you wanted something where the work is done by a team rather than by you personally,
and where the customer decides quickly rather than after months of deliberation. This brand fits
both. Owners run it as a manager-led business from a small office, and most of them are not on the
vans. The average ticket is around $480, and customers typically decide within a single visit.

The investment range runs from about $180,000 to $265,000 depending on how many territories you
open. They have been franchising for 14 years and have just over 300 locations open across 38
states, so this is not an unproven concept. Royalty is 6.5% with a 2% brand fund.

What I think you will like: the schedule is genuinely weekday-heavy, which matters given what you
said about coaching on Saturdays. What I want you to look at hard: this is a labor business, and
hiring is the constraint. When you talk to owners, ask them how long it takes to fill an open
position right now, and what they pay to keep good technicians.

If that sounds like something you want to explore, the next step is a call with their development
team, and I will set that up.
`.trim();

const findingsFor = (text: string) => checkProjectionText(text).findings.map((f) => f.leakClass);

describe("checkProjectionText: a real intro script passes", () => {
  it("accepts realistic candidate-facing copy containing money, percentages, counts and years", () => {
    const result = checkProjectionText(CLEAN);
    expect(
      result.findings.map((f) => `${f.leakClass}:${f.span}`),
      "the validator must not reject legitimate copy, or it will simply be worked around",
    ).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("rejects empty or whitespace-only text", () => {
    expect(checkProjectionText("").ok).toBe(false);
    expect(checkProjectionText("   \n  ").ok).toBe(false);
  });
});

describe("checkProjectionText: one mutation per forbidden class, each caught by name", () => {
  const mutations: { leakClass: string; text: string; note: string }[] = [
    {
      leakClass: "SCORE_DECIMAL",
      text: CLEAN + "\n\nInternally this one came out at 0.86, my highest.",
      note: "a 0-to-1 internal score",
    },
    {
      leakClass: "ITEM_SCALE",
      text: CLEAN + "\n\nTheir financial disclosure scored 4 out of 5 in my review.",
      note: "the internal 1-to-5 item scale",
    },
    {
      leakClass: "FDD_ITEM_REFERENCE",
      text: CLEAN + "\n\nItem 19 is unusually detailed for a brand this size.",
      note: "naming the FDD item scored internally",
    },
    {
      leakClass: "CONFIDENCE_TOKEN",
      text: CLEAN + "\n\nConfidence: HIGH.",
      note: "a confidence label copied from a table",
    },
    {
      leakClass: "INTERNAL_FLAG",
      text: CLEAN + "\n\nThere is one red flag I am still working through.",
      note: "internal flag vocabulary",
    },
    {
      leakClass: "MSA_TERM",
      text: CLEAN + "\n\nThe MSA modifier moved this one up slightly.",
      note: "market-viability scoring vocabulary",
    },
    {
      leakClass: "DATABASE_FIELD",
      text: CLEAN + "\n\nTheir industry_segment matches what you asked for.",
      note: "a database column name",
    },
    {
      leakClass: "RANK_OR_SCORE",
      text: CLEAN + "\n\nThis brand ranked #1 on your final score.",
      note: "a rank or score statement",
    },
  ];

  for (const { leakClass, text, note } of mutations) {
    it(`catches ${leakClass} (${note})`, () => {
      const classes = findingsFor(text);
      expect(classes, `expected ${leakClass}, got ${classes.join(", ") || "nothing"}`).toContain(leakClass);
      expect(checkProjectionText(text).ok).toBe(false);
    });
  }

  it("reports the exact span and offset so the operator can rewrite it", () => {
    const text = CLEAN + "\n\nConfidence: HIGH.";
    const finding = checkProjectionText(text).findings.find((f) => f.leakClass === "CONFIDENCE_TOKEN")!;
    expect(finding.span).toBe("HIGH");
    expect(text.slice(finding.index, finding.index + finding.span.length)).toBe("HIGH");
  });

  it("reports EVERY finding, not just the first, so one rewrite pass can fix them all", () => {
    const text = CLEAN + "\n\nConfidence: HIGH. Item 19 is detailed. It scored 0.86.";
    const classes = new Set(findingsFor(text));
    expect(classes.has("CONFIDENCE_TOKEN")).toBe(true);
    expect(classes.has("FDD_ITEM_REFERENCE")).toBe(true);
    expect(classes.has("SCORE_DECIMAL")).toBe(true);
  });
});

describe("evidence overlap: the class no regex catches", () => {
  const evidence = [
    "The owner told me she was terrified of taking on debt again after the last business failed and she had to let people go.",
  ];

  it("catches an intro script quoting the run's own evidence back at the candidate", () => {
    const leaked =
      "You mentioned you were terrified of taking on debt again after the last business failed, and I have kept that front of mind.";
    const findings = findEvidenceOverlap(leaked, evidence);
    expect(findings.map((f) => f.leakClass)).toContain("EVIDENCE_QUOTE");
  });

  it("does not fire on ordinary shared phrasing shorter than the window", () => {
    const fine = "You told me debt was the thing you did not want to repeat, and this brand suits that.";
    expect(findEvidenceOverlap(fine, evidence)).toEqual([]);
  });

  it("does not fire when there is no evidence to compare against", () => {
    expect(findEvidenceOverlap(CLEAN, [])).toEqual([]);
  });

  it(`uses a window of ${SHINGLE} words, long enough that common phrasing is not a match`, () => {
    expect(SHINGLE).toBeGreaterThanOrEqual(6);
  });
});

describe("[C-16] structural: the candidate-facing read never touches MatchScore", () => {
  it("candidateFacingProjections queries only projections and decisions", () => {
    const src = readFileSync(
      join(process.cwd(), "src", "lib", "match-workspace", "projection.ts"),
      "utf8",
    );
    // Isolate the candidate-facing function. The write path in the same file DOES read MatchScore
    // to gather evidence, which is legitimate: [C-16] constrains what a CANDIDATE can be shown.
    const start = src.indexOf("export async function candidateFacingProjections");
    const end = src.indexOf("export async function redactCandidate");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const fn = src.slice(start, end);

    expect(fn).not.toMatch(/matchScore/i);
    expect(fn).not.toMatch(/\b(fitScore|finalScore|preMsaScore|confidence|flags|i19|i20)\b/i);
    expect(fn).toMatch(/matchProjection/);
  });
});
