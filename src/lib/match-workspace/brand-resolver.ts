/**
 * Fail-closed resolution of a matcher-emitted brand NAME to a stable `wpb_` identity. [C-3]
 *
 * THE RULE
 * --------
 * A name resolves only on an EXACT identity match, after NFC + trim + lowercase. Anything else is
 * refused: unknown, ambiguous, or merely similar. The authority
 * (`bip/identity_resolution.py`) reaches a `matched` status from four tiers only, and everything
 * below them is hardcoded `PROPOSAL`. A proposal is not a match, so here it is a rejection. Only
 * two of those tiers are reachable in this app, because the matcher emits names and never ids or
 * slugs, and the third is the operator escape valve below.
 *
 * WHY ONE BAD BRAND REJECTS THE WHOLE PACKAGE
 * -------------------------------------------
 * `MatchPackageSchema` requires ranks to be a contiguous 1..n permutation, and the confirmed
 * slate is a subset of the ranked list. Dropping one brand would silently renumber the slate and
 * corrupt the record this domain exists to preserve. Partial import is worse than no import.
 *
 * THE ESCAPE VALVE
 * ----------------
 * A brand present in BrandDB but absent from the committed map would otherwise block the import
 * entirely until an engineer regenerates the map and ships a build. The operator can instead
 * supply that brand's `wpb_` id directly. This is not a loosening: it is a port of the authority's
 * OWN highest-priority tier, `explicit_waypoint_id` (identity_resolution.py:122-131), and the id
 * must already exist in the map, so nothing is guessed, inferred, or fuzzy matched. The binding is
 * recorded on the run with actor and timestamp by the import route.
 */
import identityMap from "./brand-identity-map.json";
import { normalizeNameKey } from "./brand-name-key.mjs";
import type { MatchPackage } from "./package-schema";

export type BrandRecord = {
  displayName: string;
  slug: string;
  lifecycleState: string;
  successorIds: string[];
};

type IdentityMap = {
  registryVersion: number | null;
  schemaVersion: string | null;
  registrySha256: string;
  sourceHashes: Record<string, string>;
  brands: Record<string, BrandRecord>;
  nameKeys: Record<string, string[]>;
  contentHash: string;
};

const MAP = identityMap as unknown as IdentityMap;

/** Provenance the import records on `MatchRun`, so a stored run says how its names became ids. */
export const BRAND_MAP_PROVENANCE = {
  registrySha256: MAP.registrySha256,
  contentHash: MAP.contentHash,
  registryVersion: MAP.registryVersion,
} as const;

export const WAYPOINT_BRAND_ID_PATTERN = /^wpb_[0-9a-f]{32}$/;

/**
 * Display name for a stored `wpb_` id, for read-only surfaces like the worksheet. Falls back to
 * the id rather than inventing a name: a run may reference a brand the current map no longer
 * carries, and showing the raw id is honest where a guess would not be.
 */
export function brandDisplayName(waypointBrandId: string): string {
  return MAP.brands[waypointBrandId]?.displayName ?? waypointBrandId;
}

export type RejectionReason =
  | "UNKNOWN_BRAND_NAME"
  | "AMBIGUOUS_BRAND_NAME"
  | "MALFORMED_WAYPOINT_BRAND_ID"
  | "UNKNOWN_WAYPOINT_BRAND_ID";

export type BrandResolution =
  | {
      status: "MATCHED";
      waypointBrandId: string;
      brand: BrandRecord;
      /** How it resolved. `explicit_id` means an operator supplied the id. */
      via: "exact_identity" | "explicit_waypoint_id";
    }
  | {
      status: "REJECTED";
      reason: RejectionReason;
      input: string;
      /** Populated for AMBIGUOUS_BRAND_NAME: every brand the name could mean. */
      candidates?: string[];
    };

/** Exact-identity resolution. No folding, no similarity, no guessing. */
export function resolveBrandName(name: string): BrandResolution {
  const key = normalizeNameKey(name);
  const ids = key ? MAP.nameKeys[key] : undefined;

  if (!ids || ids.length === 0) {
    return { status: "REJECTED", reason: "UNKNOWN_BRAND_NAME", input: name };
  }
  if (ids.length > 1) {
    // The authority returns AMBIGUOUS_EXACT_IDENTITY here and never picks one. Neither do we.
    // Reachable because historical (renamed/merged/retired) records stay indexed, exactly as in
    // Python, so a name shared with a superseded brand is ambiguous rather than silently confident.
    return { status: "REJECTED", reason: "AMBIGUOUS_BRAND_NAME", input: name, candidates: [...ids] };
  }
  return { status: "MATCHED", waypointBrandId: ids[0], brand: MAP.brands[ids[0]], via: "exact_identity" };
}

/** Operator escape valve. The id must already exist in the map. */
export function resolveExplicitId(waypointBrandId: string): BrandResolution {
  const id = String(waypointBrandId ?? "").trim();
  if (!WAYPOINT_BRAND_ID_PATTERN.test(id)) {
    return { status: "REJECTED", reason: "MALFORMED_WAYPOINT_BRAND_ID", input: waypointBrandId };
  }
  const brand = MAP.brands[id];
  if (!brand) {
    return { status: "REJECTED", reason: "UNKNOWN_WAYPOINT_BRAND_ID", input: waypointBrandId };
  }
  return { status: "MATCHED", waypointBrandId: id, brand, via: "explicit_waypoint_id" };
}

export type ResolvedBrand = {
  brandName: string;
  waypointBrandId: string;
  brand: BrandRecord;
  via: "exact_identity" | "explicit_waypoint_id";
};

export type BrandRejection = {
  brandName: string;
  reason: RejectionReason;
  candidates?: string[];
  /** Human-readable, shown at preview so the operator knows the next move. */
  message: string;
};

export type PackageResolution =
  | { ok: true; resolved: ResolvedBrand[]; warnings: string[] }
  | { ok: false; resolved: ResolvedBrand[]; rejections: BrandRejection[]; warnings: string[] };

function rejectionMessage(brandName: string, r: Extract<BrandResolution, { status: "REJECTED" }>): string {
  switch (r.reason) {
    case "UNKNOWN_BRAND_NAME":
      return (
        `"${brandName}" is not an exact identity in the shipped brand map (registry v${MAP.registryVersion}). ` +
        `Near matches are refused on purpose: the identity authority treats them as proposals, never matches. ` +
        `Either correct the spelling to the brand's registry name, or supply its wpb_ id to bind it explicitly.`
      );
    case "AMBIGUOUS_BRAND_NAME": {
      const detail = (r.candidates ?? [])
        .map((id) => `${id} (${MAP.brands[id]?.displayName ?? "unknown"}, ${MAP.brands[id]?.lifecycleState ?? "?"})`)
        .join("; ");
      return `"${brandName}" matches more than one brand: ${detail}. Supply the wpb_ id you mean.`;
    }
    case "MALFORMED_WAYPOINT_BRAND_ID":
      return `"${r.input}" is not a well-formed waypoint brand id (expected wpb_ followed by 32 hex characters).`;
    case "UNKNOWN_WAYPOINT_BRAND_ID":
      return `"${r.input}" is well-formed but is not in the shipped brand map, so it cannot be bound.`;
  }
}

/**
 * Resolve every brand in a validated package.
 *
 * `confirmedSlate` is deliberately NOT resolved a second time: `MatchPackageSchema` already proves
 * every slate name is string-identical to an entry in `brands[]`, so a second pass could only
 * produce the same answer.
 *
 * @param explicitBindings operator-supplied `brandName -> wpb_` bindings from a prior preview.
 */
export function resolvePackageBrands(
  pkg: Pick<MatchPackage, "brands">,
  explicitBindings: Record<string, string> = {},
): PackageResolution {
  const resolved: ResolvedBrand[] = [];
  const rejections: BrandRejection[] = [];
  const warnings: string[] = [];

  for (const b of pkg.brands) {
    const bound = explicitBindings[b.brandName];
    const result = bound ? resolveExplicitId(bound) : resolveBrandName(b.brandName);

    if (result.status === "REJECTED") {
      rejections.push({
        brandName: b.brandName,
        reason: result.reason,
        candidates: result.candidates,
        message: rejectionMessage(b.brandName, result),
      });
      continue;
    }

    if (result.brand.lifecycleState !== "active") {
      // Not a rejection. The authority never consults lifecycle either. Surfaced so the operator
      // sees it at preview, with the successor named when the registry knows one.
      const successor = result.brand.successorIds.length
        ? ` Successor(s): ${result.brand.successorIds.join(", ")}.`
        : "";
      warnings.push(
        `"${b.brandName}" resolves to ${result.waypointBrandId}, whose registry lifecycle is ` +
          `"${result.brand.lifecycleState}" rather than active.${successor}`,
      );
    }

    resolved.push({
      brandName: b.brandName,
      waypointBrandId: result.waypointBrandId,
      brand: result.brand,
      via: result.via,
    });
  }

  // Two DIFFERENT names collapsing onto one brand. Reachable through aliases, and it would
  // otherwise surface mid-transaction as an opaque unique violation on (runId, waypointBrandId).
  // Catching it here means preview can name the offending pair.
  const byId = new Map<string, string[]>();
  for (const r of resolved) {
    if (!byId.has(r.waypointBrandId)) byId.set(r.waypointBrandId, []);
    byId.get(r.waypointBrandId)!.push(r.brandName);
  }
  for (const [id, names] of byId) {
    if (names.length > 1) {
      const message =
        `${names.map((n) => `"${n}"`).join(" and ")} both resolve to the same brand ${id} ` +
        `(${MAP.brands[id]?.displayName ?? "unknown"}). A package cannot score one brand twice. ` +
        `Correct the package so the brand appears once.`;
      for (const n of names) {
        rejections.push({ brandName: n, reason: "AMBIGUOUS_BRAND_NAME", candidates: [id], message });
      }
    }
  }

  // Fail closed and whole: rank contiguity and slate integrity depend on every brand landing.
  if (rejections.length > 0) return { ok: false, resolved, rejections, warnings };
  return { ok: true, resolved, warnings };
}
