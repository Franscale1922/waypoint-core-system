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

`scripts/verify-schema.mjs` statically fails on: reintroduced review/rating
markup, non-www host leakage in page/schema files, raw ld+json `<script>` tags,
and **FAQPage markup whose questions are not rendered on the page**. Run it after
any structured-data change.

It runs in `npm test`, in the `.githooks/pre-push` hook, and in the Verify
Internal Links workflow. Standalone: `npm run verify-schema`, or
`node scripts/verify-schema.mjs --verbose` to list each FAQ call site and where
its questions are rendered.

**The FAQ check** ([scripts/lib/faq-visibility.mjs](../scripts/lib/faq-visibility.mjs))
requires every `faqPageSchema()` call to receive a *named* array (not an inline
literal) that the page also maps in JSX, so the visible FAQ and the JSON-LD
cannot drift apart. It exists because on 2026-08-04 `/investment` was found
emitting four Q&As that appeared nowhere on the page. It proves the schema and
the page share one array; it cannot prove every element reaches the DOM, since it
does not render. If a FAQ genuinely renders somewhere static analysis cannot see
(a child component, a hoisted variable), annotate the call with
`// verify-schema: faq-visible <path>`.

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

> **Note on `FAQPage`:** Google fully retired FAQ *rich results* (the expandable
> Q&A in the SERP) for all sites in May 2026 — there is no longer any rich-result
> upside to FAQ markup. We still emit `FAQPage` and, more importantly, render the
> FAQ **visibly on the page**, purely for AEO/LLM grounding (AI Overviews, ChatGPT,
> Perplexity) and for the `.md` agent variants. Keep visible FAQ and schema in
> lockstep from one shared array; don't invest further engineering in FAQ-schema
> breadth expecting SERP rich results.

## Verifying changes

- `npm run verify-schema` — static guardrails (fast, no server). Add `--verbose`
  to see every FAQPage call site and the line that renders it.
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
- **`/llms.txt` is generated, not written** (`src/lib/llms-index.ts`, served by
  `src/app/llms.txt/route.ts`). The hand-typed version drifted 13 routes behind
  the site and linked none of the articles. Article links, category groupings,
  guide links and every count now derive from the content modules, so adding an
  article, industry, cost guide or financing guide updates the index with no code
  change. Write no count as a literal.
  - **The one hand-maintained part is `staticPages`**, because a page's one-line
    description is editorial. It is held honest by `tests/unit/llms-index.test.ts`,
    which walks the real App Router tree via `scripts/lib/route-inventory.mjs` and
    fails when a page exists with no entry, or an entry has no page. Add a page,
    add its entry.
  - **`.md` is appended from what `/api/md` RENDERS, never from
    `isMarkdownNegotiable`.** That predicate is the middleware's PREFIX rewrite
    rule and answers yes for every path under `/resources/`; the renderer is a
    closed set. Using the prefix test to decide where to advertise markdown
    published a dead `/resources/archive.md` while the whole suite stayed green.
    `markdownRenderablePaths()` is the set to extend if a new markdown view ships.
  - The route scan runs at TEST time, not runtime: `src/app/**/page.tsx` is source
    rather than a traced runtime asset, so reading it inside the handler would
    survive a build and return nothing on the first ISR regeneration.
- **DNS-AID** (DNS-based agent discovery): **intentionally not implemented** —
  the site runs no A2A/MCP/agent-index endpoint to point records at; publishing
  them would advertise a capability that doesn't exist. Revisit only if a real
  agent endpoint ships.
- **Lazy Resend client** ("Option C"): **intentionally not done** — the
  build-time key requirement is covered by `build:check` + dummy env; the API
  routes were left unchanged to avoid touching lead/email paths for marginal gain.
