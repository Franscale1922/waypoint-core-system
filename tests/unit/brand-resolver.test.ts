import { describe, it, expect } from "vitest";
import {
  resolveBrandName,
  resolveExplicitId,
  resolvePackageBrands,
  BRAND_MAP_PROVENANCE,
} from "@/lib/match-workspace/brand-resolver";
import { normalizeNameKey } from "@/lib/match-workspace/brand-name-key.mjs";
import map from "@/lib/match-workspace/brand-identity-map.json";

/**
 * Every fixture below was read out of the generated map rather than guessed, because a rejection
 * test that passes for the wrong reason is worse than no test. Two specific traps this suite is
 * shaped to avoid:
 *
 *   1. "a slug is rejected when passed as a name" is FALSE for 49 of the 267 slugs, whose slug is
 *      byte-identical to a real name key (poolwerx, spenga, bio-one). Asserting it generally would
 *      encode a bug. So this suite asserts the rejection with a slug that genuinely folds
 *      (Tierra-Encantada) and separately asserts the POSITIVE case, so nobody later "fixes" it.
 *   2. "Scooter's Coffee is rejected" proves nothing about fold refusal: it is in the registry's
 *      unresolved_alias_targets and is not a brand record at all, so it would reject against a
 *      resolver with no folding logic whatsoever.
 */

const TIERRA = "wpb_00386311e1b551e6a9baa54a383985aa"; // Tierra Encantada
const POOLWERX = "wpb_d29e95335ccc5f4798806c44de600076";
const SOLENVIA = "wpb_dff969447a0f55a08b3292b59d9c7e0b"; // display "Solenvia Caregivers", alias "Solenvia"
const DURO_FLEET = "wpb_c09010563f3c566db03837b59aa5c49e"; // the one non-active record
const PAINTING_360 = "wpb_6a33e74cbc0c5fd09146d5ecfb16388b"; // carries the non-ASCII alias "360° Painting"

const matched = (name: string) => {
  const r = resolveBrandName(name);
  if (r.status !== "MATCHED") throw new Error(`expected ${name} to match, got ${r.reason}`);
  return r;
};

describe("resolveBrandName: exact identity only", () => {
  it("resolves a display name", () => {
    expect(matched("Tierra Encantada").waypointBrandId).toBe(TIERRA);
  });

  it("resolves an alias to the same brand as its display name", () => {
    expect(matched("Solenvia").waypointBrandId).toBe(SOLENVIA);
    expect(matched("Solenvia Caregivers").waypointBrandId).toBe(SOLENVIA);
  });

  it("is insensitive to case and surrounding whitespace", () => {
    for (const variant of ["POOLWERX", "poolwerx", "  Poolwerx  ", "\tPoolwerx\n"]) {
      expect(matched(variant).waypointBrandId).toBe(POOLWERX);
    }
  });

  it("folds NFD input to NFC before keying", () => {
    // No brand name in the registry is decomposable today (the only non-ASCII characters are
    // degree signs, which have no decomposition), so this exercises the normalizer directly
    // rather than pretending a real name is affected. It matters for pasted spreadsheet input,
    // and it is the axis on which this resolver is deliberately looser than the Python authority.
    const composed = "Café Brand";
    const decomposed = composed.normalize("NFD");
    expect(decomposed).not.toBe(composed);
    expect(normalizeNameKey(decomposed)).toBe(normalizeNameKey(composed));
    expect(normalizeNameKey(decomposed)).toBe("café brand");
  });

  it("resolves a name carrying a non-ASCII symbol", () => {
    // The degree sign is uncased, so case folding and lowercasing agree and the build gate passes it.
    expect(matched("360° Painting").waypointBrandId).toBe(PAINTING_360);
    expect(matched("360 Painting").waypointBrandId).toBe(PAINTING_360);
  });

  it("resolves a slug that is genuinely also a name key, and reports it as an exact match", () => {
    // 49 of 267 slugs are byte-identical to a name key. This is correct behavior, not a leak:
    // the display name simply lowercases to the same string. Asserted so it is never "fixed".
    const r = matched("poolwerx");
    expect(r.waypointBrandId).toBe(POOLWERX);
    expect(r.via).toBe("exact_identity");
  });

  it("REJECTS a slug that only matches after punctuation folding", () => {
    // "Tierra-Encantada" folds to the same key as "Tierra Encantada". The authority returns
    // PROPOSAL here (identity_resolution.py:202-226), never `matched`, so we refuse it.
    const r = resolveBrandName("Tierra-Encantada");
    expect(r.status).toBe("REJECTED");
    expect(r).toMatchObject({ reason: "UNKNOWN_BRAND_NAME" });
  });

  it("REJECTS an unknown name and an empty name", () => {
    for (const bad of ["Definitely Not A Franchise", "", "   "]) {
      expect(resolveBrandName(bad)).toMatchObject({ status: "REJECTED", reason: "UNKNOWN_BRAND_NAME" });
    }
  });

  it("carries lifecycle state through, without letting it decide the match", () => {
    // The authority never consults lifecycle_state, so a non-active record still resolves.
    const r = matched("Duro Fleet");
    expect(r.waypointBrandId).toBe(DURO_FLEET);
    expect(r.brand.lifecycleState).not.toBe("active");
  });
});

describe("resolveExplicitId: the operator escape valve", () => {
  it("resolves an id that exists in the map", () => {
    const r = resolveExplicitId(POOLWERX);
    expect(r).toMatchObject({ status: "MATCHED", waypointBrandId: POOLWERX, via: "explicit_waypoint_id" });
  });

  it("REJECTS a well-formed id that is not in the map", () => {
    expect(resolveExplicitId("wpb_" + "0".repeat(32))).toMatchObject({
      status: "REJECTED",
      reason: "UNKNOWN_WAYPOINT_BRAND_ID",
    });
  });

  it("REJECTS a malformed id rather than treating it as a name", () => {
    for (const bad of ["Poolwerx", "wpb_short", "wpb_" + "Z".repeat(32), POOLWERX.toUpperCase(), ""]) {
      expect(resolveExplicitId(bad)).toMatchObject({
        status: "REJECTED",
        reason: "MALFORMED_WAYPOINT_BRAND_ID",
      });
    }
  });
});

describe("resolvePackageBrands: whole-package fail-closed", () => {
  const pkg = (...names: string[]) => ({ brands: names.map((brandName) => ({ brandName })) }) as never;

  it("resolves a clean package", () => {
    const r = resolvePackageBrands(pkg("Tierra Encantada", "Poolwerx", "Solenvia"));
    expect(r.ok).toBe(true);
    expect(r.resolved.map((x) => x.waypointBrandId)).toEqual([TIERRA, POOLWERX, SOLENVIA]);
    expect(r.warnings).toEqual([]);
  });

  it("rejects the WHOLE package when a single brand fails, and still reports the good ones", () => {
    const r = resolvePackageBrands(pkg("Tierra Encantada", "Nope Not Real", "Poolwerx"));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.rejections).toHaveLength(1);
    expect(r.rejections[0].brandName).toBe("Nope Not Real");
    // The point of the rule: two good brands are NOT imported alone, because dropping one would
    // silently renumber the ranked slate.
    expect(r.resolved).toHaveLength(2);
  });

  it("detects two different names collapsing onto one brand, and names the pair", () => {
    const r = resolvePackageBrands(pkg("Solenvia", "Solenvia Caregivers"));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.rejections).toHaveLength(2);
    expect(r.rejections[0].message).toContain("both resolve to the same brand");
    expect(r.rejections[0].message).toContain(SOLENVIA);
  });

  it("an explicit binding unblocks an otherwise-unknown name", () => {
    const blocked = resolvePackageBrands(pkg("Tierra Encantada", "Brand Not Yet In The Map"));
    expect(blocked.ok).toBe(false);

    const unblocked = resolvePackageBrands(pkg("Tierra Encantada", "Brand Not Yet In The Map"), {
      "Brand Not Yet In The Map": POOLWERX,
    });
    expect(unblocked.ok).toBe(true);
    expect(unblocked.resolved[1]).toMatchObject({ waypointBrandId: POOLWERX, via: "explicit_waypoint_id" });
  });

  it("an explicit binding to an id that is not in the map is still refused", () => {
    const r = resolvePackageBrands(pkg("Brand Not Yet In The Map"), {
      "Brand Not Yet In The Map": "wpb_" + "0".repeat(32),
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.rejections[0].reason).toBe("UNKNOWN_WAYPOINT_BRAND_ID");
  });

  it("warns but does not reject when a resolved brand is not active", () => {
    const r = resolvePackageBrands(pkg("Duro Fleet"));
    expect(r.ok).toBe(true);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain("unresolved");
  });
});

describe("provenance", () => {
  it("exposes the hashes the import records on the run", () => {
    expect(BRAND_MAP_PROVENANCE.registrySha256).toMatch(/^[0-9a-f]{64}$/);
    expect(BRAND_MAP_PROVENANCE.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(BRAND_MAP_PROVENANCE.registryVersion).toBe(map.registryVersion);
  });
});
