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
import {
  PINNED_CHAT_MODELS,
  orderChatModels,
  isModelNotFound,
} from "./lib/openai-models.mjs";

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

// Pinned list first, discovery only if every pinned name is rejected. See
// scripts/lib/openai-models.mjs for why this is deliberately not the Gemini
// "ask and take the newest" approach: OpenAI bills, and its newest tier is
// usually its priciest.
let openaiCandidates = [...PINNED_CHAT_MODELS];
let openaiIndex = 0;
let openaiLogged = false;
let openaiDiscoveryTried = false;

async function discoverOpenAIModels(key) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return [];
  const body = await res.json();
  return orderChatModels(body.data, { exclude: openaiCandidates });
}

async function queryOpenAI(question) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { skipped: true, reason: "OPENAI_API_KEY not set" };

  let res;
  let err = "";

  while (true) {
    if (openaiIndex >= openaiCandidates.length) {
      // Every pinned name was rejected. Ask what exists, cheapest tier first, and
      // say so loudly rather than changing cost tier in silence.
      if (openaiDiscoveryTried) break;
      openaiDiscoveryTried = true;
      const discovered = await discoverOpenAIModels(key);
      if (discovered.length === 0) break;
      console.log(
        `   OpenAI: every pinned model was rejected. Falling back to discovery, ` +
          `trying ${discovered.slice(0, 3).join(", ")}`,
      );
      openaiCandidates = openaiCandidates.concat(discovered);
    }

    const model = openaiCandidates[openaiIndex];
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: question }],
        max_tokens: 500,
      }),
    });

    if (res.ok) {
      if (!openaiLogged) {
        console.log(`   OpenAI model: ${model}`);
        openaiLogged = true;
      }
      break;
    }

    err = await res.text();
    // A bad key or exhausted quota is a real failure; only an unknown model name
    // is worth retrying with a different one.
    if (!isModelNotFound(res.status, err)) break;
    console.log(`   OpenAI model ${model} rejected, trying the next one`);
    openaiIndex += 1;
  }

  if (!res || !res.ok) {
    if (openaiIndex >= openaiCandidates.length) {
      return { skipped: true, reason: `no usable chat model found. Last response: ${err.slice(0, 300)}` };
    }
    return { skipped: true, reason: `API error ${res.status}: ${err.slice(0, 300)}` };
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return { text, ...analyzeResponse(text) };
}

// ─── Perplexity ───────────────────────────────────────────────────────────────

// Perplexity has no models endpoint to query, so this is the hand-maintained
// equivalent of the Gemini walk below: cheapest first, and a rejected name is
// stepped over rather than failing the provider. The old
// `llama-3.1-sonar-small-128k-online` belonged to a naming scheme Perplexity
// retired; keeping it last costs nothing and covers an account still on it.
const PERPLEXITY_MODELS = ["sonar", "sonar-pro", "llama-3.1-sonar-small-128k-online"];
let perplexityIndex = 0;
let perplexityLogged = false;

async function queryPerplexity(question) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return { skipped: true, reason: "PERPLEXITY_API_KEY not set — add to .env to enable" };

  let res;
  let err = "";
  while (perplexityIndex < PERPLEXITY_MODELS.length) {
    const model = PERPLEXITY_MODELS[perplexityIndex];
    res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: question }],
        max_tokens: 500,
      }),
    });

    if (res.ok) {
      if (!perplexityLogged) {
        console.log(`   Perplexity model: ${model}`);
        perplexityLogged = true;
      }
      break;
    }

    err = await res.text();
    // 400 is how Perplexity reports an unknown model; 404 for completeness.
    // Anything else (401 auth, 429 quota) is a real failure worth surfacing.
    if (res.status !== 400 && res.status !== 404) break;
    console.log(`   Perplexity model ${model} rejected, trying the next one`);
    perplexityIndex += 1;
  }

  if (!res || !res.ok) {
    if (perplexityIndex >= PERPLEXITY_MODELS.length) {
      return {
        skipped: true,
        // The permitted list is in the body and was being cut off at 100 chars,
        // which is why this took a docs lookup instead of reading the error.
        reason: `no known model accepted. Last response: ${err.slice(0, 300)}`,
      };
    }
    return { skipped: true, reason: `API error ${res.status}: ${err.slice(0, 300)}` };
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return { text, ...analyzeResponse(text) };
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

// Resolved once per run rather than hardcoded. The previous hardcoded
// `gemini-1.5-flash` was retired by Google, so every check returned 404 and was
// reported as a skipped tool — indistinguishable, in the summary, from a missing
// key. Asking the API which models exist means the next retirement does not
// silently blank this section.
let geminiCandidatesPromise = null;
let geminiIndex = 0;
let geminiLogged = false;

// The models endpoint lists names that are advertised but already retired --
// gemini-2.0-flash-lite-001 is listed and answers generateContent with
// "This model is no longer available". So this returns an ORDERED list and the
// caller walks it on 404 rather than trusting the first entry.
function geminiCandidates(key) {
  geminiCandidatesPromise ??= (async () => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (!res.ok) throw new Error(`model list unavailable (HTTP ${res.status})`);

    const names = ((await res.json()).models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      // Preview and experimental models come and go; a monthly job wants stable.
      .filter((n) => !/preview|exp|thinking|vision|embedding/i.test(n));

    const version = (n) => parseFloat((n.match(/(\d+\.\d+)/) ?? [0, "0"])[1]);
    const tier = (n) => (/flash-lite/i.test(n) ? 0 : /flash/i.test(n) ? 1 : 2);

    // Newest first, and within a version the cheaper tier first. Newest matters
    // more than cheapest here because the old ones are what get retired.
    const ordered = names.sort((a, b) => version(b) - version(a) || tier(a) - tier(b));

    if (ordered.length === 0) {
      throw new Error("no model supporting generateContent is available to this key");
    }
    return ordered;
  })();
  return geminiCandidatesPromise;
}

async function queryGemini(question) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { skipped: true, reason: "GEMINI_API_KEY not set — add to .env to enable" };

  let candidates;
  try {
    candidates = await geminiCandidates(key);
  } catch (e) {
    return { skipped: true, reason: `Gemini unavailable: ${e.message}` };
  }

  let res;
  let err = "";
  // Walk past any model that is advertised but retired. geminiIndex persists, so
  // this costs one wasted call per dead model per run, not per question.
  while (geminiIndex < candidates.length) {
    const model = candidates[geminiIndex];
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: question }] }],
          generationConfig: { maxOutputTokens: 500 },
        }),
      }
    );

    if (res.ok) {
      if (!geminiLogged) {
        console.log(`   Gemini model: ${model}`);
        geminiLogged = true;
      }
      break;
    }

    err = await res.text();
    if (res.status !== 404) break; // a real error, not a retired name
    console.log(`   Gemini model ${model} is retired, trying the next one`);
    geminiIndex += 1;
  }

  if (!res || !res.ok) {
    if (geminiIndex >= candidates.length) {
      return { skipped: true, reason: "every advertised Gemini model returned 404" };
    }
    return { skipped: true, reason: `API error ${res.status}: ${err.slice(0, 300)}` };
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
  // Kept alongside the set so the note can say WHY, not just which.
  const skippedReasons = new Map();

  // These reasons are upstream error bodies, and this report is committed to a
  // PUBLIC repo. OpenAI echoes the rejected key back in its 401 ("Incorrect API
  // key provided: sk-proj-...") -- partly masked by them, but a key prefix does
  // not belong in a public file. Strip anything key-shaped before it is written.
  const redactSecrets = (text) => {
    const cleaned = text
      .replace(/\s+/g, " ")
      .trim()
      // Provider key formats, then any long opaque token.
      .replace(/\b(sk|pplx|AIza|gsk)[-_][A-Za-z0-9_*-]{4,}/gi, "[redacted]")
      .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted]")
      .replace(/\*{4,}/g, "[redacted]");
    return cleaned.length > 160 ? `${cleaned.slice(0, 160)}...` : cleaned;
  };
  const noteSkip = (tool, result) => {
    if (!result?.skipped) return;
    skippedTools.add(tool);
    if (!skippedReasons.has(tool)) {
      skippedReasons.set(tool, redactSecrets(String(result.reason ?? "no reason given")));
    }
  };
  results.forEach((r) => {
    noteSkip("OpenAI", r.openai);
    noteSkip("Perplexity", r.perplexity);
    noteSkip("Gemini", r.gemini);
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
    // A tool skips for two very different reasons: no key configured, or the API
    // rejected the call. Reporting both as "missing API keys" cost real
    // debugging time -- all three providers were actually returning 401/400/404
    // (an expired key and two retired model names) while this note insisted the
    // keys were absent. Say which it is.
    const reasons = [...skippedReasons.entries()]
      .map(([tool, reason]) => `**${tool}** — ${reason}`)
      .join("; ");
    lines.push(`> **Note:** ${skippedTools.size} tool(s) did not run: ${reasons}`);
    lines.push(``);
    lines.push(
      `> An \`API error\` means the key is present but the call was rejected, commonly an` +
        ` expired key or a retired model name. That is a different fix from a missing key.`,
    );
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
