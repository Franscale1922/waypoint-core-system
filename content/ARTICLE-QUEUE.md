# Waypoint Article Queue

Articles are drafted using `.agents/workflows/new-article.md` and must comply with `content/CONTENT-STANDARDS.md` before publishing.

**Status key:** `[ ]` To Do · `[~]` Needs Interview/Research · `[>]` In Progress · `[x]` Published

---

> ## ⚠️ HELD DRAFTS — READY TO PUBLISH (as of 2026-05-31)
>
> **Three articles are already fully drafted, verified, and wired** (relatedSlugs, back-links, pool, keyword map, social drafts). They are **NOT yet published** — they wait on the git branch **`aeo/phase2-drafts-reinvention-spouse`** (pushed to origin). **Do not re-draft them.** Some rows below still show `[~]`/`[ ]`; that is stale, ignore it.
>
> **Publish order (forced — the Spouse article links to the Reinvention article, so Reinvention must go live first):**
> 1. `franchise-ownership-as-a-total-reinvention` + `bringing-your-spouse-into-the-franchise-decision` — branch commit `e07249c`
> 2. `hair-care-and-salon-service-franchises` — branch commit `5780c58`
>
> **To publish the next held article:** `git fetch`, merge that commit into `main`, flip its queue + `CONTENT-CALENDAR.md` status from `[>]` to `[x]`, add a `Phase Tracker` row with the publish date, push `main` (Vercel auto-deploys), then submit the new URL in Google Search Console (URL Inspection → Request Indexing). Respect cadence: 3 shipped 2026-05-31 (it-services, process, avatars); max 4/week, so space the pushes across days.
>
> Hair Care uses `checklistSlug: "universal"` (a salon/beauty checklist in `content/downloads/` is an optional enhancement, not built). Interview source for Reinvention/Spouse: `content/_phase2-interview-notes.md` (local, gitignored).

---

> ## 📊 NEXT TWO, FROM MEASURED DEMAND (added 2026-08-03)
>
> The first valid Search Console report (`docs/seo-reviews/2026-08/`) says the queue below is aimed
> at the wrong things. Almost every unwritten row is an industry spotlight, but the site's measured
> demand is in **funding** and **cost**, where pages already exist and rank badly:
>
> | Cluster | Impressions | Best page today | Position |
> |---|---|---|---|
> | ROBS / SBA funding | 54 | `/franchise-financing/robs-401k-rollover` | 82.7 |
> | Franchise cost / price | 41 | `/investment` | 66.6 |
> | Territory | 9 | `how-to-pick-a-franchise-territory` | 77.3 |
>
> Industry spotlights measured so far draw 1 to 5 impressions each. They are worth writing for
> coverage, but they are not what the next two slots should go to.
>
> **Recommended next two, both depth rather than new categories:**
>
> 1. **ROBS in practice: what the rollover actually involves.** Queries are specific and procedural
>    ("robs sba loan", "robs rollovers options", "robs 401k sba"). The existing page ranks 82.7,
>    which means thin coverage against people asking operational questions. No interview needed;
>    `sba-loan-vs-robs-franchise-funding-comparison` already carries Kelsey's framing to build on.
> 2. **What a franchise costs, by the numbers.** The cost cluster is now *measured* as landing on
>    `/investment`, a landing page rather than an article, at position 85 to 97 across four queries.
>    `the-true-cost-of-buying-a-franchise` exists but drew no impressions.
>
>    ⚠️ I originally justified this with "`franchise-investment-by-category` at position 3.3 shows
>    this shape works". **Withdrawn.** The query-to-page join shows every one of that page's visible
>    queries is a brand lookup (`bonkers corner franchise cost` and similar) ranking at position 1,
>    which is what pulls its average to 3.3. The case for this article now rests on the demand being
>    real (41 impressions) and on nothing but a landing page serving it, which is enough on its own.
>
>    Also worth a category piece each, on measured demand with no coverage at all: **payroll** and
>    **freight**. `payroll franchise investment info` is 27 impressions, the second largest single
>    query on the site, and `freight franchise cost` is 10. Both currently land on `/investment` at
>    position 92. Neither has a sourced investment range in the repo yet, so research comes first.
>
> Re-check next month before committing: one month of data on a site this size is a signal, not a
> conclusion.

---

## Conceptual & Advisory Articles
*These require interview time with Kelsey or source documents before drafting. Core voice and insight must come from direct input.*

| Status | Working Title | Category | Notes |
|---|---|---|---|
| `[~]` | When a Candidate Says They're Pausing | Getting Started | "Pausing" = overwhelmed/quitting but can't say it. Reframe for advisors and candidates. Needs Kelsey's pattern observations. |
| `[~]` | Why Weekly Meetings Change Everything During Brand Exploration | Going Deeper | Value of regular touchpoints during brand conversations — prep, guide, digest. Needs Kelsey's process detail. |
| `[~]` | The Exploration Process Is a Practice Run | Getting Started | Following franchisor processes before you sign is a preview of franchise life. Trust in standards not created by you. Needs expansion. |
| `[~]` | Franchise Ownership as a Total Reinvention | Getting Started | Not just leaving a desk — full mindset shift from corporate to entrepreneurial. Connects to candidate avatars. Needs avatar docs. |
| `[x]` | Which Candidate Avatar Are You? (and What That Means for Your Search) | Getting Started | Published as `which-candidate-avatar-are-you` (2026-05-31), built on the candidate-model-builder 8-archetype framework. |
| `[x]` | What the Franchise Process Actually Looks Like, Start to Finish | Getting Started | Published as `what-the-franchise-process-looks-like-start-to-finish` (2026-05-31), from Kelsey's consult template + call transcripts. |
| `[~]` | Bringing Your Spouse or Partner Into the Franchise Decision | Getting Started | FAQ gap: how to involve a partner early, what they should know, how to align before signing. Needs Kelsey's observations on partner dynamics in the process. |

---

## Industry Spotlight Articles
*Most can be drafted agentically once a category is greenlit. Flag `[~]` if Kelsey's insights or specific market intel are needed first.*

| Status | Working Title | Category | Notes |
|---|---|---|---|
| `[x]` | Pet Services Franchises: What the Category Actually Looks Like | Industry Spotlights | Published as `pet-care-franchise-built-on-unconditional-demand`. |
| `[ ]` | Hair Care and Salon Service Franchises: How the Model Works | Industry Spotlights | Booth rental vs. franchise employee model distinction important here. |
| `[ ]` | Estate Sale Franchises: A Category Most Buyers Overlook | Industry Spotlights | Low capital entry, repeat clientele, demographic tailwinds. |
| `[ ]` | Child Enrichment Franchises: What Parents Buy and What You Operate | Industry Spotlights | Tutoring, STEM, arts — recurring vs. program-based revenue. |
| `[ ]` | Swim School Franchises: Seasonal Demand and the Year-Round Model | Industry Spotlights | Indoor vs. outdoor, membership structure, staffing model. |
| `[x]` | IT Services and MSP Franchises: The B2B Tech Category Explained | Industry Spotlights | Published as `it-services-and-msp-franchises` (2026-05-31). |
| `[ ]` | Large-Scale Storage Franchises: The PODS-Style Business Model | Industry Spotlights | Asset-heavy, high capital, recurring revenue. Real estate adjacency. |
| `[ ]` | Sports Performance and Training Franchises | Industry Spotlights | Youth vs. adult split, membership vs. session-based, facility requirements. |
| `[ ]` | Fleet Maintenance Franchises: B2B Service with Built-In Retention | Industry Spotlights | Contract-based, commercial clients, low consumer dependency. |
| `[~]` | Mental Health Franchises: What the Licensing Reality Looks Like | Industry Spotlights | Highly regulated — needs careful treatment of licensure, supervision requirements. Flag profitability restriction carefully. |
| `[~]` | Chiropractic and Health Coaching Franchises | Industry Spotlights | Overlaps licensed healthcare — needs careful framing. Kelsey's input recommended. |
| `[ ]` | Cost and Operational Efficiency Franchises: Selling Savings to Businesses | Industry Spotlights | B2B consulting model, energy auditing, procurement optimization. |
| `[x]` | Staffing Franchises: Recurring Revenue Through Workforce Placement | Industry Spotlights | Published as `staffing-franchises`. |
| `[ ]` | Light Remodel Franchises: The Middle Ground Between Construction and Services | Industry Spotlights | Bathroom, kitchen refresh — subcontractor model, ticket size, seasonality. |
| `[x]` | Garage Transformation Franchises: High Ticket, High Satisfaction | Industry Spotlights | Published as `garage-transformation-franchises`. |
| `[ ]` | Glass Replacement Franchises: Insurance-Driven Demand | Industry Spotlights | Auto and residential glass — insurance referral pipeline parallel to restoration. |
| `[ ]` | On-Site Corporate Gym Franchises: B2B Wellness at Scale | Industry Spotlights | Employer-contract model, recurring revenue, low consumer marketing spend. |
| `[ ]` | Sugar Waxing and Hair Removal Franchises | Industry Spotlights | Membership model, low product COGS, repeat service cadence. |
| `[~]` | Real Estate-Related Franchises: Brokerage, Inspection, and Adjacent Services | Industry Spotlights | Multiple sub-categories — needs scoping. Which angle to lead with? |
| `[ ]` | Assisted Stretch Franchises: The Wellness Category With Built-In Retention | Industry Spotlights | Membership model, practitioner staffing, low equipment overhead. |
| `[ ]` | Montessori and Alternative Education Franchises | Industry Spotlights | Tuition-based, long enrollment cycles, regulatory environment varies by state. |
| `[ ]` | Driving School Franchises: Licensing, Territory, and the Teen Demographic | Industry Spotlights | Regulated, recurring seasonal demand, instructor staffing model. |
| `[ ]` | Sweet Concept Franchises: Candy, Ice Cream, and the Impulse Purchase Model | Industry Spotlights | Brick-and-mortar, high foot traffic dependency, tourism and mall adjacency. |
| `[ ]` | Laundromat Franchises: The Semi-Passive Model With Real Overhead | Industry Spotlights | Capital-heavy equipment, location-critical, true passive income vs. reality. |
| `[x]` | Maid and Residential Cleaning Franchises: The Repeat Service Model | Industry Spotlights | Published as `maid-and-residential-cleaning-franchises`. |
| `[x]` | Weight Loss Franchises: Medical vs. Behavioral vs. Coaching Models | Industry Spotlights | Rapidly evolving category (GLP-1 impact). Needs current framing. |
| `[x]` | Mosquito Control Franchises: Seasonal Business With Recurring Revenue | Industry Spotlights | Subscription model, outdoor service, geographic demand variation. |
| `[ ]` | Salon Suite Franchises: The Landlord Model for Beauty | Industry Spotlights | Not operating a salon — leasing suites to independent stylists. Asset-light, recurring. |
| `[ ]` | B2B Logistics Franchises: Last-Mile and Specialty Freight Models | Industry Spotlights | Non-consumer, contract-based, driver/fleet model. |
| `[x]` | Pilates Franchises: Studio Economics and the Boutique Fitness Reality | Industry Spotlights | Membership vs. class pack, instructor staffing, equipment cost. Compare to fitness article. |
| `[ ]` | Pet Waste Removal Franchises: The Business That Sounds Funny and Performs Seriously | Industry Spotlights | Extremely low capital, recurring route-based model, B2C with B2B (HOA) potential. |
| `[ ]` | Entertainment and Destination Franchises: Experience Economy Models | Industry Spotlights | Escape rooms, axe throwing, mini golf — foot traffic and event booking hybrid. |
| `[ ]` | Furniture Franchises: Retail Model Pressures and the Franchise Fit | Industry Spotlights | Lease obligations, inventory, e-commerce competition. Requires careful framing. |
| `[ ]` | Kids Sports Franchises: Leagues, Coaching, and the Youth Activity Market | Industry Spotlights | Seasonal, facility-dependent, community-relationship-driven. |
| `[ ]` | Butcher Shop Franchises: Specialty Food Retail With a Craft Angle | Industry Spotlights | Artisan positioning, cold storage requirements, perishable inventory. |
| `[ ]` | Commercial Testing and Environmental Services Franchises | Industry Spotlights | B2B, regulatory-driven demand, recurring inspection contracts. |
| `[ ]` | Expanded B2B Services: Categories Worth Watching | Industry Spotlights | Catch-all for emerging B2B models not yet in standalone articles. |
| `[ ]` | Turf Installation and Exterior Residential Franchises | Industry Spotlights | Artificial turf, landscaping enhancement — project-based, high ticket, referral-driven. |
| `[ ]` | Music Education Franchises: The Recurring Revenue Behind the Recital | Industry Spotlights | Lesson-based model, recurring enrollment, studio vs. in-home vs. school partnership formats. |
| `[ ]` | Golf Simulator and Instruction Franchises: Year-Round Revenue in an Indoor Format | Industry Spotlights | Technology-forward, membership and lesson hybrid, premium demographic, lower real estate dependency than traditional golf. |
| `[~]` | Med Spa Franchises: What the Licensing Reality Looks Like | Industry Spotlights | Medical-adjacent, regulated by state — requires careful framing. Needs Kelsey's input on investor suitability and staffing model before drafting. |

---

## Notes for Agents

> **Before committing any article to the repo, check `content/CONTENT-CALENDAR.md`.** It defines the phased rollout plan, publish cadence (3/week), internal linking sequencing rules, and agent gate conditions. Do not publish articles out of phase order or in bulk.

- Before drafting any `[~]` article, flag for Kelsey review or request the relevant source documents
- All industry spotlights can be drafted agentically from public franchise category knowledge once greenlit
- Draft order suggestion: start with `[ ]` items that complement existing published articles (check `relatedSlugs` gaps in the current pool)
- Every completed article must run the full workflow in `.agents/workflows/new-article.md`
- **Every new article requires a `checklistSlug` frontmatter field.** See Step 4b in the workflow for the decision tree and lookup table.
- **When building any checklist or downloadable asset**, read `content/CONTENT-STANDARDS.md` Section 12 before writing. FDD item numbers require inline explanations in downloadable assets.

---

## Checklist Assignments for Queued Industry Spotlights

When these articles are drafted, use these `checklistSlug` values. If a dedicated checklist does not yet exist for the industry, use `"universal"` as a placeholder.

| Working Title | `checklistSlug` |
|---|---|
| Pet Services Franchises | `universal` (no pet-specific checklist yet — create before publishing) |
| Hair Care and Salon Service Franchises | `universal` |
| Estate Sale Franchises | `universal` |
| Child Enrichment Franchises | `universal` |
| Swim School Franchises | `fitness-wellness` |
| IT Services and MSP Franchises | `b2b` |
| Large-Scale Storage Franchises | `universal` |
| Sports Performance and Training Franchises | `fitness-wellness` |
| Fleet Maintenance Franchises | `b2b` |
| Mental Health Franchises | `universal` |
| Chiropractic and Health Coaching Franchises | `fitness-wellness` |
| Cost and Operational Efficiency Franchises | `b2b` |
| Staffing Franchises | `b2b` |
| Light Remodel Franchises | `home-services` |
| Garage Transformation Franchises | `home-services` |
| Glass Replacement Franchises | `home-services` |
| On-Site Corporate Gym Franchises | `b2b` |
| Sugar Waxing and Hair Removal Franchises | `fitness-wellness` |
| Real Estate-Related Franchises | `universal` |
| Assisted Stretch Franchises | `fitness-wellness` |
| Montessori and Alternative Education Franchises | `universal` |
| Driving School Franchises | `universal` |
| Sweet Concept Franchises | `food-and-beverage` |
| Laundromat Franchises | `universal` |
| Maid and Residential Cleaning Franchises | `home-services` |
| Weight Loss Franchises | `fitness-wellness` |
| Mosquito Control Franchises | `home-services` |
| Salon Suite Franchises | `universal` |
| B2B Logistics Franchises | `b2b` |
| Pilates Franchises | `fitness-wellness` |
| Pet Waste Removal Franchises | `home-services` |
| Entertainment and Destination Franchises | `universal` |
| Furniture Franchises | `universal` |
| Kids Sports Franchises | `universal` |
| Butcher Shop Franchises | `food-and-beverage` |
| Commercial Testing and Environmental Services Franchises | `b2b` |
| Expanded B2B Services: Categories Worth Watching | `b2b` |
| Turf Installation and Exterior Residential Franchises | `home-services` |
| Music Education Franchises | `universal` |
| Golf Simulator and Instruction Franchises | `universal` |
| Med Spa Franchises | `fitness-wellness` |

*Conceptual/Advisory articles:* Use `checklistSlug: "universal"` for all Getting Started and Going Deeper conceptual pieces.
