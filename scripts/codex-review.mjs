/**
 * codex-review.mjs — run a hardened, user-invoked Codex adversarial review.
 *
 * Why this exists: calling `codex exec` safely requires ~12 flags that were each
 * verified individually (see .claude/tool-evaluations.md §11 E-O). Retyping them
 * by hand is how the containment quietly breaks — one wrong flag reopens web
 * egress or the hosted GitHub/Drive write connectors. This encodes them once.
 *
 * Design borrowed from the "claudex" build-prompts pack (§11-O): per-round
 * reviewer personas, a machine-checkable findings contract, and bounded rounds.
 * The transport is NOT borrowed — that pack uses
 * --dangerously-bypass-approvals-and-sandbox, which this deliberately does not.
 *
 * Usage:
 *   node scripts/codex-review.mjs --target <path> [--round N] [--out DIR] [--dry-run]
 *   node scripts/codex-review.mjs --diff [--round N]
 *
 * Exit codes: 0 ok · 1 usage/precondition failure · 2 codex call failed
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

/** Reviewer persona per round. Round 4+ deepens rather than going generic. */
const PERSONAS = {
  1: {
    label: "Senior-engineer review",
    stanza:
      "You are a skeptical senior engineer. Hunt for design flaws, broken assumptions, " +
      "ambiguous specifications, and places the stated approach will not survive contact " +
      "with real inputs. Assume the work is wrong until the code proves otherwise.",
  },
  2: {
    label: "Security and data-integrity review",
    stanza:
      "You are a security and data-integrity reviewer. Focus on authentication and " +
      "authorization gaps, input validation, race conditions, partial-failure recovery, " +
      "secret handling, audit trails, and any path that can silently lose or corrupt data.",
  },
  3: {
    label: "Ops and SRE review",
    stanza:
      "You are an ops/SRE reviewer. Focus on rollback safety, observability, gradual " +
      "rollout, version skew between deployed and local state, and on-call ergonomics " +
      "when this fails at 3am.",
  },
};

/**
 * Findings come back on stdout between these markers rather than as a file Codex
 * writes itself: --sandbox read-only blocks every write, so a file-writing
 * contract cannot be satisfied without giving up the sandbox. The script writes
 * the file locally instead, which keeps read-only intact AND keeps the token
 * economy (Claude reads the small file, never the transcript).
 */
const FINDINGS_BEGIN = "<<<CODEX_FINDINGS_BEGIN>>>";
const FINDINGS_END = "<<<CODEX_FINDINGS_END>>>";

function personaForRound(round) {
  if (round <= 3) return PERSONAS[round];
  return {
    label: `Deepened review (round ${round})`,
    stanza:
      "You have already reviewed this from the engineering, security, and ops angles. " +
      "Do NOT restate earlier generic findings. Go deeper on the angles already raised: " +
      "find the second-order consequences and the cases the previous rounds only gestured at.",
  };
}

/**
 * Build the MCP strip flags from live config rather than a hard-coded list.
 * §11-K6: the Codex app rewrites config.toml, so a fixed list silently re-arms
 * when a new server appears. Derive it at invocation time instead.
 */
function mcpDisableFlags() {
  const res = spawnSync("codex", ["mcp", "list"], { encoding: "utf8" });
  if (res.status !== 0) {
    console.error("WARN: `codex mcp list` failed; falling back to the known server set.");
    return ["vidiq", "agentopus", "openaiDeveloperDocs", "node_repl", "computer-use"].flatMap(
      (n) => ["-c", `mcp_servers.${n}.enabled=false`],
    );
  }
  // Server names are the first token of each table row; skip headers and blanks.
  const names = new Set();
  for (const line of res.stdout.split("\n")) {
    const m = line.match(/^([A-Za-z][\w.-]*)\s{2,}/);
    if (m && !["Name", "Command", "Url"].includes(m[1])) names.add(m[1]);
  }
  if (names.size === 0) {
    console.error("WARN: parsed zero MCP servers from `codex mcp list` — check its output format.");
  }
  return [...names].flatMap((n) => ["-c", `mcp_servers.${n}.enabled=false`]);
}

/**
 * The verified hardened invocation. Each flag traces to a probe in §11:
 *   --sandbox read-only ......... writes blocked (E). NOT a read or egress control.
 *   web_search="disabled" ....... web egress closed, verified behaviourally (G-bis).
 *   --disable apps .............. removes hosted GitHub/Drive WRITE connectors (F, K2).
 *                                 Single most load-bearing flag here.
 *   mcp_servers.*.enabled=false . config-declared MCP servers (E). Note `mcp_servers={}`
 *                                 is a SILENT NO-OP — never use that form (E).
 *   model_verbosity / summary ... delegated workers return findings, not prose (§11 config).
 * Belt-and-braces (no individual probe, see K5): browser_use*, in_app_browser,
 * computer_use, multi_agent, plugins, image_generation.
 */
function hardenedArgs() {
  return [
    "exec",
    "--sandbox", "read-only",
    "-c", 'web_search="disabled"',
    "-c", 'model_verbosity="low"',
    "-c", 'model_reasoning_summary="none"',
    ...mcpDisableFlags(),
    "--disable", "apps",
    "--disable", "browser_use",
    "--disable", "browser_use_external",
    "--disable", "browser_use_full_cdp_access",
    "--disable", "in_app_browser",
    "--disable", "computer_use",
    "--disable", "multi_agent",
    "--disable", "plugins",
    "--disable", "image_generation",
  ];
}

function buildPrompt({ persona, round, targetDesc, findingsPath, scopeNote }) {
  return `${persona.stanza}

You are reviewing: ${targetDesc}

${scopeNote}

Review it adversarially. Find real defects, not style preferences. For each finding give a
concrete failure scenario — specific inputs or state leading to a specific wrong outcome.
Cite file paths and line numbers. If you cannot demonstrate how something actually breaks,
do not report it.

CRITICAL OUTPUT REQUIREMENT: you are running in a read-only sandbox and CANNOT write files —
do not try. Instead, end your response by printing a clean summary of just the findings to
stdout, wrapped in these exact marker lines:

${FINDINGS_BEGIN}
# Round ${round} findings

## High
- <description> (<recommendation>)

## Medium
- <description> (<recommendation>)

## Low
- <description> (<recommendation>)
${FINDINGS_END}

Omit any severity section that has no entries. If there is nothing material to report, the
block must contain exactly:

${FINDINGS_BEGIN}
# Round ${round} findings

No substantive findings.
${FINDINGS_END}

The marker lines must appear on their own lines, exactly as written.`;
}

/** Count bullets per severity so the caller can see the trajectory across rounds. */
function severityCounts(file) {
  if (!fs.existsSync(file)) return { high: 0, medium: 0, low: 0, missing: true };
  const counts = { high: 0, medium: 0, low: 0 };
  let section = null;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const h = line.match(/^##\s+(High|Medium|Low)\s*$/i);
    if (h) { section = h[1].toLowerCase(); continue; }
    if (section && /^\s*-\s+\S/.test(line)) counts[section]++;
  }
  return { ...counts, missing: false };
}

function parseArgs(argv) {
  const args = { round: 1, out: ".codex-reviews", dryRun: false, diff: false, target: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") args.target = argv[++i];
    else if (a === "--round") args.round = parseInt(argv[++i], 10);
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--diff") args.diff = true;
    else if (a === "--dry-run") args.dryRun = true;
    else { console.error(`Unknown argument: ${a}`); return null; }
  }
  if (!args.target && !args.diff) {
    console.error("Specify --target <path> or --diff.");
    return null;
  }
  if (!Number.isInteger(args.round) || args.round < 1) {
    console.error("--round must be a positive integer.");
    return null;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) process.exit(1);

  // Scope guard. This is a REVIEW-SCOPE guard, not containment: §11-H established
  // that reads are disk-wide regardless of working directory, so nothing here can
  // stop a determined worker reading elsewhere. It prevents the ordinary mistake of
  // aiming the brief straight at a secrets file.
  if (args.target) {
    const abs = path.resolve(args.target);
    if (!fs.existsSync(abs)) {
      console.error(`Target does not exist: ${abs}`);
      process.exit(1);
    }
    if (/(^|\/)\.env(\.|$)/.test(abs)) {
      console.error("Refusing: target looks like an environment/secrets file.");
      process.exit(1);
    }
  }

  const persona = personaForRound(args.round);
  const outDir = path.resolve(REPO_ROOT, args.out);
  fs.mkdirSync(outDir, { recursive: true });
  const findingsPath = path.join(outDir, `findings-round-${args.round}.md`);

  const targetDesc = args.diff
    ? "the current uncommitted diff in this repository (run `git diff` to see it)"
    : `the file or directory at ${path.resolve(args.target)}`;

  const scopeNote =
    "SCOPE: review only public, non-sensitive source material. Do not read, open, print, " +
    "or quote any .env file, credential, API key, candidate personal data, or franchisor " +
    "confidential document. If the task appears to require any of those, stop and say so " +
    "instead of proceeding.";

  const prompt = buildPrompt({ persona, round: args.round, targetDesc, findingsPath, scopeNote });
  const codexArgs = hardenedArgs();

  console.log(`Round ${args.round} — ${persona.label}`);
  console.log(`Findings will be written to: ${findingsPath}`);

  if (args.round > 1) {
    const prev = severityCounts(path.join(outDir, `findings-round-${args.round - 1}.md`));
    console.log(
      prev.missing
        ? "Previous round: no findings file"
        : `Previous round: high=${prev.high} medium=${prev.medium} low=${prev.low}`,
    );
  }

  if (args.dryRun) {
    console.log("\n--- DRY RUN: command ---");
    console.log(["codex", ...codexArgs].join(" "));
    console.log("\n--- DRY RUN: prompt ---");
    console.log(prompt);
    return;
  }

  const res = spawnSync("codex", [...codexArgs, prompt], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });

  if (res.error) {
    console.error(`Failed to launch codex: ${res.error.message}`);
    process.exit(2);
  }
  if (res.status !== 0) {
    console.error(`codex exited ${res.status}`);
    if (res.stderr) console.error(res.stderr.slice(0, 2000));
    process.exit(2);
  }

  // Egress canary: any rmcp transport chatter means an MCP client dialled out
  // despite the strip. Surface it rather than let it pass silently (§11-A).
  const combined = `${res.stdout}\n${res.stderr}`;
  if (/rmcp::transport|streamable_http_client/.test(combined)) {
    console.error("WARN: MCP transport activity detected — the strip may not have applied.");
  }

  // Extract the findings block from stdout and write it ourselves.
  const begin = res.stdout.lastIndexOf(FINDINGS_BEGIN);
  const end = res.stdout.lastIndexOf(FINDINGS_END);
  if (begin === -1 || end === -1 || end < begin) {
    console.error(
      "WARN: Codex did not emit a findings block. It ignored the output contract; " +
        "read the transcript below rather than assuming there were no findings.",
    );
    console.log(res.stdout.slice(-4000));
    process.exit(2);
  }
  const body = res.stdout.slice(begin + FINDINGS_BEGIN.length, end).trim();
  fs.writeFileSync(findingsPath, `${body}\n`, "utf8");

  const counts = severityCounts(findingsPath);
  const clean = /No substantive findings\./.test(body);
  console.log(
    clean
      ? "\nResult: NO SUBSTANTIVE FINDINGS (loop may terminate)."
      : `\nResult: high=${counts.high} medium=${counts.medium} low=${counts.low}`,
  );
  console.log(`Read the findings file, not the transcript: ${findingsPath}`);
}

main();
