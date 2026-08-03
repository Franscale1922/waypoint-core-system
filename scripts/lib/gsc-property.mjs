// scripts/lib/gsc-property.mjs
//
// Pure helpers for matching a configured Search Console property identifier
// against what the API reports, and for deriving the sitemap URL that property
// will accept.
//
// Separate from .github/scripts/submit-sitemap.mjs so this logic can be tested
// without executing the script, which authenticates and calls Google on import.
//
// The distinction that matters throughout: a DOMAIN property (`sc-domain:host`)
// and a URL-PREFIX property (`https://host/`) are different properties. They hold
// different data, carry different permissions, and accept different sitemap
// paths. Treating them as spellings of the same thing is the bug this file
// exists to prevent.

/** Canonical spelling of a configured identifier, or null if unparseable. */
export function normalizeProperty(value) {
  if (typeof value !== "string" || value === "") return null;
  if (value.startsWith("sc-domain:")) return value;
  try {
    // URL-prefix properties are reported with a trailing slash; a configured
    // value without one names the same property, not a different one.
    return new URL(value).toString();
  } catch {
    return null;
  }
}

/** Hostname for either property form, or null. */
export function hostOf(value) {
  if (typeof value !== "string" || value === "") return null;
  if (value.startsWith("sc-domain:")) return value.slice("sc-domain:".length) || null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

/**
 * @param {string|undefined} configured        e.g. the GSC_SITE_URL variable
 * @param {Array<{url:string, permission:string}>} available  from GET /webmasters/v3/sites
 * @param {{fallbackHost: string}} options
 * @returns {{url:string, permission:string}|null}
 */
export function resolveSite(configured, available, { fallbackHost }) {
  const byUrl = new Map(available.map((s) => [s.url, s]));

  if (configured) {
    if (byUrl.has(configured)) return byUrl.get(configured);
    const normalized = normalizeProperty(configured);
    if (normalized && byUrl.has(normalized)) return byUrl.get(normalized);
  }

  const host = hostOf(configured) ?? fallbackHost;
  const bare = host.replace(/^www\./, "");
  const wantsDomainProperty = Boolean(configured && configured.startsWith("sc-domain:"));

  // Same-type candidates first, so a configured URL prefix never silently
  // resolves to the domain property just because the exact string missed.
  const prefixCandidates = [`https://${host}/`, `https://www.${bare}/`, `https://${bare}/`];
  const domainCandidates = [`sc-domain:${bare}`];
  const ordered = wantsDomainProperty
    ? [...domainCandidates, ...prefixCandidates]
    : [...prefixCandidates, ...domainCandidates];

  for (const candidate of ordered) {
    if (byUrl.has(candidate)) return byUrl.get(candidate);
  }

  return null;
}

/**
 * The sitemap path Google will accept for a property.
 *
 * A URL-prefix property only covers its own origin, so the sitemap must resolve
 * against that exact origin even when the site canonicalises elsewhere.
 * Submitting a www sitemap to a non-www prefix returns
 * `400 invalidParameter` on `feedpath`. A domain property covers every host, so
 * the canonical host is used there.
 */
export function sitemapUrlFor(propertyUrl, { canonicalHost }) {
  if (propertyUrl.startsWith("sc-domain:")) {
    return `https://${canonicalHost}/sitemap.xml`;
  }
  return new URL("sitemap.xml", propertyUrl).toString();
}

/** True when the permission level allows submitting a sitemap. */
export function canSubmitSitemap(permission) {
  return permission !== "siteUnverifiedUser" && permission !== "siteRestrictedUser";
}
