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
import { createRequire } from "module";

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

const SITE_SIGNALS = [
  "waypointfranchise.com",
  "waypoint franchise",
  "kelsey stuart",
];

// Tracked competitor / peer franchise-advisory signals used to compute a
// Share-of-Voice DENOMINATOR. This is a *tracked-set* SOV, not an absolute one:
// it measures Waypoint's share among the named advisors we explicitly watch,
// plus any others detected in the same answer. NOTE: FranChoice is intentionally
// NOT listed — Waypoint is a FranChoice affiliate, not a competitor. Edit this
// list as the competitive set changes.
const COMPETITOR_SIGNALS = [
  "frannet",
  "franchise brokers association",
  "the franchise consulting company",
  "ifranchise",
  "franchise sidekick",
  "franchise.com",
  "franchisegator",
  "franchise gator",
  "the entrepreneur's source",
  "entrepreneur source",
  "frandata",
];

const TEST_QUERIES = [
  // Core definitional / informational intent (original 8)
  "What does a franchise consultant do?",
  "How much does it cost to buy a franchise?",
  "What is an FDD in franchising?",
  "What is a semi-absentee franchise?",
  "Best home services franchises to buy",
  "How to finance a franchise",
  "Is franchise ownership passive income?",
  "What are red flags when buying a franchise?",
  // Decision / advisor-selection intent — where being the cited advisor matters
  "Should I use a franchise consultant or buy a franchise directly?",
  "Who can help me choose the right franchise for my goals and budget?",
  "Is it worth talking to a franchise consultant before buying?",
  "How do I find a trustworthy franchise consultant?",
  // High-consideration, conversational fan-out queries (AI Mode style)
  "I am leaving my corporate job and want a semi-absentee franchise under $250,000. Where do I start?",
  "How do I know if a franchise is a good fit for me?",
  "What questions should I ask a franchisee before buying?",
  "How long does it take to buy a franchise from start to finish?",
];

// ─── Response analysis: citation + Share of Voice ───────────────────────────────

function checkCitation(responseText) {
  const lower = responseText.toLowerCase();
  for (const signal of SITE_SIGNALS) {
    if (lower.includes(signal.toLowerCase())) {
      return { cited: true, signal };
    }
  }
  return { cited: false, signal: null };
}

/**
 * Analyze a single AI response for Share of Voice.
 *
 * Returns whether Waypoint was named, which tracked competitors were named, the
 * total number of distinct advisors named in the answer (the denominator), and
 * Waypoint's share for that answer (1 / advisorsNamed when present, else 0).
 */
function analyzeResponse(responseText) {
  const { cited, signal } = checkCitation(responseText);
  const lower = responseText.toLowerCase();
  const competitors = COMPETITOR_SIGNALS.filter((c) => lower.includes(c));
  // Distinct advisors named = (Waypoint if present) + distinct competitors.
  const advisorsNamed = (cited ? 1 : 0) + competitors.length;
  const share = cited && advisorsNamed > 0 ? 1 / advisorsNamed : 0;
  return { cited, signal, competitors, advisorsNamed, share };
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
  return { text, ...analyzeResponse(text) };
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
  return { text, ...analyzeResponse(text) };
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
  return { text, ...analyzeResponse(text) };
}

// ─── Report builder ───────────────────────────────────────────────────────────

// Aggregate Share of Voice across all non-skipped responses (all engines).
// presenceSOV = answers naming Waypoint / answers naming ANY tracked advisor.
// avgShare    = mean of per-answer share (1/advisorsNamed) over those answers.
function computeSOV(results) {
  let answersWithAnyAdvisor = 0;
  let waypointPresent = 0;
  let shareSum = 0;
  for (const r of results) {
    for (const data of [r.openai, r.perplexity, r.gemini]) {
      if (!data || data.skipped) continue;
      if ((data.advisorsNamed ?? 0) > 0) {
        answersWithAnyAdvisor += 1;
        shareSum += data.share ?? 0;
        if (data.cited) waypointPresent += 1;
      }
    }
  }
  const presenceSOV = answersWithAnyAdvisor > 0 ? waypointPresent / answersWithAnyAdvisor : 0;
  const avgShare = answersWithAnyAdvisor > 0 ? shareSum / answersWithAnyAdvisor : 0;
  return { answersWithAnyAdvisor, waypointPresent, presenceSOV, avgShare };
}

const pct = (n) => `${Math.round(n * 100)}%`;

function buildReport(results, now) {
  const totalChecks = results.length * 3;
  const citationCount = results.reduce((sum, r) => {
    return sum + [r.openai, r.perplexity, r.gemini].filter(x => x?.cited).length;
  }, 0);
  const sov = computeSOV(results);
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
    `**Citation hits:** ${citationCount} of ${totalChecks - skippedTools.size * results.length} checks (${skippedTools.size > 0 ? `${skippedTools.size} tool(s) skipped: ${[...skippedTools].join(", ")}` : "all tools active"})  `,
    `**Share of Voice:** ${pct(sov.presenceSOV)} presence (${sov.waypointPresent}/${sov.answersWithAnyAdvisor} answers that named any tracked advisor), ${pct(sov.avgShare)} average share`,
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
  lines.push(`## Share of Voice`);
  lines.push(``);
  lines.push(`_Tracked-set Share of Voice: Waypoint's presence among the named franchise advisors we watch (see \`COMPETITOR_SIGNALS\` in the script). This is a directional proxy, not an absolute market share — answers may name advisors outside the tracked set, which are not counted in the denominator._`);
  lines.push(``);
  lines.push(`- **Presence SOV:** ${pct(sov.presenceSOV)} — Waypoint was named in ${sov.waypointPresent} of ${sov.answersWithAnyAdvisor} answers that named at least one tracked advisor.`);
  lines.push(`- **Average share:** ${pct(sov.avgShare)} — average of (1 / advisors named) across those answers. Higher means Waypoint is named alongside fewer competitors.`);
  lines.push(``);
  lines.push(`| Query | GPT-4o | Perplexity | Gemini |`);
  lines.push(`|---|---|---|---|`);
  const cell = (d) => {
    if (!d || d.skipped) return "⏭️";
    if (d.cited) return `✅ 1/${d.advisorsNamed}`;
    if ((d.advisorsNamed ?? 0) > 0) return `❌ 0/${d.advisorsNamed}`;
    return "·";
  };
  for (const r of results) {
    lines.push(`| ${r.query} | ${cell(r.openai)} | ${cell(r.perplexity)} | ${cell(r.gemini)} |`);
  }
  lines.push(``);
  lines.push(`_Cell shows Waypoint's share for that answer: \`1/N\` = named alongside N total advisors; \`0/N\` = competitors named but not Waypoint; \`·\` = no advisor named._`);
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
  lines.push(``);
  lines.push(`**On Share of Voice:** raising presence SOV means getting named at all on advisor-selection queries; raising average share means getting named with fewer competitors crowding the answer. Both improve with stronger E-E-A-T signals, original first-party data, and off-site authority that AI engines synthesize from.`);

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
