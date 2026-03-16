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
 *   GSC_SERVICE_ACCOUNT_KEY   Base64-encoded JSON service account credentials
 *   GSC_SITE_URL              Site URL exactly as it appears in GSC (e.g. sc-domain:waypointfranchise.com)
 */

import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── Config ───────────────────────────────────────────────────────────────────

const SITE_URL = process.env.GSC_SITE_URL || "sc-domain:waypointfranchise.com";
const DAYS_BACK = 28;

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getAuth() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    console.error("❌ GSC_SERVICE_ACCOUNT_KEY is not set.");
    console.error("   See docs/seo-reviews/SETUP.md for setup instructions.");
    process.exit(1);
  }
  const credentials = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  return new google.auth.GoogleAuth({
    credentials,
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

// ─── Sitemap ping ─────────────────────────────────────────────────────────────

async function pingSitemap() {
  const url = "https://www.google.com/ping?sitemap=https://waypointfranchise.com/sitemap.xml";
  try {
    const res = await fetch(url);
    if (res.ok) {
      console.log("✅ Sitemap pinged to Google");
    } else {
      console.log(`⚠️  Sitemap ping returned ${res.status}`);
    }
  } catch (e) {
    console.log(`⚠️  Sitemap ping failed: ${e.message}`);
  }
}

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

  // Ping sitemap while we're here
  await pingSitemap();

  console.log("\nDone. Open the report and run the optimization workflow.");
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
