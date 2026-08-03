#!/usr/bin/env node
/**
 * gsc-report.mjs
 *
 * Pulls Google Search Console performance data and saves a dated markdown
 * report to docs/seo-reviews/[YYYY-MM]/.
 *
 * SETUP (one-time, then never again):
 *   See docs/seo-reviews/SETUP.md for step-by-step instructions.
 *
 * USAGE:
 *   node scripts/gsc-report.mjs
 *
 * ENV VARS required:
 *   GSC_SERVICE_ACCOUNT_KEY   Service account credentials, as raw JSON or base64
 *   GSC_SITE_URL              The property identifier exactly as Search Console shows it.
 *                             Currently https://www.waypointfranchise.com/ — a URL-prefix
 *                             property, NOT sc-domain:. The two are different properties
 *                             holding different data, and no default is assumed.
 */

import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { loadServiceAccount, reportCredentialFailure } from "./lib/load-service-account.mjs";
import {
  byImpressions,
  pathFor,
  splitPages,
  selectOpportunities,
  selectLowCtr,
  selectPoorlyRanked,
  weightedPosition,
  cell,
  dateRange,
} from "./lib/gsc-report-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Load .env from repo root
const require = createRequire(import.meta.url);
try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.join(ROOT, ".env") });
} catch {
  // dotenv not available — env vars must be set externally
}

// ─── Config ───────────────────────────────────────────────────────────────────

// No default. The old fallback was `sc-domain:waypointfranchise.com`, a property
// this account cannot see, so an unset variable produced an opaque 403 rather than
// a configuration error. Guessing a property identifier is exactly the thing that
// turns a misconfiguration into a mystery.
const SITE_URL = process.env.GSC_SITE_URL;
if (!SITE_URL) {
  console.error("❌ GSC_SITE_URL is not set.");
  console.error("   It must be the exact property identifier from Search Console,");
  console.error("   e.g. https://www.example.com/ for a URL-prefix property or");
  console.error("   sc-domain:example.com for a Domain property. The two are different");
  console.error("   properties with different data, so the spelling matters.");
  process.exit(1);
}
const DAYS_BACK = 28;

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getAuth() {
  // Prefer an on-disk key when one is configured; otherwise read the env var.
  // Both go through the same loader, which accepts raw JSON or base64 and
  // reports the specific reason it could not read a value. See
  // scripts/lib/load-service-account.mjs for why the reason never quotes it.
  const keyPath = process.env.GSC_SERVICE_ACCOUNT_PATH;
  let raw;
  let varName;

  if (keyPath) {
    varName = "GSC_SERVICE_ACCOUNT_PATH";
    try {
      raw = fs.readFileSync(keyPath, "utf-8");
    } catch {
      console.error(`❌ GSC_SERVICE_ACCOUNT_PATH points at ${keyPath}, which could not be read.`);
      process.exit(1);
    }
    console.log("   Auth: loading from file path");
  } else {
    varName = "GSC_SERVICE_ACCOUNT_KEY";
    raw = process.env.GSC_SERVICE_ACCOUNT_KEY;
  }

  const result = loadServiceAccount(raw, { varName });

  if (result.status === "missing") {
    console.error("❌ Neither GSC_SERVICE_ACCOUNT_PATH nor GSC_SERVICE_ACCOUNT_KEY is set.");
    console.error("   Add GSC_SERVICE_ACCOUNT_PATH=/path/to/credentials.json to your .env");
    process.exit(1);
  }

  if (result.status === "invalid") {
    reportCredentialFailure(result);
    process.exit(1);
  }

  if (!keyPath) console.log(`   Auth: loading from ${result.encoding} key in ${varName}`);

  return new google.auth.GoogleAuth({
    credentials: result.credentials,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
}


// ─── Date helpers ─────────────────────────────────────────────────────────────

// ─── GSC API calls ────────────────────────────────────────────────────────────

// Per-request ceiling allowed by the API, and our own stop so a large property
// cannot turn a monthly report into an unbounded crawl.
const PAGE_SIZE = 5000;
const MAX_ROWS = 25000;

/**
 * Fetch every row for a dimension, not just the first page.
 *
 * The API has no orderBy: it returns rows by clicks descending, ties broken by
 * key. With few clicks nearly everything ties, so a single small request comes
 * back in alphabetical order and silently stops partway through the alphabet.
 * The August report cut off at "bonkers corner franchise cost" and hid every
 * query after "b" — including whatever drives 299 impressions to /glossary.
 * Paging through the whole set and ordering it ourselves is the fix.
 */
async function query(searchconsole, dimensions) {
  const { startDate, endDate } = dateRange(DAYS_BACK);
  const rows = [];

  while (rows.length < MAX_ROWS) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions,
        rowLimit: PAGE_SIZE,
        startRow: rows.length,
        dataState: "final",
      },
    });
    const batch = res.data.rows || [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break; // last page
  }

  // A cap that silences itself is worse than no cap: the report would still be
  // headed "by Impressions" while missing rows the API never got round to
  // returning, and the API orders by clicks, so the omitted rows are not the
  // least interesting ones. Say so instead.
  rows.truncated = rows.length >= MAX_ROWS;
  return rows;
}

function fmt(n, decimals = 1) {
  return n == null ? "—" : Number(n).toFixed(decimals);
}

// ─── Report builder ───────────────────────────────────────────────────────────

function buildReport(pageRows, queryRows, queryPageRows, startDate, endDate) {
  const now = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const { articles, corePages } = splitPages(pageRows);

  const opportunities = selectOpportunities(pageRows);
  const lowCtr = selectLowCtr(pageRows);
  const poorlyRanked = selectPoorlyRanked(pageRows);

  // Derived from the configured property rather than hardcoded. The old literal
  // was the non-www origin, so once the property moved to www it stopped
  // matching and every row printed as a full URL.
  const slug = pathFor(SITE_URL);

  const tableRow = (r) =>
    `| ${cell(slug(r.keys[0])).padEnd(55)} | ${String(r.clicks).padStart(6)} | ${String(r.impressions).padStart(11)} | ${fmt(r.ctr * 100, 1)}% | ${fmt(r.position)} |`;

  const truncated = [pageRows, queryRows, queryPageRows].some((r) => r.truncated);

  const lines = [
    `# GSC Report — ${now}`,
    ``,
    `**Date range:** ${startDate} → ${endDate} (${DAYS_BACK} days)  `,
    `**Site:** ${SITE_URL}`,
    ``,
    `---`,
    ``,
    ...(truncated
      ? [
          `> ⚠️ **This report is incomplete.** At least one dimension hit the ${MAX_ROWS}-row fetch`,
          `> cap, so rows are missing. Search Console orders by clicks, not impressions, so the`,
          `> omitted rows are not necessarily the smallest ones and the tables below cannot be`,
          `> read as a complete ranking. Raise MAX_ROWS or segment the request by date.`,
          ``,
          `---`,
          ``,
        ]
      : []),
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Total clicks | ${pageRows.reduce((s, r) => s + r.clicks, 0)} |`,
    `| Total impressions | ${pageRows.reduce((s, r) => s + r.impressions, 0)} |`,
    // Weighted by impressions. The unweighted mean of per-page averages let a
    // single one-impression page at position 100 drag the headline as hard as a
    // 1,000-impression page at position 1, which is not what "average position"
    // means to anyone reading it.
    `| Average position | ${fmt(weightedPosition(pageRows))} |`,
    `| Pages with data | ${pageRows.length} |`,
    ``,
    `---`,
    ``,
    `> **Reading the position columns:** Search Console reports position as the *average* across a`,
    `> row's impressions. A page ranking 1st for one query and 111th for another averages to 12, so`,
    `> the bands below are a prompt to go look, not a statement of where a page sits. Pages can also`,
    `> appear in more than one table; that means more than one fix applies, not a contradiction.`,
    ``,
    `---`,
    ``,
    `## 🎯 Optimization Opportunities (Position 8–20)`,
    ``,
    opportunities.length === 0
      ? `_No pages in position 8–20 with enough impressions yet._`
      : [
          `These pages are close to top results but need a push. Check keyword prominence, internal links, and meta description.`,
          ``,
          `| URL | Clicks | Impressions | CTR | Position |`,
          `|---|---|---|---|---|`,
          ...opportunities.map(tableRow),
        ].join("\n"),
    ``,
    `---`,
    ``,
    `## ⚠️ Low CTR Pages (position ≤ 20, CTR < 2%)`,
    ``,
    lowCtr.length === 0
      ? `_No low-CTR pages with enough traffic yet._`
      : [
          `Ranked where people can see them, but not earning the click. Fix: rewrite the title tag or meta description.`,
          ``,
          `| URL | Clicks | Impressions | CTR | Position |`,
          `|---|---|---|---|---|`,
          ...lowCtr.map(tableRow),
        ].join("\n"),
    ``,
    `---`,
    ``,
    `## 📉 Ranking Too Low to Be Clicked (position > 20)`,
    ``,
    poorlyRanked.length === 0
      ? `_No pages earning impressions from beyond position 20._`
      : [
          `Earning impressions from well down the results. Rewriting the title will not help, because nobody is declining to click a result they never scrolled to. Fix: relevance, internal links, and depth.`,
          ``,
          `| URL | Clicks | Impressions | CTR | Position |`,
          `|---|---|---|---|---|`,
          ...poorlyRanked.map(tableRow),
        ].join("\n"),
    ``,
    `---`,
    ``,
    `## Article Pages`,
    ``,
    `| URL | Clicks | Impressions | CTR | Position |`,
    `|---|---|---|---|---|`,
    ...(articles.length > 0 ? articles.map(tableRow) : [`| _No article data yet_ | — | — | — | — |`]),
    ``,
    `---`,
    ``,
    `## Core Pages`,
    ``,
    `| URL | Clicks | Impressions | CTR | Position |`,
    `|---|---|---|---|---|`,
    ...(corePages.length > 0 ? corePages.map(tableRow) : [`| _No core page data yet_ | — | — | — | — |`]),
    ``,
    `---`,
    ``,
    `## Top Queries (by Impressions)`,
    ``,
    `| Query | Clicks | Impressions | CTR | Position |`,
    `|---|---|---|---|---|`,
    ...(queryRows.length > 0
      ? byImpressions(queryRows).slice(0, 30).map(r =>
          `| ${cell(r.keys[0]).padEnd(50)} | ${String(r.clicks).padStart(6)} | ${String(r.impressions).padStart(11)} | ${fmt(r.ctr * 100, 1)}% | ${fmt(r.position)} |`
        )
      : [`| _No query data yet_ | — | — | — | — |`]),
    ``,
    `---`,
    ``,
    // Without this section the two tables above are unjoinable: GSC returns
    // ["page"] and ["query"] as independent aggregations, so pairing a query
    // with the page that served it was pure inference. The August review
    // published such a pairing as if it were measured, which is the mistake
    // this section exists to stop.
    `## Which Page Serves Which Query`,
    ``,
    `_Pulled with the ["query","page"] dimension pair, so this is measured rather than inferred._`,
    ``,
    `| Query | Page | Impressions | Position |`,
    `|---|---|---|---|`,
    ...(queryPageRows.length > 0
      ? byImpressions(queryPageRows).slice(0, 30).map(r =>
          `| ${cell(r.keys[0]).padEnd(40)} | ${cell(slug(String(r.keys[1])))} | ${String(r.impressions).padStart(11)} | ${fmt(r.position)} |`
        )
      : [`| _No query/page data yet_ | — | — | — |`]),
    ``,
    `---`,
    ``,
    `## Next Actions`,
    ``,
    `- [ ] Review optimization opportunities above and update those article files`,
    `- [ ] Rewrite meta descriptions for low-CTR pages`,
    `- [ ] Run \`node scripts/ai-citation-check.mjs\` to check AI citation status`,
    `- [ ] Review and schedule social drafts from \`content/social/\``,
    ``,
  ];

  return lines.join("\n");
}

// Sitemap submission used to live here. It could never have worked: getAuth()
// requests the webmasters.readonly scope, so every run printed
// "Sitemap submission failed: Request had insufficient authentication scopes"
// and carried on. This script only reads. Submission belongs to
// .github/scripts/submit-sitemap.mjs, which asks for the write scope and runs on
// deploy rather than once a month.

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("📊 Pulling Google Search Console data...\n");

  const auth = getAuth();
  const searchconsole = google.searchconsole({ version: "v1", auth });

  const { startDate, endDate } = dateRange(DAYS_BACK);

  const [pageRows, queryRows, queryPageRows] = await Promise.all([
    query(searchconsole, ["page"]),
    query(searchconsole, ["query"]),
    // The join. Without it, pairing a query with its landing page is guesswork.
    query(searchconsole, ["query", "page"]),
  ]);

  console.log(`   Pages with data: ${pageRows.length}`);
  console.log(`   Queries with data: ${queryRows.length}`);

  const report = buildReport(pageRows, queryRows, queryPageRows, startDate, endDate);

  // Save to docs/seo-reviews/YYYY-MM/
  // Same UTC-only rule as dateRange(). Taken from toISOString rather than local
  // parts so a 31 August evening run cannot file itself under September.
  const monthFolder = new Date().toISOString().slice(0, 7);
  const outDir = path.join(ROOT, "docs", "seo-reviews", monthFolder);
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "gsc-report.md");
  fs.writeFileSync(outPath, report, "utf-8");
  console.log(`\n✅ Report saved to: docs/seo-reviews/${monthFolder}/gsc-report.md`);

  console.log("\nDone. Open the report and run the optimization workflow.");
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
