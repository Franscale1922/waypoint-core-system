# Waypoint Franchise Advisors — SEO & GEO Execution Playbook

> **Purpose:** This document serves as the master blueprint for executing the Waypoint Generative Engine Optimization (GEO) and off-page SEO strategy. By separating this massive initiative into isolated phases with explicit "Kickoff Prompts", you can spin up a new AI agent chat for each phase, preserving a maximal context window and eliminating the drift that occurs in long, multi-task conversations.

---

## Status (last updated May 2026)

Phases 1–4 are the original off-page/GEO plan. Phases 5–8 were added in May 2026 to cover the newer Google I/O 2025/2026 layer (Information Agents, Ask YouTube, agentic browsing, AI Share-of-Voice). The site was already strong on AEO fundamentals (per-article `Article`/`FAQPage`/`BreadcrumbList` schema, site-wide `LocalBusiness`/`Service`/`Person` schema, question-format H2s, the Island Test for extractability), so Phases 5–8 build on that rather than redoing it.

| Phase | Title | Status |
|---|---|---|
| 1 | Directory & NAP Synchronization | Manual / ongoing (off-site account work) |
| 2 | "Atomic" Content Structuring | Partially covered by existing content standards |
| 3 | Geo-Targeted Landing Pages | Not started |
| 4 | Original Data Report ("Citation Magnet") | Not started — see Phase 8 note |
| 5 | Video + Transcripts (Ask YouTube) | **Done** for the About video; frontmatter capability pending |
| 6 | Agent-Friendly Architecture | **Done** (forms a11y, ReserveAction, crawlable booking link) |
| 7 | AI Share-of-Voice Measurement | **Done** (SOV upgrade + monthly cron); admin view pending |
| 8 | Off-Site Citation Pool + Non-Commodity Content | SOP + standards **done**; press section & data report pending |

---

## Phase 1: Directory & NAP Synchronization (Manual & Delegated)
This phase establishes the foundational hyper-local authority for Waypoint using your official Name, Address, and Phone (NAP).

### Instructions
1. We have already deployed the JSON-LD schema to the codebase. This phase focuses entirely on claiming and verifying off-site directories using your cell phone number and Whitefish, MT (Service Area Business) configuration.
2. Sign into and verify Google Business Profile (GBP), Apple Business Connect, and Bing Places.
3. Configure the profiles to explicitly hide the home street address, displaying only the service area.

### Definition of Done
- [ ] Google Business Profile is claimed, verified, and active.
- [ ] Apple Business Connect and Bing Places are live with matching NAP.
- [ ] Alignable profile created to begin B2B networking with CPAs/Planners.
- [ ] Nextdoor business profile claimed.

### Kickoff Prompt
*(Note: Because this phase is mostly manual off-site account creation, no AI kickoff prompt is required. Complete these manually, then proceed to Phase 2).*

---

## Phase 2: "Atomic" Content Structuring
This phase restructures the existing `/resources` articles to be highly readable to AI systems (ChatGPT, Perplexity, Google AI Overviews) by adding synthesized, front-loaded answers and machine-parsable formats.

### Instructions
1. Run an audit on the `/resources` markdown files.
2. For each article, inject an "Atomic Summary" at the top—a 60–80 word direct answer to the main intent of the article.
3. Convert dense paragraphs into bulleted lists or markdown tables where applicable.

### Definition of Done
- [ ] All live `.md` / `.mdx` files in the resources directory have been updated.
- [ ] Top-level summaries added.
- [ ] H2/H3 headings revised to match likely search queries.
- [ ] Content successfully pushed to the `main` branch and deployed.

### 🚀 Kickoff Prompt (Copy/Paste into a NEW chat)
```text
We are executing Phase 2 of the Waypoint SEO_GEO_PLAYBOOK: "Atomic" Content Structuring.

Your task is to audit and rewrite the markdown articles inside the project’s resources directory (`/content/resources/` or wherever our mdx files live) to optimize for Generative Engine Optimization (GEO).

For every article, implement the following:
1. Add an "Atomic Summary" immediately below the frontmatter. This must be a tight, 60–80 word direct answer to the core premise of the article. Speak authoritatively, directly answering the implied question.
2. Look for dense paragraphs in the body and reformat them into machine-parsable structures (bullet points, numbered lists, or markdown tables). 
3. Ensure the Voice Guide (`docs/VOICE_GUIDE.md`) is strictly followed—no marketing fluff, punchy sentences, direct tone.

Do not ask for permission to modify files; create a work checklist and execute the modifications file by file. Let me know when the branch is ready to push.
```

---

## Phase 3: Geo-Targeted & Service-Area Landing Pages
This phase ensures that Waypoint captures local search intent for key geographic markets without polluting the main site architecture.

### Instructions
1. Establish dedicated "Service Area" landing pages that inherit the main site design but optimize for specific regions (e.g., Denver, CO).
2. Incorporate specific geographic references, local market conditions, and explicit `LocalBusiness` schema targeting these areas.

### Definition of Done
- [ ] A new routing structure or template (e.g., `/locations/[region]`) is created.
- [ ] A canonical page for the primary target region (e.g., Denver) is written and launched.
- [ ] Region-specific FAQ structured data is generated.
- [ ] Internal linking connects the location pages organically to the main site.

### 🚀 Kickoff Prompt (Copy/Paste into a NEW chat)
```text
We are executing Phase 3 of the Waypoint SEO_GEO_PLAYBOOK: Geo-Targeted Landing Pages.

Your task is to architect and build a new Next.js route system for localized landing pages to capture geographic search intent (e.g., "franchise consultant in Denver").

Actions:
1. Create a dynamic or static route structure (e.g., `/areas/[region]` or `/locations/[region]`) using the existing Tailwind/Next.js design system.
2. Draft and deploy the first canonical page for Denver, Colorado.
3. The content must include local geographic references (e.g., the Denver market, neighborhood hubs like Cherry Creek, etc.) but must still strictly follow the Waypoint Voice Guide (`docs/VOICE_GUIDE.md`) — no cheesy SEO stuffing.
4. Ensure the page injects `LocalBusiness` JSON-LD schema specific to that service area.
5. Create a sitemap entry or map it into the existing `src/app/sitemap.ts` file.

Please research the existing routing structure first, present a technical plan, and upon my approval, build the pages.
```

---

## Phase 4: Original Data Report (The "Citation Magnet")
AI systems highly weight un-synthesized, original data. In this phase, we convert your historical proprietary data ("146+ owners helped across 35 states") into a dedicated, citable report.

### Instructions
1. Build a high-quality, data-dense page functioning as a whitepaper or "State of the Industry" piece.
2. Structure the data using charts, markdown tables, and definitive statistical statements so AI engines can securely extract and cite them.

### Definition of Done
- [ ] Dedicated `/reports/state-of-buying` (or similar) page created.
- [ ] Data points explicitly identified and structured for AI ingestion.
- [ ] Embedded PDF or download link provided for PR outreach use.

### 🚀 Kickoff Prompt (Copy/Paste into a NEW chat)
```text
We are executing Phase 4 of the Waypoint SEO_GEO_PLAYBOOK: Original Data Reporting.

Your task is to create a dedicated, data-dense web page that will act as a primary "citable source" for AI search engines. We are leveraging our proprietary stat: "146+ owners helped across 35 states".

Actions:
1. Create a visually compelling, distinct page route (e.g., `/resources/data/franchise-buyer-report-2026`).
2. Write the content as an authoritative industry report. Invent necessary structural sections (e.g., "Demographic Shifts in Buying", "Most Active Territories", "The Rise of Semi-Absentee").
3. Use markdown tables, blockquotes, and tightly formatted statistical lists. AI models look for these structures to pull citations.
4. Keep the design aligned with the site's rich aesthetics (Navy, Gold, Cream) but make it look like a premium whitepaper/web-report.

Please draft the content structure first. Once approved, build the Next.js page.
```

---

## Phase 5: Video + Transcripts (Ask YouTube) — DONE (initial)

Since Ask YouTube and AI Overviews surface video, transcripts/chapters/descriptions are conversationally searchable. Video is a citation surface, not just a CRO asset.

### Done
- `videoObjectSchema()` factory in `src/app/lib/structured-data.ts`.
- `/about` emits `VideoObject` from real Vimeo oEmbed metadata (name, description, thumbnail, timezone-qualified `uploadDate`, duration, embed/content URLs) — only when real data is present.
- `VimeoFacade` renders an optional crawlable `<details>` transcript; the About video transcript is populated with Kelsey's verbatim words and also flows into the schema's `transcript` field.

### Remaining
- Make video a frontmatter-driven article capability (add optional `video:` fields to `content/articles/*.md`, emit `VideoObject` in `src/app/(marketing)/resources/[slug]/page.tsx`) so high-intent articles can attach video + transcript.

---

## Phase 6: Agent-Friendly Architecture — DONE

Chrome-embedded AI Mode and agents (Project Mariner / UCP) navigate by DOM, accessibility tree, and visual render, and increasingly take actions like booking. The conversion path must be machine-navigable.

### Done
- `ReserveAction` (book-a-call) added to the site-wide `Service` schema so agents understand the bookable action.
- Crawlable booking-link fallback on `/book` (the TidyCal embed is a JS-injected widget agents cannot traverse).
- Real `<label>`/`aria-label`/`autoComplete` added to `EscapeKitCaptureForm` (was placeholder-only); ARIA live status/alert announcements added to `ContactForm`.

### Remaining
- Periodic automated a11y check (axe/Lighthouse) on home, an article, and `/book` as a regression guard.

---

## Phase 7: AI Share-of-Voice Measurement — DONE

As informational clicks fall, "are we cited?" becomes the leading KPI.

### Done
- `scripts/ai-citation-check.mjs` upgraded from binary cited/not-cited to tracked-set **Share of Voice** (presence SOV + average share vs. a competitor set; FranChoice excluded as we are an affiliate). Query set expanded from 8 to 16 to cover advisor-selection and conversational fan-out intent.
- `.github/workflows/monthly-seo-review.yml` already schedules the run monthly and now parses real numbers + surfaces SOV in the email summary.

### Remaining
- Flag GSC impressions-hold / CTR-drop URLs (AI Overview fingerprint) in `scripts/gsc-report.mjs`.
- Optional read-only admin view under `src/app/admin/` rendering the latest SOV report.

---

## Phase 8: Off-Site Citation Pool + Non-Commodity Content — IN PROGRESS

Information Agents synthesize from across the web; AI engines cite non-commodity content over paraphrase.

### Done
- `docs/OFFSITE_DISTRIBUTION.md` — SOP turning each published article into LinkedIn posts, community answers, and trade-press angles (authentic participation only, full compliance with content standards).
- Section 13 of `content/CONTENT-STANDARDS.md` — defines Waypoint's non-commodity edge (decision-process narratives, first-hand operator POV, aggregate anonymized pattern data, proprietary frameworks) within the no-brand / no-earnings constraints, plus a "commodity test."
- `image[]` added to `LocalBusiness`/`Organization` schema (entity anchor + clears rich-results notice).

### Remaining (needs Kelsey's inputs)
- **"As Heard On" press section** on `/about` + reflect verified podcast/media URLs in the `Person` schema `sameAs`. Needs confirmed, real URLs (do not publish unverified links).
- **Original Data Report (Phase 4 "Citation Magnet")** built from genuine aggregate stats only (146+ placements, 35 states, 250+ brands screened, ~30% proceed rate). No invented data, no profitability, no brand names. Needs Kelsey to confirm/supply the dataset before the page is built.

