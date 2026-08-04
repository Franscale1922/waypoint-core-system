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
 *
 * publicationDate is calendar-validated, not just type-checked. A merely
 * `typeof === "string"` check would let a syntactically YYYY-MM-DD but
 * impossible day (e.g. "2026-13-01") through the comparison below and echo it
 * straight into `updatedAt` verbatim, since the comparison is a plain string
 * compare that never inspects whether the value names a real day. Reproduced:
 * `"2026-08-04" < "2026-13-01"` is true lexicographically, so the malformed
 * value would have been returned unchanged. An invalid publicationDate falls
 * back to `today`, the same fallback used when it is missing entirely.
 *
 * A publicationDate that IS a real calendar day but still in the future
 * relative to `today` is a separate, narrower case this does not resolve: the
 * ordering invariant above forces a choice between `updatedAt` before `date`
 * (a verify-dates build failure) or `updatedAt` naming a day that has not
 * happened yet. This function keeps the existing behavior (returns
 * publicationDate, preserving the ordering invariant) rather than deciding
 * that policy question here. It is reachable only when a content-authoring mistake
 * (a post-dated article, which verify-dates does not reject: it checks that a
 * day exists, not that it is in the past) meets a manual `{ force: true }`
 * refresh of that specific article. Tracked as a follow-up, not fixed inline,
 * because the correct fix is to refuse the refresh entirely rather than
 * choose which invariant to violate, and that is a caller-level decision.
 */
export function revisionUpdatedAt(publicationDate: unknown, today: string): string {
  if (typeof publicationDate !== "string" || !isRealCalendarDay(publicationDate)) {
    return today;
  }
  return today < publicationDate ? publicationDate : today;
}

/**
 * Whole calendar days between an article's date and `now`, or null when the
 * date cannot be validated.
 *
 * Deliberately NOT `articleDateObject`-based. That helper anchors to LOCAL
 * noon, which is correct for display (it keeps the rendered day equal to the
 * authored day) but wrong for age math: comparing two noon-anchored instants
 * by elapsed milliseconds makes the result depend on the SERVER's ambient
 * timezone and on what time of day the cron happens to fire. An article
 * touched exactly 365 days ago by the calendar can read as 364 days and
 * change if the run lands a few hours before the anchor, silently deferring
 * it to the next scheduled run.
 *
 * This computes both sides as UTC calendar-date boundaries instead, so the
 * result is an exact integer day count independent of the process's TZ
 * environment variable or the time of day `now` carries.
 */
export function daysSinceArticleDate(value: unknown, now: Date): number | null {
  const iso = articleDateISO(value);
  if (iso === null) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const articleUTC = Date.UTC(year, month - 1, day);
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((nowUTC - articleUTC) / (1000 * 60 * 60 * 24));
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
