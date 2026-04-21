---

# Waypoint Franchise Advisors — Technology Overview
### Built Infrastructure, Tools, and Agent Systems

> **Prepared for:** Technology Partner Discussion  
> **As of:** April 2026  
> **Scope:** All repositories and systems under `github.com/Franscale1922`

---

## Executive Summary

Waypoint operates a fully custom-built technology stack across three major layers:

1. **The Waypoint Platform** — Public-facing website + custom CRM/admin dashboard (Next.js, deployed on Vercel)
2. **Gravity Claw** — Autonomous agent swarm that runs intelligence, lead enrichment, and outreach pipelines
3. **Franchise Conduit** — A separate B2B discovery platform connecting high-net-worth investors to franchisors

All systems are interconnected through a shared Slack workspace and numerous API integrations. Almost everything downstream of Kelsey's weekly lead research runs without her touching it.

---

## Repository Map

| Repository | Purpose | Status |
|---|---|---|
| `waypoint-core-system` | Main web app + CRM + cold email pipeline | ✅ Live |
| `gravity-claw` | Autonomous agent orchestration swarm | ✅ Live |
| `warn-intel` | WARN Act intelligence pipeline (standalone) | ✅ Live |
| `franchise-conduit` | Investor-facing franchise discovery platform | 🏗️ In Build |
| `franchise-library` | Document vault (238 FDDs + one-sheets) | ✅ Active |
| `fdd-extractor` | PDF → structured JSON extraction pipeline | ✅ Active |
| `brand-asset-collector` | Automated brand asset collection pipeline | ✅ Active |

---

## waypointfranchise.com — Current Build Status
### As of April 2026

**Site is live.** Deployed on Vercel at waypointfranchise.com. Auto-deploys on every push to `main`.

### Pages — All Live

| Route | Status | Notes |
|---|---|---|
| `/` | ✅ Live | Hero, process steps, 8 testimonials (dynamic stat), CTA |
| `/about` | ✅ Live | Kelsey bio, hero bg image, campfire photo, valley photo |
| `/process` | ✅ Live | 5-step advisory process, statistics bar, franchise map |
| `/faq` | ✅ Live | 30 questions, accordion, FAQ JSON-LD schema (all questions included) |
| `/book` | ✅ Live | TidyCal embed for 90-min Zoom consultations + trust bullets |
| `/scorecard` | ✅ Live | 5-question quiz → score-aware CTA (4 bands), score display capped at 98 |
| `/archetype` | ✅ Live | Owner archetype quiz |
| `/resources` | ✅ Live | Article index — 30+ articles live, phased content calendar active |
| `/resources/[slug]` | ✅ Live | Full article pages with related articles + checklist CTAs |
| `/checklists` | ✅ Live | Lead magnet hub — industry-specific PDF delivery via email |
| `/refer` | ✅ Live | Referral page for CPAs, attorneys, financial planners |
| `/glossary` | ✅ Live | Franchise glossary for AEO/LLM discovery |
| `/investment` | ✅ Live | Investment range breakdown by category |
| `/privacy` | ✅ Live | Privacy policy |
| `/terms` | ✅ Live | Terms of service |

### Backend Systems — All Live

| System | Status | Notes |
|---|---|---|
| Cold email pipeline (end-to-end) | ✅ Live | Clay → GPT-4o → Instantly → reply classification → HITL alerts |
| Lead admin dashboard | ✅ Live | `/admin/leads`, `/admin/leads/[id]`, send-now, regenerate, settings |
| LinkedIn DM queue | ✅ Live | `/admin/linkedin` — live queue, DM scripts, Mark Sent / Skip |
| Checklist lead magnet | ✅ Live | Email capture → branded HTML email → 5-email nurture (Resend) |
| Scorecard nurture | ✅ Live | 3-email sequence: Day 0 / Day 2 / Day 5 via Resend |
| Franchise map | ✅ Live | 146 cities pulled from Google Sheet via ISR — revalidates hourly |
| Dynamic stats | ✅ Live | "146+ owners / 35 states" in hero — live pull from same Google Sheet |
| Webhook bridge | ✅ Live | Google Apps Script → `/api/webhooks/clay` (onRowAdded trigger) |
| PR Automation Webhook | ✅ Live | `/api/webhooks/connectively` → filters media queries via Claude → Slack |
| Sitemap + robots.txt | ✅ Live | `waypointfranchise.com/sitemap.xml` — auto-generated |
| FAQ JSON-LD schema | ✅ Live | All 30 questions injected as `FAQPage` structured data |
| Page-specific OG images | ✅ Live | Unique OG images for key pages; stored in `/public/og/` |
| Internal linking audit | ✅ Live | 111 contextual links added across 5 core pages |
| Mobile responsive audit | ✅ Live | Tested at 390px / 430px / 768px breakpoints |

### Technical SEO Completions (Sprint 3)

| Item | Status |
|---|---|
| `next/image` migration (all marketing pages) | ✅ Complete |
| FAQ JSON-LD schema (all 30 questions, dynamic) | ✅ Complete |
| Page-specific Open Graph images | ✅ Complete |
| Internal linking audit (111 additions, 5 pages) | ✅ Complete |


### SEO & GEO Master Execution (Sprint 5)

| Item | Status |
|---|---|
| Trust JSON-LD Schema | ✅ Complete — `Organization`, `Person`, and `LocalBusiness` schemas injected. Hardcoded `memberOf` blocks connecting to **FranChoice** and **IFA** |
| Master Execution Playbook | ✅ Complete — 4-phase master roadmap stored in `docs/SEO_GEO_PLAYBOOK.md`|
| PR Automator Webhook | ✅ Complete — Hooks inbound media queries, drafts quotes, pushes to Slack |
| Phase 1: Local Directory Claims | ⚠️ Pending (Manual setup) |
| Phase 2: Atomic Content Rewrite | ⚠️ Pending |
| Phase 3: Geo-Targeting Pages | ⚠️ Pending |
| Phase 4: Proprietary Data Report | ⚠️ Pending |


### In Queue (Sprint 4 — Ongoing)

| Item | Status |
|---|---|
| Article publishing (30+ live, ~10 remaining in queue) | 🟡 Ongoing — 3/week, phase order |
| FAQ copy fix ("two-hour discovery" → "30-minute intro call") | ⚠️ Verify still needed |

### Design System

| Token | Value |
|---|---|
| Navy | `#0c1929` |
| Gold | `#d4a55a` |
| Copper | `#CC6535` |
| Cream | `#FAF8F4` |
| Body text | `#3a3a2e` / `#4a4a4a` |
| Heading font | Playfair Display |
| Body font | System sans-serif stack |

---

## System 1: `waypoint-core-system`
### The Waypoint Platform — waypointfranchise.com

**What it is:** Full-stack Next.js application. This is the public website, the internal admin dashboard, and the complete cold email outreach engine — all in one codebase.

**Hosting:** Vercel (auto-deploys on push to `main`)  
**Database:** Neon PostgreSQL via Prisma ORM  
**Domain:** waypointfranchise.com (DNS via Cloudflare)

---

### 1A. Public Marketing Website

| Page | Purpose |
|---|---|
| `/` | Homepage — hero, process steps, testimonials, CTA |
| `/about` | Kelsey's bio, credibility signals |
| `/process` | 5-step franchise advisory process |
| `/faq` | 30-question FAQ with JSON-LD schema |
| `/book` | TidyCal booking embed (90-min Zoom consultation) |
| `/scorecard` | 5-question quiz → personalized score + CTA |
| `/archetype` | Owner archetype quiz |
| `/resources` | Article index (30+ live articles) |
| `/resources/[slug]` | Individual article pages with related articles |
| `/checklists` | Lead magnet hub — industry-specific PDF delivery by email |
| `/refer` | Referral page for CPAs, attorneys, financial planners |
| `/glossary` | Franchise glossary for AEO/LLM discovery |
| `/investment` | Investment range breakdown |

**Key features:** Dynamic franchise map (146 cities), dynamic owner/state count stats, Foundation JSON-LD Schema (Organization, Person, IFA Member Status), unique OG images per key page, SEO Playbook routing.

---

### 1B. Cold Email Pipeline — Complete 13-Step Sequence

```
Step 1 — LEAD DISCOVERY (Manual | Weekly, ~45 min total)
  Kelsey uses LinkedIn Sales Navigator:
  Filter: VP/Director/CXO + career transition signals + WARN Act company names
  Signals: OpenToWork badge, "Posted in last 30 days", transition language in posts
  
Step 2 — LEAD EXPORT (Manual | Weekly)
  Evaboot Chrome extension → "Extract with Evaboot" button in Sales Navigator
  → Clean CSV with server-verified emails (safe tier only during warmup)
  → ~65% email match rate at safe tier

Step 3 — LEAD IMPORT (Manual | Weekly)
  Admin dashboard → ImportLeadForm → POST /api/leads
  → Lead enters database: status: PENDING_CLAY

Step 4 — CLAY ENRICHMENT (Automated | Triggered per import batch)
  Evaboot CSV manually imported into Clay table
  Clay runs enrichment waterfall:
    - recentPostSummary (recent LinkedIn posts)
    - companyNewsEvent (PredictLeads → Google News)
    - yearsInCurrentRole (tenure)
    - Company headcount, industry, seniority, OpenToWork status
  Findymail fallback: finds emails where Evaboot found none
  ZeroBounce: verifies all enriched emails before export
  → Clay exports enriched row to Google Sheet

Step 5 — WEBHOOK BRIDGE (Automated | Per row added to Sheet)
  Google Apps Script (Code.gs) fires on each new Google Sheet row
  → POSTs enriched lead payload to POST /api/webhooks/clay
  Auth: x-clay-secret header
  → Lead updated in DB with enrichment signals, status: RAW
  → Fires Inngest event: workflow/lead.hunter.start

Step 6 — SCORING (Automated | Seconds after Step 5)
  Inngest function: leadHunterProcess
  Scores 0–100 based on:
    - Title seniority (VP/Director/CXO = higher score)
    - Career trigger signals (layoff, OpenToWork, posts)
    - Company news event (WARN filing, layoff announcement)
    - Post content (transition language, burnout signals)
    - Persona fit (Ops/Finance/Sales/GM functions)
    - Tenure (≥8 years = +20pts, ≥5 years = +10pts)
  Score < 70 → status: SUPPRESSED (never sends to this lead)
  Score ≥ 70 → status: ENRICHED → fires personalizerProcess

Step 7 — EMAIL PERSONALIZATION (Automated | Minutes after Step 6)
  Inngest function: personalizerProcess
  GPT-4o writes 50–90 word plain-text cold email using:
    - 6 email templates (A–F, mapped to ICP trigger type)
    - Priority A signal: companyNewsEvent (WARN/layoff)
    - Priority B signal: recentPostSummary (LinkedIn post)
    - Priority C: universal "golden handcuffs" framing
    - 20 prohibited phrases enforced (no AI clichés)
    - CAN-SPAM footer auto-appended (P.O. Box + opt-out)
  → status: SEQUENCED

Step 8 — DAILY SEND SCHEDULER (Automated | 8 AM MT, Mon–Fri)
  Inngest cron: warmupScheduler
  Reads SystemSettings.maxSendsPerDay (currently 35)
  Selects top 35 SEQUENCED leads by score
  Fires workflow/lead.send.start for each

Step 9 — EMAIL SEND (Automated | Immediately after Step 8)
  Inngest function: senderProcess
  Calls Instantly v2 API → adds lead to "Waypoint Outbound" campaign
  Subject: "quick thought" | Body: {{personalization}} field
  Sends from: getwaypointfranchise.com / meetwaypointfranchise.com
  6 warmed inboxes (all at 100% health), 25/day cap
  → status: SENT

Step 10 — REPLY DETECTION (Automated | Within minutes of reply)
  Instantly inbound reply webhook → POST /api/webhooks/resend
  Auth: INBOUND_WEBHOOK_SECRET Bearer token
  → Creates Reply DB record
  → Fires Inngest event: workflow/lead.reply.received

Step 11 — REPLY CLASSIFICATION (Automated | Seconds after Step 10)
  Inngest function: replyGuardianProcess
  GPT-4o classifies reply as one of:
    Interested / Curious / Not now / Not a fit / Unsubscribe / OOO / Ambiguous
  If Interested / Curious / Ambiguous → triggers HITL alert (Step 12)
  If Unsubscribe / Not a fit → status: SUPPRESSED
  → status: REPLIED

Step 12 — HUMAN ALERT (Automated | Triggered by hot reply)
  Resend API → plain email to kelsey@waypointfranchise.com
  + Slack webhook → #waypoint-hot-replies channel
  Alert contains:
    - Lead name, title, company, LinkedIn URL, score
    - Full reply text
    - AI-drafted follow-up suggestion (GPT-4o, Kelsey's voice)
    - TidyCal booking link
  ⏱ Target response time: 15 minutes

Step 13 — BOOKING SYNC (Automated | 10 AM MT, Mon–Fri)
  Inngest cron: tidycalBookingSync
  Polls TidyCal API for new bookings (2-day lookback window)
  Matches booking email against Lead DB
  → status: BOOKED
```

**Lead Status Lifecycle:**
```
PENDING_CLAY → RAW → ENRICHED → SEQUENCED → SENT → REPLIED → BOOKED
                                                    ↓
                                              SUPPRESSED (at any stage)
```

---

### 1C. Inngest Background Functions — Cron Schedule

| Function | Trigger | Schedule | Purpose |
|---|---|---|---|
| `warmupScheduler` | Cron | 8 AM MT, Mon–Fri | Fires daily send batch |
| `tidycalBookingSync` | Cron | 10 AM MT, Mon–Fri | Polls TidyCal, syncs bookings |
| `pendingClayFallback` | Cron | 7 AM MT, Mon–Fri | Advances leads stuck >24h in PENDING_CLAY |
| `linkedInDmQueue` | Cron | 9 AM MT, Mon–Fri | Generates LinkedIn DM scripts for Slack |
| `ghostRecoveryAlert` | Cron | 10 AM MT, Monday | Finds silent REPLIED leads → ghost recovery scripts |
| `monitorProcess` | Cron | Daily 9 AM | Pipeline health check |
| `contentRefreshFunction` | Cron | 1st of each month | Rewrites stale website articles via GPT-4o |
| `leadHunterProcess` | Event | On `workflow/lead.hunter.start` | Scores each RAW lead |
| `personalizerProcess` | Event | On `workflow/lead.personalize.start` | GPT-4o writes email |
| `senderProcess` | Event | On `workflow/lead.send.start` | Adds lead to Instantly campaign |
| `replyGuardianProcess` | Event | On `workflow/lead.reply.received` | Classifies reply, fires HITL alert |

---

### 1D. LinkedIn & PR Parallel Tracks

**LinkedIn Pipeline (Sent leads, No Reply)**  
Runs automatically via cron, Kelsey hits send manually:
| Step | Trigger Day | Slack Output |
|---|---|---|
| Step 0 | Day 1 post-SENT | Connection request note (calm, personal, no pitch) |
| Step 1 | Day 5 | Follow-up DM script |
| Step 2 | Day 10 | Resource/guide resurface DM |
| Step 3 | Day 16 | Final low-pressure check-in |

**Inbound PR Pipeline (Connectively Media Requests)**  
Email auto-forward hits `/api/webhooks/connectively`, runs autonomously:
| Step | Trigger | Slack Output |
|---|---|---|
| Step 1 | Connectively list received | Claude-Haiku filters for franchise-relevant queries |
| Step 2 | Hit identified | Generates Voice Guide-aligned draft quote automatically |
| Step 3 | Output | Pushed to Slack for immediate copy-pasting to reporters |

---

### 1E. Inbound Nurture Sequences

| Sequence | Trigger | Delivery |
|---|---|---|
| Checklist nurture | Lead downloads industry checklist from `/checklists` | 5-email sequence via Resend |
| Scorecard nurture | Lead completes `/scorecard` quiz | 3-email sequence: Day 0 / Day 2 / Day 5 via Resend |

---

### 1F. Admin Dashboard

Live at `waypointfranchise.com/admin` (Google OAuth required).

| Page | What Kelsey Does There |
|---|---|
| `/admin` | Reviews funnel stats overview |
| `/admin/leads` | Monitors all leads by status, score, email draft |
| `/admin/leads/[id]` | Regenerates emails, sends individually, views enrichment signals |
| `/admin/linkedin` | Copies DM scripts, marks leads done, skips leads |
| `/admin/settings` | Adjusts daily send cap, reviews API key status |

---

### 1G. Third-Party Integrations Summary

| Tool | Role in Pipeline | Frequency |
|---|---|---|
| LinkedIn Sales Navigator | Lead discovery (VP/Dir/CXO + signals) | Kelsey weekly |
| Evaboot | Export Sales Nav results + server-verify emails | Kelsey weekly |
| Clay | Post/news/company enrichment waterfall | Automated per batch |
| Google Apps Script | Bridge Clay Google Sheet → Waypoint webhook | Auto per Clay row |
| OpenAI GPT-4o | Email personalization + reply classification | Auto per lead |
| Instantly | Email delivery (6 warmed inboxes, 25/day) | Auto daily |
| Resend | HITL alert emails + nurture sequences | Auto on trigger |
| Slack | Hot reply + PR drafts + DM queue + agent intel | Auto daily |
| TidyCal | Booking widget on /book + booking sync cron | Continuous |
| Inngest | All background jobs and crons | Continuous |
| Neon PostgreSQL | Lead CRM database | Continuous |
| Vercel | Hosting + auto-deploy on git push | On every push |
| Cloudflare | DNS + CDN + security layer | Continuous |

---

## System 2: `gravity-claw`
### The Agent Swarm — Autonomous Intelligence Pipeline

**What it is:** A self-hosted agent orchestration system (OpenClaw gateway) running a fleet of semi-autonomous AI agents on scheduled cron jobs. Each agent has its own workspace folder with `AGENTS.md` (config) and `SKILL.md` (execution instructions).

**Gateway:** OpenClaw (self-hosted) routes tasks to Claude, GPT-4o, or Gemini Flash based on task type and cost profile.

---

### Agent Roster

#### Agent 1: `warn-intel`
Collects WARN Act layoff filings from 5 US states, extracts company names and headcounts from PDFs, deduplicates against the historical registry, and posts a structured "Lead Intelligence Report" to Slack.

| Attribute | Detail |
|---|---|
| **Frequency** | Weekly (Monday, automated cron) |
| **Model** | Claude Sonnet 4.5 |
| **States covered** | California, Texas, Florida, Ohio, Tennessee |
| **Output** | Slack intelligence report + `warn-act-companies.md` registry update |
| **Human step** | Kelsey reviews Slack report, manually cross-searches companies in Sales Navigator |

**Why WARN Act leads are valuable:** Companies file 60 days in advance. Executives are still employed, severance is incoming, transition mindset is active — the ideal franchise buyer archetype.

#### Agent 2: `linkedin-signal`
Daily LinkedIn intelligence scan for VP/Director/CXO profiles showing career transition signals. Scores profiles and formats results into structured Slack cards.

| Attribute | Detail |
|---|---|
| **Frequency** | Daily (automated cron) |
| **Model** | Gemini Flash (cost-optimized for daily runs) |
| **Data source** | Tavily API (LinkedIn profile signal search) |
| **Output** | Slack cards with scored lead profiles + copy-paste import instructions |
| **Human step** | Kelsey reviews cards, selects who to import to admin dashboard |

#### Agent 3: `inbox-triage-poll`
Polls the Waypoint email inbox every 120 minutes, classifies each incoming message, and routes it to the appropriate Slack channel with a suggested response.

| Attribute | Detail |
|---|---|
| **Frequency** | Every 120 minutes (automated cron) |
| **Model** | Claude (Anthropic) |
| **Output** | Slack triage cards with classification + suggested response |
| **Human step** | Kelsey reads and responds |

#### Agent 4: `portal-watcher`
Monitors competitor franchise portals and industry directories for signal changes — new listings, pricing updates, competitor activity — and surfaces intelligence to Kelsey via Slack.

| Attribute | Detail |
|---|---|
| **Frequency** | Weekly (automated cron) |
| **Model** | Claude or Gemini |
| **Output** | Slack intelligence digest |
| **Human step** | Kelsey reviews for strategic decisions |

---

### Gravity Claw Architecture

```
OpenClaw Gateway (self-hosted)
  ├── Anthropic API → Claude Sonnet 4.5 (warn-intel, inbox-triage, portal-watcher)
  ├── OpenAI API → GPT-4o (fallback, complex reasoning tasks)
  └── Google Gemini API → Flash (linkedin-signal, cost-optimized daily runs)

Agent Workspaces (in gravity-claw repo):
  ├── warn-intel/         → AGENTS.md + SKILL.md + warn-act-companies.md
  ├── linkedin-signal/    → AGENTS.md + SKILL.md (Tavily-powered profile search)
  ├── inbox-triage-poll/  → AGENTS.md + SKILL.md (email polling + classification)
  └── portal-watcher/     → AGENTS.md + SKILL.md (competitor monitoring)

Slack Output Channels:
  ├── #warn-intel           → weekly WARN Act report
  ├── #waypoint-hot-replies → cold email hot reply HITL alerts
  └── #linkedin-signals     → daily profile cards + LinkedIn DM queue
```

---

## System 3: `warn-intel` (Standalone Repo)
### WARN Act Intelligence — Python Data Pipeline

A standalone Python pipeline that scrapes, parses, and aggregates WARN Act filings from state labor portals.

| Attribute | Detail |
|---|---|
| **Language** | Python (requests, BeautifulSoup, PyPDF2) |
| **States** | California, Texas, Florida, Ohio, Tennessee |
| **Cadence** | Weekly (Monday) |
| **Key file** | `warn-act-companies.md` — central company registry with dedup |
| **Output** | Registry updated + Slack intelligence report with ranked companies |

**Pipeline flow:**
```
1. Fetch WARN filing pages from state portals (web scrape)
2. Parse PDFs for: company name, headcount, notice date, location
3. Deduplicate against warn-act-companies.md registry
4. Rank by headcount (larger layoffs = more executive targets)
5. Update registry
6. Post Slack intelligence digest
```

---

## System 4: `franchise-conduit`
### Investor-Facing Discovery Platform

**What it is:** An executive-grade franchise discovery platform for $250K+ investors. Advisor-matched, FDD-powered, data-driven alternative to pay-to-rank consumer portals. Built in Next.js with static export.

**Status:** Stages 1–9 complete. Stage 10 (DNS cutover) pending.  
**Target user:** High-net-worth individuals considering franchising ($250K–$2M+ liquid capital)  
**Business model:** Advisor referral commission — Kelsey serves as the advisor match

| Page | Purpose |
|---|---|
| `/franchises` | Search/filter brand browsing (238 brands) |
| `/franchises/[slug]` | Individual brand detail (pulled from FDD-extracted JSON) |
| `/how-it-works` | Process explainer |
| `/methodology` | How brands are evaluated |
| `/resources` | Content hub (articles for SEO + trust building) |
| `/quiz` | Investor fit quiz → Kelsey advisor match |
| `/contact` | Inquiry form → Resend → Kelsey inbox |
| `/fdd-request` | FDD request form |

**Data feeding this platform:**
```
FDD PDFs (franchise-library vault)
  → fdd-extractor pipeline (Python + Claude)
    → brand JSON files (data/brands/[slug].json)
      → franchise-conduit Next.js pages (static at build time)
```

---

## System 5: `fdd-extractor`
### FDD PDF → Structured Data Pipeline

| Attribute | Detail |
|---|---|
| **Language** | Python + Claude API (document parsing) |
| **Input** | PDF files from `franchise-library` |
| **Output** | `data/brands/[slug].json` in `franchise-conduit` |
| **Trigger** | Manual (Kelsey runs when adding/updating brands) |

**Key data extracted:** Item 7 (investment range), Item 19 (financial performance), Item 20 (unit count), royalty rates, marketing fees, franchise term, training hours.

---

## System 6: `franchise-library`
### Document Vault — 238 Franchisors

| Attribute | Detail |
|---|---|
| **Contents** | 238 franchisors: FDDs, one-sheets, concept overviews |
| **Structure** | `franchisors/[brand-name]/` folders with PDFs |
| **Add workflow** | `add_brand.sh` script |
| **Downstream** | Feeds `fdd-extractor` → feeds `franchise-conduit` |

---

## System 7: `brand-asset-collector`
### Automated Brand Asset Pipeline

| Attribute | Detail |
|---|---|
| **Language** | Python |
| **Output** | Organized Google Drive folder per brand (logos + screenshots) |
| **Trigger** | Manual (Kelsey triggers when onboarding new brands) |

---

## End-to-End Master Sequence

```
─────────────────────────────────────────────────────────────────
INTELLIGENCE LAYER  (Weekly + Daily, Automated)
─────────────────────────────────────────────────────────────────
warn-intel agent (Monday, weekly)
  → Scrapes 5 state WARN portals → parses headcounts
    → Posts Slack intelligence report
      → Kelsey reviews → searches WARN companies in Sales Nav

linkedin-signal agent (Daily)
  → Tavily searches for VP/Dir/CXO transition profiles
    → Scores and formats lead cards → Posts to Slack
      → Kelsey reviews → selects leads to import

inbox-triage-poll agent (Every 120 min)
  → Polls email inbox → classifies messages
    → Routes triage cards to Slack → Kelsey responds

─────────────────────────────────────────────────────────────────
LEAD INGEST  (Weekly, Manual by Kelsey ~90 min total)
─────────────────────────────────────────────────────────────────
LinkedIn Sales Navigator
  → Evaboot Chrome extension exports CSV (server-verified emails)
    → Admin dashboard ImportLeadForm → DB: PENDING_CLAY
      → Same Evaboot CSV imported into Clay table

─────────────────────────────────────────────────────────────────
ENRICHMENT  (Automated, triggered per import batch)
─────────────────────────────────────────────────────────────────
Clay enrichment waterfall runs per row:
  recentPostSummary + companyNewsEvent + yearsInCurrentRole + demographics
  Findymail fallback email finding + ZeroBounce verification
    → Clay exports to Google Sheet
      → Google Apps Script → POST /api/webhooks/clay
        → Inngest: leadHunterProcess (score 0–100)
          → score < 70 → SUPPRESSED
          → score ≥ 70 → ENRICHED → personalizerProcess (GPT-4o email)
            → SEQUENCED

─────────────────────────────────────────────────────────────────
DAILY OUTREACH  (Automated, 8 AM MT Mon–Fri)
─────────────────────────────────────────────────────────────────
warmupScheduler cron
  → top 25 SEQUENCED leads → senderProcess
    → Instantly API → email dispatched → SENT

─────────────────────────────────────────────────────────────────
REPLY HANDLING  (Automated, real-time on any reply)
─────────────────────────────────────────────────────────────────
Instantly inbound webhook → replyGuardianProcess
  → GPT-4o classifies reply
    → Hot reply (Interested/Curious/Ambiguous):
        Resend alert + Slack card → Kelsey responds within 15 min
          → Shares TidyCal link → Prospect books
    → Cold reply (Unsubscribe/Not a fit):
        → SUPPRESSED

─────────────────────────────────────────────────────────────────
BOOKING SYNC  (Automated, 10 AM MT Mon–Fri)
─────────────────────────────────────────────────────────────────
tidycalBookingSync cron
  → TidyCal API poll (2-day lookback)
    → Matches booking to Lead DB → BOOKED

─────────────────────────────────────────────────────────────────
LINKEDIN & PR PARALLEL TRACKS (Automated alerts, Manual responses)
─────────────────────────────────────────────────────────────────
linkedInDmQueue cron (9 AM MT Mon–Fri)
  → Posts DM scripts iteratively to Slack → Kelsey sends DMs manually

PR Automator Webhook (Continuous)
  → Inbound media queries via /api/webhooks/connectively
    → Claude drafts responses → Posts directly to Slack

ghostRecoveryAlert cron (Monday 10 AM MT)
  → Finds REPLIED leads silent 30+ days → Posts recovery scripts

─────────────────────────────────────────────────────────────────
BRAND RESEARCH PIPELINE  (Manual trigger, batch runs)
─────────────────────────────────────────────────────────────────
Kelsey adds FDD PDF to franchise-library
  → brand-asset-collector: logos + screenshots → Google Drive
    → fdd-extractor: PDF → structured JSON
      → franchise-conduit brand pages built at next deploy
```

---

## Frequency Summary Table

| System / Agent | Triggered By | Frequency |
|---|---|---|
| WARN Act intelligence (warn-intel agent) | Automated cron | Weekly — Monday |
| LinkedIn signal scan (linkedin-signal agent) | Automated cron | Daily |
| Inbox triage (inbox-triage-poll agent) | Automated cron | Every 120 minutes |
| Lead import (Sales Nav + Evaboot + admin dashboard) | Kelsey | Weekly |
| Clay enrichment | Automated (on import batch) | Per batch |
| Lead scoring (`leadHunterProcess`) | Automated (per lead event) | Continuous |
| Email personalization (`personalizerProcess`) | Automated (per scored lead) | Continuous |
| Daily email sends (`warmupScheduler` → Instantly) | Automated cron | Daily — 8 AM MT |
| Reply classification (`replyGuardianProcess`) | Automated (on reply webhook) | Real-time |
| HITL hot reply alert (Resend + Slack) | Automated (on hot reply) | Real-time |
| PR Media Hit Alerts | Automated (via Webhook) | Real-time |
| LinkedIn DM queue (`linkedInDmQueue`) | Automated cron → manual send | Daily — 9 AM MT |
| Ghost recovery alert | Automated cron | Weekly — Monday |
| TidyCal booking sync | Automated cron | Daily — 10 AM MT |
| PENDING_CLAY fallback | Automated cron | Daily — 7 AM MT |
| Website content refresh | Automated cron | Monthly — 1st |
| Admin dashboard review | Kelsey | Daily |
| FDD extraction | Kelsey (on new brand add) | As needed |
| Brand asset collection | Kelsey (on new brand add) | As needed |

---

## Technology Stack at a Glance

| Layer | Tool | Purpose |
|---|---|---|
| **Hosting** | Vercel | Auto-deploy, serverless functions |
| **DNS / CDN** | Cloudflare | Domain management, security |
| **Database** | Neon PostgreSQL + Prisma ORM | Lead CRM, settings, replies |
| **Frontend** | Next.js 14 (App Router) | Web + admin UI |
| **Background Jobs** | Inngest | All async pipeline functions + cron jobs |
| **Cold Email** | Instantly (6 warmed inboxes) | Email delivery, 25/day cap |
| **Transactional Email** | Resend | HITL alerts + nurture sequences |
| **AI — Email/Reply** | OpenAI GPT-4o | Personalization + reply classification |
| **AI — Agents** | Claude Sonnet 4.5 | warn-intel, inbox-triage, portal-watcher |
| **AI — Agents (budget)** | Google Gemini Flash | linkedin-signal (daily runs) |
| **AI — PR Automation** | Anthropic claude-3-haiku | Filtering Connectively PR endpoints, drafts Slack responses |
| **Lead Export** | Evaboot | Sales Nav export + server-side email verification |
| **Lead Enrichment** | Clay (Launch plan) | Post, news, company data enrichment waterfall |
| **Webhook Bridge** | Google Apps Script | Clay Google Sheet → Waypoint /api/webhooks/clay |
| **Booking** | TidyCal | Consultation scheduling (embed + API sync) |
| **Notifications** | Slack | All agent output, HITL alerts, PR pitches, LinkedIn queue |
| **Version Control** | GitHub (Franscale1922 org) | All codebases |
| **Agent Gateway** | OpenClaw (self-hosted) | Routes agent tasks to correct AI model |

---

## What Kelsey Personally Does (Human-in-the-Loop Steps Only)

Everything not listed here runs automatically.

| Task | Frequency | Est. Time |
|---|---|---|
| Review WARN Act Slack intelligence report | Weekly | ~15 min |
| Search WARN companies in Sales Navigator | Weekly | ~30 min |
| Run Evaboot export (Sales Navigator) | Weekly | ~20 min |
| Import Evaboot CSV to admin dashboard | Weekly | ~10 min |
| Import Evaboot CSV to Clay table | Weekly | ~10 min |
| Review LinkedIn signal cards from Slack | Daily | ~10 min |
| Send LinkedIn DMs from Slack queue | Daily (Mon–Fri) | ~15 min |
| Copy-paste PR pitch drafts from Slack | On PR Hit | ~5 min |
| Respond to hot reply alerts | Within 15 min of receipt | Variable |
| Share TidyCal link with interested prospects | On hot reply | ~5 min |
| Review admin dashboard | Daily | ~10 min |
| Add new FDD/brand to franchise-library | As needed | ~30 min/brand |
| Trigger fdd-extractor for new brands | As needed | ~10 min |

**Weekly active time estimate: ~2.5–3 hours/week for a fully active pipeline.**

---

*Everything else — scoring, personalization, sending, reply classification, booking sync, LinkedIn DM scripts, inbox triage, WARN Act collection, content refresh, and PR drafting — runs automatically.*
