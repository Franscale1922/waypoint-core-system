import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  buildMap,
  serializeMap,
  readRegistry,
  OUTPUT_PATH,
  DEFAULT_REGISTRY_PATH,
} from "../../scripts/build-brand-map.mjs";
import map from "@/lib/match-workspace/brand-identity-map.json";

/**
 * The committed brand map is generated from a registry that lives in a DIFFERENT repository. That
 * makes drift the realistic failure: the registry moves, the artifact does not, and imports start
 * refusing brands that exist.
 *
 * This repo has no CI job that runs tests (workflows exist, but they run the link and content
 * audits, and a free-plan private repo cannot make any check blocking anyway). So this file plus
 * the pre-push hook ARE the enforcement. It therefore fails hard when the registry is missing
 * rather than skipping: a guard whose default state is "skipped" is not a guard. Opt out
 * explicitly with SKIP_BIP_DRIFT=1, or point at a copy with BIP_REGISTRY_PATH.
 */

const registryPath = process.env.BIP_REGISTRY_PATH || DEFAULT_REGISTRY_PATH;
const skip = process.env.SKIP_BIP_DRIFT === "1";

describe("brand-identity-map.json: shape and self-consistency (always runs)", () => {
  it("exists and is committed", () => {
    expect(existsSync(OUTPUT_PATH), `${OUTPUT_PATH} is missing. Run: node scripts/build-brand-map.mjs`).toBe(true);
  });

  it("declares a contentHash that matches its own body", () => {
    // Circular on its own, which is exactly why it is not the drift check: it proves the file was
    // not hand-edited or truncated, nothing more. The registry comparison below proves it is current.
    const { contentHash, ...body } = map as Record<string, unknown> & { contentHash: string };
    expect(createHash("sha256").update(JSON.stringify(body)).digest("hex")).toBe(contentHash);
  });

  it("carries full-length provenance hashes, not truncated ones", () => {
    expect(map.registrySha256).toMatch(/^[0-9a-f]{64}$/);
    expect(map.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("has a plausible corpus and every name key points at a known brand", () => {
    const brandIds = new Set(Object.keys(map.brands));
    expect(brandIds.size).toBeGreaterThan(200);
    expect(Object.keys(map.nameKeys).length).toBeGreaterThanOrEqual(brandIds.size);
    for (const [key, ids] of Object.entries(map.nameKeys)) {
      expect(ids.length, `name key ${key} has no ids`).toBeGreaterThan(0);
      for (const id of ids) expect(brandIds.has(id), `${key} points at unknown brand ${id}`).toBe(true);
    }
  });

  it("has no name key that maps to two ACTIVE brands", () => {
    // An active-versus-historical collision is legitimate and becomes a runtime AMBIGUOUS
    // rejection. Two ACTIVE brands sharing a name would make a current brand unresolvable, which
    // the build refuses; this asserts the committed file honors that.
    const offenders = Object.entries(map.nameKeys).filter(
      ([, ids]) => ids.filter((id) => map.brands[id as keyof typeof map.brands]?.lifecycleState === "active").length > 1,
    );
    expect(offenders.map(([k]) => k)).toEqual([]);
  });

  it("stores every name key already normalized", () => {
    for (const key of Object.keys(map.nameKeys)) {
      expect(key).toBe(key.normalize("NFC").trim().toLowerCase());
    }
  });

  it("contains no key whose case folding would differ from lowercasing", () => {
    // This is what keeps the JS resolver and the Python authority from disagreeing on a name.
    const residual = /\p{Changes_When_Casefolded}/u;
    expect(Object.keys(map.nameKeys).filter((k) => residual.test(k))).toEqual([]);
  });

  it("does not index current_slug as a name key, except where a slug IS also a real name", () => {
    // Verifying the exclusion by counting: if slugs were indexed, every one of the 267 would be a
    // key. Only the subset that genuinely coincides with a display name or alias should be.
    const slugs = Object.values(map.brands).map((b) => b.slug.toLowerCase());
    const present = slugs.filter((s) => s in map.nameKeys).length;
    expect(present).toBeGreaterThan(0);
    expect(present).toBeLessThan(slugs.length);
  });
});

describe.skipIf(skip)("brand-identity-map.json: drift against the live registry", () => {
  it("the registry is reachable", () => {
    expect(
      existsSync(registryPath),
      `Identity registry not found at ${registryPath}. It lives in the brand-intelligence-pipeline ` +
        `repo. Point BIP_REGISTRY_PATH at it, or set SKIP_BIP_DRIFT=1 to opt out deliberately.`,
    ).toBe(true);
  });

  it("regenerates byte-identically from the registry", () => {
    const { registry, registrySha256 } = readRegistry(registryPath);
    const rebuilt = serializeMap(buildMap(registry, registrySha256));
    const onDisk = readFileSync(OUTPUT_PATH, "utf8");
    expect(
      rebuilt === onDisk,
      "The committed brand map no longer matches what the registry produces. Regenerate and review " +
        "the diff: node scripts/build-brand-map.mjs",
    ).toBe(true);
  });

  it("the recorded registrySha256 is the hash of the registry actually on disk", () => {
    const { registrySha256 } = readRegistry(registryPath);
    expect(map.registrySha256).toBe(registrySha256);
  });
});
