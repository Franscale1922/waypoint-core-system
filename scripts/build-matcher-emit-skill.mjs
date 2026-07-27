#!/usr/bin/env node
/**
 * Build an uploadable matcher skill that includes the match-workspace export stage.
 *
 * Reads the authoritative July skill, appends the block from
 * docs/match-workspace/MATCHER-EMIT-STAGE.md, and writes a NEW .skill file beside the
 * original. It never overwrites the source, and it never touches the installed skill (there
 * isn't one on disk: the live copy is uploaded to Claude, so the result of this script has to
 * be re-uploaded by hand).
 *
 * Usage:
 *   node scripts/build-matcher-emit-skill.mjs [--source <path/to/.skill>] [--out <path>]
 *
 * Defaults:
 *   --source  ~/Projects/candidate-matcher/franchise-candidate-matcher.skill
 *   --out     ~/Projects/candidate-matcher/franchise-candidate-matcher-with-emit.skill
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir, homedir } from "node:os";

const ROOT = process.cwd();
const DEFAULT_SOURCE = join(homedir(), "Projects", "candidate-matcher", "franchise-candidate-matcher.skill");
const DEFAULT_OUT = join(homedir(), "Projects", "candidate-matcher", "franchise-candidate-matcher-with-emit.skill");
const SPEC = join(ROOT, "docs", "match-workspace", "MATCHER-EMIT-STAGE.md");
const INNER_DIR = "franchise-candidate-matcher";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** Pull the appended block out of the spec doc: everything inside the outer ```` fence. */
export function extractEmitBlock(specMarkdown) {
  const start = specMarkdown.indexOf("````markdown");
  if (start === -1) throw new Error("MATCHER-EMIT-STAGE.md: opening ````markdown fence not found");
  const bodyStart = specMarkdown.indexOf("\n", start) + 1;
  const end = specMarkdown.indexOf("\n````", bodyStart);
  if (end === -1) throw new Error("MATCHER-EMIT-STAGE.md: closing ```` fence not found");
  return specMarkdown.slice(bodyStart, end).trimEnd() + "\n";
}

/** The frozen scoring-config block the seed hashes. Kept here so both sides read one parser. */
export function extractScoringConfigBlock(skillMarkdown) {
  const m = /```scoring-config\n([\s\S]*?)\n```/.exec(skillMarkdown);
  if (!m) throw new Error("No ```scoring-config block found in the skill");
  return m[1].trim();
}

/** Parse the frozen block into the shape ScoringConfig stores. */
export function parseScoringConfig(block) {
  const out = { version: null, weights: {}, thresholds: {}, caps: {} };
  for (const line of block.split("\n")) {
    const [rawKey, ...rest] = line.split(":");
    if (!rest.length) continue;
    const key = rawKey.trim();
    const value = rest.join(":").trim();

    if (key === "version") out.version = value;
    else if (key.startsWith("weights.")) {
      const level = key.slice("weights.".length);
      const w = {};
      for (const pair of value.split(/\s+/)) {
        const [k, v] = pair.split("=");
        if (k && v) w[k] = Number(v);
      }
      out.weights[level] = w;
    } else if (key === "red_flag_cap") out.caps.redFlag = Number(value);
    else if (key === "pride_gate_caps") {
      for (const pair of value.split(/\s+/)) {
        const [k, v] = pair.split("=");
        if (k && v) out.caps[`prideGate_${k}`] = Number(v);
      }
    } else if (key === "fdd_cut") out.thresholds.fddCut = value;
    else if (key === "normalization") out.thresholds.normalization = value;
  }
  if (!out.version) throw new Error("scoring-config block has no version");
  if (!Object.keys(out.weights).length) throw new Error("scoring-config block has no weights");
  return out;
}

function main() {
  const source = arg("--source", DEFAULT_SOURCE);
  const out = arg("--out", DEFAULT_OUT);

  if (!existsSync(source)) throw new Error(`Source skill not found: ${source}`);
  if (!existsSync(SPEC)) throw new Error(`Spec not found: ${SPEC}`);

  const work = mkdtempSync(join(tmpdir(), "matcher-skill-"));
  try {
    // Skills are zip archives containing <name>/SKILL.md.
    execFileSync("unzip", ["-q", "-o", source, "-d", work]);
    const skillPath = join(work, INNER_DIR, "SKILL.md");
    if (!existsSync(skillPath)) throw new Error(`Expected ${INNER_DIR}/SKILL.md inside ${source}`);

    const original = readFileSync(skillPath, "utf8");
    if (original.includes("STAGE 6: Match-Workspace Export")) {
      throw new Error("Source skill already contains the export stage; refusing to append twice.");
    }

    const block = extractEmitBlock(readFileSync(SPEC, "utf8"));
    writeFileSync(skillPath, `${original.trimEnd()}\n\n${block}`);

    // Sanity: the appended content must parse as a scoring-config block.
    const cfg = parseScoringConfig(extractScoringConfigBlock(readFileSync(skillPath, "utf8")));

    mkdirSync(dirname(out), { recursive: true });
    rmSync(out, { force: true });
    execFileSync("zip", ["-q", "-r", out, INNER_DIR], { cwd: work });

    console.log(`Built ${out}`);
    console.log(`  scoringConfigVersion: ${cfg.version}`);
    console.log(`  weight rows: ${Object.keys(cfg.weights).join(", ")}`);
    console.log("\nNext step (manual, and required):");
    console.log("  Re-upload that file to replace the installed matcher skill.");
    console.log("  Editing files on disk does NOT change the skill Claude runs.");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("build-matcher-emit-skill.mjs");
if (invokedDirectly) main();
