import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  registryAvailability,
  shouldSkipDrift,
  DEFAULT_REGISTRY_REPO_ROOT,
  DEFAULT_REGISTRY_PATH,
} from "../../scripts/build-brand-map.mjs";

/**
 * `registryAvailability` is the one function in this repo that can turn a guard off. The drift check
 * in brand-map-drift.test.ts skips when it answers "absent-repo", so a bug here would make every run
 * green while nothing was actually compared, which is strictly worse than the red run the skip
 * exists to prevent.
 *
 * So it is asserted directly, with `exists` and `env` injected, rather than only through its
 * callers: no real filesystem, no process.env mutation, identical result on every machine. A test
 * that had to stage directories to reach these branches would be the kind that quietly stops
 * covering them.
 */

const ROOT = "/fake/Projects/brand-intelligence-pipeline";
const REGISTRY = join(ROOT, "config", "identity", "registry.v3.json");

/** `exists` stubbed from an explicit set of present paths. */
const withPaths = (...present: string[]) => (p: string) => present.includes(p);

describe("registryAvailability: the only path that may skip is a missing sibling repo", () => {
  it("reports available when the registry is readable", () => {
    const result = registryAvailability({ env: {}, repoRoot: ROOT, exists: withPaths(ROOT, REGISTRY) });
    expect(result.status).toBe("available");
    expect(result.path).toBe(REGISTRY);
    expect(result.explicit).toBe(false);
  });

  it("reports absent-repo ONLY when the repo root itself is not there", () => {
    const result = registryAvailability({ env: {}, repoRoot: ROOT, exists: withPaths() });
    expect(result.status).toBe("absent-repo");
    expect(result.reason).toContain(ROOT);
  });

  it("reports missing, not absent-repo, when the repo is present but the registry moved", () => {
    // The realistic drift: the pipeline repo is checked out, the registry is not where it was.
    // Skipping here would silently stop verifying the artifact on the one machine that can verify it.
    const result = registryAvailability({ env: {}, repoRoot: ROOT, exists: withPaths(ROOT) });
    expect(result.status).toBe("missing");
  });
});

describe("registryAvailability: an explicit BIP_REGISTRY_PATH is opting in, so it never skips", () => {
  it("uses the override path and marks it explicit", () => {
    const env = { BIP_REGISTRY_PATH: "/elsewhere/registry.v3.json" };
    const result = registryAvailability({ env, repoRoot: ROOT, exists: withPaths("/elsewhere/registry.v3.json") });
    expect(result.status).toBe("available");
    expect(result.path).toBe("/elsewhere/registry.v3.json");
    expect(result.explicit).toBe(true);
  });

  it("fails hard on a bad override EVEN when the sibling repo is also absent", () => {
    // The trap: `absent-repo` is true of this machine, but the user named a path. A typo in
    // BIP_REGISTRY_PATH must not be laundered into a skip.
    const env = { BIP_REGISTRY_PATH: "/typo/registry.v3.json" };
    const result = registryAvailability({ env, repoRoot: ROOT, exists: withPaths() });
    expect(result.status).toBe("missing");
    expect(result.explicit).toBe(true);
  });

  it("treats an empty BIP_REGISTRY_PATH as unset rather than as a path", () => {
    // `BIP_REGISTRY_PATH= npm test` is how a shell clears it; it must not become a lookup of "".
    const result = registryAvailability({ env: { BIP_REGISTRY_PATH: "" }, repoRoot: ROOT, exists: withPaths(ROOT, REGISTRY) });
    expect(result.status).toBe("available");
    expect(result.explicit).toBe(false);
    expect(result.path).toBe(REGISTRY);
  });
});

describe("registryAvailability: a broken environment is not an absent repo", () => {
  it("reports missing, not absent-repo, when the repo root is not an absolute path", () => {
    // HOME="" makes os.homedir() return "", so the default root collapses to the relative
    // "Projects/brand-intelligence-pipeline", existsSync resolves it against cwd and misses, and the
    // guard would skip on a machine that has the registry. Reachable under `env -i`, minimal
    // containers, and some launchd/cron contexts.
    const result = registryAvailability({ env: {}, repoRoot: "Projects/brand-intelligence-pipeline", exists: withPaths() });
    expect(result.status).toBe("missing");
    expect(result.reason).toContain("absolute");
  });

  it("still reports absent-repo for an absolute root that is simply not there", () => {
    // The fix above must not swallow the legitimate case it sits next to.
    expect(registryAvailability({ env: {}, repoRoot: ROOT, exists: withPaths() }).status).toBe("absent-repo");
  });
});

describe("shouldSkipDrift: the decision the drift test acts on", () => {
  const available = { status: "available", path: REGISTRY, explicit: false, reason: "" };
  const absentRepo = { status: "absent-repo", path: REGISTRY, explicit: false, reason: "no repo here" };
  const missing = { status: "missing", path: REGISTRY, explicit: false, reason: "registry moved" };

  it("does not skip when the registry is available", () => {
    expect(shouldSkipDrift({ env: {}, availability: available }).skip).toBe(false);
  });

  it("does not skip when the registry is merely missing", () => {
    // The mutation this kills: `status !== "available"` instead of `=== "absent-repo"`, which would
    // turn a moved registry and a bad BIP_REGISTRY_PATH into silent passes. That includes the
    // user's own repro command, which must keep failing.
    expect(shouldSkipDrift({ env: {}, availability: missing }).skip).toBe(false);
  });

  it("skips when the sibling repo is absent, and explains why", () => {
    const { skip, why } = shouldSkipDrift({ env: {}, availability: absentRepo });
    expect(skip).toBe(true);
    expect(why).toBe("no repo here");
  });

  it("skips on SKIP_BIP_DRIFT=1 with its own distinct explanation", () => {
    const { skip, why } = shouldSkipDrift({ env: { SKIP_BIP_DRIFT: "1" }, availability: available });
    expect(skip).toBe(true);
    expect(why).toContain("SKIP_BIP_DRIFT=1");
  });

  it("treats only the documented value 1 as the opt-out", () => {
    // The hook used `-z`, so SKIP_BIP_DRIFT=0 disabled the push guard while the test still ran it.
    // Both now test for exactly "1"; this pins the half that lives in JS.
    for (const value of ["0", "", "false", "no", "true"]) {
      expect(shouldSkipDrift({ env: { SKIP_BIP_DRIFT: value }, availability: available }).skip).toBe(false);
    }
  });
});

describe("registryAvailability: the real defaults stay wired to the sibling repo", () => {
  it("derives the default registry path from the exported repo root", () => {
    // Guards the refactor that split these two constants apart: if they ever stop agreeing, the
    // drift test and the pre-push hook would be checking different files.
    expect(DEFAULT_REGISTRY_PATH.startsWith(DEFAULT_REGISTRY_REPO_ROOT)).toBe(true);
    expect(DEFAULT_REGISTRY_PATH).toBe(join(DEFAULT_REGISTRY_REPO_ROOT, "config", "identity", "registry.v3.json"));
  });

  it("defaults to that path when no override and no injection are supplied", () => {
    const result = registryAvailability({ env: {}, exists: withPaths(DEFAULT_REGISTRY_REPO_ROOT, DEFAULT_REGISTRY_PATH) });
    expect(result.path).toBe(DEFAULT_REGISTRY_PATH);
    expect(result.status).toBe("available");
  });
});
