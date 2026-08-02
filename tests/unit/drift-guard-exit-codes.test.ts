import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { OUTPUT_PATH, DEFAULT_REGISTRY_PATH } from "../../scripts/build-brand-map.mjs";

/**
 * registry-availability.test.ts proves the RULE is right. This proves the two things that ACT on it
 * are right, which is a separate question and the one that actually gates work:
 *
 *   node scripts/build-brand-map.mjs --check   what .githooks/pre-push runs before every push
 *   node scripts/build-brand-map.mjs           the write path, which must never skip
 *
 * Without these, mutations that disarm the guard leave the suite green. Verified by mutation: making
 * the skip fire for any non-available status, or dropping the `check &&` qualifier, is caught here
 * and by nothing else.
 *
 * Real child processes, because the exit code IS the contract: the hook branches on it and vitest
 * cannot observe process.exit() in-process.
 */

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "scripts", "build-brand-map.mjs");

/** Run the script with a scrubbed env, so the developer's own HOME/BIP_REGISTRY_PATH cannot leak in. */
function runCheck(env: Record<string, string>, args: string[] = ["--check"]) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    env: { PATH: process.env.PATH ?? "", ...env },
    encoding: "utf8",
  });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

/** A HOME whose Projects/brand-intelligence-pipeline does not exist at all. */
function homeWithoutRepo() {
  return mkdtempSync(join(tmpdir(), "drift-no-repo-"));
}

/** A HOME where the repo root exists but holds no registry: the registry MOVED. */
function homeWithEmptyRepo() {
  const home = mkdtempSync(join(tmpdir(), "drift-empty-repo-"));
  mkdirSync(join(home, "Projects", "brand-intelligence-pipeline", "config", "identity"), { recursive: true });
  return home;
}

describe("build-brand-map --check: exit codes the pre-push hook depends on", () => {
  it("exits 0 and says so when the sibling repo is genuinely absent", () => {
    const { code, out } = runCheck({ HOME: homeWithoutRepo() });
    expect(code).toBe(0);
    expect(out).toContain("BRAND_MAP_DRIFT_SKIPPED");
  });

  it("exits 1 when the repo is present but the registry moved", () => {
    // The mutation this kills: skipping on any non-"available" status. That would make the hook
    // wave through a genuinely moved registry, which is the drift the guard exists for.
    const { code, out } = runCheck({ HOME: homeWithEmptyRepo() });
    expect(code).toBe(1);
    expect(out).not.toContain("BRAND_MAP_DRIFT_SKIPPED");
  });

  it("exits 1 on a bad explicit BIP_REGISTRY_PATH even when the repo is also absent", () => {
    const { code, out } = runCheck({ HOME: homeWithoutRepo(), BIP_REGISTRY_PATH: "/nonexistent/registry.json" });
    expect(code).toBe(1);
    expect(out).not.toContain("BRAND_MAP_DRIFT_SKIPPED");
  });

  it("exits 1 when HOME is set but EMPTY, rather than reading as an absent repo", () => {
    // HOME="" makes os.homedir() return "", collapsing the repo root to a RELATIVE path that misses.
    // Left alone that silently disarms the guard on a machine that does have the registry.
    const { code, out } = runCheck({ HOME: "" });
    expect(code).toBe(1);
    expect(out).not.toContain("BRAND_MAP_DRIFT_SKIPPED");
  });
});

describe("build-brand-map --check: the skip still verifies everything a registry is not needed for", () => {
  /** Drive artifactSelfCheck against an arbitrary path, so the committed artifact is never touched. */
  function selfCheck(path: string) {
    const probe = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { artifactSelfCheck } from ${JSON.stringify(SCRIPT)};
         const problem = artifactSelfCheck(${JSON.stringify(path)});
         console.log(problem === null ? "OK" : problem);`,
      ],
      { encoding: "utf8" },
    );
    return probe.stdout.trim();
  }

  it("reports a missing artifact, even with no registry to compare against", () => {
    // Guards the fresh-clone hole: no sibling repo AND no node_modules means the hook skips the
    // vitest suites too, so this is the only thing left looking at the artifact.
    expect(selfCheck(join(mkdtempSync(join(tmpdir(), "drift-absent-")), "nope.json"))).toContain("does not exist");
  });

  it("passes the real committed artifact", () => {
    // The negative cases above only mean something if the positive one is not also "a problem".
    expect(selfCheck(OUTPUT_PATH)).toBe("OK");
  });

  it("reports an artifact that is not valid JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "drift-badjson-"));
    const path = join(dir, "brand-identity-map.json");
    writeFileSync(path, "{ truncated mid-w");
    expect(selfCheck(path)).toContain("not valid JSON");
  });

  it("detects a hand-edited artifact via its own contentHash without any registry", () => {
    // Done in a temp copy so the real committed artifact is never touched.
    const tampered = JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
    const firstBrand = Object.keys(tampered.brands)[0];
    tampered.brands[firstBrand].displayName = "TAMPERED";
    const dir = mkdtempSync(join(tmpdir(), "drift-tampered-"));
    const copy = join(dir, "brand-identity-map.json");
    writeFileSync(copy, JSON.stringify(tampered, null, 2) + "\n");

    expect(selfCheck(copy)).toContain("edited by hand");
  });
});

describe("build-brand-map (write path): never skips", () => {
  it("exits 1 without writing when there is no registry to build from", () => {
    // The mutation this kills: dropping the `check &&` qualifier on the skip, which would make the
    // write path exit 0 having written nothing while the user believes the map regenerated.
    const before = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, "utf8") : null;
    const { code, out } = runCheck({ HOME: homeWithoutRepo() }, []);
    expect(code).toBe(1);
    expect(out).not.toContain("BRAND_MAP_DRIFT_SKIPPED");
    expect(out).toContain("BRAND_MAP_BUILD_FAILED");
    // and it left the committed artifact alone
    expect(existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, "utf8") : null).toBe(before);
  });
});

describe("build-brand-map --check: the happy path still actually compares", () => {
  it("exits 0 against the real registry when it is present on this machine", () => {
    // Conditional by necessity: on a machine without the pipeline repo there is nothing to compare.
    // It asserts the POSITIVE case rather than skipping silently, so a machine that can run it does.
    if (!existsSync(DEFAULT_REGISTRY_PATH)) {
      expect(runCheck({ HOME: homeWithoutRepo() }).code).toBe(0);
      return;
    }
    const { code, out } = runCheck({ HOME: process.env.HOME ?? "" });
    expect(code).toBe(0);
    expect(out).toContain("in sync");
    expect(out).not.toContain("BRAND_MAP_DRIFT_SKIPPED");
  });
});
