# Waypoint Franchise Advisors — Website Optimization Roadmap

> **Purpose:** This document is a durable, context-window-independent reference for ongoing website improvements. Any agent or developer picking this up cold should be able to understand what has been done, what needs to happen next, and why — without needing to read the full conversation history.

---

## Current State (as of March 2026)

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Fonts:** Playfair Display (headings) + sans-serif system stack
- **Analytics:** GA4 (configured via `src/app/lib/analytics.ts`, events tracked: quiz start, quiz complete, book call clicked)
- **Booking:** TidyCal embed on `/book`
- **Email:** Resend — transactional, scorecard nurture, checklist delivery
- **Automation:** Inngest — cold email pipeline, checklist nurture, reply handling, warmup scheduler
- **Database:** Prisma + Neon (Postgres) — leads, status, enrichment, settings
- **Hosting:** Vercel (GitHub-connected, auto-deploy on push to `main`)
- **Repo:** `github.com/Franscale1922/waypoint-core-system`

### Pages Live
| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ Live | Hero, process steps, testimonials (dynamic stats), CTA |
| `/about` | ✅ Live | Kelsey bio, hero bg image, campfire photo, valley photo |
| `/process` | ✅ Live | 5-step process, intro call framing, statistics bar, franchise map |
| `/faq` | ✅ Live | 30-question accordion FAQ — no JSON-LD schema yet |
| `/book` | ✅ Live | TidyCal embed, trust bullets |
| `/scorecard` | ✅ Live | 5-question quiz, score-aware CTA (4 bands), score capped at 98 display |
| `/archetype` | ✅ Live | Owner archetype quiz |
| `/resources` | ✅ Live | Article index, 30+ articles live, phased content calendar active |
| `/resources/[slug]` | ✅ Live | Full article pages with related articles + checklist CTAs |
| `/checklists` | ✅ Live | Lead magnet hub — industry-specific PDF delivery via email |
| `/refer` | ✅ Live | Referral page for CPAs, attorneys, financial planners |
| `/glossary` | ✅ Live | Franchise glossary for AEO/LLM discovery |
| `/investment` | ✅ Live | Investment range breakdown page |
| `/privacy` | ✅ Live | — |
| `/terms` | ✅ Live | — |

### Systems Live (Backend)
| System | Status | Notes |
|--------|--------|-------|
| **Cold email pipeline** | ✅ Complete | Clay → enrichment → GPT-4o personalization → Instantly send → reply classification → HITL Slack alerts |
| **Lead admin dashboard** | ✅ Complete | `/admin/leads`, `/admin/leads/[id]`, send-now button, regenerate emails, settings |
| **Checklist lead magnet** | ✅ Complete | Email capture → branded HTML email delivery → 5-email nurture via Resend |
| **Scorecard nurture** | ✅ Complete | 3-email sequence (Day 0 / Day 2 / Day 5) via Resend scheduled send |
| **Franchise map** | ✅ Complete | 146 cities from Google Sheet (public CSV) — ISR cached, updates hourly |
| **Dynamic stats** | ✅ Complete | "146+ owners / 35 states" in Testimonials pulls live from same Google Sheet |
| **Webhook bridge** | ✅ Complete | Google Apps Script → Clay webhook, `onRowAdded` trigger |
| **Sitemap + robots** | ✅ Complete | `src/app/sitemap.ts` — live at waypointfranchise.com/sitemap.xml |

---

## Decision Log

### Blog → Resources
**Decision:** `/blog` renamed to `/resources`. 301 redirect active in `next.config.ts`. All nav, footer, and internal links updated.

### Testimonials
**Decision:** 8 synthesized testimonials (business is new; historical stat of 146 owners is real and sourced from prior business). The "146+ owners / 35 states" stat is dynamic — reads from the franchise map Google Sheet (`1olep7m7ZjCu_jpePBqEqMZo2rWyoiCo_RIzTlX3Hleo`). Stat fallback = hardcoded 146/35 if fetch fails.

### Scorecard Score Cap
**Decision:** Display caps at 98/100. Raw score still drives CTA band logic. Email subject also capped at 98.

### Content Calendar
**Decision:** Articles publish 3/week in phase order. See `content/CONTENT-CALENDAR.md` for phased rollout. Do not publish out of order or in bulk.

---

## Remaining Work

Items ordered by **impact × effort ratio**.

---

### 🔴 Sprint 3 — Performance & Technical SEO

#### ✅ 3.1 `<img>` → Next.js `<Image>` Component — COMPLETE
All marketing pages already use `next/image` with proper `fill`, `priority`, `sizes`, and `width`/`height`. No raw `<img>` tags exist. Migration was done in a prior session.

#### ✅ 3.2 FAQ Schema Markup (JSON-LD) — COMPLETE
`FAQPage` JSON-LD schema dynamically built from the `faqs` data array in `faq/page.tsx` (lines 235–257). All 30 questions included automatically. Injected as `<script type="application/ld+json">` in page head. Schema stays in sync with content by construction.

#### ✅ 3.3 Page-Specific Open Graph Images — COMPLETE
Generated and deployed unique OG images for: glossary, investment, tools, franchise-consultant-vs-broker, resources/getting-started. All stored in `/public/og/`. Pages still using default: `resources/going-deeper`, `resources/industry-spotlights`, `quizzes` (low priority — thin pages).

#### ✅ 3.4 Internal Linking Audit — COMPLETE
Contextual links added to 5 pages (111 insertions):
- **`/process`**: Step 4 → validation article, Step 5 → `/checklists`
- **`/scorecard`**: Low-score path now returns 3 targeted resource cards instead of generic browse
- **`/about`**: Inline scorecard + process nudge added mid-body
- **`/book`**: "Want to come prepared?" section linking to process, investment, scorecard
- **`/investment`**: Inline ROBS → funding article, FDD → FDD article, FAQ exit → agreement article

---

### 🟢 Sprint 5 — SEO & GEO Execution (New Priority)
> A comprehensive Generative Engine Optimization (GEO) and off-page SEO playbook has been built. The detailed, phased execution plan is stored at `docs/SEO_GEO_PLAYBOOK.md`.

#### ✅ 5.1 Foundation & Trust Schema — COMPLETE
Expanded `Organization`, `Person`, and `LocalBusiness` JSON-LD schema across the site. Added `memberOf` blocks connecting Kelsey Stuart and Waypoint to the **FranChoice** and **International Franchise Association (IFA)** networks for high-authority association. Configured as a Service Area Business (Whitefish, MT / National).

#### ✅ 5.2 PR Automation Engine (Connectively) — COMPLETE
Built an inbound webhook at `/api/webhooks/connectively` to process forwarded PR media lists. Uses Anthropic (`claude-3-haiku`) to filter for specific franchise/funding topics, draft a pitch according to the Voice Guide, and push the draft to the Slack admin channel automatically.

#### 5.3 Implement Actionable Playbook Phases — PENDING
Execute Phases 1-4 documented in `docs/SEO_GEO_PLAYBOOK.md` (Directory Claims, Atomic Content Restructuring, Geo-Targeting Pages, Original Data Extraction).

---

### 🟡 Sprint 4 — Content & Growth (Ongoing)

#### 4.1 Continue Article Publishing
**Status:** 30+ articles live. ~10+ remaining in queue.
**Rule:** Follow `content/CONTENT-CALENDAR.md` — 3/week, phase order, no bulk publishing.

#### 4.2 FAQ Copy Fix
**File:** `src/app/(marketing)/faq/page.tsx`
**Issue:** First FAQ answer may still reference "two-hour discovery conversation" as the first step — contradicts the new "30-minute intro call" framing on `/process`.
**Fix:** *"We start with a short intro call — usually 20 to 30 minutes — to understand where you are and whether going deeper makes sense. If it does, we schedule the full discovery conversation from there."*

#### ✅ 4.3 LinkedIn DM Queue — COMPLETE
**Built (March 2026):**
- `/admin/linkedin` page — mirrors the Inngest query in real-time (SENT leads, 5+ days, top 20 by score)
- Each lead card shows name/title/company/score, days since email, LinkedIn profile link, copy-paste DM script
- "Mark DM Sent" and "Skip" buttons — call `/api/admin/leads/[id]/dm-sent` and `/api/admin/leads/[id]/dm-skip`
- Done leads collapse to a separate section; queue refreshes in-place on action
- `dmStatus` + `dmSentAt` fields added to `Lead` schema (auto-migrated via `prisma db push` on Vercel deploy)
- "LinkedIn Queue" nav item added to admin sidebar
- Inngest function (`linkedInDmQueue`) was already built and registered — Slack alerts continue to fire Mon–Fri 9 AM MT



### 🟢 Completed — For Reference

| Item | Done |
|------|------|
| Testimonials section — 8 synthesized quotes, dynamic stat | ✅ |
| Scorecard personalized CTA (4 score bands) | ✅ |
| Scorecard score capped at 98 display | ✅ |
| Scorecard 3-email nurture sequence | ✅ |
| Blog → Resources rename + 301 redirect | ✅ |
| Resources page wired to MDX articles | ✅ |
| Sitemap + robots.txt | ✅ |
| Franchise map — 146 cities from Google Sheet | ✅ |
| Dynamic "owners helped / states" stat from Google Sheet | ✅ |
| Checklist lead magnet + HTML email delivery | ✅ |
| 5-email checklist nurture sequence | ✅ |
| Cold email pipeline (end-to-end) | ✅ |
| Admin dashboard + lead detail pages | ✅ |
| Referral page (`/refer`) | ✅ |
| Glossary page | ✅ |
| Investment page | ✅ |
| Mobile audit (390px / 430px / 768px) | ✅ |
| Image compression (14 PNGs → JPEGs) | ✅ |
| FAQ 30-question expansion | ✅ |
| FAQ copy note (discovery session framing) | ⚠️ Verify |

---

## Go-Live Checklist (Site is live — this section is for reference)

### Environment Variables (Vercel)
| Variable | Source |
|---|---|
| `OPENAI_API_KEY` | platform.openai.com |
| `RESEND_API_KEY` | resend.com |
| `DATABASE_URL` | Neon dashboard |
| `AUTH_SECRET` | `.env` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console |
| `GITHUB_TOKEN` | github.com/settings/tokens (repo: Contents R/W) |
| `GITHUB_REPO_OWNER` | `Franscale1922` |
| `GITHUB_REPO_NAME` | `waypoint-core-system` |
| `GITHUB_BRANCH` | `main` |
| `TIDYCAL_WEBHOOK_SECRET` | TidyCal dashboard |
| `RESEND_WEBHOOK_SECRET` | Resend dashboard |
| `INNGEST_SIGNING_KEY` / `INNGEST_EVENT_KEY` | app.inngest.com |
| `CLAY_WEBHOOK_SECRET` | Clay dashboard |
| `INSTANTLY_API_KEY` | app.instantly.ai |
| `SLACK_WEBHOOK_URL` | Slack app settings |

---

## Guiding Principles for Future Agents

1. **Kelsey's voice:** Direct, honest, first-person, never salesy. Short sentences. "I'll tell you if this isn't right for you" energy.

2. **Design system:**
   - Navy: `#0c1929`
   - Gold: `#d4a55a` / Copper: `#CC6535`
   - Cream: `#FAF8F4`
   - Body text: `#3a3a2e` / `#4a4a4a`
   - Fonts: Playfair Display (headings), system sans (body)

3. **Image rules:** Hero images as CSS `background-image` with explicit `backgroundPosition`. Section images as `<img>` with `object-cover`. Migrate to `next/image` in Sprint 3 (still pending).

4. **Git commit pattern:** `git add -A && git commit -m "type: short description" && git push`. Types: `feat`, `fix`, `perf`, `content`, `refactor`.

5. **Dev server:** `npm run dev` from `/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system/`

6. **Content calendar:** Never publish articles out of phase order or in bulk. Always check `content/CONTENT-CALENDAR.md` first.

7. **Google Sheet (map + stats):** `1olep7m7ZjCu_jpePBqEqMZo2rWyoiCo_RIzTlX3Hleo` — two columns: `City` (display name) | `State` (abbreviation). Public CSV access. ISR revalidates hourly.
