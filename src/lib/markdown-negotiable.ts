// Which public paths have a markdown representation, and how to build a link to one.
//
// This predicate was extracted verbatim from src/middleware.ts so that code
// outside the middleware can ask the question without importing the middleware
// itself. That import is not merely undesirable, it is impossible in a route
// handler: src/middleware.ts imports `@/auth`, which would pull next-auth into
// any `force-static` route that touched it.
//
// The middleware remains the only CALLER that rewrites; this module is the
// single definition both it and /llms.txt read, so a path can never be
// negotiable in one place and not the other.

/**
 * Content-rich pages that have a markdown representation (src/app/api/md).
 * Articles, the resources index + category pages, the glossary index, the FAQ,
 * the financing guides and the industry guides.
 *
 * NOTE the asymmetry that is easy to misread: `/glossary` is negotiable but
 * `/glossary/<term>` is NOT. Individual term pages have no markdown view, so
 * `/glossary/auv.md` would 404. `mdUrl` below is what keeps callers from
 * advertising one by hand.
 */
export function isMarkdownNegotiable(pathname: string): boolean {
  return (
    pathname === "/resources" ||
    pathname.startsWith("/resources/") ||
    pathname === "/glossary" ||
    pathname === "/faq" ||
    pathname === "/franchise-financing" ||
    pathname.startsWith("/franchise-financing/") ||
    pathname === "/industries" ||
    pathname.startsWith("/industries/")
  );
}

/**
 * Absolute URL for a site path, with `.md` appended ONLY when that path really
 * resolves as markdown. Callers building link indexes should route every URL
 * through this rather than concatenating ".md" themselves, so "every advertised
 * .md link resolves" is true by construction instead of by review.
 *
 * `siteUrl` is passed in rather than imported to keep this module free of
 * environment lookups; callers supply the one `SITE_URL` the rest of the site
 * uses.
 */
export function mdUrl(siteUrl: string, path: string): string {
  return `${siteUrl}${path}${isMarkdownNegotiable(path) ? ".md" : ""}`;
}
