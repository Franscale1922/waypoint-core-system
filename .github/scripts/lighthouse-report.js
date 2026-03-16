// Lighthouse Quarterly Audit Script
// Runs Lighthouse on key pages, formats results, and emails via Resend.
// Triggered by .github/workflows/quarterly-audit.yml

const { execSync } = require("child_process");
const fs = require("fs");
const https = require("https");

const PAGES = [
  { name: "/ (Home)", url: "https://www.waypointfranchise.com/" },
  { name: "/about", url: "https://www.waypointfranchise.com/about" },
  { name: "/process", url: "https://www.waypointfranchise.com/process" },
  { name: "/resources", url: "https://www.waypointfranchise.com/resources" },
  { name: "/faq", url: "https://www.waypointfranchise.com/faq" },
];

const REPORT_PATH = "/tmp/lh-report.json";
const EMAIL_PATH = "/tmp/lh-email.html";
const CHROMIUM = process.env.CHROMIUM_PATH || "chromium-browser";

// ─── Run Lighthouse on each page ───────────────────────────────────────────

function auditPage(url) {
  console.log(`  Auditing ${url}...`);
  try {
    execSync(
      [
        `lighthouse "${url}"`,
        `--output=json`,
        `--output-path=${REPORT_PATH}`,
        `--chrome-flags="--headless --no-sandbox --disable-gpu --disable-dev-shm-usage"`,
        `--only-categories=performance,accessibility,best-practices,seo`,
        `--quiet`,
        `--chrome-path=${CHROMIUM}`,
      ].join(" "),
      { stdio: "pipe" }
    );

    const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
    return {
      perf: Math.round(report.categories.performance.score * 100),
      a11y: Math.round(report.categories.accessibility.score * 100),
      bp: Math.round(report.categories["best-practices"].score * 100),
      seo: Math.round(report.categories.seo.score * 100),
      lcp: report.audits["largest-contentful-paint"].displayValue,
      fcp: report.audits["first-contentful-paint"].displayValue,
      tbt: report.audits["total-blocking-time"].displayValue,
    };
  } catch (e) {
    console.error(`  ⚠️  Failed to audit ${url}: ${e.message}`);
    return null;
  }
}

// ─── Format results as HTML email ──────────────────────────────────────────

function scoreEmoji(n) {
  if (n === null) return "⚠️";
  if (n >= 90) return "🟢";
  if (n >= 50) return "🟡";
  return "🔴";
}

function scoreColor(n) {
  if (n === null) return "#999";
  if (n >= 90) return "#16a34a";
  if (n >= 50) return "#d97706";
  return "#dc2626";
}

function buildEmail(results, date) {
  const rows = results
    .map(({ page, data }) => {
      if (!data) {
        return `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #f0ebe3;font-size:14px;">${page.name}</td>
            <td colspan="6" style="padding:10px 14px;border-bottom:1px solid #f0ebe3;color:#dc2626;font-size:13px;">Audit failed — check the Actions log</td>
          </tr>`;
      }
      const td = (val, isNum = true) => {
        const color = isNum ? scoreColor(val) : "#1a1a1a";
        const weight = isNum ? "700" : "400";
        return `<td style="padding:10px 14px;border-bottom:1px solid #f0ebe3;text-align:${isNum ? "center" : "left"};font-size:14px;color:${color};font-weight:${weight};">${isNum ? `${scoreEmoji(val)} ${val}` : val}</td>`;
      };
      return `<tr>${td(page.name, false)}${td(data.perf)}${td(data.a11y)}${td(data.bp)}${td(data.seo)}${td(data.lcp, false)}${td(data.fcp, false)}</tr>`;
    })
    .join("\n");

  // Check for any scores below 90
  const warnings = results
    .filter((r) => r.data)
    .flatMap(({ page, data }) => {
      const flags = [];
      if (data.perf < 90) flags.push(`${page.name} Performance: ${data.perf}`);
      if (data.a11y < 95) flags.push(`${page.name} Accessibility: ${data.a11y}`);
      if (data.seo < 95) flags.push(`${page.name} SEO: ${data.seo}`);
      return flags;
    });

  const warningBlock =
    warnings.length > 0
      ? `<div style="background:#fff8ec;border-left:4px solid #d97706;padding:14px 18px;margin:24px 0;border-radius:4px;">
          <p style="margin:0 0 8px;font-weight:600;color:#92400e;">⚠️ Action needed</p>
          <ul style="margin:0;padding-left:20px;color:#78350f;font-size:14px;">${warnings.map((w) => `<li>${w}</li>`).join("")}</ul>
        </div>`
      : `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 18px;margin:24px 0;border-radius:4px;">
          <p style="margin:0;color:#15803d;font-weight:600;">✅ All scores healthy — no action needed this quarter.</p>
        </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#faf8f4;margin:0;padding:0;">
  <div style="max-width:680px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06);">

    <div style="background:#0c1929;padding:32px 40px;">
      <p style="margin:0 0 4px;font-size:11px;color:#d4a55a;text-transform:uppercase;letter-spacing:0.15em;font-weight:600;">Waypoint Franchise Advisors</p>
      <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">Quarterly PageSpeed Report</h1>
      <p style="margin:8px 0 0;font-size:13px;color:#718096;">${date} · Lighthouse 13 · Mobile + Desktop Emulated</p>
    </div>

    <div style="padding:32px 40px;">
      ${warningBlock}

      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead>
          <tr style="background:#f5f0e8;">
            <th style="padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7a6a55;font-weight:600;">Page</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7a6a55;font-weight:600;">Perf</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7a6a55;font-weight:600;">A11y</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7a6a55;font-weight:600;">BP</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7a6a55;font-weight:600;">SEO</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7a6a55;font-weight:600;">LCP</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7a6a55;font-weight:600;">FCP</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #f0ebe3;">
        <a href="https://pagespeed.web.dev/analysis?url=https://www.waypointfranchise.com/" 
           style="display:inline-block;background:#d4a55a;color:#0c1929;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:600;">
          Re-run on PageSpeed Insights →
        </a>
      </div>

      <p style="margin-top:24px;font-size:12px;color:#b0a899;line-height:1.6;">
        This report runs automatically on the 15th of March, June, September, and December.<br>
        To run it manually: GitHub repo → Actions → <em>Quarterly PageSpeed Audit</em> → Run workflow.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Write report to disk (emailed by the workflow via Gmail SMTP) ─────────

function writeReport(html, date) {
  fs.writeFileSync(EMAIL_PATH, html, "utf8");
  console.log(`  ✅ Report written to ${EMAIL_PATH}`);

  // Export date to GitHub env so the workflow can use it in the email subject
  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `AUDIT_DATE=${date}\n`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  console.log(`\n🔍 Waypoint Quarterly PageSpeed Audit — ${date}\n`);

  const results = PAGES.map((page) => ({
    page,
    data: auditPage(page.url),
  }));

  console.log("\n📊 Results:");
  results.forEach(({ page, data }) => {
    if (data) {
      console.log(`  ${page.name}: Perf ${data.perf} | A11y ${data.a11y} | LCP ${data.lcp}`);
    } else {
      console.log(`  ${page.name}: ❌ FAILED`);
    }
  });

  console.log("\n📝 Writing HTML report...");
  const html = buildEmail(results, date);
  writeReport(html, date);

  console.log("\n✅ Audit complete — email will be sent by workflow.\n");
}

main().catch((err) => {
  console.error("❌ Audit failed:", err.message);
  process.exit(1);
});

