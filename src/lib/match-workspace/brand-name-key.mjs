/**
 * The single normalization used to key brand names, shared by the build script that emits
 * `brand-identity-map.json` and the runtime resolver that reads it.
 *
 * It lives in one plain-JS module on purpose. If the generator and the resolver each carried
 * their own copy, a drift between them would not be a failing test, it would be a lookup that
 * silently misses and rejects a brand the map actually contains.
 *
 * RELATIONSHIP TO THE PYTHON AUTHORITY
 * ------------------------------------
 * The authority is `bip/identity_resolution.py`. Its exact-identity tier is a bare
 * `value.casefold() == name.casefold()` with no trim and no Unicode normalization. This module
 * is therefore a deliberate, narrow SUPERSET on two axes, and a strict subset on none:
 *
 *   * trim     a name with stray whitespace is UNRESOLVED in Python (it falls through to the
 *              punctuation-folded tier, which is hardcoded PROPOSAL and never a match). Here it
 *              resolves.
 *   * NFC      an NFD-composed query misses in Python (raw codepoint compare) and hits here.
 *
 * That divergence is chosen rather than accidental: `idempotency.ts` already canonicalizes brand
 * names with exactly `normalize("NFC").trim()`, and three different normalization regimes inside
 * one write path would be the actual defect. Nothing here loosens the match itself. Punctuation
 * folding is still refused, because Python returns PROPOSAL for it and a proposal is not a match.
 */

/** Case folding that JS can express: NFC, trim, lowercase. Nothing else. No punctuation folding. */
export function normalizeNameKey(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .toLowerCase();
}

/**
 * True when a string still contains a character whose Unicode case folding differs from plain
 * lowercasing, AFTER lowercasing has already been applied.
 *
 * Why this shape. Python compares with `str.casefold()`; JS has only `toLowerCase()`. For almost
 * every character the two agree, so a lowercased string normally contains nothing that case
 * folding would change further. The exceptions are exactly the divergent set: sharp s, the
 * ligatures, final sigma, the Cherokee lowercase block. Testing the residual
 * `Changes_When_Casefolded` property COMPUTES that set from the Unicode tables instead of
 * hand-listing it, so it cannot rot as Unicode grows.
 *
 * Verified to pass ordinary symbols: `360°` is a live alias in the registry today, and the
 * degree sign is uncased, so it is correctly not flagged.
 */
const RESIDUAL_CASEFOLD = /\p{Changes_When_Casefolded}/u;

export function hasCasefoldDivergence(value) {
  return RESIDUAL_CASEFOLD.test(normalizeNameKey(value));
}

/** The registry fields that are legitimate NAME keys, in the authority's own order. */
export const IDENTITY_NAME_FIELDS = ["display_name", "aliases", "former_names", "dba_names"];

/**
 * Every name string a registry record contributes.
 *
 * `current_slug` is deliberately absent. The authority treats the slug as its own tier, matched
 * against a separate `canonical_slug` parameter, and explicitly EXCLUDES it from the
 * exact-identity tier (identity_resolution.py:172-177). A slug arriving as a name is a
 * punctuation-folded PROPOSAL there, so it must not silently become a match here.
 *
 * `source_refs.branddb.brand_name` is also absent, for the same fidelity reason. Confirmed
 * unnecessary: all 248 BrandDB spellings already resolve through the four fields above.
 */
export function namesOf(record) {
  const out = [];
  for (const field of IDENTITY_NAME_FIELDS) {
    const value = record[field];
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) out.push(...value.filter((v) => typeof v === "string"));
  }
  return out;
}
