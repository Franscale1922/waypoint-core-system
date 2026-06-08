# Structured Data (JSON-LD) — Architecture & Conventions

_Last updated: June 2026. Owner reference for the Schema.org / JSON-LD layer of
waypointfranchise.com. Read this before adding or editing any page schema._

## Goal

Every public page participates in **one connected Schema.org knowledge graph**
so that traditional search (rich results) and AI crawlers can resolve the site's
entities, content, and primary action (booking a call). Entities are linked by
stable `@id`, not duplicated.

## The entity graph

The site-wide entities are emitted on **every page** from the root layout
(`src/app/layout.tsx`) as a single `@graph`:

| Entity | `@id` | Defined in |
|--------|-------|-----------|
| Organization / LocalBusiness | `${SITE_URL}/#business` | `localBusinessSchema` |
| WebSite | `${SITE_URL}/#website` | `webSiteSchema` |
| Person (Kelsey Stuart) | `${SITE_URL}/about#kelsey` | `personSchema` |
| Service (franchise consulting) | `${SITE_URL}/#service` | `franchiseConsultingServiceSchema` |

Each **page** then emits its own `@graph` (a second `<script>`) with a page node
(`WebPage`/`CollectionPage`/`Article`) that links into the global entities by
`@id` — e.g. `isPartOf → #website`, `mainEntity → #business`/`#service`,
`author → #kelsey`, `publisher → #business`.

> **Why the cross-script references resolve:** Google (and most parsers) merge
> *all* JSON-LD blocks on a page before resolving `@id`s. The global graph from
> the layout is therefore always present alongside the page graph. **Do not
> remove the layout graph or move it** — every page node depends on it.

## Source of truth: `src/app/lib/structured-data.ts`

Pure, framework-agnostic builders and constants. Key exports:

- `SITE_URL` — canonical origin (`https://www.waypointfranchise.com`, **www, no trailing slash**).
- `toWww(url)` — normalizes any same-site URL to the www host. The apex 301s to
  www, so JSON-LD must always use www or `@id`s won't dedupe.
- `fragmentId(canonical, "#frag")` — builds a fragment `@id`; gives the root URL
  a `/` before the fragment so the homepage emits `…com/#webpage` (uniform with
  `…com/#business`), while pathed URLs append directly (`…/resources#webpage`).
- `jsonLdGraph(...nodes)` — wraps nodes into one `@graph` with a single
  `@context`, stripping any per-node `@context` (top level only).
- `breadcrumbSchema(items)` — `BreadcrumbList` node (URLs normalized to www).
- `webPageSchema({ url, name, description, breadcrumb?, mainEntityId?, primaryImage? })`
  — `WebPage` node with `isPartOf → #website`.
- `collectionPageSchema({ url, name, description, items, breadcrumb? })`
  — `CollectionPage` + embedded `ItemList` (used by the resources hub + categories).
- `videoObjectSchema({...})` — `VideoObject` factory (Google-required fields).
- `localBusinessSchema`, `webSiteSchema`, `personSchema`,
  `franchiseConsultingServiceSchema`, `scorecardFaqSchema` — entity constants.

## Rendering: always use `<JsonLd>`

**Never hand-write `<script type="application/ld+json">`.** Use the component:

```tsx
import JsonLd from "@/app/components/JsonLd"; // or relative path
<JsonLd data={jsonLdGraph(webPageSchema({ ... }), someOtherNode)} />
```

`src/app/components/JsonLd.tsx` centralizes the one risky API
(`dangerouslySetInnerHTML`) and **escapes `<` → `<`**, which is semantically
identical to JSON-LD parsers but prevents a stray `</script>` in a
content-derived string (article title, FAQ answer, glossary term) from breaking
out of the script element.

## Conventions (enforced by `npm test`)

1. **www only.** Use `SITE_URL` / `toWww()` — never a bare `https://waypointfranchise.com`.
2. **No self-serving reviews.** `aggregateRating` / `review[]` are **not**
   allowed on `#business` (Google disallows self-serving review markup on a
   site's own LocalBusiness/Organization; it's ignored and risks a Search
   Console flag). Testimonials live as on-page content only.
3. **Reference, don't re-type.** Link to an existing entity by `@id` alone
   (e.g. `brand: { "@id": "${SITE_URL}/#business" }`) rather than repeating a
   `@type`, which would collapse the merged node into conflicting types.
4. **Distinct page vs content `@id`.** An `Article` and its containing `WebPage`
   get different fragments (`#article` vs `#webpage`), not the same `@id`.
5. **Render through `<JsonLd>`** (no raw ld+json scripts in `.tsx`).

### Guardrail

`scripts/verify-schema.mjs` (run via `npm test` and standalone
`npm run verify-schema`) statically fails on: reintroduced review/rating markup,
non-www host leakage in page/schema files, and raw ld+json `<script>` tags. Run
it after any structured-data change.

## Recipe: add schema to a new page

```tsx
import { SITE_URL, jsonLdGraph, webPageSchema, breadcrumbSchema } from "../../lib/structured-data";
import JsonLd from "../../components/JsonLd";

// inside the component's returned JSX, first child:
<JsonLd
  data={jsonLdGraph(
    webPageSchema({
      url: `${SITE_URL}/your-path`,
      name: "Page Title | Waypoint Franchise Advisors",
      description: "…matches the page's meta description…",
      mainEntityId: `${SITE_URL}/#business`, // optional: the page's primary entity
      breadcrumb: breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Your Page", url: `${SITE_URL}/your-path` },
      ]),
    }),
    // …optional sibling nodes: an FAQPage, HowTo, ItemList, etc.
  )}
/>
```

## Verifying changes

- `npm run verify-schema` — static guardrails (fast, no server).
- `npm run build:check` — full `prisma generate && next build` (no DB push;
  pair with dummy `RESEND_API_KEY` / `POSTGRES_*` env if running keyless).
- Render check — `npm run dev`, then curl a route and extract the
  `application/ld+json` blocks; confirm valid JSON and that every `@id`
  reference resolves to a node present on the page (page graph + layout graph).
- External: Google Rich Results Test and `validator.schema.org`.

## Related discoverability (decisions on record)

- **RFC 8288 `Link` header** (`next.config.ts`): advertises `/llms.txt` via
  `rel="describedby"`, scoped to HTML routes only (excludes `_next`, `api`,
  dotted asset paths, and `/llms.txt` itself).
- **DNS-AID** (DNS-based agent discovery): **intentionally not implemented** —
  the site runs no A2A/MCP/agent-index endpoint to point records at; publishing
  them would advertise a capability that doesn't exist. Revisit only if a real
  agent endpoint ships.
- **Lazy Resend client** ("Option C"): **intentionally not done** — the
  build-time key requirement is covered by `build:check` + dummy env; the API
  routes were left unchanged to avoid touching lead/email paths for marginal gain.
