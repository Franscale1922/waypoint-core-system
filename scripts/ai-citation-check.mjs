#!/usr/bin/env node
/**
 * ai-citation-check.mjs
 *
 * Queries OpenAI (GPT-4o), Perplexity, and Google Gemini with 8 franchise
 * questions and checks whether Waypoint Franchise Advisors or Kelsey Stuart
 * is cited. Saves a dated markdown report.
 *
 * USAGE:
 *   node scripts/ai-citation-check.mjs
 *
 * ENV VARS:
 *   OPENAI_API_KEY        Required — already in .env
 *   PERPLEXITY_API_KEY    Optional — get free key at perplexity.ai/api
 *   GEMINI_API_KEY        Optional — get key at aistudio.google.com
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── Config ───────────────────────────────────────────────────────────────────

const SITE_SIGNALS = [
  "waypointfranchise.com",
  "waypoint franchise",
  "kelsey stuart",
];

const TEST_QUERIES = [
  "What does a franchise consultant do?",
  "How much does it cost to buy a franchise?",
  "What is an FDD in franchising?",
  "What is a semi-absentee franchise?",
  "Best home services franchises to buy",
  "How to finance a franchise",
  "Is franchise ownership passive income?",
  "What are red flags when buying a franchise?",
];

// ─── Citation check ───────────────────────────────────────────────────────────

function checkCitation(responseText) {
  const lower = responseText.toLowerCase();
  for (const signal of SITE_SIGNALS) {
    if (lower.includes(signal.toLowerCase())) {
      return { cited: true, signal };
    }
  }
  return { cited: false, signal: null };
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function queryOpenAI(question) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { skipped: true, reason: "OPENAI_API_KEY not set" };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: question }],
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { skipped: true, reason: `API error ${res.status}: ${err.slice(0, 100)}` };
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return { text, ...checkCitation(text) };
}

// ─── Perplexity ───────────────────────────────────────────────────────────────

async function queryPerplexity(question) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return { skipped: true, reason: "PERPLEXITY_API_KEY not set — add to .env to enable" };

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [{ role: "user", content: question }],
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { skipped: true, reason: `API error ${res.status}: ${err.slice(0, 100)}` };
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return { text, ...checkCitation(text) };
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function queryGemini(question) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { skipped: true, reason: "GEMINI_API_KEY not set — add to .env to enable" };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 500 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return { skipped: true, reason: `API error ${res.status}: ${err.slice(0, 100)}` };
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return { text, ...checkCitation(text) };
}

// ─── Report builder ───────────────────────────────────────────────────────────

function buildReport(results, now) {
  const totalChecks = results.length * 3;
  const citationCount = results.reduce((sum, r) => {
    return sum + [r.openai, r.perplexity, r.gemini].filter(x => x?.cited).length;
  }, 0);
  const skippedTools = new Set();
  results.forEach(r => {
    if (r.openai?.skipped) skippedTools.add("OpenAI");
    if (r.perplexity?.skipped) skippedTools.add("Perplexity");
    if (r.gemini?.skipped) skippedTools.add("Gemini");
  });

  const emojiFor = (result) => {
    if (result?.skipped) return "⏭️";
    if (result?.cited) return "✅";
    return "❌";
  };

  const lines = [
    `# AI Citation Check — ${now}`,
    ``,
    `**Signals checked:** ${SITE_SIGNALS.join(", ")}  `,
    `**Citation hits:** ${citationCount} of ${totalChecks - skippedTools.size * results.length} checks (${skippedTools.size > 0 ? `${skippedTools.size} tool(s) skipped: ${[...skippedTools].join(", ")}` : "all tools active"})`,
    ``,
  ];

  if (skippedTools.size > 0) {
    lines.push(`> **Note:** Some tools were skipped due to missing API keys. See \`docs/seo-reviews/SETUP.md\` to enable them.`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Results`);
  lines.push(``);
  lines.push(`| Query | GPT-4o | Perplexity | Gemini | Signal found |`);
  lines.push(`|---|---|---|---|---|`);

  for (const r of results) {
    const signal =
      r.openai?.signal || r.perplexity?.signal || r.gemini?.signal || "—";
    lines.push(
      `| ${r.query} | ${emojiFor(r.openai)} | ${emojiFor(r.perplexity)} | ${emojiFor(r.gemini)} | \`${signal}\` |`
    );
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Response Excerpts`);
  lines.push(``);
  lines.push(`_First 300 characters of each AI response, for review._`);
  lines.push(``);

  for (const r of results) {
    lines.push(`### "${r.query}"`);
    lines.push(``);
    for (const [tool, data] of [["GPT-4o", r.openai], ["Perplexity", r.perplexity], ["Gemini", r.gemini]]) {
      if (data?.skipped) {
        lines.push(`**${tool}:** ⏭️ _Skipped — ${data.reason}_`);
      } else {
        const excerpt = (data?.text || "").slice(0, 300).replace(/\n/g, " ");
        const badge = data?.cited ? "✅ **CITED**" : "❌ Not cited";
        lines.push(`**${tool}:** ${badge}  `);
        lines.push(`> ${excerpt}${(data?.text || "").length > 300 ? "..." : ""}`);
      }
      lines.push(``);
    }
    lines.push(`---`);
    lines.push(``);
  }

  lines.push(`## Interpretation`);
  lines.push(``);
  lines.push(`- **✅ Cited** — Waypoint or Kelsey Stuart appeared in the AI response. Good.`);
  lines.push(`- **❌ Not cited** — The AI answered without referencing Waypoint. Note which queries these are — the articles covering those topics may need stronger AEO signals:`);
  lines.push(`  - Ensure the article's first paragraph directly answers the question in 2–3 sentences`);
  lines.push(`  - Ensure the \`faqs\` frontmatter block is present and the answers are complete, standalone sentences`);
  lines.push(`  - Ensure the article has inbound internal links from at least 2 other articles`);
  lines.push(`- **⏭️ Skipped** — API key not configured. Add to \`.env\` to enable.`);

  return lines.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  console.log(`🤖 AI Citation Check — ${now}\n`);
  console.log(`   Checking ${TEST_QUERIES.length} queries across GPT-4o, Perplexity, Gemini...\n`);

  const results = [];

  for (const query of TEST_QUERIES) {
    process.stdout.write(`   "${query.slice(0, 50)}..." `);

    const [openai, perplexity, gemini] = await Promise.all([
      queryOpenAI(query),
      queryPerplexity(query),
      queryGemini(query),
    ]);

    const anyHit = [openai, perplexity, gemini].some(r => r?.cited);
    console.log(anyHit ? "✅" : "❌");

    results.push({ query, openai, perplexity, gemini });
  }

  const report = buildReport(results, now);

  const monthFolder = new Date().toISOString().slice(0, 7);
  const outDir = path.join(ROOT, "docs", "seo-reviews", monthFolder);
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "ai-citation-check.md");
  fs.writeFileSync(outPath, report, "utf-8");

  console.log(`\n✅ Report saved to: docs/seo-reviews/${monthFolder}/ai-citation-check.md`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
