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
 *   GSC_SITE_URL              Site URL exactly as it appears in GSC (e.g. sc-domain:waypointfranchise.com)
 */

import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { loadServiceAccount, reportCredentialFailure } from "./lib/load-service-account.mjs";

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

const SITE_URL = process.env.GSC_SITE_URL || "sc-domain:waypointfranchise.com";
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

function toISO(date) {
  return date.toISOString().split("T")[0];
}

function dateRange() {
  const end = new Date();
  end.setDate(end.getDate() - 2); // GSC data lags 2 days
  const start = new Date(end);
  start.setDate(start.getDate() - DAYS_BACK);
  return { startDate: toISO(start), endDate: toISO(end) };
}

// ─── GSC API calls ────────────────────────────────────────────────────────────

async function query(searchconsole, dimensions, rowLimit = 50) {
  const { startDate, endDate } = dateRange();
  const res = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      dataState: "final",
    },
  });
  return res.data.rows || [];
}

function fmt(n, decimals = 1) {
  return n == null ? "—" : Number(n).toFixed(decimals);
}

// ─── Report builder ───────────────────────────────────────────────────────────

function buildReport(pageRows, queryRows, startDate, endDate) {
  const now = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  // Separate article pages from core pages
  const articles = pageRows.filter(r => r.keys[0].includes("/resources/") && !r.keys[0].endsWith("/resources/"));
  const corePages = pageRows.filter(r => !r.keys[0].includes("/resources/") || r.keys[0].endsWith("/resources/"));

  // Identify "low-hanging fruit" — position 8–20 with impressions > 50
  const opportunities = pageRows
    .filter(r => r.position >= 8 && r.position <= 20 && r.impressions >= 50)
    .sort((a, b) => b.impressions - a.impressions);

  // Identify low-CTR pages — impressions > 100, CTR < 0.02
  const lowCtr = pageRows
    .filter(r => r.impressions >= 100 && r.ctr < 0.02)
    .sort((a, b) => b.impressions - a.impressions);

  const slug = (url) => url.replace("https://waypointfranchise.com", "") || "/";

  const tableRow = (r) =>
    `| ${slug(r.keys[0]).padEnd(55)} | ${String(r.clicks).padStart(6)} | ${String(r.impressions).padStart(11)} | ${fmt(r.ctr * 100, 1)}% | ${fmt(r.position)} |`;

  const lines = [
    `# GSC Report — ${now}`,
    ``,
    `**Date range:** ${startDate} → ${endDate} (${DAYS_BACK} days)  `,
    `**Site:** ${SITE_URL}`,
    ``,
    `---`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Total clicks | ${pageRows.reduce((s, r) => s + r.clicks, 0)} |`,
    `| Total impressions | ${pageRows.reduce((s, r) => s + r.impressions, 0)} |`,
    `| Average position | ${fmt(pageRows.reduce((s, r) => s + r.position, 0) / (pageRows.length || 1))} |`,
    `| Pages with data | ${pageRows.length} |`,
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
    `## ⚠️ Low CTR Pages (impressions > 100, CTR < 2%)`,
    ``,
    lowCtr.length === 0
      ? `_No low-CTR pages with enough traffic yet._`
      : [
          `Ranking but not earning clicks. Fix: rewrite title tag or meta description.`,
          ``,
          `| URL | Clicks | Impressions | CTR | Position |`,
          `|---|---|---|---|---|`,
          ...lowCtr.map(tableRow),
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
      ? queryRows.slice(0, 30).map(r =>
          `| ${r.keys[0].padEnd(50)} | ${String(r.clicks).padStart(6)} | ${String(r.impressions).padStart(11)} | ${fmt(r.ctr * 100, 1)}% | ${fmt(r.position)} |`
        )
      : [`| _No query data yet_ | — | — | — | — |`]),
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

  const { startDate, endDate } = dateRange();

  const [pageRows, queryRows] = await Promise.all([
    query(searchconsole, ["page"], 100),
    query(searchconsole, ["query"], 50),
  ]);

  console.log(`   Pages with data: ${pageRows.length}`);
  console.log(`   Queries with data: ${queryRows.length}`);

  const report = buildReport(pageRows, queryRows, startDate, endDate);

  // Save to docs/seo-reviews/YYYY-MM/
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
