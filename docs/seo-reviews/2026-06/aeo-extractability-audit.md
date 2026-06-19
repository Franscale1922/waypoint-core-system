# AEO Extractability Audit — June 2026

**Date:** 2026-06-18
**Trigger:** GSC shows high-impression / zero-click *definitional* queries (`auv franchise meaning`, `robs sba loan`, etc.) — the site is in the answer-engine consideration set (avg pos ~35.8, 1.36K impr/3mo) but its best answers are not packaged as **extractable, citable units**.
**Goal:** Find every extractability gap, prioritize by GSC signal, build a backlog. Write content *after* this.

> **Status note (2026-06-18, retained for reference):** The *execution plan* below was
> largely superseded by a parallel, more complete SEO/GEO overhaul that landed on `main`
> (industries + financing pillars, data-driven glossary, connected JSON-LD graph, llms.txt).
> Three pieces from this session were salvaged onto `main`: the verified entity links
> (Crunchbase + Wikidata Q140285847), the cross-category investment article, and the
> authoritative external citations. This doc is kept for the **GSC analysis and strategic
> findings** (the data interpretation and the multi-agent review), not as a live backlog.

---

## Live GSC data (28d, pulled 2026-06-18) — reprioritizes everything below

Service account access to the **www** property is now granted. Live pull
(`docs/seo-reviews/2026-06/gsc-report.md`) reveals a *page-level* picture the query
screenshots hid: **two pillar pages do 74% of all impressions and earn zero clicks.**

| Page | Impr | Clicks | Position | Read |
|---|---|---|---|---|
| `/investment` | **670** | 0 | 13.6 | 56% of all site impressions; bottom of pg1/top of pg2. RANK push, not a broken page (already has good title + FAQPage schema). |
| `/glossary` | **203** | 0 | **7.4** | Already on page 1. Validates P0 below — seen constantly, never extracted/clicked. |
| Homepage | 36 | 7 | 3.3 | Only page earning clicks (branded, 19.4% CTR). |
| Article pages | 1–25 each | 0 | mostly 60–92 | Lower priority than assumed — long-tail, weak positions. |

Site totals: 1,187 impr / 7 clicks / avg pos 36.4. Script returns top 50 queries/pages
(not the full 273) — sufficient for the head; deeper tail can be exported from GSC if needed.

**New #1 priority = `/investment`** (see P0a). Glossary P0 holds. Article-level work demoted.

---

## Post-review synthesis & execution status (2026-06-18)

Four review agents (schema correctness, implementation, GSC-data/prioritization, AEO strategy)
stress-tested this plan. Net changes after evaluating their findings:

**Reframed:** Glossary schema is an *addressability/parsing* win, **not** "99 citable answers" and
**not** a clicks lever (definitional queries are zero-click by nature) — three agents concurred.
`/investment` reframed from "rank for clicks" to "be the cited cost answer" (much of its 670 impr
is off-ICP brand-name cost lookups that won't click).

**Data caveat found:** `gsc-report.mjs`'s query table renders *alphabetically*, not by impressions,
and drops the real top queries (payroll/robs from the screenshots). Page-level data is reliable;
query→page mapping is not yet available. → fixing the script is now infra that unblocks the gated items.

**Rejected:** per-brand cost pages (violates CONTENT-STANDARDS §2, hard rule — no brand names);
`llms.txt` as a citation play (AI chat crawlers ignore it; robots.ts already allows all AI bots, so
the "feed agents" goal is not blocked); the `/resources`→`/blog` rename (192 refs, migration risk, no gain).

### ✅ SHIPPED this pass (Phase 1 — data-independent, standards-safe, typechecks clean)
- **Glossary** (`glossary/page.tsx`): `slugify()` helper → per-term `id` anchors (parens kept, 100px scroll-margin) + per-term `DefinedTerm` nodes nested via `hasDefinedTerm` (no `@context`/`inDefinedTermSet` repetition; "See X" stubs excluded); added `BreadcrumbList`; cleaned `DefinedTermSet` name; fixed stale "90+ / March 2026" → "99 / June 2026" (hero + metadata title).
- **`/resources` index** (`resources/page.tsx`): `CollectionPage` + `ItemList` over all articles, reusing per-article `@id`s; `isPartOf` the new WebSite node.
- **WebSite entity** (`structured-data.ts` + `layout.tsx`): added `websiteSchema` (no SearchAction — no on-site search exists) injected sitewide; completes the entity graph everything references.
- **Sitemap** (`sitemap.ts`): bumped `/glossary` + `/resources` `lastModified` → 2026-06-18 for recrawl signal.

### ⏳ GATED / fast-follow (need data or a decision)
- **Standalone `/glossary/<slug>` pages for top ~6 terms** (AUV, ROBS, FDD, SBA 7(a), Item 19, Item 7) — the *real* citability lever (a `#fragment` can't rank, be sitemapped, or be cited as its own URL). Gated on confirming the top definitional terms from corrected query data.
- **External authoritative citations** (FTC Franchise Rule, SBA 7(a), IRS ROBS, FBR) on high-value pages — strongest new strategic finding; YMYL credibility + citation magnet. Standards-safe. A content pass.
- **`/investment` internal-linking push (P0a)** — gated on (a) a CONTENT-STANDARDS §4 decision (it changes the "body links via relatedSlugs / CTAs to /book" convention) and (b) a cannibalization check needing query→page data.
- **Fix `gsc-report.mjs`** (impression-sort the query table + pull per-page query breakdown) — unblocks the two items above.

### 🆕 Added to backlog (from review)
- **Page-1-adjacent commercial-intent pages** tier (`/scorecard` 11.0, `/escape-kit` 8.0, `/newsletter` 11.9, `/franchise-consultant-vs-broker` 60.9) — the real CTR-recovery work, distinct from the zero-click glossary.
- **Original-data asset**: "Franchise Investment Ranges by Category (2026)" — §1 explicitly permits investment ranges; table-driven, stat-dense, the content type AI engines cite most.
- Extend `Person.sameAs` to Wikidata/Crunchbase (highest-confidence entity-verification nodes).

### Execution log (live)
- **2026-06-18 — Task 1 DONE:** Fixed `gsc-report.mjs` (impression-sort query table; added query→page mapping + cannibalization sections; raised limits; www slug fix). Re-pulled: 363 queries, 367 page+query rows. **Key finding:** `/investment`'s "pos 13.6" is a misleading average — it ranks pos **90.6/98.1** for its real-intent payroll-cost queries (page 9-10) and pos 2-4 only for off-ICP brand queries (red robin, yum brands). `robs sba loan` (23 impr) sits at pos 72 on the funding article. Almost nothing ranks page 1 for an on-ICP query → validates the AEO/citation strategy over chasing clicks.
- **2026-06-18 — Task 2 DONE:** Added 4 authoritative external citations (SBA 7(a), IRS ROBS, FTC Franchise Rule) across the funding/FDD cluster — `sba-loan-vs-robs` (×2), `how-franchise-funding-actually-works`, `fdd-decoded`. All resolve 200; §11 (no em dash) and §10 verified. Glossary external citations deferred into Task 3 (standalone term pages render prose; current glossary definitions are plain-text).

- **2026-06-18 — Task 3 DONE:** Built `/glossary/[slug]` route + 3 standalone term pages (AUV, ROBS, SBA Loan) — each = snippet definition + "why it matters" (non-commodity, §13) + 2 FAQs + external citation (IRS/SBA) + link to the deep-dive article. Schema: `DefinedTerm` (mainEntity, `inDefinedTermSet`→`#termset`) + `BreadcrumbList` + `FAQPage`. Added to sitemap; linked from the glossary index ("Full definition" link on promoted terms). FDD deliberately excluded (the fdd-decoded article is its canonical page — avoid cannibalization). Typecheck clean; 0 em dashes; §1 reframed onto cost/margin (no take-home-income framing). **Scoped to 3 proven-demand terms, not 6** — per-term data was thin, so the route is reusable infra we grow as demand appears.
- **2026-06-18 — Found + queued (Task 8):** §11 em-dash violations in live UI copy (glossary 4, investment 10) that the article-only `aeo-audit` never scans. Queued a sitewide sweep + an audit-coverage extension.

- **2026-06-18 — Task 4 DONE (linking/standards portion):** Amended CONTENT-STANDARDS §4 to permit contextual cornerstone links (guardrails: ≤1-2/article, descriptive anchors, cost-framing only, CTAs still /book). Added 2 inbound `/investment` body links (the-true-cost, are-you-ready) — was zero. The pos-90 payroll content gap is NOT fixed by links; that fix moved into Task 6.
- **2026-06-18 — Task 5 DONE (partial, rest data-gated):** Improved `/franchise-consultant-vs-broker` meta for the `franchise advisor`/`franchise broker meaning` intent it ranks for + fixed its em dash. `/escape-kit` (pos 8) & `/scorecard` (pos 11) CTR tweaks deferred — no per-page query rows captured yet; optimizing blind would risk harm.

- **2026-06-18 — Task 8 [RESOLVED on `main`, scope widened 2026-06-19]:** The original sweep was discarded in the reset, then **re-run on `main`**: 537 em dashes removed across 89 files in `src/app` + `src/data` (commit `25a4cb5`), and `aeo-audit.mjs` extended to **exit non-zero on any em dash** (commit `4ddbc34`). A follow-up panel then caught two real gaps, fixed 2026-06-19: (1) the guard's scope missed the rest of `src/` (`src/lib`, `src/components`, `src/inngest` held ~284 more em dashes, some in agent/email-facing copy), now swept and the guard widened to scan all of `src/` with an `emdash-allow` marker for the one legitimately-functional em dash (the detector pattern in `templates.ts`); (2) **CI does NOT actually enforce this** — GitHub Actions is billing-disabled (runs never start) and the repo is a free-plan private repo with no branch protection (required-status-checks unavailable), so the workflow is advisory only. **Real enforcement is a local pre-push hook** (`.husky`/`core.hooksPath`) that runs the guard before a push. To make CI genuinely gate `main`: re-enable Actions billing AND make the repo public or upgrade to Pro, then mark the check required. §11 is now clean across articles + all of `src/` (verified by the guard).
- **2026-06-18 — Task 6 DONE (draft for review):** New article `content/articles/franchise-investment-by-category.md` — table-led, 15 categories with §1-compliant investment ranges sourced from existing Waypoint articles (incl. a Staffing/Payroll/Bookkeeping row to absorb the payroll-cost query intent from Task 4). Citation-grade per §13 (aggregate-pattern judgment, not commodity). External citations: SBA 7(a), FTC Franchise Rule. Compliant: 0 em dashes, 0 FDD item numbers, 0 profitability terms, 4 FAQs, 3 valid relatedSlugs. §5 satisfied: added to asset-light article's relatedSlugs + new-article-checklist pool. Bidirectional `/investment` link added (lead card in Related Resources). Auto-enters sitemap + /resources index via the loader. Renders at `/resources/franchise-investment-by-category`. **NEEDS: Kelsey to verify the dollar ranges before commit/publish.**
- **2026-06-18 — Task 7 (only remaining):** blocked on external entities existing. Directions: create a Crunchbase org (and optionally person) profile, then add the URL to `personSchema.sameAs` (structured-data.ts:99) and/or the business `sameAs`. Wikidata is higher-confidence but needs notability (may not qualify yet). I'll wire the code the moment the profiles exist.

- **2026-06-18 — Task 7 DONE:** Kelsey created Crunchbase (org + person) and a Wikidata item (Q140285847, instance-of business, official website + reference, Crunchbase cross-link). Wired all three into the entity graph: business `sameAs` += Crunchbase org + Wikidata; person `sameAs` += Crunchbase person. All resolve (HTTP 200), typecheck clean.

**STATUS (corrected 2026-06-18 after multi-agent review):** The "Task N DONE" entries above describe the ORIGINAL session. Most of that work was **discarded** in a `git reset --hard origin/main` when reconciling with a larger parallel SEO/GEO overhaul that had landed on `main`. **Live on `main`:** (1) the verified entity links (Crunchbase + Wikidata Q140285847), (2) the `franchise-investment-by-category` article (ranges reconciled against `src/data/industries.ts`), (3) the external `.gov` citations on the funding/FDD articles, (4) the §11 em-dash sweep across `src/app` + `src/data` plus the CI guard in `aeo-audit.mjs` (see Task 8 above). **NOT on main / superseded by the overhaul:** the WebSite + CollectionPage nodes, the standalone glossary term pages, and the GSC cannibalization tooling (the overhaul ships its own equivalents). The original discarded commits are recoverable from reflog (tip was `64e54f4`) for ~90 days. This doc is a paper trail, not a description of `main`.

### Revised sequence
1. ✅ Phase 1 schema infra (done above)
2. Fix `gsc-report.mjs` → re-pull full impression-sorted + per-page query data
3. External citations pass + standalone top-term glossary pages (both serve "feed agents")
4. `/investment` (standards decision → internal links) + absorb payroll intent there (don't build a competing article)
5. Page-1-adjacent commercial pages; original-data asset

---

## What's already strong (don't touch)

- **Article corpus:** 44 articles, 100% FAQ-frontmatter coverage, all `relatedSlugs`=3, 0 banned em-dashes, question-format H2s present (1 exception). Per-article JSON-LD: `Article` + `FAQPage` + `BreadcrumbList` + optional `VideoObject`, with a real entity graph (`author`/`publisher` `@id`s). This is genuinely good AEO.
- **Site canonicalizes to www**, sitemap uses real `lastModified` dates, RSS feed exists.

---

## Findings, prioritized

### P0a — `/investment` rank push  ⭐ NEW #1 (live data) — 56% of all impressions, 0 clicks

**File:** `src/app/(marketing)/investment/page.tsx`

- 670 impr / 0 clicks / **position 13.6**. The page is *not* broken — it has a strong title (`How Much Does a Franchise Cost?`) and FAQPage schema. The problem is it sits at the bottom of page 1 / top of page 2, where CTR is structurally ~0.
- Lever is **rank**, and the cheapest rank lever is **internal linking**: count and strengthen contextual links into `/investment` from high-relevance articles (funding, true-cost, ROI, payroll/industry spotlights) with descriptive anchor text. Secondary: confirm the page's `dateModified`/freshness signal and that its H1 + answer block match the dominant queries (`payroll franchise investment info`, `... business cost`, brand-cost queries).

**Effort:** S–M. **Impact:** Highest — one page moving from pos 13.6 → top 10 captures more than all article work combined.

---

### P0 — Glossary is 99 great answers trapped in one un-citable blob  ⭐ highest leverage

**File:** `src/app/(marketing)/glossary/page.tsx`

- 99 terms, but only **one** page-level `DefinedTermSet` schema and **zero** per-term `DefinedTerm` schema.
- Anchors exist only **per letter** (`#letter-A`); term `<h2>`s have **no `id`**. You cannot deep-link or cite `Average Unit Volume (AUV)` as a unit.
- Directly maps to the **#1 impression query** `auv franchise meaning` (81 impr, 0 clicks) and `robs sba loan`/`robs 401k sba` (101 combined) — all already answered on the page, just not addressable.

**Fix:**
1. Add a stable slug `id` to each term container (e.g. `id="average-unit-volume-auv"`) + `scroll-margin-top`.
2. Emit a `hasDefinedTerm: [...]` array inside the existing `DefinedTermSet`, each entry a `DefinedTerm` with `@id`, `name`, `description`, `url` (`/glossary#<anchor>`), `termCode`, `inDefinedTermSet`.
3. (Optional, higher effort) promote the highest-impression terms to their own `/glossary/<slug>` pages for individual ranking + sitemap inclusion. Start with AUV, ROBS, Item 19, SBA 7(a).

**Effort:** S–M (steps 1–2 are a single-file change, no new content). **Impact:** High — converts already-written, already-ranking content into agent-citable answers.

---

### P0b — `/resources` index emits no collection schema  ⭐ pairs with P0 glossary

**File:** `src/app/(marketing)/resources/page.tsx`

- The article-library index page declares **no** `CollectionPage` / `Blog` / `ItemList` JSON-LD. Engines and AI retrievers have no machine signal that this page *is* the index of the content library or which articles are its members.
- This — not the URL word — is the real "where does the information live?" clarity gap. (Renaming `/resources` → `/blog` was considered and rejected: 192 references across 24 files, 301s on every article URL, schema/`@id`/canonical rewrites, and ranking-reset risk during a rising-impression window, all for ~zero AEO gain. The URL token is a near-zero classification signal; schema + structure are what classify content.)

**Fix:** Add `CollectionPage` (or `Blog`) JSON-LD to the index with an `ItemList` / `hasPart` of the articles (each `url` + `name`), mirroring the entity-graph `@id` convention already used on article pages. Optional human-facing relabel of nav to "Blog/Insights" is a text-only change — keep the `/resources` path.

**Effort:** S. **Impact:** Med — gives engines an explicit content-collection map; reusable as the library grows.

---

### P1 — Net-new content gap: payroll / bookkeeping franchise

- `payroll franchise investment info` (56 impr) + `payroll franchise business cost` (38 impr) = ~94 impr, **0 clicks, and no dedicated page** ("payroll" appears only incidentally in other articles).

**Fix:** New Industry Spotlight article to existing conventions (frontmatter + 4 FAQs + 3 relatedSlugs + Article/FAQ schema), with a crisp investment-range + cost answer block up top.

**Effort:** M. **Impact:** Med–High — clear demand, zero current supply.

---

### P2 — Resolve intent mismatch: "franchise royalty management / collection"

- `franchise royalty management` (23) + `franchise royalty collection` (19) read as **franchisor-side** (royalty software / collecting royalties) — not buyer intent. Your `understanding-franchise-royalties` article is buyer-facing.

**Decision needed:** capture this traffic (add a buyer-framed "how royalties are calculated and collected *from you*" answer block) or ignore as off-ICP. Recommend a short answer block, not a new article.

**Effort:** S. **Impact:** Low–Med (intent uncertain).

---

### P3 — Minor polish

- `red-flags-franchise-types-to-avoid`: 0 question-format H2s — add 1–2 for extraction parity.
- 15 thin (<900w) industry spotlights — AEO-functional (full FAQ+schema) but could be deepened opportunistically; not urgent.
- Consider a reusable `definedTermSchema()` / `articleSchema()` helper in `src/app/lib/structured-data.ts` (currently Article/FAQ schema is inlined in the route). Reduces drift as the glossary grows.

---

## Recommended sequence

1. **P0 glossary extractability** (infra win, serves #1 query, reusable for all future terms)
2. Grant GSC www access → re-pull full 273 queries → re-prioritize P1+ against complete data
3. **P1 payroll spotlight**
4. P2 royalty decision, P3 polish
