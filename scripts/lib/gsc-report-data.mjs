// scripts/lib/gsc-report-data.mjs
//
// Pure row-shaping helpers for scripts/gsc-report.mjs.
//
// Separate from the script so the selection logic can be tested without
// authenticating or calling Google, the same split gsc-property.mjs uses.
//
// The bug this file exists to prevent: the Search Console v3 searchAnalytics
// API has NO orderBy field. It returns rows by clicks descending, ties broken
// by key. On a site with few clicks that means almost every row is a tie, so
// the rows arrive in key order and `rowLimit` truncates them ALPHABETICALLY.
// A report that calls itself "top queries by impressions" while showing an
// alphabetical slice hides exactly the pages worth working on. Ordering is
// therefore ours to do, here, after the fetch.

import { hostOf } from "./gsc-property.mjs";

/** Impressions descending, stable on ties by key. Never mutates the input. */
export function byImpressions(rows) {
  return [...rows].sort(
    (a, b) => b.impressions - a.impressions || String(a.keys[0]).localeCompare(String(b.keys[0])),
  );
}

/**
 * Render a row's URL as a path when it sits on the property's own host.
 *
 * Rows from a DOMAIN property can span hosts (www and apex are both in scope),
 * and collapsing those to the same path would merge two genuinely different
 * rows on screen. So a foreign host keeps its full URL and stays legible.
 */
export function pathFor(siteUrl) {
  const propertyHost = hostOf(siteUrl);
  return (url) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return url; // not a URL we can reason about; show it as-is
    }
    if (propertyHost && parsed.hostname !== propertyHost) return url;
    return `${parsed.pathname}${parsed.search}` || "/";
  };
}

/** Article pages live under /resources/; the index itself is a core page. */
export function splitPages(rows) {
  const isArticle = (r) => {
    const p = String(r.keys[0]);
    return p.includes("/resources/") && !p.endsWith("/resources/");
  };
  return {
    articles: byImpressions(rows.filter(isArticle)),
    corePages: byImpressions(rows.filter((r) => !isArticle(r))),
  };
}

// Thresholds are rank-based rather than absolute. The previous absolutes
// (>=50 impressions to be an opportunity, >=100 to be low-CTR) were written for
// a site with traffic; against 985 monthly impressions they matched nothing at
// all, so the review had no targets and looked healthy. Taking the top N above
// a small noise floor surfaces the real leaders at any traffic level, and keeps
// the list short once the site grows.
const NOISE_FLOOR = 5;
const TOP_N = 10;

/**
 * Pages close to page one: ranked 8-20, most impressions first.
 * These need a push, not a rewrite.
 */
export function selectOpportunities(rows, { minImpressions = NOISE_FLOOR, limit = TOP_N } = {}) {
  return byImpressions(
    rows.filter((r) => r.position >= 8 && r.position <= 20 && r.impressions >= minImpressions),
  ).slice(0, limit);
}

/**
 * Pages Google ranks well that are not earning the click.
 *
 * The position gate is the point. Without it a page at position 66 gets filed
 * as a CTR problem, and the workflow then advises rewriting its title. Nobody
 * is declining to click a result they never scrolled to; that is a ranking
 * problem, and it belongs in selectPoorlyRanked instead.
 */
export function selectLowCtr(
  rows,
  { minImpressions = 20, maxCtr = 0.02, maxPosition = 20, limit = TOP_N } = {},
) {
  return byImpressions(
    rows.filter(
      (r) => r.impressions >= minImpressions && r.ctr < maxCtr && r.position <= maxPosition,
    ),
  ).slice(0, limit);
}

/**
 * Pages earning impressions from well down the results, where the fix is
 * ranking work rather than a better title. This is the bucket the old low-CTR
 * filter was silently absorbing.
 */
export function selectPoorlyRanked(
  rows,
  { minImpressions = 20, minPosition = 20, limit = TOP_N } = {},
) {
  return byImpressions(
    rows.filter((r) => r.impressions >= minImpressions && r.position > minPosition),
  ).slice(0, limit);
}
