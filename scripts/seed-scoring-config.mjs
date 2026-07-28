#!/usr/bin/env node
/**
 * Seed the initial approved ScoringConfig from the matcher skill's frozen weights block.
 *
 * [C-14]: every MatchRun references exactly one ScoringConfig version, and an import declaring
 * an unknown or unapproved version is refused. That check is only meaningful if the stored
 * configuration is bound to the arithmetic the matcher actually used, so `contentHash` is
 * derived from the skill's `scoring-config` block rather than typed by hand. A companion test
 * recomputes the hash from the skill and fails when the two drift, which is what catches
 * "someone edited a weight without bumping the version".
 *
 * Usage:
 *   node scripts/seed-scoring-config.mjs                 # dry run: prints what it would write
 *   node scripts/seed-scoring-config.mjs --commit        # writes the row
 *   node scripts/seed-scoring-config.mjs --spec <path>   # read the block from a spec/skill file
 *
 * Safe by default: without --commit it writes nothing. Idempotent: a row whose version AND
 * contentHash already match is left alone; a version that exists with a DIFFERENT hash is an
 * error, never an overwrite, because a config change must be a new approved row.
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { extractScoringConfigBlock, parseScoringConfig } from "./build-matcher-emit-skill.mjs";

const ROOT = process.cwd();
const DEFAULT_SPEC = join(ROOT, "docs", "match-workspace", "MATCHER-EMIT-STAGE.md");

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** The canonical hash of the frozen block: whitespace-normalized so reflowing is not a change. */
export function hashScoringConfigBlock(block) {
  const normalized = block
    .split("\n")
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/** Read the frozen block from a spec doc or a raw SKILL.md. */
export function readScoringConfig(specPath = DEFAULT_SPEC) {
  if (!existsSync(specPath)) throw new Error(`Spec not found: ${specPath}`);
  const text = readFileSync(specPath, "utf8");
  const block = extractScoringConfigBlock(text);
  return { block, contentHash: hashScoringConfigBlock(block), config: parseScoringConfig(block) };
}

async function main() {
  const commit = process.argv.includes("--commit");
  const { block, contentHash, config } = readScoringConfig(arg("--spec", DEFAULT_SPEC));

  console.log(`version:     ${config.version}`);
  console.log(`contentHash: ${contentHash}`);
  console.log(`weights:     ${JSON.stringify(config.weights)}`);
  console.log(`caps:        ${JSON.stringify(config.caps)}`);
  console.log(`thresholds:  ${JSON.stringify(config.thresholds)}`);

  if (!commit) {
    console.log("\nDry run. Re-run with --commit to write this row.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.scoringConfig.findUnique({ where: { version: config.version } });
    if (existing) {
      if (existing.contentHash === contentHash) {
        console.log(`\nAlready seeded and unchanged (id ${existing.id}). Nothing to do.`);
        return;
      }
      throw new Error(
        `ScoringConfig "${config.version}" exists with a DIFFERENT contentHash.\n` +
          `  stored: ${existing.contentHash}\n  now:    ${contentHash}\n` +
          `A configuration change must be a NEW approved version, never an edit to a version ` +
          `that historical runs already reference. Bump the version in the skill's ` +
          `scoring-config block and re-run.`,
      );
    }

    const row = await prisma.scoringConfig.create({
      data: {
        version: config.version,
        weights: config.weights,
        thresholds: config.thresholds,
        caps: config.caps,
        effectiveFrom: new Date(),
        approvalState: "approved",
        contentHash,
      },
    });
    console.log(`\nSeeded ScoringConfig ${row.version} (id ${row.id}), approvalState=approved.`);
    console.log(`Frozen block:\n${block}`);
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("seed-scoring-config.mjs");
if (invokedDirectly) {
  main().catch((err) => {
    console.error(String(err.message || err));
    process.exit(1);
  });
}
