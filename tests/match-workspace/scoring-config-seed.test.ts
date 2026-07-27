import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { prisma } from "../setup/test-db";
import { readScoringConfig, hashScoringConfigBlock } from "../../scripts/seed-scoring-config.mjs";
import { extractScoringConfigBlock, parseScoringConfig } from "../../scripts/build-matcher-emit-skill.mjs";

const SPEC = join(process.cwd(), "docs", "match-workspace", "MATCHER-EMIT-STAGE.md");

/**
 * The seed script is plain JS, so TypeScript infers `{}` for its parsed output and every property
 * access is an error. Declaring the shape here keeps `tsc --noEmit` clean without weakening the
 * assertions: this IS the shape the Stage-4C formula consumes.
 */
type WeightRow = { fit: number; i19: number; i20: number };
type ParsedScoringConfig = {
  version: string;
  weights: Record<"COMPREHENSIVE" | "MODERATE" | "MINIMAL", WeightRow>;
  thresholds: Record<string, string>;
  caps: { redFlag: number; prideGate_no: number; prideGate_unknown: number };
};
const parseSpec = (spec: string) =>
  readScoringConfig(spec) as unknown as { config: ParsedScoringConfig; contentHash: string };

describe("ScoringConfig seed [C-14]", () => {
  it("parses the frozen block into the weight rows the scoring formula uses", () => {
    const { config } = parseSpec(SPEC);
    expect(config.version).toMatch(/^matcher-/);
    // These three rows ARE the Stage-4C combined-score formula; drift here changes every score.
    expect(config.weights.COMPREHENSIVE).toEqual({ fit: 0.5, i19: 0.25, i20: 0.25 });
    expect(config.weights.MODERATE).toEqual({ fit: 0.55, i19: 0.15, i20: 0.3 });
    expect(config.weights.MINIMAL).toEqual({ fit: 0.6, i19: 0.1, i20: 0.3 });
    expect(config.caps.redFlag).toBe(0.7);
    expect(config.caps.prideGate_no).toBe(0.74);
    expect(config.caps.prideGate_unknown).toBe(0.82);
  });

  it("hashes stably across reflowing, and CHANGES when a weight changes", () => {
    const { block, contentHash } = readScoringConfig(SPEC);
    // Re-indenting or double-spacing is not a configuration change.
    const reflowed = block.split("\n").map((l) => `   ${l}   `).join("\n");
    expect(hashScoringConfigBlock(reflowed)).toBe(contentHash);
    // Changing a single weight is.
    const tampered = block.replace("fit=0.50", "fit=0.55");
    expect(tampered).not.toBe(block);
    expect(hashScoringConfigBlock(tampered)).not.toBe(contentHash);
  });

  it("seeds an approved row, and re-seeding the same version is a no-op", async () => {
    const { config, contentHash } = parseSpec(SPEC);
    const created = await prisma.scoringConfig.create({
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
    expect(created.approvalState).toBe("approved");

    // The seed's idempotency check: same version + same hash means nothing to do.
    const existing = await prisma.scoringConfig.findUniqueOrThrow({ where: { version: config.version } });
    expect(existing.contentHash).toBe(contentHash);

    // And the same version can never be created twice (@unique), so an edit cannot masquerade
    // as a re-seed. A configuration change must be a NEW version.
    await expect(
      prisma.scoringConfig.create({
        data: {
          version: config.version,
          weights: {},
          thresholds: {},
          caps: {},
          effectiveFrom: new Date(),
          approvalState: "approved",
          contentHash: "different-hash",
        },
      }),
    ).rejects.toBeTruthy();
  });
});

/**
 * The drift guard. If the matcher skill's weights are edited without bumping the version, the
 * "approved config" check in [C-14] would pass while runs were scored under different
 * arithmetic. This compares the spec doc against the real skill file and fails on divergence.
 *
 * Skipped when the matcher repo is not present (CI, a fresh clone, the Mini), because the skill
 * is not vendored into this repo. A skip is loud, not silent.
 */
const MATCHER_SKILL = join(homedir(), "Projects", "candidate-matcher", "franchise-candidate-matcher.skill");

describe("scoring-config drift vs the live matcher skill", () => {
  const available = existsSync(MATCHER_SKILL);

  it.skipIf(!available)("the spec's frozen block matches the skill, or the skill has none yet", () => {
    const work = mkdtempSync(join(tmpdir(), "skill-drift-"));
    try {
      execFileSync("unzip", ["-q", "-o", MATCHER_SKILL, "-d", work]);
      const skillMd = join(work, "franchise-candidate-matcher", "SKILL.md");
      const text = readFileSync(skillMd, "utf8");

      if (!text.includes("```scoring-config")) {
        // Expected until the emit stage is built and re-uploaded. Assert the precondition that
        // makes the append safe, so this still tests something real.
        expect(text).not.toContain("STAGE 6: Match-Workspace Export");
        return;
      }

      const skillBlock = extractScoringConfigBlock(text);
      const { contentHash } = readScoringConfig(SPEC);
      expect(
        hashScoringConfigBlock(skillBlock),
        "The matcher skill's scoring-config block has drifted from docs/match-workspace/" +
          "MATCHER-EMIT-STAGE.md. Reconcile them and bump the version if any weight changed.",
      ).toBe(contentHash);
      expect(parseScoringConfig(skillBlock).weights).toEqual(readScoringConfig(SPEC).config.weights);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });

  it("reports whether the drift check actually ran (a silent skip would hide drift)", () => {
    if (!available) {
      console.warn(`[drift check SKIPPED] matcher skill not found at ${MATCHER_SKILL}`);
    }
    expect(typeof available).toBe("boolean");
  });
});
