/**
 * articleDate + the content-refresh date contract.
 *
 * Two things are under test here and they are coupled on purpose:
 *
 *   1. src/lib/articleDate.ts, the render-time validator every date-consuming
 *      surface now shares.
 *   2. The refresh write/read pair, serializeArticle() and isStale(). These
 *      cannot be tested apart. serializeArticle resets the staleness clock and
 *      isStale reads it, so changing either one alone produces either a
 *      destroyed publication date or an infinite refresh loop, and BOTH of
 *      those states pass every other gate in this repo.
 *
 * The refresh tests drive the REAL serializeArticle rather than a local
 * reimplementation. A mirrored copy would pass by construction and keep passing
 * after the real one regressed, which is precisely the failure mode that let
 * the original bug ship.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import matter from "gray-matter";
import {
  isRealCalendarDay,
  articleDateISO,
  articleDateObject,
  formatArticleDate,
  articleDateSortKey,
} from "@/lib/articleDate";
import { isStale, type Article, type ArticleFrontmatter } from "@/lib/contentRefresh";
import { serializeArticle } from "@/lib/githubArticleCommit";
// The gate that owns dates at build time. Imported so the two implementations
// of isRealCalendarDay cannot drift apart: verify-dates.mjs deliberately reads
// RAW frontmatter text and is mutation-tested, so it is not restructured to
// share code, and this cross-check is what keeps the duplication honest.
import { isRealCalendarDay as gateIsRealCalendarDay } from "../../scripts/verify-dates.mjs";

afterEach(() => {
  vi.useRealTimers();
});

describe("isRealCalendarDay", () => {
  it("accepts real days", () => {
    expect(isRealCalendarDay("2026-08-04")).toBe(true);
    expect(isRealCalendarDay("2024-02-29")).toBe(true); // leap year
  });

  it("rejects impossible days that new Date() silently rolls over", () => {
    // The whole reason the reconstruction exists: these are NOT NaN.
    expect(Number.isNaN(new Date("2026-02-30").getTime())).toBe(false);
    expect(isRealCalendarDay("2026-02-30")).toBe(false);
    expect(isRealCalendarDay("2026-13-01")).toBe(false);
    expect(isRealCalendarDay("2025-02-29")).toBe(false); // not a leap year
  });

  it("rejects anything that is not a bare YYYY-MM-DD", () => {
    expect(isRealCalendarDay("2026-8-4")).toBe(false);
    expect(isRealCalendarDay("2026-08-04T00:00:00Z")).toBe(false);
    expect(isRealCalendarDay("0026-01-01")).toBe(false); // Date.UTC maps to 1926
    expect(isRealCalendarDay("")).toBe(false);
  });

  it("agrees with the build gate on every case", () => {
    const cases = [
      "2026-08-04", "2024-02-29", "2025-02-29", "2026-02-30", "2026-13-01",
      "2026-00-10", "2026-01-00", "2026-8-4", "0026-01-01", "9999-12-31",
      "2026-08-04T00:00:00Z", "not-a-date", "",
    ];
    for (const value of cases) {
      expect(
        isRealCalendarDay(value),
        `disagreed with verify-dates.mjs on ${JSON.stringify(value)}`,
      ).toBe(gateIsRealCalendarDay(value));
    }
  });
});

describe("articleDateISO", () => {
  it("returns the validated string, or null", () => {
    expect(articleDateISO("2026-08-04")).toBe("2026-08-04");
    expect(articleDateISO("2026-02-30")).toBeNull();
    expect(articleDateISO(undefined)).toBeNull();
  });

  it("rejects a Date, which is what an UNQUOTED frontmatter date arrives as", () => {
    // js-yaml has already rolled the value over by this point and the authored
    // text is gone, so normalizing it would launder a corrupted date.
    expect(articleDateISO(new Date("2026-08-04"))).toBeNull();
  });
});

describe("articleDateObject", () => {
  it("anchors to local noon so the rendered day never slips a timezone", () => {
    const date = articleDateObject("2026-03-22")!;
    // The bug this prevents: UTC midnight formats as the 21st west of Greenwich.
    expect(date.getDate()).toBe(22);
    expect(date.getMonth()).toBe(2);
    expect(date.getHours()).toBe(12);
  });
});

describe("formatArticleDate", () => {
  it("formats both styles", () => {
    expect(formatArticleDate("2026-03-22", "long")).toBe("March 22, 2026");
    expect(formatArticleDate("2026-03-22", "short")).toBe("Mar 22, 2026");
  });

  it("returns null instead of the string 'Invalid Date'", () => {
    // The pre-fix behaviour rendered those two words to visitors.
    expect(new Date("nonsense" + "T12:00:00").toString()).toBe("Invalid Date");
    expect(formatArticleDate("2026-02-30")).toBeNull();
  });
});

describe("articleDateSortKey", () => {
  it("orders newest first and never returns NaN", () => {
    const dates = ["2026-01-05", "bad", "2026-06-01"];
    const sorted = [...dates].sort((a, b) => articleDateSortKey(b) - articleDateSortKey(a));
    expect(sorted).toEqual(["2026-06-01", "2026-01-05", "bad"]);
    expect(Number.isNaN(articleDateSortKey("bad"))).toBe(false);
  });
});

// ─── The refresh write/read pair ─────────────────────────────────────────────

function article(
  frontmatter: Partial<ArticleFrontmatter> = {},
  slug = "test-article",
): Article {
  return {
    // getRefreshCadenceDays reads the TOP-LEVEL slug, not frontmatter.slug.
    slug,
    frontmatter: {
      title: "T",
      slug,
      date: "2020-01-01",
      category: "Getting Started",
      tier: 1,
      excerpt: "E",
      relatedSlugs: [],
      ...frontmatter,
    },
    body: "body",
    filePath: `/tmp/${slug}.md`,
  };
}

/** serializeArticle reads the wall clock for `today`, so pin it. */
function serializeOn(today: string, frontmatter: ArticleFrontmatter): string {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${today}T18:00:00Z`));
  try {
    return serializeArticle(frontmatter, "body");
  } finally {
    vi.useRealTimers();
  }
}

describe("serializeArticle", () => {
  it("preserves the original publication date and stamps updatedAt", () => {
    const parsed = matter(
      serializeOn("2026-08-04", article({ date: "2026-01-15" }).frontmatter),
    ).data;
    // The bug: `date` used to be overwritten with the run date on every refresh,
    // permanently destroying the authored publication date.
    expect(parsed.date).toBe("2026-01-15");
    expect(parsed.updatedAt).toBe("2026-08-04");
  });

  it("emits dates QUOTED, so js-yaml cannot roll them over on the way back in", () => {
    const out = serializeOn("2026-08-04", article({ date: "2026-01-15" }).frontmatter);
    expect(out).toContain("date: '2026-01-15'");
    expect(typeof matter(out).data.date).toBe("string");
  });

  it("never writes an updatedAt earlier than date, which verify-dates fails on", () => {
    // Reachable only via the manual { force: true } run, which bypasses isStale.
    const parsed = matter(
      serializeOn("2026-08-04", article({ date: "2026-12-01" }).frontmatter),
    ).data;
    expect(parsed.updatedAt >= parsed.date).toBe(true);
  });
});

describe("isStale", () => {
  const OLD = "2020-01-01"; // far past any cadence

  it("flags an article that has never been refreshed", () => {
    expect(isStale(article({ date: OLD }))).toBe(true);
  });

  it("does NOT re-flag an article that was just refreshed", () => {
    // The infinite-refresh regression. With the publication date now preserved,
    // reading age from `date` alone would leave this permanently stale and every
    // monthly run would rewrite it again.
    const today = "2026-08-04";
    const refreshed = matter(
      serializeOn(today, article({ date: OLD }).frontmatter),
    ).data as ArticleFrontmatter;

    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${today}T18:00:00Z`));
    expect(isStale(article(refreshed))).toBe(false);
  });

  it("flags it again once a full cadence has passed since the refresh", () => {
    const refreshed = matter(
      serializeOn("2026-08-04", article({ date: OLD }).frontmatter),
    ).data as ArticleFrontmatter;

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-09-01T18:00:00Z")); // >365d later
    expect(isStale(article(refreshed))).toBe(true);
  });

  it("treats an unvalidatable date as not stale rather than aging it as NaN", () => {
    expect(isStale(article({ date: "2026-02-30" }))).toBe(false);
  });

  it("still honours strategic slugs and the force flag", () => {
    expect(
      isStale(article({ date: OLD }, "the-semi-absentee-franchise-real-talk")),
    ).toBe(false);
    expect(isStale(article({ date: "2099-01-01" }), true)).toBe(true);
  });
});
