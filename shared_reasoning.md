## [2026-06-15 00:00] - FAQ/Industries/Financing Implementation Audit

### Devil's Advocate - Analysis

#### Initial Observations
Auditing 9 modified files + 2 new data files + 4 new page directories. Claims to verify: verify-schema clean, TypeScript/build clean, dev-server routes functional, all 44 articles have FAQ, and FAQItem plain-text rendering safe.

#### Reasoning Process
1. Ran `node scripts/verify-schema.mjs` independently — confirmed 129 files, 0 warnings.
2. Ran `npx tsc --noEmit` — exit code 0, no TypeScript errors.
3. Ran `next build` with empty env vars — only failure is `/api/contact` (pre-existing Resend module-level instantiation; traced to commit `30c725b`, predates this work entirely).
4. Audited all 44 articles for `faqs` field using Python + regex on `- q:` pattern — 44/44 confirmed non-empty.
5. Checked FAQItem renders `{a}` as a raw string inside `<p>` — no markdown processing, no link components. Scanned all 44 article FAQ answers for embedded markdown syntax — none found.
6. Checked sitemap: /franchise-financing is static entry, /industries/[slug] pages covered dynamically via `industries.map()`. But .md URL variants not in sitemap (not a stated requirement).
7. Checked OfferCatalog in structured-data.ts vs. built /industries pages: 7 catalog entries, 5 pages built, 3 omitted (Restoration, Pet Care, Car Wash). Food & Beverage built but NOT in OfferCatalog. This is a schema consistency gap.
8. Desktop nav: /industries added, /franchise-financing NOT in desktop nav (footer only).
9. MobileNav: /industries added to navLinks, /franchise-financing NOT in MobileNav navLinks array.
10. Markdown negotiation: fully wired for /franchise-financing and /industries/* — this was marked OPTIONAL, was implemented in full, and is working.
11. All 9 modified files are the implementer's work. No separability concern — no pre-existing uncommitted WIP in those files.

#### Key Insights
- The "44 articles FAQ" claim is TRUE, but only detectable with correct YAML key (`- q:`, not `question:`).
- The build failure claim is TRUE and correctly attributed to pre-existing code.
- The OfferCatalog schema lists 7 categories but only 5 /industries pages exist. Food & Beverage page was built but doesn't appear in the OfferCatalog. The 3 omitted categories (Restoration, Pet Care, Car Wash) have existing articles but no category hub page. This was not disclosed clearly.
- /franchise-financing is in the footer and Guides section but not in the desktop nav bar or MobileNav — a discoverability gap for the highest-traffic surface.
- The FAQPage JSON-LD nodes in /industries/[slug] and /franchise-consultant-vs-broker lack @id and are not linked to their parent WebPage node via mainEntity in the @graph. Minor structural issue.

#### Assumptions Identified
- Implementer assumed "sitemap includes every new route" was satisfied by dynamic map() — technically true but the .md variant URLs are not in sitemap (minor, not stated as a requirement).
- Implementer assumed FAQPage schema eligibility is achieved — it is, for the correct pages.
- Implementer did not disclose that /franchise-financing and the new industry pages are absent from the primary navigation entry points (desktop header + MobileNav).

#### Conclusion
VERIFIED: verify-schema (confirmed), TypeScript (confirmed), build failure attribution (confirmed), 44-article FAQ presence (confirmed), FAQItem plain-text safety (confirmed), sitemap coverage of new routes (confirmed).
OVERSTATED: "all nav and footer links" — /franchise-financing is footer-only; not in desktop nav or MobileNav.
OMITTED/UNDISCLOSED: OfferCatalog schema mismatch (7 catalog entries vs 5 pages, wrong pairing on Food & Beverage). The 3 omitted industry categories (Restoration, Pet Care, Car Wash) weren't clearly flagged.
LOW RISK: FAQPage nodes lack @id/mainEntity graph links; acceptable but imperfect.

---
