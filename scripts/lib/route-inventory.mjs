/**
 * route-inventory.mjs
 *
 * Walks a Next.js App Router tree and returns the STATIC public routes it
 * serves, so a hand-maintained list of pages (src/lib/llms-index.ts's
 * `staticPages`) can be checked against the pages that actually exist.
 *
 * The failure this exists to stop: /llms.txt's page list silently fell 13 routes
 * behind the site. Nothing compared the list to reality, so every page added
 * after it was written was invisible to agents reading the index.
 *
 * WHY A TEST-TIME SCAN AND NOT A RUNTIME ONE. Deriving the list inside the route
 * handler at runtime looks equivalent and is not. `src/app/**\/page.tsx` is
 * source, not a traced runtime asset, so a readdir of it would work locally,
 * produce a correct file on the first deploy, and then return an empty list on
 * the first ISR regeneration on Vercel - a failure landing in production hours
 * after a green build. A test-time scan has none of that exposure: the repo is
 * fully checked out and the failure lands in the pre-push hook.
 *
 * Pure and parameterized on `appDir` so its own tests can point it at a seeded
 * temp tree and prove it discriminates, rather than only ever observing it agree
 * with the real repo.
 *
 * Unit tests: tests/unit/llms-index.test.ts
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Route groups: `(marketing)`. Contribute no URL segment. */
const ROUTE_GROUP = /^\([a-zA-Z0-9_-]+\)$/;
/** Dynamic segments: `[slug]`, `[...rest]`, `[[...opt]]`. Not static routes. */
const DYNAMIC = /^\[.*\]$/;
/**
 * Private folders: `_components`. Next excludes underscore-prefixed folders AND
 * their descendants from routing entirely, so a page.tsx inside one serves no
 * URL. Treating it as a route would be worse than a miss: the gate would demand
 * a staticPages entry for a path that 404s, and adding one to satisfy it would
 * put a dead link in the published index.
 */
const PRIVATE = /^_/;

/**
 * Segment shapes this scanner deliberately refuses rather than guesses at.
 * Intercepting routes ((.)foo, (..)foo) LOOK like route groups and would be
 * wrongly stripped; parallel routes (@modal) are not URL segments either. Next
 * supports both, this repo uses neither, and a gate that silently mis-parses is
 * worse than one that stops. Fail closed and make someone decide.
 */
const REFUSED = [
  { re: /^\(\.{1,3}\)/, what: "intercepting route" },
  { re: /^@/, what: "parallel route slot" },
];

function walkPages(dir, appDir, out) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkPages(full, appDir, out);
    else if (entry === "page.tsx" || entry === "page.ts" || entry === "page.jsx" || entry === "page.js") {
      out.push(dir === appDir ? "" : full.slice(appDir.length + 1, -(entry.length + 1)));
    }
  }
  return out;
}

/**
 * Static public routes served by `appDir`.
 *
 * @param {{appDir: string, ignore?: RegExp[]}} opts
 * @returns {string[]} sorted URL paths, e.g. ["/", "/about", ...]
 */
export function collectStaticRoutes({ appDir, ignore = [/^\/admin(\/|$)/] }) {
  const dirs = walkPages(appDir, appDir, []);
  const routes = new Set();

  for (const rel of dirs) {
    const segments = rel === "" ? [] : rel.split("/");
    let unrouted = false;
    const kept = [];

    for (const seg of segments) {
      const refused = REFUSED.find((r) => r.re.test(seg));
      if (refused) {
        throw new Error(
          `route-inventory: unsupported ${refused.what} segment "${seg}" in "${rel}". ` +
            "This scanner does not know the URL it produces; teach it that shape rather than " +
            "letting it guess.",
        );
      }
      if (DYNAMIC.test(seg)) { unrouted = true; break; }
      if (PRIVATE.test(seg)) { unrouted = true; break; }
      if (ROUTE_GROUP.test(seg)) continue;
      kept.push(seg);
    }
    if (unrouted) continue;

    const path = kept.length === 0 ? "/" : `/${kept.join("/")}`;
    if (ignore.some((re) => re.test(path))) continue;
    routes.add(path);
  }
  return [...routes].sort();
}

/**
 * Compare the declared page list against the routes that actually exist.
 * Both directions: an undeclared page and a declared non-page are both drift.
 *
 * @param {{appDir: string, declared: string[], ignore?: RegExp[]}} opts
 * @returns {{errors: string[], checked: number}}
 */
export function checkRouteInventory({ appDir, declared, ignore }) {
  const errors = [];
  const real = collectStaticRoutes(ignore ? { appDir, ignore } : { appDir });

  // Vacuous-pass guard, the shape verify-links.mjs shipped once: that script
  // "reported a green pass while checking zero slugs" because its regex matched
  // nothing. A scan that finds no pages at all has not proved the list correct,
  // it has proved the walk broken. Refuse rather than pass.
  if (real.length === 0) {
    errors.push(
      `no page files found under ${appDir} - the scan found nothing, so it cannot ` +
        "have verified anything. Check appDir before trusting a pass.",
    );
    return { errors, checked: 0 };
  }

  const declaredSet = new Set(declared);
  const realSet = new Set(real);

  for (const path of real) {
    if (!declaredSet.has(path)) {
      errors.push(`page exists but is not described in staticPages: ${path}`);
    }
  }
  for (const path of declared) {
    if (!realSet.has(path)) {
      errors.push(`staticPages describes a page that does not exist: ${path}`);
    }
  }
  return { errors, checked: real.length };
}

/**
 * Every absolute site URL linked from a generated document, in order.
 * Matches markdown links only - a bare URL in prose is not a link an agent
 * follows from the index.
 *
 * @returns {string[]} URLs including the origin
 */
export function extractSiteLinks(body, siteUrl) {
  const re = /\]\((https?:\/\/[^)\s]+)\)/g;
  const out = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m[1].startsWith(siteUrl)) out.push(m[1]);
  }
  return out;
}
