import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import {
  verifyArticleDates,
  extractFrontmatterBlock,
  topLevelValues,
  parseScalar,
  isRealCalendarDay,
  DEFAULT_ARTICLES_DIR,
} from "../../scripts/verify-dates.mjs";

/**
 * verify-dates.mjs guards a corruption that destroys its own evidence.
 *
 * js-yaml resolves an UNQUOTED frontmatter date into a Date before any app code
 * runs, applying a silent rollover on the way: 2026-02-30 arrives as March 2 and
 * 2026-13-01 as January 2027. Once that has happened the authored value cannot be
 * recovered, and a rolled-over date is indistinguishable from an intended one.
 *
 * So the load-bearing property of this whole suite is that the checker reads RAW
 * TEXT. Every fixture below is written as a literal string and handed to the
 * checker unparsed. If somebody "simplifies" verify-dates.mjs to use gray-matter,
 * these tests must go red rather than quietly agreeing with the laundered value.
 *
 * The second load-bearing assertion is `checkedDates`. This repo has already been
 * burned once by a guard that extracted nothing from all 45 articles and printed
 * a green pass for months (see tests/unit/verify-links.test.ts). A checker that
 * finds no dates must FAIL here, which is why no green test asserts on `errors`
 * alone.
 */

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "verify-dates-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * Write an article fixture from LITERAL frontmatter lines. Deliberately not
 * built with matter.stringify (except in the machine-writer test below), because
 * serializing through js-yaml is exactly the step that would launder a fixture
 * meant to be malformed.
 */
function writeArticle(
  filename: string,
  frontmatterLines: string[],
  { body = "Body text.\n", eol = "\n", bom = false }: { body?: string; eol?: string; bom?: boolean } = {},
): void {
  const text = ["---", ...frontmatterLines, "---", "", body].join(eol);
  writeFileSync(join(dir, filename), bom ? "﻿" + text : text);
}

const VALID = ['title: "T"', 'slug: "s"', 'date: "2026-01-15"'];

describe("verifyArticleDates: the green path, and proof it actually looked", () => {
  it("passes a valid corpus AND proves it examined every date field", () => {
    writeArticle("alpha.md", VALID);
    writeArticle("beta.md", ['date: "2025-12-31"']);
    writeArticle("gamma.md", ['date: "2024-02-29"', 'updatedAt: "2026-06-19"']);

    const { fileCount, checkedDates, errors } = verifyArticleDates(dir);

    expect(errors).toEqual([]);
    expect(fileCount).toBe(3);
    // 3 `date` + 1 `updatedAt`. A checker that silently stopped extracting would
    // report 0 here while still reporting no errors, which is the failure this
    // assertion exists to catch.
    expect(checkedDates).toBe(4);
  });

  it("treats an absent updatedAt as normal, since most articles never get revised", () => {
    writeArticle("alpha.md", VALID);
    const { checkedDates, errors } = verifyArticleDates(dir);
    expect(errors).toEqual([]);
    expect(checkedDates).toBe(1);
  });

  it("ignores non-markdown files rather than reporting them as dateless articles", () => {
    writeArticle("alpha.md", VALID);
    writeFileSync(join(dir, "notes.txt"), "not an article");
    const { fileCount, errors } = verifyArticleDates(dir);
    expect(errors).toEqual([]);
    expect(fileCount).toBe(1);
  });
});

/**
 * The machine-writer contract. src/lib/contentRefresh.ts writeArticle() and
 * src/lib/githubArticleCommit.ts both re-serialize frontmatter with
 * matter.stringify, which emits SINGLE quotes. Every article on disk today uses
 * double quotes, so a guard tightened to `"` only would pass the entire real
 * corpus and then reject the first automated content refresh.
 */
describe("verifyArticleDates: output of the machine writers", () => {
  it("accepts the single-quoted frontmatter that matter.stringify emits", () => {
    const serialized = matter.stringify("Body.\n", {
      title: "T",
      slug: "s",
      date: "2026-08-04",
      updatedAt: "2026-08-04",
    });
    // Guard the guard: if gray-matter ever changes its quoting style, this test
    // should say so directly rather than failing for a mysterious reason.
    expect(serialized).toContain("date: '2026-08-04'");
    writeFileSync(join(dir, "refreshed.md"), serialized);

    const { checkedDates, errors } = verifyArticleDates(dir);
    expect(errors).toEqual([]);
    expect(checkedDates).toBe(2);
  });
});

describe("verifyArticleDates: a missing required date", () => {
  it("fails when date is absent entirely", () => {
    writeArticle("alpha.md", ['title: "T"', 'slug: "s"']);
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("alpha.md");
    expect(errors[0]).toContain("REQUIRED");
  });

  it("fails when date is present but has no value", () => {
    writeArticle("alpha.md", ["date:"]);
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("no value");
  });

  it("does not accept an INDENTED date as the top-level one", () => {
    // A nested `date:` belongs to some other mapping. Counting it would let an
    // article with no publication date report as valid.
    writeArticle("alpha.md", ['meta:', '  date: "2026-01-15"']);
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("REQUIRED");
  });
});

describe("verifyArticleDates: unquoted dates, the case YAML destroys", () => {
  it("rejects an unquoted date even when the day is perfectly valid", () => {
    // The value is fine; the ENCODING is the defect. Accepting it would mean the
    // next author writes 2026-02-30 in the same style and gets silent rollover.
    writeArticle("alpha.md", ["date: 2026-01-15"]);
    const { checkedDates, errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("UNQUOTED");
    expect(errors[0]).toContain("2026-02-30 becomes March 2");
    // Still counts as examined: the checker saw a value and judged it.
    expect(checkedDates).toBe(1);
  });

  it("rejects an unquoted impossible day", () => {
    writeArticle("alpha.md", ["date: 2026-02-30"]);
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("UNQUOTED");
  });

  it("rejects an unquoted updatedAt, which launders identically", () => {
    writeArticle("alpha.md", ['date: "2026-01-15"', "updatedAt: 2026-06-19"]);
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("updatedAt");
    expect(errors[0]).toContain("UNQUOTED");
  });
});

describe("verifyArticleDates: quoted values that are not real days", () => {
  it("rejects an impossible day that new Date() would happily accept", () => {
    // The whole reason the checker reconstructs the date instead of calling
    // isNaN: new Date("2026-02-30") is a valid Date for March 2.
    expect(isNaN(new Date("2026-02-30").getTime())).toBe(false);
    writeArticle("alpha.md", ['date: "2026-02-30"']);
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("not a real calendar day");
  });

  it("rejects a thirteenth month", () => {
    writeArticle("alpha.md", ['date: "2026-13-01"']);
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("not a real calendar day");
  });

  it("rejects a non-ISO date string", () => {
    writeArticle("alpha.md", ['date: "March 2, 2026"']);
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("not a real calendar day");
  });

  it("rejects Feb 29 in a non-leap year while accepting it in a leap year", () => {
    writeArticle("leap.md", ['date: "2024-02-29"']);
    writeArticle("notleap.md", ['date: "2026-02-29"']);
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("notleap.md");
  });
});

describe("verifyArticleDates: duplicate keys, where YAML silently picks the last", () => {
  it("fails rather than validating whichever one it happened to find first", () => {
    writeArticle("alpha.md", ['date: "2026-01-15"', 'date: "2026-09-09"']);
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("2 top-level");
    expect(errors[0]).toContain("LAST");
  });
});

describe("verifyArticleDates: frontmatter framing", () => {
  it("fails a file with no frontmatter block at all", () => {
    writeFileSync(join(dir, "alpha.md"), "# Just a heading\n\nBody.\n");
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("no YAML frontmatter block");
  });

  it("fails a file whose frontmatter is never closed", () => {
    writeFileSync(join(dir, "alpha.md"), '---\ndate: "2026-01-15"\n\nBody.\n');
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("no YAML frontmatter block");
  });

  it("stops at the FIRST closing delimiter, so a body horizontal rule is not frontmatter", () => {
    // The sharp version of this test: the body contains a second `date:` line
    // after a `---` rule. If the block scan ran to the last delimiter it would
    // swallow the body and report a duplicate key instead of passing.
    writeArticle("alpha.md", ['date: "2026-01-15"'], {
      body: "Intro.\n\n---\n\ndate: not actually frontmatter\n",
    });
    const { checkedDates, errors } = verifyArticleDates(dir);
    expect(errors).toEqual([]);
    expect(checkedDates).toBe(1);
  });

  it("handles CRLF line endings", () => {
    writeArticle("alpha.md", ['date: "2026-01-15"'], { eol: "\r\n" });
    const { checkedDates, errors } = verifyArticleDates(dir);
    expect(errors).toEqual([]);
    expect(checkedDates).toBe(1);
  });

  it("handles a leading UTF-8 BOM", () => {
    writeArticle("alpha.md", ['date: "2026-01-15"'], { bom: true });
    const { checkedDates, errors } = verifyArticleDates(dir);
    expect(errors).toEqual([]);
    expect(checkedDates).toBe(1);
  });
});

describe("verifyArticleDates: quoting oddities", () => {
  it("allows a trailing comment after the quoted value", () => {
    writeArticle("alpha.md", ['date: "2026-01-15" # backdated on purpose']);
    const { checkedDates, errors } = verifyArticleDates(dir);
    expect(errors).toEqual([]);
    expect(checkedDates).toBe(1);
  });

  it("rejects a mismatched quote pair", () => {
    writeArticle("alpha.md", ["date: \"2026-01-15'"]);
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("unterminated or mismatched quote");
  });

  it("rejects junk after the closing quote", () => {
    writeArticle("alpha.md", ['date: "2026-01-15" 2026-01-16']);
    const { errors } = verifyArticleDates(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("after the closing quote");
  });
});

describe("helpers", () => {
  it("extractFrontmatterBlock returns only the frontmatter lines", () => {
    expect(extractFrontmatterBlock('---\na: 1\nb: 2\n---\nbody\n')).toEqual(["a: 1", "b: 2"]);
    expect(extractFrontmatterBlock("no frontmatter\n")).toBeNull();
  });

  it("topLevelValues finds every unindented occurrence and no indented one", () => {
    const block = ['date: "a"', "  date: nested", 'date: "b"'];
    expect(topLevelValues(block, "date")).toEqual([' "a"', ' "b"']);
  });

  it("topLevelValues does not match a key that merely ends with the name", () => {
    // `publishDate:` is a different key; a substring match would claim it.
    expect(topLevelValues(['publishDate: "x"'], "date")).toEqual([]);
  });

  it("parseScalar classifies each shape", () => {
    expect(parseScalar(' "2026-01-15"')).toEqual({ kind: "quoted", value: "2026-01-15" });
    expect(parseScalar(" '2026-01-15'")).toEqual({ kind: "quoted", value: "2026-01-15" });
    expect(parseScalar(" 2026-01-15").kind).toBe("unquoted");
    expect(parseScalar("").kind).toBe("empty");
    expect(parseScalar("   ").kind).toBe("empty");
    expect(parseScalar(' "2026-01-15').kind).toBe("unterminated");
  });

  it("isRealCalendarDay reconstructs the date rather than trusting the parser", () => {
    expect(isRealCalendarDay("2026-01-15")).toBe(true);
    expect(isRealCalendarDay("2024-02-29")).toBe(true);
    expect(isRealCalendarDay("2026-02-29")).toBe(false);
    expect(isRealCalendarDay("2026-02-30")).toBe(false);
    expect(isRealCalendarDay("2026-13-01")).toBe(false);
    expect(isRealCalendarDay("2026-00-01")).toBe(false);
    expect(isRealCalendarDay("2026-01-00")).toBe(false);
    expect(isRealCalendarDay("2026-1-5")).toBe(false);
    // Date.UTC maps years 0-99 into the 1900s, so this must not round-trip.
    expect(isRealCalendarDay("0026-01-01")).toBe(false);
  });

  it("points at the real content directory by default", () => {
    expect(DEFAULT_ARTICLES_DIR).toMatch(/content[/\\]articles$/);
  });
});
