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
| 1 | `property-management-franchises` | 2026-04-01 | ⏳ Pending | ⏳ Pending |

*"Indexed" = confirmed via URL Inspection in Search Console showing "URL is on Google". Submit each new URL in GSC immediately after publish — do not wait for sitemap crawl.*

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
| 13 | Property Management Franchises | `[x]` Published 2026-04-01 | Industry Spotlights |

> **Note on `[~]` articles:** Flag these for Kelsey before drafting. The four Getting Started conceptual pieces (items 1–4) require Kelsey's direct input or source documents before an agent should write them. If Kelsey input is not yet available, skip to the agent-ready Industry Spotlights and return to the `[~]` items when source material is ready.

> **Note on item 13 (Property Management):** Priority bump — social content already exists on this topic. This gap should close before Phase 2 begins. Agent-ready.

---

### Phase 2 — Cluster Expansion (Weeks 5–9, ~15 articles)

**Goal:** Fill out the industry spotlight layer and deepen the Going Deeper / advisory cluster. Phase 2 articles have strong back-link targets already live from Phase 1.

| Priority | Working Title | Queue Status | Category |
|----------|---------------|--------------|----------|
| 14 | Hair Care and Salon Service Franchises | `[ ]` | Industry Spotlights |
| 15 | Child Enrichment Franchises | `[ ]` | Industry Spotlights |
| 16 | Sports Performance and Training Franchises | `[ ]` | Industry Spotlights |
| 17 | Assisted Stretch Franchises | `[ ]` | Industry Spotlights |
| 18 | Laundromat Franchises | `[ ]` | Industry Spotlights |
| 19 | Salon Suite Franchises | `[ ]` | Industry Spotlights |
| 20 | Light Remodel Franchises | `[ ]` | Industry Spotlights |
| 21 | Glass Replacement Franchises | `[ ]` | Industry Spotlights |
| 22 | Cost and Operational Efficiency Franchises | `[ ]` | Industry Spotlights |
| 23 | Fleet Maintenance Franchises | `[ ]` | Industry Spotlights |
| 24 | The Exploration Process Is a Practice Run | `[~]` Needs expansion | Getting Started |
| 25 | Why Weekly Meetings Change Everything During Brand Exploration | `[~]` Needs Kelsey input | Going Deeper |
| 26 | When a Candidate Says They're Pausing | `[~]` Needs Kelsey observations | Going Deeper |
| 27 | On-Site Corporate Gym Franchises | `[ ]` | Industry Spotlights |
| 28 | Sugar Waxing and Hair Removal Franchises | `[ ]` | Industry Spotlights |
| 29 | What Kind of Support Does a Franchisor Actually Provide? | `[~]` Needs Kelsey input | Going Deeper |
| 30 | Franchising vs. Starting Your Own Business: An Honest Look at Both | `[ ]` Agent-ready | Going Deeper |
| 31 | Betting on Yourself: How to Overcome Self-Doubt Before Buying a Franchise | `[~]` Needs Kelsey input | Mindset |

> **Note on item 30 (Franchising vs. Starting a Business):** This article is the editorial backbone for a planned infographic asset — *"Franchise vs. Starting From Scratch."* Draft the article first, then the infographic pulls its core comparison points directly from the article content. See **Special Assets** section below.

> **Note on item 31 (Betting on Yourself):** This is a high-trust, identity-level piece that requires Kelsey's voice and real personal story. Do not draft from research alone — needs Kelsey input on the emotional arc of making the leap, what self-doubt felt like, and what pushed him through it.

---

### Phase 3 — Long Tail & Niche (Weeks 10–14, ~13 articles)

**Goal:** Complete coverage of niche categories and regulated/complex industries. These articles benefit from the domain authority built in Phases 1–2. Regulated categories (`[~]`) require careful drafting — agents should flag for Kelsey review on those specifically.

| Priority | Working Title | Queue Status | Category |
|----------|---------------|--------------|----------|
| 32 | Swim School Franchises | `[ ]` | Industry Spotlights |
| 33 | Montessori and Alternative Education Franchises | `[ ]` | Industry Spotlights |
| 34 | Driving School Franchises | `[ ]` | Industry Spotlights |
| 35 | Estate Sale Franchises | `[ ]` | Industry Spotlights |
| 36 | Pet Waste Removal Franchises | `[ ]` | Industry Spotlights |
| 37 | Large-Scale Storage Franchises | `[ ]` | Industry Spotlights |
| 38 | B2B Logistics Franchises | `[ ]` | Industry Spotlights |
| 39 | Turf Installation and Exterior Residential Franchises | `[ ]` | Industry Spotlights |
| 40 | Music Education Franchises | `[ ]` | Industry Spotlights |
| 41 | Golf Simulator and Instruction Franchises | `[ ]` | Industry Spotlights |
| 42 | Mental Health Franchises | `[~]` Needs careful framing | Industry Spotlights |
| 43 | Chiropractic and Health Coaching Franchises | `[~]` Needs Kelsey input | Industry Spotlights |
| 44 | Med Spa Franchises | `[~]` Needs Kelsey input | Industry Spotlights |

> **Note on regulated categories:** Mental Health, Chiropractic, and Med Spa franchises involve licensing complexity and liability framing that requires Kelsey's review before publishing. Draft, but do not commit without sign-off.

---

### Phase 3 — After You Buy Cluster (new category)

**Goal:** Content for people who have signed or are close to signing — operational, team-building, and mindset articles that demonstrate Kelsey's depth of post-purchase knowledge. These also attract pre-purchase readers who want to understand what comes after the decision.

> **Category note:** "After You Buy" is a new content category. These articles should link back to Getting Started and Going Deeper articles to create a full reader journey from consideration → decision → execution.

| Priority | Working Title | Queue Status | Category |
|----------|---------------|--------------|----------|
| 45 | I Bought a Franchise. Now I Have to Build a Team. | `[~]` Needs Kelsey input | After You Buy |
| 46 | What to Look for When Hiring People to Run Your Franchise With You | `[~]` Needs Kelsey input | After You Buy |
| 47 | Five Mistakes New Franchisees Make in Year One | `[~]` Needs Kelsey input | After You Buy |
| 48 | Why the Franchisees Who Ask for Help Outperform the Ones Who Don't | `[ ]` Agent-ready | After You Buy |
| 49 | The Playbook Is There for a Reason: Why Improvising Early Costs You | `[ ]` Agent-ready | After You Buy |
| 50 | The First-Year Emotional Arc: What Nobody Tells You Before You Sign | `[~]` Needs Kelsey input | After You Buy |

> **Note on items 45–50:** These six articles form a cluster. Draft item 47 (Five Mistakes) first — it is the hub piece and the others (48, 49, 50) are explicit spinoffs that deepen individual mistakes into full articles. Items 45 and 46 (team building and hiring) are a paired cluster — draft together or in sequence.

> **Note on item 47 (Five Mistakes):** The five mistakes should include at minimum: (1) not asking for help, (2) ignoring the playbook and improvising, (3) hiring too fast or with the wrong criteria, (4) underestimating the emotional difficulty of year one, (5) operating in isolation instead of leaning on the franchisee network. Each mistake in the hub article becomes its own full article in items 48–50.

---

### Remaining Queue Items (No Phase Assigned Yet)

The following articles have not been phased. Assign them to a phase or create Phase 4 when Phase 3 is underway:

- Sweet Concept Franchises
- Entertainment and Destination Franchises
- Furniture Franchises
- Kids Sports Franchises
- Butcher Shop Franchises
- Commercial Testing and Environmental Services Franchises
- Expanded B2B Services: Categories Worth Watching
- Real Estate-Related Franchises

---

### Special Assets

Non-article content tied to specific articles in the queue. Produce these alongside the paired article, not before it.

| Asset | Type | Paired Article | Status |
|-------|------|----------------|--------|
| Franchise vs. Starting From Scratch | Infographic | Item 30 — *Franchising vs. Starting Your Own Business* | `[ ]` Pending article draft |

> **Infographic production note:** Draft item 30 (the editorial article) first. The infographic should distill the article's core comparison points into a clean visual — key dimensions: upfront cost, time to revenue, ongoing support, risk profile, creative control, scalability. Once the article is committed, the infographic can be produced and embedded at the top of the article page and shared as a standalone social asset.

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
