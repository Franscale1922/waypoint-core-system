/**
 * reviewCadence.mjs: the freshness review cadences from CONTENT-STANDARDS Section 6,
 * and the optional frontmatter field an article uses to declare its own.
 *
 * Plain .mjs, following frontmatterDates.mjs and frontmatterFields.mjs, so the runtime
 * (src/lib/contentRefresh.ts) and the gate (scripts/aeo-audit.mjs) read ONE definition.
 * A TypeScript module cannot be imported by the audit script, and duplicating the
 * vocabulary is how the two would drift into disagreeing about which values are legal.
 *
 * WHY THE FIELD EXISTS
 *
 * getRefreshCadenceDays infers cadence from the slug string, matching a list of
 * financing keywords. That inference cannot be made correct, because the signal it reads
 * is not in the slug. Two articles already queued in CONTENT-CALENDAR.md prove it:
 *
 *   "Cost and Operational Efficiency Franchises"  (Industry Spotlights)
 *       Genuinely classifiable both ways. CONTENT-STANDARDS lists "Investment and cost
 *       articles: every 12 months" AND "Category analysis: every 18 months", and this
 *       article is honestly both. No ordering of the two rules is right, because the
 *       standard does not say which wins.
 *
 *   "The Playbook Is There for a Reason: Why Improvising Early Costs You"  (After You Buy)
 *       Here "Costs" is a VERB. There is no reordering, and no amount of tokenizing,
 *       that distinguishes it from a cost article. A strategic piece would be pulled onto
 *       the 12-month financing cadence by a word about the price of improvising.
 *
 * So the field is an override, not a replacement. The heuristic still decides the common
 * case and no existing article had to change; an article whose cadence the slug gets
 * wrong says so, once, in the one place a human is already making that editorial call.
 *
 * The names are the standard's own row labels rather than raw day counts, so the numbers
 * live here alone and an article states editorial intent instead of an implementation
 * detail.
 */

/**
 * Content type → review cadence in days, or null for "no scheduled review".
 * Mirrors the CONTENT-STANDARDS Section 6 table row for row.
 */
export const REVIEW_CADENCES = {
  "investment-and-cost": 365,
  financing: 365,
  "category-analysis": 548,
  process: 730,
  strategic: null,
};

/** The legal values, for error messages and the audit gate. */
export const REVIEW_CADENCE_NAMES = Object.keys(REVIEW_CADENCES);

/** The frontmatter key an article uses to declare its cadence. */
export const REVIEW_CADENCE_FIELD = "reviewCadence";

/**
 * True when `value` names a cadence in the table above.
 *
 * `hasOwnProperty` rather than `value in` or a truthiness test on the lookup: `in` would
 * accept "constructor" and "toString" off Object.prototype, and a truthiness test would
 * reject "strategic", whose cadence is a legitimate null.
 */
export function isReviewCadence(value) {
  return (
    typeof value === "string" && Object.prototype.hasOwnProperty.call(REVIEW_CADENCES, value)
  );
}

/**
 * Validate an article's declared cadence.
 *
 * Returns an error string, or null when there is nothing wrong. Absent is not an error:
 * the field is optional by design, and the heuristic handles every article that does not
 * need to override it.
 */
export function validateReviewCadence(value, { label } = {}) {
  if (value === undefined) return null;
  if (isReviewCadence(value)) return null;
  const where = label ? `${label}: ` : "";
  return (
    `${where}${REVIEW_CADENCE_FIELD} is "${String(value)}", which is not a review cadence. ` +
    `Use one of: ${REVIEW_CADENCE_NAMES.join(", ")}. Omit the field to let the cadence be ` +
    `inferred from the slug.`
  );
}
