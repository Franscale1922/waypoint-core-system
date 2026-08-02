#!/usr/bin/env node
/**
 * Generate `src/lib/match-workspace/brand-identity-map.json` from the brand-intelligence
 * pipeline's identity registry.
 *
 * WHY A COMMITTED BUILD ARTIFACT
 * ------------------------------
 * Brand identity is resolved on the import write path, and that path's whole purpose is an
 * immutable record. A runtime fetch to a sibling repository would make every historical write
 * depend on a filesystem that is not present in production and can change underneath us. A
 * generated, committed, reviewable file makes the identity used by a given deploy a fixed,
 * inspectable fact, and the run rows record the exact hashes they resolved against.
 *
 * WHAT IS INDEXED, AND WHAT IS NOT
 * --------------------------------
 * Names come from `display_name`, `aliases`, `former_names`, `dba_names` (see
 * `src/lib/match-workspace/brand-name-key.mjs` for why `current_slug` and the BrandDB spelling
 * are excluded).
 *
 * EVERY record is indexed, whatever its `lifecycle_state`. The authority does the same: nothing
 * in `resolve_identity` reads lifecycle at all. Filtering to active records here would be wrong
 * twice over. It would turn a Python AMBIGUOUS_EXACT_IDENTITY into a confident single match
 * whenever an active and a historical record share a name, and the first time a brand is marked
 * `renamed` it would retroactively make every past package naming that brand unimportable, since
 * one unresolved brand rejects a whole package. Lifecycle is carried into the result so the
 * CALLER can decide, where the message can name the successor.
 *
 * USAGE
 *   node scripts/build-brand-map.mjs            write the artifact
 *   node scripts/build-brand-map.mjs --check     rebuild in memory and fail on any drift
 *   BIP_REGISTRY_PATH=/path/to/registry.v3.json  override the source
 *
 * WHEN THE REGISTRY IS NOT ON THIS MACHINE
 * ----------------------------------------
 * The pipeline is a SIBLING repo, so not every clone has it. `--check` distinguishes two cases that
 * look identical from a bare `existsSync` on the registry file:
 *
 *   the repo root is absent   nothing to compare against and nothing suspicious about that, so it
 *                             warns and exits 0. This is the only path that skips.
 *   the repo root is present   but the registry file is gone: the registry MOVED, which is exactly
 *                             the drift this guard exists to catch. Exits 1.
 *
 * Setting BIP_REGISTRY_PATH is opting in, so it never skips: a bad explicit path is a hard failure.
 * See `registryAvailability`. The plain (write) invocation never skips either, since you cannot
 * generate an artifact without a source.
 *
 * Read-only with respect to the pipeline repo: it never writes there.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { normalizeNameKey, hasCasefoldDivergence, namesOf } from "../src/lib/match-workspace/brand-name-key.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Root of the sibling pipeline repo. Its presence is what separates "not on this machine" from
 *  "the registry moved", so it is exported and shared rather than re-derived by each caller. */
export const DEFAULT_REGISTRY_REPO_ROOT = join(homedir(), "Projects", "brand-intelligence-pipeline");

export const DEFAULT_REGISTRY_PATH = join(DEFAULT_REGISTRY_REPO_ROOT, "config", "identity", "registry.v3.json");

/**
 * Decide whether the drift comparison can run, and whether being unable to run it is benign.
 *
 * Pure and fully injectable so the rule itself can be unit-tested without a filesystem or an env:
 * this function is the one place that can silently disarm the guard, so it needs to be assertable
 * directly rather than only through its callers.
 *
 * @returns {{status: "available"|"absent-repo"|"missing", path: string, explicit: boolean, reason: string}}
 *   available    the registry is readable; compare and fail hard on any mismatch.
 *   absent-repo  the sibling repo is not checked out here; skip, loudly. THE ONLY SKIP.
 *   missing      a registry was expected at a specific place and is not there; fail hard.
 */
export function registryAvailability({ env = process.env, repoRoot = DEFAULT_REGISTRY_REPO_ROOT, exists = existsSync } = {}) {
  const override = env.BIP_REGISTRY_PATH;
  const explicit = typeof override === "string" && override.length > 0;
  const path = explicit ? override : join(repoRoot, "config", "identity", "registry.v3.json");

  // `reason` is a diagnostic string, so it claims presence only. Readability is proven by actually
  // reading: a directory or a mode-000 file is "present" here and fails hard in readRegistry.
  if (exists(path)) return { status: "available", path, explicit, reason: `registry file is present at ${path}` };

  // A non-absolute repo root means the environment is broken, not that the repo is absent. The live
  // case: HOME="" (set but empty, as in `env -i` wrappers, minimal containers, some launchd/cron
  // contexts) makes os.homedir() return "", so this path collapses to the RELATIVE
  // "Projects/brand-intelligence-pipeline", which existsSync resolves against cwd and misses. Left
  // as absent-repo that silently disarms the guard on a machine that does have the registry, which
  // is the one failure this whole rule exists to prevent. HOME unset entirely is fine: homedir()
  // falls back to getpwuid.
  if (!explicit && !isAbsolute(repoRoot)) {
    return { status: "missing", path, explicit, reason: `the pipeline repo root is not an absolute path (${JSON.stringify(repoRoot)}); HOME is probably set but empty` };
  }

  // An explicit path is a deliberate claim that a registry lives there. Honoring it as "absent" would
  // let a typo in BIP_REGISTRY_PATH turn the guard off silently, which is the failure mode this whole
  // rule is shaped to prevent.
  if (explicit) {
    return { status: "missing", path, explicit, reason: `BIP_REGISTRY_PATH points at ${path}, which does not exist` };
  }

  if (!exists(repoRoot)) {
    return { status: "absent-repo", path, explicit, reason: `the brand-intelligence-pipeline repo is not checked out at ${repoRoot}` };
  }

  return { status: "missing", path, explicit, reason: `the pipeline repo is present at ${repoRoot} but its registry is not at ${path}` };
}

export const OUTPUT_PATH = join(ROOT, "src", "lib", "match-workspace", "brand-identity-map.json");

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

class BuildError extends Error {}

/**
 * Build the map body from a parsed registry. Pure: no filesystem, no process exit, so the drift
 * test can call it directly and compare against the committed file.
 *
 * @param registry parsed registry.v3.json
 * @param registrySha256 hash of the exact bytes the registry was read from
 */
export function buildMap(registry, registrySha256) {
  const records = Array.isArray(registry?.brands) ? registry.brands : null;
  if (!records || records.length === 0) {
    throw new BuildError("registry has no `brands` array; refusing to emit an empty map");
  }

  const brands = {};
  /** @type {Map<string, Set<string>>} */
  const nameKeys = new Map();
  /** Only ACTIVE-versus-ACTIVE collisions are a build failure. See below. */
  const activeByKey = new Map();
  const divergent = [];

  for (const record of records) {
    const id = record.waypoint_brand_id;
    if (typeof id !== "string" || !/^wpb_[0-9a-f]{32}$/.test(id)) {
      throw new BuildError(`record has no valid waypoint_brand_id: ${JSON.stringify(record).slice(0, 200)}`);
    }
    if (brands[id]) throw new BuildError(`duplicate waypoint_brand_id in the registry: ${id}`);

    const lifecycleState = typeof record.lifecycle_state === "string" ? record.lifecycle_state : "unknown";
    brands[id] = {
      displayName: String(record.display_name ?? ""),
      slug: String(record.current_slug ?? ""),
      lifecycleState,
      successorIds: Array.isArray(record.successor_ids) ? [...record.successor_ids].sort() : [],
    };

    for (const raw of namesOf(record)) {
      const key = normalizeNameKey(raw);
      if (!key) continue;

      // A key that still case-folds further would resolve differently in Python than here.
      // Collect them all rather than throwing on the first, so one run reports the whole set.
      if (hasCasefoldDivergence(key)) divergent.push({ key, id, raw });

      if (!nameKeys.has(key)) nameKeys.set(key, new Set());
      nameKeys.get(key).add(id);

      if (lifecycleState === "active") {
        if (!activeByKey.has(key)) activeByKey.set(key, new Set());
        activeByKey.get(key).add(id);
      }
    }
  }

  if (divergent.length > 0) {
    throw new BuildError(
      `${divergent.length} name key(s) contain a character whose Unicode case FOLDING differs from ` +
        `plain lowercasing, so this resolver and the Python authority would disagree on them:\n` +
        divergent.map((d) => `  ${JSON.stringify(d.raw)} -> ${JSON.stringify(d.key)} (${d.id})`).join("\n") +
        `\nResolve upstream in the registry before shipping a map that resolves differently in the two languages.`,
    );
  }

  // Two ACTIVE brands sharing a name key is an upstream data defect: it would make a legitimate,
  // current brand permanently unresolvable. Fail the build. An active-versus-HISTORICAL collision
  // is a real registry state that the authority answers with AMBIGUOUS_EXACT_IDENTITY, so it is
  // allowed through and becomes a runtime rejection instead. That is also what keeps
  // AMBIGUOUS_BRAND_NAME reachable and testable rather than dead code.
  const activeCollisions = [...activeByKey.entries()].filter(([, ids]) => ids.size > 1);
  if (activeCollisions.length > 0) {
    throw new BuildError(
      `${activeCollisions.length} name key(s) map to more than one ACTIVE brand:\n` +
        activeCollisions.map(([k, ids]) => `  ${JSON.stringify(k)} -> ${[...ids].sort().join(", ")}`).join("\n"),
    );
  }

  const body = {
    registryVersion: registry.registry_version ?? null,
    schemaVersion: registry.schema_version ?? null,
    registrySha256,
    sourceHashes: registry.source_hashes ?? {},
    brands: Object.fromEntries(Object.keys(brands).sort().map((k) => [k, brands[k]])),
    nameKeys: Object.fromEntries(
      [...nameKeys.keys()].sort().map((k) => [k, [...nameKeys.get(k)].sort()]),
    ),
  };

  // contentHash covers the body above and is appended last, so verifying means dropping the
  // field and rehashing. Key order is fixed by construction, which is what makes it stable.
  return { ...body, contentHash: sha256(JSON.stringify(body)) };
}

/**
 * Whether the registry comparison should be skipped, and what to say about it. Lives here rather
 * than inline in the drift test so the decision is assertable: logic that only exists inside a test
 * file is logic nothing tests, and this particular decision is the one that can switch a guard off.
 *
 * @returns {{skip: boolean, why: string|null}}
 */
export function shouldSkipDrift({ env = process.env, availability = registryAvailability({ env }) } = {}) {
  if (env.SKIP_BIP_DRIFT === "1") {
    return { skip: true, why: "SKIP_BIP_DRIFT=1 is set, so the registry comparison was opted out of deliberately" };
  }
  if (availability.status === "absent-repo") return { skip: true, why: availability.reason };
  return { skip: false, why: null };
}

/**
 * Everything about the committed artifact that can be checked WITHOUT a registry: that it is there,
 * that it parses, and that its self-declared contentHash still covers its own body. Circular on its
 * own, which is why it is not the drift check, but it does catch a missing, truncated, or
 * hand-edited file. Used on the skip path so "no registry here" never means "nothing verified".
 *
 * @returns {string|null} a description of the problem, or null when the artifact is self-consistent
 */
export function artifactSelfCheck(outputPath = OUTPUT_PATH) {
  if (!existsSync(outputPath)) return `${outputPath} does not exist. Run: node scripts/build-brand-map.mjs`;

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(outputPath, "utf8"));
  } catch (err) {
    return `${outputPath} is not valid JSON (${err.message}). Regenerate: node scripts/build-brand-map.mjs`;
  }

  const { contentHash, ...body } = parsed;
  if (typeof contentHash !== "string" || !/^[0-9a-f]{64}$/.test(contentHash)) {
    return `${outputPath} has no full-length contentHash, so it was truncated or hand-edited.`;
  }
  // Key order is fixed by construction in buildMap and preserved by JSON.parse, so re-stringifying
  // the body reproduces the exact bytes that were hashed.
  const actual = sha256(JSON.stringify(body));
  if (actual !== contentHash) {
    return `${outputPath} declares contentHash ${contentHash} but its body hashes to ${actual}, so it was edited by hand.`;
  }
  return null;
}

/** The exact bytes written to disk. One definition so `--check` compares like for like. */
export function serializeMap(map) {
  return JSON.stringify(map, null, 2) + "\n";
}

export function readRegistry(path) {
  if (!existsSync(path)) {
    throw new BuildError(
      `identity registry not found at ${path}. It lives in the brand-intelligence-pipeline repo. ` +
        `Set BIP_REGISTRY_PATH to point at it.`,
    );
  }
  const bytes = readFileSync(path);
  return { registry: JSON.parse(bytes.toString("utf8")), registrySha256: sha256(bytes) };
}

function main() {
  const check = process.argv.includes("--check");
  const availability = registryAvailability();
  const registryPath = availability.path;

  // Only --check may skip. Writing the artifact without a source is impossible, so that path still
  // falls through to the hard failure in readRegistry below.
  //
  // The skip forgoes the REGISTRY COMPARISON, not all verification. Everything checkable without a
  // registry is still checked, or a fresh clone with no sibling repo and no node_modules (where the
  // hook also skips the vitest suites) would validate the artifact nowhere at all.
  if (check && availability.status === "absent-repo") {
    const problem = artifactSelfCheck();
    if (problem) {
      console.error(`BRAND_MAP_DRIFT: ${problem}`);
      process.exit(1);
    }
    console.error(
      `BRAND_MAP_DRIFT_SKIPPED: ${availability.reason}.\n` +
        `  The committed map is self-consistent, but was NOT compared against a registry on this run.\n` +
        `  Point BIP_REGISTRY_PATH at a copy of registry.v3.json to check it here.`,
    );
    process.exit(0);
  }

  let serialized;
  try {
    const { registry, registrySha256 } = readRegistry(registryPath);
    const map = buildMap(registry, registrySha256);
    serialized = serializeMap(map);
    console.log(
      `registry ${registryPath}\n` +
        `  version ${map.registryVersion}, ${Object.keys(map.brands).length} brands, ` +
        `${Object.keys(map.nameKeys).length} name keys\n` +
        `  registrySha256 ${map.registrySha256}\n  contentHash    ${map.contentHash}`,
    );
  } catch (err) {
    console.error(`BRAND_MAP_BUILD_FAILED: ${err.message}`);
    process.exit(1);
  }

  if (check) {
    if (!existsSync(OUTPUT_PATH)) {
      console.error(`BRAND_MAP_DRIFT: ${OUTPUT_PATH} does not exist. Run: node scripts/build-brand-map.mjs`);
      process.exit(1);
    }
    const onDisk = readFileSync(OUTPUT_PATH, "utf8");
    if (onDisk !== serialized) {
      console.error(
        `BRAND_MAP_DRIFT: the committed artifact does not match what the registry produces now.\n` +
          `Regenerate and review the diff: node scripts/build-brand-map.mjs`,
      );
      process.exit(1);
    }
    console.log("brand map is in sync with the registry.");
    process.exit(0);
  }

  writeFileSync(OUTPUT_PATH, serialized);
  console.log(`wrote ${OUTPUT_PATH} (${serialized.length} bytes)`);
}

const invokedDirectly =
  process.argv[1] && process.argv[1].replace(/\.mjs$/, "").endsWith("build-brand-map");
if (invokedDirectly) main();
