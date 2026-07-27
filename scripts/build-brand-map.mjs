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
 * Read-only with respect to the pipeline repo: it never writes there.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { normalizeNameKey, hasCasefoldDivergence, namesOf } from "../src/lib/match-workspace/brand-name-key.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const DEFAULT_REGISTRY_PATH = join(
  homedir(),
  "Projects",
  "brand-intelligence-pipeline",
  "config",
  "identity",
  "registry.v3.json",
);

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
  const registryPath = process.env.BIP_REGISTRY_PATH || DEFAULT_REGISTRY_PATH;

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
