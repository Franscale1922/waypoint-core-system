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

/** Claude Skills reject an upload whose YAML frontmatter description exceeds this. */
export const DESCRIPTION_LIMIT = 1024;

/** The compliant description from the spec doc, used to replace an over-limit one. */
export function extractSkillDescription(specMarkdown) {
  const m = /```skill-description\n([\s\S]*?)\n```/.exec(specMarkdown);
  if (!m) throw new Error("MATCHER-EMIT-STAGE.md: no ```skill-description block found");
  return m[1].trim();
}

/**
 * Split a SKILL.md into its YAML frontmatter lines and the rest.
 * Line-based on purpose: a folded `>` scalar spans indented continuation lines, and an earlier
 * regex attempt used `\Z` (which is not a JavaScript anchor and silently matched a literal Z),
 * corrupting the frontmatter.
 */
function splitFrontmatter(skillMarkdown) {
  const lines = skillMarkdown.split("\n");
  if (lines[0].trim() !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end === -1) return null;
  return { fmLines: lines.slice(1, end), body: lines.slice(end + 1).join("\n") };
}

/** Index range of the `description:` key and its continuation lines. */
function descriptionRange(fmLines) {
  const start = fmLines.findIndex((l) => /^description:/.test(l));
  if (start === -1) return null;
  let end = start + 1;
  // Continuation lines of a folded scalar are indented; a new key is not.
  while (end < fmLines.length && /^\s/.test(fmLines[end])) end++;
  return { start, end };
}

/** Measure the description as the platform sees it (folded scalar joined with single spaces). */
export function measureDescription(skillMarkdown) {
  const split = splitFrontmatter(skillMarkdown);
  if (!split) return null;
  const range = descriptionRange(split.fmLines);
  if (!range) return null;
  const first = split.fmLines[range.start].replace(/^description:\s*>?-?\s*/, "");
  const rest = split.fmLines.slice(range.start + 1, range.end);
  const text = [first, ...rest].map((l) => l.trim()).filter(Boolean).join(" ");
  return { text, length: text.length };
}

/** Replace the frontmatter description with a single-line compliant one. */
export function replaceDescription(skillMarkdown, description) {
  const split = splitFrontmatter(skillMarkdown);
  if (!split) throw new Error("SKILL.md has no YAML frontmatter");
  const range = descriptionRange(split.fmLines);
  if (!range) throw new Error("SKILL.md frontmatter has no description key");
  if (description.includes("\n")) throw new Error("Replacement description must be a single line");
  const fmLines = [
    ...split.fmLines.slice(0, range.start),
    `description: ${description}`,
    ...split.fmLines.slice(range.end),
  ];
  return `---\n${fmLines.join("\n")}\n---\n${split.body.replace(/^\n/, "")}`;
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

    const spec = readFileSync(SPEC, "utf8");
    const block = extractEmitBlock(spec);
    let built = `${original.trimEnd()}\n\n${block}`;

    // The upload is rejected outright when the frontmatter description is over the limit, and
    // the July skill ships at 1138. Substitute the compliant one from the spec when needed.
    const before = measureDescription(built);
    if (before && before.length > DESCRIPTION_LIMIT) {
      console.log(`description was ${before.length} chars (limit ${DESCRIPTION_LIMIT}); substituting the compliant one`);
      built = replaceDescription(built, extractSkillDescription(spec));
    }

    // Fail rather than emit an unuploadable artifact.
    const after = measureDescription(built);
    if (!after) throw new Error("Built skill has no readable frontmatter description");
    if (after.length > DESCRIPTION_LIMIT) {
      throw new Error(
        `description is ${after.length} chars, over the ${DESCRIPTION_LIMIT} limit. Shorten the ` +
          "```skill-description block in docs/match-workspace/MATCHER-EMIT-STAGE.md.",
      );
    }

    writeFileSync(skillPath, built);

    // Sanity: the appended content must parse as a scoring-config block.
    const cfg = parseScoringConfig(extractScoringConfigBlock(readFileSync(skillPath, "utf8")));

    mkdirSync(dirname(out), { recursive: true });
    rmSync(out, { force: true });
    execFileSync("zip", ["-q", "-r", out, INNER_DIR], { cwd: work });

    // Also write a .zip twin: some upload dialogs only accept that extension.
    const zipTwin = out.replace(/\.skill$/, ".zip");
    if (zipTwin !== out) {
      rmSync(zipTwin, { force: true });
      writeFileSync(zipTwin, readFileSync(out));
    }

    console.log(`Built ${out}`);
    console.log(`  and ${zipTwin}`);
    console.log(`  scoringConfigVersion: ${cfg.version}`);
    console.log(`  weight rows: ${Object.keys(cfg.weights).join(", ")}`);
    console.log(`  description: ${after.length}/${DESCRIPTION_LIMIT} chars`);
    console.log("\nNext step (manual, and required):");
    console.log("  Re-upload that file to replace the installed matcher skill.");
    console.log("  Editing files on disk does NOT change the skill Claude runs.");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("build-matcher-emit-skill.mjs");
if (invokedDirectly) main();
