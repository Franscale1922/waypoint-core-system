/**
 * articleDate.ts
 *
 * One validated reading of an article's frontmatter date, shared by every
 * surface that renders or sorts one.
 *
 * Why this file exists, and why it is deliberately dependency-free:
 *
 * 1. It must be importable from a CLIENT component. ResourcesGrid.tsx is
 *    "use client", so this logic cannot live in src/lib/articles.ts, which
 *    imports fs. Nothing here may reach for a Node built-in.
 *
 * 2. Before this existed, `new Date(meta.date + "T12:00:00")` was copy-pasted
 *    across five render sites and the raw string was handed to Open Graph and
 *    to <time dateTime> unchecked. Structured data went through schemaDate and
 *    was therefore the ONLY consumer protected from a malformed value, so the
 *    same article could omit a date from its JSON-LD while still printing it
 *    in the byline.
 *
 * The noon anchor is load-bearing, not cosmetic. `new Date("2026-03-22")` is
 * parsed as UTC midnight, which in any negative-offset zone (Mountain is UTC-6
 * or -7) formats as March 21: the article visibly loses a day. Anchoring to
 * local noon keeps the rendered day equal to the authored day for every
 * timezone within +/-12h.
 *
 * Validation here is a RENDER-TIME backstop, not the primary gate. The primary
 * gate is scripts/verify-dates.mjs, which runs at pre-push and in CI and reads
 * the RAW frontmatter text (it has to: js-yaml destroys an unquoted impossible
 * date before any parsed value exists). This file only ever sees an
 * already-parsed value, so it cannot detect that case and must not pretend to.
 * What it does guarantee is that nothing downstream renders or sorts on a value
 * this module could not validate.
 *
 * isRealCalendarDay is duplicated from verify-dates.mjs on purpose: that script
 * is standalone ESM with no build step and is mutation-tested, so it is not
 * worth destabilising to share one predicate. tests/unit/articleDate.test.ts
 * cross-checks the two implementations against each other so they cannot drift.
 */

/**
 * True when `value` is a YYYY-MM-DD string naming a day that actually exists.
 *
 * The round-trip through Date.UTC is load-bearing and an isNaN check is NOT a
 * substitute: `new Date("2026-02-30")` is a perfectly valid Date for March 2,
 * so isNaN returns false and the impossible day sails through. Building the
 * date and asserting all three components survive is what detects the rollover.
 *
 * Reconstruction also rejects a year below 1000 written with leading zeroes:
 * Date.UTC maps years 0-99 into the 1900s, so "0026-01-01" returns 1926 and
 * fails the year comparison.
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
 * <time dateTime> attribute, Open Graph publishedTime, the markdown byline.
 * A null means "emit nothing", never "emit something approximate".
 *
 * An unquoted frontmatter date arrives here as a Date, already rolled over by
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
 * Use this anywhere a Date is required (sitemap lastModified, RSS pubDate) or
 * where two dates are compared by age.
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
 * The `updatedAt` a machine writer should stamp when it re-serializes an
 * article, given that article's publication date and today.
 *
 * Both machine writers (githubArticleCommit.serializeArticle and
 * contentRefresh.writeArticle) call this, so the rule lives in one place. They
 * previously each wrote `date: today`, which destroyed the publication date;
 * a revision belongs in `updatedAt`, which is what dateModified, the sitemap,
 * and isStale all already prefer.
 *
 * The clamp keeps `updatedAt >= date`, which verify-dates enforces as a build
 * error. A scheduled refresh cannot reach here with a post-dated article, since
 * isStale requires a full cadence to have passed, but the manual
 * `{ force: true }` run bypasses that check. Both values are YYYY-MM-DD, so a
 * string compare is a date compare, matching how verify-dates orders them.
 */
export function revisionUpdatedAt(publicationDate: unknown, today: string): string {
  return typeof publicationDate === "string" && today < publicationDate
    ? publicationDate
    : today;
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
