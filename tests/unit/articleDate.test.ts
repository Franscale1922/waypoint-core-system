/**
 * src/lib/articleDate.ts, the render-side date validator.
 *
 * The write path (what the AI refresh commits) is covered separately by
 * tests/unit/write-path-dates.test.ts against src/lib/frontmatterDates.mjs.
 * This file covers the READ path: what the site renders, sorts, and emits as
 * metadata.
 *
 * The cross-check below is the point of this file. articleDate.ts duplicates
 * isRealCalendarDay because it has to stay client-bundle-safe and the canonical
 * copy imports gray-matter. A duplicate nobody compares is a future divergence,
 * so both are imported here and asserted to agree.
 */

import { describe, it, expect } from "vitest";
import {
  isRealCalendarDay,
  articleDateISO,
  articleDateObject,
  formatArticleDate,
  articleDateSortKey,
} from "@/lib/articleDate";
// The canonical definition, enforced by the pre-push hook and CI.
import { isRealCalendarDay as canonicalIsRealCalendarDay } from "@/lib/frontmatterDates.mjs";

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

  it("agrees with the canonical copy in frontmatterDates.mjs on every case", () => {
    const cases = [
      "2026-08-04", "2024-02-29", "2025-02-29", "2026-02-30", "2026-13-01",
      "2026-00-10", "2026-01-00", "2026-8-4", "0026-01-01", "9999-12-31",
      "2026-08-04T00:00:00Z", "not-a-date", "",
    ];
    for (const value of cases) {
      expect(
        isRealCalendarDay(value),
        `articleDate.ts disagreed with frontmatterDates.mjs on ${JSON.stringify(value)}`,
      ).toBe(canonicalIsRealCalendarDay(value));
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
