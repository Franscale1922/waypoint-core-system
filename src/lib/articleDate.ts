/**
 * articleDate.ts
 *
 * One validated reading of an article's frontmatter date for everything that
 * RENDERS or SORTS one. This is the read side only: the write path (what the
 * monthly AI refresh commits) is validated separately and more strictly by
 * src/lib/frontmatterDates.mjs, via validateArticlePayload in
 * src/lib/githubArticleCommit.ts.
 *
 * Why this exists at all. Date validation used to protect exactly one consumer:
 * schemaDate() in src/app/lib/structured-data.ts drops a malformed value from
 * the JSON-LD. Nothing else checked. So the same article could omit its date
 * from structured data while still printing it in the byline, handing it to
 * Open Graph as `publishedTime`, and emitting it as a `<time dateTime>`
 * attribute. Worse, `new Date(bad + "T12:00:00")` renders the literal string
 * "Invalid Date" to visitors rather than failing loudly.
 *
 * Why it is deliberately dependency-free. src/app/components/ResourcesGrid.tsx
 * is a "use client" component, so this module crosses into the browser bundle.
 * It therefore cannot import src/lib/articles.ts (which imports `fs`) nor
 * src/lib/frontmatterDates.mjs (which imports gray-matter). Nothing here may
 * reach for a Node built-in or a parser.
 *
 * The noon anchor is load-bearing, not cosmetic. `new Date("2026-03-22")` is
 * parsed as UTC midnight, which in any negative-offset zone (Mountain is UTC-6
 * or -7) formats as March 21: the article visibly loses a day. Anchoring to
 * local noon keeps the rendered day equal to the authored day for every
 * timezone within +/-12h.
 */

/**
 * True when `value` is a YYYY-MM-DD string naming a day that actually exists.
 *
 * DUPLICATED, deliberately, from isRealCalendarDay in
 * src/lib/frontmatterDates.mjs, which is the canonical definition and the one
 * the pre-push hook and CI enforce. It is not imported because that module
 * pulls in gray-matter, and this one has to stay client-bundle-safe (see the
 * header). tests/unit/articleDate.test.ts imports BOTH and asserts they agree
 * on a shared case list, so the copy cannot drift silently.
 *
 * The round-trip through Date.UTC is load-bearing and an isNaN check is NOT a
 * substitute: `new Date("2026-02-30")` is a perfectly valid Date for March 2,
 * so isNaN returns false and the impossible day sails through. Building the
 * date and asserting all three components survive is what detects the rollover.
 *
 * Reconstruction also rejects a year below 1000 written with leading zeroes:
 * Date.UTC maps years 0-99 into the 1900s, so "0026-01-01" comes back as 1926
 * and fails the year comparison.
 */
export function isRealCalendarDay(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * The validated YYYY-MM-DD string, or null when the value cannot be trusted.
 *
 * Use this anywhere the date is emitted as machine-readable metadata: the
 * `<time dateTime>` attribute, Open Graph `publishedTime`, the markdown byline.
 * A null means "emit nothing", never "emit something approximate".
 *
 * An UNQUOTED frontmatter date arrives here as a Date, already rolled over by
 * js-yaml with the authored value unrecoverable. It is rejected rather than
 * normalized, matching schemaDate: accepting it would launder a corrupted date
 * into published metadata with no way to detect it downstream.
 */
export function articleDateISO(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return isRealCalendarDay(value) ? value : null;
}

/**
 * The date as a Date object anchored to LOCAL noon, or null.
 *
 * Use this anywhere a Date is required (sitemap lastModified, RSS pubDate).
 */
export function articleDateObject(value: unknown): Date | null {
  const iso = articleDateISO(value);
  if (iso === null) return null;
  return new Date(`${iso}T12:00:00`);
}

/**
 * The date formatted for display, or null when it cannot be validated.
 *
 * "long"  gives "March 22, 2026" (article byline)
 * "short" gives "Mar 22, 2026"   (resource cards)
 *
 * Callers render nothing when this returns null. That is intentional: a byline
 * with no date reads as an omission, while the previous behaviour printed the
 * literal string "Invalid Date" to visitors whenever the value was unusable.
 */
export function formatArticleDate(
  value: unknown,
  style: "long" | "short" = "long",
): string | null {
  const date = articleDateObject(value);
  if (date === null) return null;
  return date.toLocaleDateString("en-US", {
    month: style === "long" ? "long" : "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Sort key in milliseconds. Unvalidatable dates sort LAST rather than poisoning
 * the comparison.
 *
 * `new Date(bad).getTime()` returns NaN, and every comparison against NaN is
 * false, so a single bad date used to make the surrounding sort order
 * arbitrary rather than merely misplacing that one article.
 */
export function articleDateSortKey(value: unknown): number {
  const date = articleDateObject(value);
  return date === null ? Number.NEGATIVE_INFINITY : date.getTime();
}
