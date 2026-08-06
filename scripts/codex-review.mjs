/**
 * codex-review.mjs — run a hardened, user-invoked Codex adversarial review.
 *
 * PORTED from ~/Projects/waypoint-core-system/scripts/codex-review.mjs (2026-08-06) so that
 * CLAUDE.md's "where the repo has a wrapper, that wrapper is the only sanctioned call" is
 * satisfiable HERE. Before this existed, every Codex review in this repo was an unwrappered
 * hand-typed `codex exec`, which is exactly the failure mode the rule names.
 *
 * `hardenedArgs()` below is a BYTE-IDENTICAL port (verified by hashing the function body against
 * the source, 2026-08-06). Do not "tidy" it. Each flag traces to an individually-verified probe
 * recorded in ~/dotfiles/projects/tool-evaluations.md §11 E-O (machine-local, symlinked into some
 * repos as .claude/tool-evaluations.md; deliberately NOT vendored here). Retyping those flags by
 * hand is how the containment quietly breaks — one wrong flag reopens web egress or the hosted
 * GitHub/Drive WRITE connectors.
 *
 * ⚠ SEVEN DEFECTS INHERITED FROM THE SOURCE ARE FIXED HERE. They were found by pointing this
 * wrapper at itself on 2026-08-06 (Codex round 2, plus one found while investigating a false
 * canary). THE SOURCE STILL HAS ALL OF THEM — waypoint-core-system/scripts/codex-review.mjs
 * should be back-ported. Each fix is commented at its site; in severity order:
 *   1. `clean` used a SUBSTRING test, so any response merely containing "No substantive findings."
 *      reported clean. Observed live: a review with 4 High + 3 Medium printed "NO SUBSTANTIVE
 *      FINDINGS". The console lied about its own review. Now an exact match on the whole body.
 *   2. The egress canary scanned STDOUT, which carries the model's echo of the payload — so
 *      reviewing a file that mentions the canary pattern fired the canary. Now stderr only, and
 *      a hard failure rather than a warning.
 *   3. `codex mcp list` failing fell back to a stale hard-coded server list; parsing zero servers
 *      only warned. Both fail OPEN. Now both abort.
 *   4. Symlinked targets bypassed the forbidden-path check (path.resolve does not follow links,
 *      readFileSync does). Now realpathSync.
 *   5. Directory targets were delegated to Codex unscanned. Now refused.
 *   6. Diff modes never applied the forbidden-path rule at all. Now enumerated and checked.
 *   7. The payload was written BEFORE the findings were validated, so a failed retry could pair
 *      new payload with stale findings. Now findings first, payload second.
 * Plus: the refusal message printed the first 12 characters of any matched secret — in the one
 * code path whose purpose is to stop that secret spreading. Now type and line number only.
 *
 * WHAT DIVERGES FROM THE SOURCE, and why (containment untouched in every case):
 *   1. --range <A..B>  review a COMMITTED range, not just the worktree. The 2026-08-06 Phase-C
 *      review needed `HEAD~1..HEAD`; the source wrapper could only do uncommitted work, so that
 *      review went unwrappered.
 *   2. The diff is EMBEDDED in the prompt and SAVED next to the findings, instead of telling
 *      Codex to run `git diff` itself. That pins the review to an auditable payload — the same
 *      lesson as review finding #7 (published numbers whose instruments were garbage-collected).
 *   3. Prompt goes over STDIN (`-`) rather than as an argv element, so a large diff cannot hit
 *      ARG_MAX.
 *   4. A payload pre-scan + a hard timeout (see below).
 *
 * ⚠ THE PRE-SCAN IS A SCOPE GUARD, NOT CONTAINMENT. §11-H established that reads are disk-wide
 * under --sandbox read-only regardless of cwd, so nothing here can stop a determined worker
 * reading .env. What it does prevent is the ordinary, likely mistake: shipping a secret to
 * OpenAI because it happened to sit in the diff. This repo's CLAUDE.md requires that check
 * before every Codex run; encoding it here makes it a machine check instead of a promise.
 *
 * Usage:
 *   node scripts/codex-review.mjs --diff [--round N]
 *   node scripts/codex-review.mjs --range HEAD~1..HEAD [--round N]
 *   node scripts/codex-review.mjs --target <path> [--round N]
 *   ... [--out DIR] [--dry-run] [--timeout-min M] [--max-bytes B]
 *
 * Exit codes: 0 ok · 1 usage/precondition failure · 2 codex call failed
 */

import { spawnSync } from "child_process";
import { createHash, randomUUID } from "crypto";
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

/**
 * Egress canary (§11-A). Anchored to the Rust MODULE-PATH shape that rmcp tracing actually emits
 * (`rmcp::transport::…`, `streamable_http_client:`), not a bare substring — see the long note at
 * the use site for why the bare form is unusable and why even this needs a degraded mode.
 */
const CANARY = /(rmcp::transport::|streamable_http_client:)/;

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
  // Prefer `--json` over the source's table-regex parse. The regex fails OPEN on a partial format
  // change: if the stdio table still parses but the URL table does not, at least one name is found,
  // the zero-name guard is bypassed, and the remote servers — the actual egress path — stay enabled.
  // Structured output removes that whole failure class rather than narrowing the regex.
  const js = spawnSync("codex", ["mcp", "list", "--json"], { encoding: "utf8" });
  if (js.status === 0) {
    let servers;
    try {
      servers = JSON.parse(js.stdout);
    } catch {
      console.error("REFUSED: `codex mcp list --json` returned unparseable JSON; cannot prove the strip is complete.");
      process.exit(1);
    }
    if (!Array.isArray(servers)) {
      console.error("REFUSED: `codex mcp list --json` did not return an array; format changed.");
      process.exit(1);
    }
    const names = servers.map((s) => s && s.name).filter((n) => typeof n === "string" && n);
    if (names.length !== servers.length) {
      console.error("REFUSED: an MCP entry has no usable name; cannot prove the strip is complete.");
      process.exit(1);
    }
    // A dotted name becomes a NESTED TOML path: `mcp_servers.corp.prod.enabled=false` addresses
    // mcp_servers.corp.prod, not the server literally called "corp.prod", so that server would
    // stay ENABLED while the flag looks right. Rather than guess at TOML quoting semantics for
    // `-c`, refuse — this is currently hypothetical (no configured name has a dot) and a wrong
    // guess here is a silent containment hole.
    const dotted = names.filter((n) => n.includes("."));
    if (dotted.length) {
      console.error(
        `REFUSED: MCP server name(s) contain dots and cannot be safely expressed as a -c key: ${dotted.join(", ")}.\n` +
        "A dotted name would address a NESTED config path and leave that server enabled.",
      );
      process.exit(1);
    }
    if (names.length === 0) console.error("Note: no MCP servers configured; nothing to strip.");
    return names.flatMap((n) => ["-c", `mcp_servers.${n}.enabled=false`]);
  }

  const res = spawnSync("codex", ["mcp", "list"], { encoding: "utf8" });
  if (res.status !== 0) {
    // DIVERGES FROM SOURCE, deliberately. The source falls back to a hard-coded server list and
    // proceeds. That is fail-OPEN twice over: the list goes stale the moment a server is added
    // (§11-K6 is the whole reason the list is derived live), and this repo's remote MCP servers
    // are exactly the egress path the strip exists to close. Abort instead.
    console.error(
      "REFUSED: `codex mcp list` failed, so the enabled-server set is UNKNOWN and the strip\n" +
      "cannot be proven complete. A stale hard-coded list would silently re-arm any server added\n" +
      "since it was written. Fix codex, then re-run.",
    );
    process.exit(1);
  }
  // Server names are the first token of each table row; skip headers and blanks. Note `codex mcp
  // list` emits TWO tables (stdio servers, then URL servers) with different headers — both start
  // their header row with "Name", which the filter drops.
  const names = new Set();
  for (const line of res.stdout.split("\n")) {
    const m = line.match(/^([A-Za-z][\w.-]*)\s{2,}/);
    if (m && !["Name", "Command", "Url"].includes(m[1])) names.add(m[1]);
  }
  if (names.size === 0) {
    // Distinguish "no servers configured" (legitimate) from "the output format changed and the
    // parser silently matched nothing" (a strip that disables NOTHING while reporting success).
    const looksPopulated = /^\s*Name\s{2,}/m.test(res.stdout) || res.stdout.trim().length > 200;
    if (looksPopulated) {
      console.error(
        "REFUSED: parsed ZERO MCP servers from a NON-EMPTY `codex mcp list` — the output format\n" +
        "changed and the strip would disable nothing while appearing to succeed. Fix the parser\n" +
        "in mcpDisableFlags() before running another review.",
      );
      process.exit(1);
    }
    console.error("Note: no MCP servers configured; nothing to strip.");
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

/**
 * Secret-shaped tokens. Deliberately broad and fail-CLOSED: a false positive costs one
 * `--allow-payload` re-read by a human, a false negative ships a live credential to OpenAI.
 * Ordered so the message names what matched.
 */
const SECRET_PATTERNS = [
  [/AIza[0-9A-Za-z_-]{20,}/, "Google/Gemini API key"],
  [/\bghp_[0-9A-Za-z]{20,}/, "GitHub token"],
  [/\bgithub_pat_[0-9A-Za-z_]{20,}/, "GitHub fine-grained PAT"],
  [/\bsk-[0-9A-Za-z_-]{20,}/, "OpenAI-style secret key"],
  [/\bya29\.[0-9A-Za-z_-]{10,}/, "Google OAuth access token"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key block"],
  [/\b(client_secret|refresh_token|GEMINI_API_KEY|SLACK_BOT_TOKEN)\s*[=:]\s*\S{8,}/i,
   "assigned credential variable"],
];

/** Paths that must never be fed in as review payload, whatever the caller asked for. */
const FORBIDDEN_PATH = /(^|\/)(\.env(\.|$)|var\/|\.venv\/)/;

function scanPayload(text, label) {
  const hits = [];
  const lines = text.split("\n");
  for (const [re, what] of SECRET_PATTERNS) {
    const idx = lines.findIndex((l) => re.test(l));
    // NEVER echo any part of the matched value. The source printed the first 12 characters, which
    // copies a live credential into the terminal, scrollback, and any CI or orchestration log —
    // in the one code path whose entire purpose is to stop that credential from spreading.
    // Report the TYPE and a LOCATION instead; that is enough to find it.
    if (idx !== -1) hits.push(`${what} — payload line ${idx + 1} (value withheld)`);
  }
  if (hits.length) {
    console.error(`\nREFUSED: ${label} contains secret-shaped material and would be sent to OpenAI:`);
    for (const h of hits) console.error(`  - ${h}`);
    console.error(
      "\nThis is a scope guard, not containment — but it is the check CLAUDE.md requires before\n" +
      "every Codex run. Redact the payload, or narrow the range, then re-run.",
    );
    process.exit(1);
  }
}

/** Collect the review payload as text, plus a human description of what it is. */
function collectPayload(args) {
  if (args.target) {
    if (!fs.existsSync(args.target)) {
      console.error(`Target does not exist: ${path.resolve(args.target)}`);
      process.exit(1);
    }
    // realpathSync, NOT path.resolve: resolve() normalizes the STRING and does not follow
    // symlinks, so `docs/notes.md -> ../.env` passed the forbidden-path test and was then read
    // and transmitted by readFileSync, which does follow. Check the real path.
    const abs = fs.realpathSync(args.target);
    const st = fs.statSync(abs);
    if (FORBIDDEN_PATH.test(abs + (st.isDirectory() ? "/" : ""))) {
      console.error(`Refusing: ${abs} is an environment/secrets or gitignored-data path.`);
      process.exit(1);
    }
    // Directory targets are REFUSED rather than passed through as a pointer. The source handed
    // Codex a directory and told it to traverse — which means the payload is never scanned and
    // the forbidden-path rule covers only the root, so a directory containing .env or var/ was
    // delegated wholesale. --diff / --range cover the normal case; review files explicitly.
    if (st.isDirectory()) {
      console.error(
        `Refusing: ${abs} is a directory. A directory target is never scanned — its contents\n` +
        "would be delegated to Codex unexamined. Use --diff, --range, or name a single file.",
      );
      process.exit(1);
    }
    const text = fs.readFileSync(abs, "utf8");
    return { text, desc: `the file at ${abs}` };
  }

  if (args.range) {
    // `git diff --output=FILE` WRITES that file — verified 2026-08-06 by overwriting a sentinel.
    // So an unvalidated --range is a write primitive inside a tool whose whole premise is
    // read-only. Reject option-shaped values, then require git itself to confirm the range
    // resolves to real commits.
    if (args.range.startsWith("-")) {
      console.error(`Refusing: --range ${JSON.stringify(args.range)} looks like a git OPTION, not a revision.`);
      process.exit(1);
    }
    // Require an actual RANGE. `--range HEAD` passes rev-parse and then runs `git diff HEAD --`,
    // which diffs the WORKTREE against HEAD — so uncommitted edits get reviewed and reported as
    // "the committed diff for range HEAD". A label that misdescribes its own payload is the same
    // defect class as a silently-truncated diff.
    if (!/\.{2,3}/.test(args.range)) {
      console.error(
        `Refusing: --range ${JSON.stringify(args.range)} is a single revision, not a range.\n` +
        "Use A..B (e.g. HEAD~1..HEAD). A bare revision would diff the WORKTREE and be mislabelled\n" +
        "as a committed diff; use --diff if that is what you meant.",
      );
      process.exit(1);
    }
    // Verify EVERY component, not just the last one: `HEAD~999..HEAD` has a valid right-hand side,
    // so checking only the tail passed a range git cannot resolve, and the failure then surfaced
    // several steps later as a misleading "could not enumerate changed paths".
    for (const rev of args.range.split(/\.{2,3}/).filter(Boolean)) {
      const probe = spawnSync("git", ["rev-parse", "--verify", "--quiet", `${rev}^{commit}`],
        { cwd: REPO_ROOT, encoding: "utf8" });
      if (probe.status !== 0) {
        console.error(`Refusing: --range ${JSON.stringify(args.range)} — ${JSON.stringify(rev)} does not resolve to a commit.`);
        process.exit(1);
      }
    }
  }

  // `git diff HEAD` does NOT see untracked files, so a worktree review of "new script plus tracked
  // edits" would silently cover only the edits — reviewing a different change than the one
  // reported. Refuse and name them; `git add -N` makes them visible to `git diff` without staging
  // content. (Range mode is unaffected: a commit range has no untracked component.)
  if (!args.range) {
    const un = spawnSync("git", ["ls-files", "--others", "--exclude-standard", "-z"],
      { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
    const untracked = un.status === 0 ? un.stdout.split("\0").filter(Boolean) : [];
    if (untracked.length) {
      console.error("REFUSED: untracked files exist and `git diff` cannot see them, so this review");
      console.error("would silently cover only part of the change:");
      for (const p of untracked.slice(0, 20)) console.error(`  - ${p}`);
      if (untracked.length > 20) console.error(`  … and ${untracked.length - 20} more`);
      console.error("\nRun `git add -N <paths>` to make them visible to git diff, then re-run.");
      process.exit(1);
    }
  }

  const gitArgs = args.range
    ? ["diff", args.range, "--"]
    : ["diff", "HEAD", "--"];

  // Forbidden-path policy applies to DIFFS too, not just --target. .env and var/ are gitignored
  // here so this is defence in depth rather than the primary control — but a force-added file, or
  // a new secrets-shaped path nobody added to .gitignore, would otherwise be embedded and shipped.
  const namesRes = spawnSync("git", [...gitArgs.slice(0, -1), "--name-only", "-z", "--"],
    { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
  if (namesRes.status === 0) {
    const bad = namesRes.stdout.split("\0").filter((p) => p && FORBIDDEN_PATH.test(p));
    if (bad.length) {
      console.error("REFUSED: the diff touches paths that must never be sent to OpenAI:");
      for (const p of bad) console.error(`  - ${p}`);
      process.exit(1);
    }
  } else {
    console.error("REFUSED: could not enumerate changed paths, so the forbidden-path rule cannot be checked.");
    process.exit(1);
  }

  const res = spawnSync("git", gitArgs, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
  if (res.status !== 0) {
    console.error(`git ${gitArgs.join(" ")} failed:\n${res.stderr}`);
    process.exit(1);
  }
  if (!res.stdout.trim()) {
    console.error(
      args.range
        ? `Empty diff for range ${args.range} — nothing to review.`
        : "Empty worktree diff — nothing to review. (Committed already? Use --range HEAD~1..HEAD.)",
    );
    process.exit(1);
  }
  const desc = args.range
    ? `the committed diff for range ${args.range} in this repository`
    : "the current uncommitted diff in this repository";
  return { text: res.stdout, desc };
}

function buildPrompt({ persona, round, targetDesc, payload, scopeNote }) {
  const embedded = payload
    ? `\n=== THE MATERIAL UNDER REVIEW ===\n${payload}\n=== END OF MATERIAL ===\n`
    : "";
  return `${persona.stanza}

You are reviewing: ${targetDesc}

${scopeNote}
${embedded}
Review it adversarially. Find real defects, not style preferences. For each finding give a
concrete failure scenario — specific inputs or state leading to a specific wrong outcome.
Cite file paths and line numbers. If you cannot demonstrate how something actually breaks,
do not report it. Do NOT summarize the code back to me.

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
  const args = {
    round: 1, out: ".codex-reviews", dryRun: false, diff: false,
    target: null, range: null, timeoutMin: 15, maxBytes: 400_000,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") args.target = argv[++i];
    else if (a === "--round") args.round = parseInt(argv[++i], 10);
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--range") args.range = argv[++i];
    else if (a === "--timeout-min") args.timeoutMin = parseInt(argv[++i], 10);
    else if (a === "--max-bytes") args.maxBytes = parseInt(argv[++i], 10);
    else if (a === "--diff") args.diff = true;
    else if (a === "--dry-run") args.dryRun = true;
    else { console.error(`Unknown argument: ${a}`); return null; }
  }
  const modes = [args.target, args.diff ? "diff" : null, args.range].filter(Boolean).length;
  if (modes === 0) {
    console.error("Specify exactly one of --diff, --range <A..B>, or --target <path>.");
    return null;
  }
  if (modes > 1) {
    console.error("--diff, --range and --target are mutually exclusive.");
    return null;
  }
  for (const [name, v, floor] of [["--round", args.round, 1], ["--timeout-min", args.timeoutMin, 1],
                                  ["--max-bytes", args.maxBytes, 1000]]) {
    if (!Number.isInteger(v) || v < floor) {
      console.error(`${name} must be an integer >= ${floor}.`);
      return null;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) process.exit(1);

  const { text: payload, desc: targetDesc } = collectPayload(args);

  if (payload !== null) {
    // Fail CLOSED on size. Silently truncating a diff would produce a review of a DIFFERENT
    // change than the one reported — the class of error this repo keeps finding in itself.
    const bytes = Buffer.byteLength(payload, "utf8");
    if (bytes > args.maxBytes) {
      console.error(
        `REFUSED: payload is ${bytes} bytes, over the ${args.maxBytes} cap. Narrow the range or\n` +
        "raise --max-bytes deliberately. It is NOT truncated automatically: a review of a\n" +
        "silently-shortened diff would be reported as a review of the whole change.",
      );
      process.exit(1);
    }
    scanPayload(payload, "the review payload");
  }

  const runId = randomUUID().slice(0, 8);
  const vres = spawnSync("codex", ["--version"], { encoding: "utf8" });
  const codexVersion = vres.status === 0 ? vres.stdout.trim() : "unknown";

  const persona = personaForRound(args.round);
  const outDir = path.resolve(REPO_ROOT, args.out);
  fs.mkdirSync(outDir, { recursive: true });
  const findingsPath = path.join(outDir, `findings-round-${args.round}.md`);
  const payloadPath = path.join(outDir, `payload-round-${args.round}.txt`);

  const scopeNote =
    "SCOPE: review only public, non-sensitive source material. Do not read, open, print, " +
    "or quote any .env file, credential, API key, candidate personal data, or franchisor " +
    "confidential material. If the task appears to require any of those, stop and say so " +
    "instead of proceeding.";

  const prompt = buildPrompt({ persona, round: args.round, targetDesc, payload, scopeNote });
  const codexArgs = hardenedArgs();

  console.log(`Round ${args.round} — ${persona.label}`);
  console.log(`Reviewing: ${targetDesc}`);
  if (payload !== null) {
    console.log(`Payload: ${Buffer.byteLength(payload, "utf8")} bytes, secret pre-scan clean`);
  }
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
    console.log(["codex", ...codexArgs, "-"].join(" "), "   # prompt on stdin");
    console.log("\n--- DRY RUN: prompt ---");
    console.log(prompt);
    return;
  }

  // Prompt over STDIN (`-`), not argv: an embedded diff can exceed ARG_MAX as an argument.
  const startedAt = Date.now();
  const res = spawnSync("codex", [...codexArgs, "-"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    input: prompt,
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
    timeout: args.timeoutMin * 60_000,
  });

  // A durable, redacted status record for BOTH outcomes. Without it an intermittent timeout leaves
  // nothing to reconstruct from: stdout discarded, stderr truncated to 2 KB on the terminal, and no
  // record of version, duration, or what was actually reviewed.
  const writeStatus = (outcome, extra = {}) => {
    try {
      fs.writeFileSync(path.join(outDir, `status-round-${args.round}.json`), `${JSON.stringify({
        run_id: runId, round: args.round, outcome, finished_utc: new Date().toISOString(),
        duration_ms: Date.now() - startedAt, codex_version: codexVersion, target: targetDesc,
        payload_bytes: payload === null ? null : Buffer.byteLength(payload, "utf8"),
        payload_sha256_16: payload === null ? null
          : createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 16),
        mcp_servers_stripped: codexArgs.filter((a) => a.startsWith("mcp_servers.")).length,
        ...extra,
      }, null, 2)}\n`, "utf8");
    } catch { /* diagnostics must never mask the real failure */ }
  };

  if (res.error) {
    // ETIMEDOUT arrives here too; name it, because "failed to launch" would be a lie.
    const why = res.error.code === "ETIMEDOUT"
      ? `timed out after ${args.timeoutMin} min (raise --timeout-min)`
      : res.error.message;
    console.error(`codex did not complete: ${why}`);
    writeStatus("launch_or_timeout_failure", { error: why, stderr_tail: (res.stderr || "").slice(-2000) });
    process.exit(2);
  }
  if (res.status !== 0) {
    console.error(`codex exited ${res.status}`);
    if (res.stderr) console.error(res.stderr.slice(0, 2000));
    writeStatus("codex_nonzero_exit", { exit_code: res.status, stderr_tail: (res.stderr || "").slice(-2000) });
    process.exit(2);
  }

  // Egress canary (§11-A): transport chatter means an MCP client dialled out despite the strip.
  //
  // It must NOT be run over the raw streams. Measured 2026-08-06 on codex 0.145.0: stderr is the
  // full transcript — a session preamble, then `user` followed by a VERBATIM echo of our prompt,
  // then the model's reply. So the payload appears in stderr as well as stdout, and reviewing any
  // file that merely mentions the canary's own pattern fires the canary. That happened twice here:
  // once against stdout, and once again after a first fix that assumed — without checking — that
  // stderr was log-only. It is not.
  //
  // Regex-tightening cannot fix this, and three measured attempts proved it: stdout-only, then
  // stderr-only, then a module-path anchor all false-fired, the last one citing lines 517 and 523
  // OF THIS FILE — Codex quoting the canary's own source back with line numbers. Any pattern
  // written literally here matches whenever this file is the material under review. The canary is
  // SELF-REFERENTIAL, so the honest move is to detect when it cannot discriminate and say so,
  // rather than to keep narrowing a pattern until it happens to pass.
  //
  // Two regimes:
  //   * payload free of the pattern -> the whole transcript is trustworthy. Scan it all. Hard fail.
  //   * payload CONTAINS the pattern -> the model may legitimately quote it, so a content match
  //     proves nothing. Fall back to codex's own PREAMBLE (everything before the `user` marker),
  //     which is log output we did not author, and report the check as DEGRADED.
  // Never silently "pass": a degraded canary is announced, so the operator knows what was and
  // was not certified.
  const withoutEcho = (s) => s.split(prompt).join("\n[our own prompt echo removed]\n");
  const preambleOf = (s) => s.split(/^user$/m)[0];
  const selfReferential = payload !== null && CANARY.test(payload);
  const scanned = selfReferential
    ? preambleOf(res.stderr)
    : `${withoutEcho(res.stdout)}\n${withoutEcho(res.stderr)}`;

  if (CANARY.test(scanned)) {
    // SHOW THE EVIDENCE. The source printed a bare warning, which is uninvestigable — you cannot
    // tell a real dial-out from a quotation without the line, and an alarm you cannot check is an
    // alarm that gets waved through. This diagnostic is what exposed the self-reference above.
    const offending = scanned.split("\n").filter((l) => CANARY.test(l)).slice(0, 5);
    console.error(
      "REFUSED: MCP transport activity detected — a client dialled out despite the strip (§11-A).\n" +
      "Treat this as a containment failure, not a warning. Findings are NOT written, because the\n" +
      "run cannot be certified contained. Offending line(s):",
    );
    for (const l of offending) console.error(`  | ${l.trim().slice(0, 200)}`);
    process.exit(2);
  }
  if (selfReferential) {
    console.error(
      "NOTE: egress canary DEGRADED for this run — the reviewed material itself contains the\n" +
      "canary pattern, so model quotations are indistinguishable from real transport chatter.\n" +
      "Checked codex's own preamble only. Containment is NOT fully certified for this run.",
    );
  }

  // Extract the findings block from stdout.
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

  // Write findings FIRST, then the payload it belongs to. The source wrote the payload before
  // validating the markers, so a failed retry replaced payload A with payload B while leaving
  // findings A on disk — the directory then presents findings A as the evidence for payload B.
  // Pairing the two only after both are known-good is what makes the archive mean anything.
  // Stamp the pair so a mismatched findings/payload combination is DETECTABLE rather than merely
  // unlikely. A crash between the two writes, or two same-round runs racing, would otherwise leave
  // findings from one run beside the payload of another with nothing to reveal it. (A full lock +
  // fsync + manifest protocol was proposed and is declined: this is a single-operator, machine-local
  // dev tool, and the header is what actually makes the failure visible.)
  const payloadSha = payload === null
    ? "n/a"
    : createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 16);
  const banner =
    `<!-- run ${runId} · ${new Date().toISOString()} · codex ${codexVersion} · ` +
    `payload sha256:${payloadSha} · target: ${targetDesc} -->\n` +
    (selfReferential
      ? "> ⚠ **Egress canary DEGRADED for this run** — the reviewed material contains the canary\n" +
        "> pattern, so only codex's own preamble could be checked. Containment is NOT fully\n" +
        "> certified for these findings.\n\n"
      : "");
  fs.writeFileSync(findingsPath, `${banner}${body}\n`, "utf8");
  if (payload !== null) fs.writeFileSync(payloadPath, payload, "utf8");

  const counts = severityCounts(findingsPath);
  // EXACT match on the normalized body, not a substring test. The source used
  // /No substantive findings\./.test(body), so any response merely CONTAINING that sentence —
  // including one that quotes the output contract, or a finding that discusses this very bug —
  // reported "no findings". Observed 2026-08-06: a review carrying 4 High and 3 Medium findings
  // printed "NO SUBSTANTIVE FINDINGS (loop may terminate)". The console lied about its own review.
  // Match THIS round's number, not any digit: a response headed "Round 1 findings" returned for a
  // round-3 request is a stale or confused reply, and accepting it silently attributes one round's
  // conclusions to another.
  const normalized = body.replace(/\r/g, "").replace(/[ \t]+$/gm, "").trim();
  const cleanRe = new RegExp(`^#\\s*Round\\s+${args.round}\\s+findings\\s*\\n+No substantive findings\\.$`);
  const clean = cleanRe.test(normalized);
  if (!new RegExp(`^#\\s*Round\\s+${args.round}\\s+findings`).test(normalized)) {
    console.error(`WARN: findings block is not headed "Round ${args.round}" — the reply may not match this request.`);
  }
  const total = counts.high + counts.medium + counts.low;
  if (clean && total > 0) {
    // Belt and braces: the two signals must agree, or the operator gets told they disagree.
    console.error("WARN: body parsed as CLEAN but severity bullets were counted — reporting NOT clean.");
  }
  console.log(
    clean && total === 0
      ? "\nResult: NO SUBSTANTIVE FINDINGS (loop may terminate)."
      : `\nResult: high=${counts.high} medium=${counts.medium} low=${counts.low}`,
  );
  writeStatus("ok", {
    high: counts.high, medium: counts.medium, low: counts.low,
    clean: clean && total === 0, canary_degraded: selfReferential,
  });
  console.log(`Read the findings file, not the transcript: ${findingsPath}`);
  if (payload !== null) console.log(`Payload preserved at: ${payloadPath}`);
}

main();
