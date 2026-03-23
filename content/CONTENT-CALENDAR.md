# Waypoint Franchise Advisors — Content Calendar

> **Purpose:** This document governs the timing, sequencing, and distribution of all Waypoint content — articles, checklists, and social programming. Any agent or human picking this up should be able to determine: what to publish next, when to publish it, and what to post around it.
>
> **Scope:** Article publishing strategy · Social media programming · Internal linking sequencing · Cadence rules

---

## Why Timing Matters

Publishing 40 articles at once is slower than a staged rollout, not faster. Google allocates crawl budget to newer sites carefully. A sudden flood of content with no inbound signals looks like bulk publishing, not authority building. LLMs and AI answer engines (Perplexity, ChatGPT, Gemini) favor content that has accumulated at least some indexing and link signals before they citation-rank it.

**The goal is not to have articles published. The goal is to have articles indexed, trusted, and surfaced.**

A staged rollout accomplishes this. A bulk drop does not.

---

## Article Publishing Cadence

### Target rate: 3 articles per week

- **Minimum:** 2 per week (below this, Google crawl intervals stretch and momentum is lost)
- **Maximum:** 4 per week (above this, indexing typically lags publication and back-linking quality suffers)
- **Day of week:** No hard rule, but spacing them across Mon/Wed/Fri or similar avoids clustering all articles in one crawl window

### Agent instruction: one session = one article

When drafting articles, complete one full article (including back-linking, pool update, keyword map update, and social drafts) before starting the next. Do not batch-draft without completing the full workflow per article. Incomplete articles with missing back-links or pool updates break the internal link graph.

### Commitment rhythm

After each article is drafted and passes the pre-publication checklist in `CONTENT-STANDARDS.md`:
1. Commit and push to `main` — Vercel auto-deploys
2. Submit the new URL to Google Search Console manually via the URL Inspection tool (do not wait for the sitemap crawl)
3. Log the publish date in the Phase Tracker below

---

## Phase Tracker

Update this table after each article is published. This is the source of truth for what has shipped and when.

| Phase | Article Slug | Publish Date | GSC Submitted | Indexed |
|-------|--------------|--------------|---------------|---------|
| 1 | *(see Phase 1 below)* | — | — | — |

*Replace placeholder rows with actual entries as articles go live. "Indexed" = confirmed via URL Inspection in Search Console showing "URL is on Google".*

---

## Phased Rollout Plan

Articles are sequenced to build topical authority progressively. Earlier phases establish foundational content that later phase articles can back-link to. Do not skip phases — an Industry Spotlight that back-links to a Getting Started article that isn't live yet is an orphan.

### Phase 1 — Foundation (Weeks 1–4, ~12 articles)

**Goal:** Establish the broadest layer of topical authority. These articles target the widest search intent and form the hub that all future articles link back to.

**Rule:** All Phase 1 articles should be live before any Phase 2 article is drafted.

| Priority | Working Title | Queue Status | Category |
|----------|---------------|--------------|----------|
| 1 | What the Franchise Process Actually Looks Like, Start to Finish | `[~]` Needs Kelsey input | Getting Started |
| 2 | Which Candidate Avatar Are You? | `[~]` Needs avatar docs | Getting Started |
| 3 | Franchise Ownership as a Total Reinvention | `[~]` Needs Kelsey input | Getting Started |
| 4 | Bringing Your Spouse or Partner Into the Franchise Decision | `[~]` Needs Kelsey input | Getting Started |
| 5 | Maid and Residential Cleaning Franchises | `[ ]` Agent-ready | Industry Spotlights |
| 6 | Staffing Franchises | `[ ]` Agent-ready | Industry Spotlights |
| 7 | Garage Transformation Franchises | `[ ]` Agent-ready | Industry Spotlights |
| 8 | Mosquito Control Franchises | `[ ]` Agent-ready | Industry Spotlights |
| 9 | Pet Services Franchises | `[ ]` Agent-ready | Industry Spotlights |
| 10 | Weight Loss Franchises | `[ ]` Agent-ready | Industry Spotlights |
| 11 | Pilates Franchises | `[ ]` Agent-ready | Industry Spotlights |
| 12 | IT Services and MSP Franchises | `[ ]` Agent-ready | Industry Spotlights |

> **Note on `[~]` articles:** Flag these for Kelsey before drafting. The four Getting Started conceptual pieces (items 1–4) require Kelsey's direct input or source documents before an agent should write them. If Kelsey input is not yet available, skip to the agent-ready Industry Spotlights and return to the `[~]` items when source material is ready.

---

### Phase 2 — Cluster Expansion (Weeks 5–9, ~15 articles)

**Goal:** Fill out the industry spotlight layer and deepen the Going Deeper / advisory cluster. Phase 2 articles have strong back-link targets already live from Phase 1.

| Priority | Working Title | Queue Status | Category |
|----------|---------------|--------------|----------|
| 13 | Hair Care and Salon Service Franchises | `[ ]` | Industry Spotlights |
| 14 | Child Enrichment Franchises | `[ ]` | Industry Spotlights |
| 15 | Sports Performance and Training Franchises | `[ ]` | Industry Spotlights |
| 16 | Assisted Stretch Franchises | `[ ]` | Industry Spotlights |
| 17 | Laundromat Franchises | `[ ]` | Industry Spotlights |
| 18 | Salon Suite Franchises | `[ ]` | Industry Spotlights |
| 19 | Light Remodel Franchises | `[ ]` | Industry Spotlights |
| 20 | Glass Replacement Franchises | `[ ]` | Industry Spotlights |
| 21 | Cost and Operational Efficiency Franchises | `[ ]` | Industry Spotlights |
| 22 | Fleet Maintenance Franchises | `[ ]` | Industry Spotlights |
| 23 | The Exploration Process Is a Practice Run | `[~]` Needs expansion | Getting Started |
| 24 | Why Weekly Meetings Change Everything During Brand Exploration | `[~]` Needs Kelsey input | Going Deeper |
| 25 | When a Candidate Says They're Pausing | `[~]` Needs Kelsey observations | Going Deeper |
| 26 | On-Site Corporate Gym Franchises | `[ ]` | Industry Spotlights |
| 27 | Sugar Waxing and Hair Removal Franchises | `[ ]` | Industry Spotlights |

---

### Phase 3 — Long Tail & Niche (Weeks 10–14, ~13 articles)

**Goal:** Complete coverage of niche categories and regulated/complex industries. These articles benefit from the domain authority built in Phases 1–2. Regulated categories (`[~]`) require careful drafting — agents should flag for Kelsey review on those specifically.

| Priority | Working Title | Queue Status | Category |
|----------|---------------|--------------|----------|
| 28 | Swim School Franchises | `[ ]` | Industry Spotlights |
| 29 | Montessori and Alternative Education Franchises | `[ ]` | Industry Spotlights |
| 30 | Driving School Franchises | `[ ]` | Industry Spotlights |
| 31 | Estate Sale Franchises | `[ ]` | Industry Spotlights |
| 32 | Pet Waste Removal Franchises | `[ ]` | Industry Spotlights |
| 33 | Large-Scale Storage Franchises | `[ ]` | Industry Spotlights |
| 34 | B2B Logistics Franchises | `[ ]` | Industry Spotlights |
| 35 | Turf Installation and Exterior Residential Franchises | `[ ]` | Industry Spotlights |
| 36 | Music Education Franchises | `[ ]` | Industry Spotlights |
| 37 | Golf Simulator and Instruction Franchises | `[ ]` | Industry Spotlights |
| 38 | Mental Health Franchises | `[~]` Needs careful framing | Industry Spotlights |
| 39 | Chiropractic and Health Coaching Franchises | `[~]` Needs Kelsey input | Industry Spotlights |
| 40 | Med Spa Franchises | `[~]` Needs Kelsey input | Industry Spotlights |

> **Note on regulated categories:** Mental Health, Chiropractic, and Med Spa franchises involve licensing complexity and liability framing that requires Kelsey's review before publishing. Draft, but do not commit without sign-off.

---

### Remaining Queue Items (No Phase Assigned Yet)

The following articles from `ARTICLE-QUEUE.md` have not been phased. Assign them to a phase or create Phase 4 when Phase 3 is underway:

- Sweet Concept Franchises
- Entertainment and Destination Franchises
- Furniture Franchises
- Kids Sports Franchises
- Butcher Shop Franchises
- Commercial Testing and Environmental Services Franchises
- Expanded B2B Services: Categories Worth Watching
- Real Estate-Related Franchises
- Kids Sports Franchises

---

## Internal Linking Sequencing Rules

These rules exist so the back-link graph stays intact as the library grows.

1. **Never back-link to an article that isn't live yet.** Before adding a slug to an existing article's `relatedSlugs`, confirm that slug exists in `content/articles/` and has been committed to `main`.

2. **Phase 1 articles are the primary hub.** When choosing `relatedSlugs` for any Phase 2 or Phase 3 article, prefer Phase 1 articles as at least one of the three links. This ensures authority flows back to the foundation.

3. **Industry Spotlights should link upward.** Every Industry Spotlight article should include at least one Getting Started or Going Deeper article in its `relatedSlugs`. This creates vertical authority flow across tiers, not just horizontal clustering within the same category.

4. **Back-link proportionally to phase.** A Phase 3 article should be findable from at least one Phase 1 and one Phase 2 article before it goes live. Check this before committing.

---

## Agent Gate: When to Pause

Agents working through this queue should stop and flag for Kelsey review when any of the following conditions exist:

- **All Phase 1 agent-ready articles are drafted** and the `[~]` Getting Started articles have not been unblocked yet. Do not proceed to Phase 2 without confirming Phase 1 is complete.
- **A `[~]` article is next in priority** and no source material or Kelsey guidance has been provided. Flag it, skip to the next `[ ]` article, and return.
- **90 days of Search Console data is available.** At this point, stop adding new articles and run `/seo-review` before publishing more. Real performance data should inform the next phase's prioritization.
- **More than 4 articles are queued in GitHub without being indexed.** Slow down publishing and prioritize Search Console submission of the backlog.

---

## Social Media Programming

> **Status: Framework defined — detailed programming rules to be added.**

The social draft workflow is already embedded in the article creation process (Step 8 of `.agents/workflows/new-article.md`). Each article produces a Twitter/X thread and a LinkedIn post as part of standard output.

This section will expand to cover:

- Platform-specific posting cadence (how many times per week per platform)
- Evergreen re-promotion schedule (republishing older articles on social after 30/60/90 days)
- Content mixing rules (ratio of article promotions to original social-only posts)
- Engagement response guidelines (how to handle comments, DMs, reposts)
- Hashtag strategy per platform
- Best times to post for the franchise buyer audience
- Coordination between social posting and fresh article publication (e.g., post the LinkedIn share within 48 hours of a new article going live to signal fresh activity to Google)

**When building social programming rules**, add them here and cross-reference `.agents/workflows/new-article.md` Step 8 so agents have a single place to check for both the draft format and the distribution timing.

---

## Reference Documents

| Document | Purpose |
|---|---|
| `content/ARTICLE-QUEUE.md` | Full queue of articles with status and checklist assignments |
| `content/CONTENT-STANDARDS.md` | Hard rules every article must pass before publishing |
| `content/new-article-checklist.md` | Article pool table and back-linking process |
| `content/keyword-map.md` | Primary keyword targets per article |
| `.agents/workflows/new-article.md` | Full 9-step workflow for drafting and publishing an article |
| `.agents/workflows/seo-review.md` | Monthly SEO health check — run when GSC data is available |
