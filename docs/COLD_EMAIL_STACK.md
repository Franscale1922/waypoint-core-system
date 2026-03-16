# Waypoint Cold Email System — Tech Stack Reference

**Last updated:** March 2026  
**Volume target:** 15–20 sends/day, Mon–Fri  
**Goal:** Book franchise advisory consultations with VP/Director/CXO corporate executives in career transition

> This document is the source of truth for any AI session or developer working on the cold email pipeline. Read this before touching any code related to lead gen, outreach, or booking.

---

## Pipeline Overview

```
Lead Discovery (Sales Navigator)
    ↓
Manual CSV Export → ImportLeadForm.tsx → DB (RAW status)
    ↓
Inngest: leadHunterProcess → enriches via SuperSearch → scores (0–100)
    ↓ (gate: score ≥ 70)
Inngest: personalizerProcess → GPT-4o writes email from 5 context fields
    ↓
Instantly.ai campaign → lead added, email sent (SEQUENCED status)
    ↓
Inngest: replyGuardianProcess → classifies reply, alerts Kelsey
    ↓
HITL: Kelsey reviews AI draft, sends reply, shares TidyCal link
    ↓
TidyCal booking → Inngest: tidycalBookingSync → lead → REPLIED status
```

---

## Tools

---

### 1. LinkedIn Sales Navigator Core
**What:** B2B lead discovery platform with advanced search filters and LinkedIn behavioral signals.  
**Why:** Only tool with real-time LinkedIn signals (OpenToWork badge, post activity, career transitions). Our ICP (VP/Director/CXO in career transition) lives here.  
**Cost:** ~$80/mo (annual)  
**Setup status:** ✅ Active — Kelsey has an account

**How we use it:**
- Search by seniority (Director/VP/CXO), geography (US), company size (200–10,000), function (Ops/Finance/Sales/GM)
- Filter by "Posted on LinkedIn in past 30 days" Spotlight (confirms active engagement)
- Boolean keyword search: `"next chapter" OR "exploring options" OR "open to opportunities" OR "business ownership" OR "what's next"`
- **Do NOT use:** "Changed jobs in past 90 days" Spotlight — catches people settling into new roles, opposite of our ICP
- Weekly: pull WARN Act company names from WARNTracker.com, search those accounts manually

**Limitations on Core plan:**
- No CSV Account List upload (requires Advanced tier) — search WARN companies by name manually instead
- Core is sufficient at 15–20 sends/day

**Programming notes:** None — this is a manual step, no API integration.

---

### 2. Lead Export & Import
**What:** Manual data transfer from Sales Navigator to the CRM database.  
**Why:** Avoids LinkedIn ToS violations from automated scrapers (Apify community actors carry ban risk).  
**Cost:** $0  
**Setup status:** ✅ Decided — process is manual

**How it works:**
1. In Sales Navigator: filter leads → Export to CSV (native feature, no third-party tool)
2. In Waypoint admin panel: navigate to lead import → paste/upload via `ImportLeadForm.tsx`
3. Leads enter database as `RAW` status and trigger `leadHunterProcess` via Inngest event

**Scale trigger:** When sends exceed 50/day, evaluate Evaboot ($9–49/mo) for automated Sales Nav export + email finding bundled.

**Do NOT use:**
- Apify `curious_coder` actor — community actor with ToS risk, not purchased, don't start
- [qtecsolution/LinkedIn-Sales-Navigator-Scraper](https://github.com/qtecsolution/Linkedin-Sales-Navigator-Scraper) Chrome extension — same ToS risk, v1.0.0 release, low-quality data

---

### 3. Instantly SuperSearch (Email Finding / Enrichment)
**What:** Built-in B2B lead database and email enrichment tool inside Instantly.ai.  
**Why:** Already included in Instantly Growth plan (no extra subscription), waterfall enrichment across 5+ providers for higher match rates (~70%) vs Hunter.io alone (~56%).  
**Cost:** Requires SuperSearch credits — recommend Growth Credits tier ($47/mo = 1,500–2,000 credits)  
**Setup status:** ⏳ Credits not yet purchased — $47/mo Growth Credits plan needed

**How it works:**
- After CSV import, leads have LinkedIn data but no verified email
- SuperSearch finds work email by name + company (1 credit per lookup)
- At 20 leads/day × 22 working days = ~440 lookups/mo → ~630 credits needed (70% hit rate)
- Growth Credits (1,500) provides comfortable buffer

**When enrichment tool is live — update `functions.ts` line 121:**
```typescript
// Change from:
if (!foundEmail || emailConfidence < 60) {
// Change to:
if (!foundEmail || emailConfidence < 90) {  // ← raise gate from 60 to 90
```
**Also update line 126:**
```typescript
score = Math.min(score, 50); // ← lower cap from 60 to 50 (unverified email cannot clear 70-point gate)
```

**Env var:** None needed — SuperSearch is used via the Instantly.ai dashboard UI, not API.

---

### 4. Instantly.ai
**What:** Email delivery platform with built-in inbox warmup, sending schedules, and campaign management.  
**Why:** Flat Growth pricing with unlimited inboxes, Gen-2 warmup, and API for programmatic lead injection and status tracking.  
**Cost:** Included (Growth plan already active)  
**Setup status:** ✅ Fully configured

**Current inbox setup:**
| Email | Domain | Health | Warmed |
|---|---|---|---|
| kelsey.stuart@getwaypointfranchise.com | getwaypointfranchise.com | 100% | ✅ |
| kelsey@getwaypointfranchise.com | getwaypointfranchise.com | 100% | ✅ |
| kstuart@getwaypointfranchise.com | getwaypointfranchise.com | 100% | ✅ |
| kelsey.stuart@meetwaypointfranchise.com | meetwaypointfranchise.com | 100% | ✅ |
| kelsey@meetwaypointfranchise.com | meetwaypointfranchise.com | 100% | ✅ |
| kstuart@meetwaypointfranchise.com | meetwaypointfranchise.com | 100% | ✅ |

**Important notes:**
- Sending domains (`getwaypointfranchise.com`, `meetwaypointfranchise.com`) are NOT the primary domain (`waypointfranchise.com`) — correct approach
- 6 inboxes × 30/day max = 180 capacity; running at 11% at 20/day — massive headroom
- SPF, DKIM, DMARC confirmed on both sending domains

**Required Instantly campaign settings (verify before first send):**
- [ ] Open tracking: **DISABLED**
- [ ] Click tracking: **DISABLED**
- [ ] Email format: **Plain text only** (no HTML, no images, no tracking pixels)

**Env vars:**
```
INSTANTLY_API_KEY=    ✅ set in Vercel (waypoint-core-system)
INSTANTLY_CAMPAIGN_ID=e969de1c-e244-488a-8b29-6278f1ea39a2  ✅ set in Vercel
```

**Code integration:** `src/inngest/functions.ts` → `senderProcess` — calls Instantly v2 API to add lead to campaign.

---

### 5. OpenAI GPT-4o
**What:** Large language model used for email personalization and reply classification.  
**Why:** Produces above-average copy quality from structured context slots. Also classifies inbound replies into actionable categories.  
**Cost:** Pay-per-use (API)  
**Setup status:** ✅ API key set in Vercel

**Two use cases in the pipeline:**

**A — Personalization** (`personalizerProcess`):
- Input: lead's name, title, company, careerTrigger, recentPostSummary
- Output: 50–90 word plain text cold email using timeline hook structure
- **Critical:** Must use timeline hooks ("Here's what the next 4 weeks look like..."), NOT problem hooks ("Tired of corporate?")
- No links. No formatting. No em dashes. No exclamation points.

**B — Reply classification** (`replyGuardianProcess`):
- Input: prospect's reply text
- Output: one of: `Interested`, `Curious`, `Not Now`, `Unsubscribe`, `Wrong Person`, `Bounce`, `Neutral`
- Interested/Curious → triggers HITL alert to Kelsey via Resend
- Unsubscribe → adds to SuppressionList

**Env var:**
```
OPENAI_API_KEY=    ✅ set in Vercel (waypoint-core-system)
```

---

### 6. Resend
**What:** Transactional email API used for system notifications.  
**Why:** Already in stack, reliable API, simple integration with Inngest.  
**Cost:** Free tier sufficient  
**Setup status:** ✅ API key set in Vercel

**Use cases:**
1. **HITL (Human-in-the-Loop) hot reply alerts** — when a lead replies as `Interested` or `Curious`, Resend sends Kelsey an email with:
   - Lead name + LinkedIn URL
   - Their reply text
   - An AI-drafted response for review (Kelsey edits and sends manually within 15 min)
2. **Content refresh summaries** — monthly report of article rewrites
3. **System error alerts** — (future)

**IMPORTANT:** The `functions.ts` codebase was briefly switched to Gmail SMTP for the GitHub Actions Lighthouse audit workflow. Resend is still the correct tool for Inngest system emails — do not change this.

**Env var:**
```
RESEND_API_KEY=    ✅ set in Vercel (waypoint-core-system)
```

---

### 7. TidyCal
**What:** Appointment booking platform used by prospects to schedule franchise consultations.  
**Why:** $29 lifetime price, clean embed widget, API access. Highest ROI tool in the stack.  
**Cost:** $29 lifetime (already purchased)  
**Setup status:** ✅ Booking page configured ("Franchise Consultation" — 90 min, Zoom)

**Booking page:** `tidycal.com/m7v2jox/franchise-consultation`

**Website integration:** TidyCal scheduling widget embedded on `/book` page — handles visitor bookings entirely through TidyCal's frontend. No webhook needed for website visitors.

**Cold email pipeline integration:**
TidyCal does NOT support native outbound webhooks on the Individual plan (confirmed March 2026 — no webhook UI exists in Settings or Integrations).

**Solution: `tidycalBookingSync` Inngest cron** (implemented):
- Runs Mon–Fri at 10 AM MT via cron: `0 16 * * 1-5`
- Calls `GET https://tidycal.com/api/bookings?starts_at={2 days ago}`
- Matches booking email against Lead database
- Updates matched lead status → `REPLIED`
- 2-day lookback handles timezone drift and any missed runs
- Skips cancelled bookings and leads already at terminal status

**Personal access token:** Named "Cold Email" — created in TidyCal → Integrations → Manage API Keys  
**Env var:**
```
TIDYCAL_API_KEY=    ✅ set in Vercel (waypoint-core-system)
```

**The `/api/webhooks/tidycal` route also exists** (updated to use query-param auth instead of Bearer header auth) — if TidyCal ever adds webhook support, register:
```
https://www.waypointfranchise.com/api/webhooks/tidycal?secret=TIDYCAL_WEBHOOK_SECRET
```

---

### 8. Neon PostgreSQL (via Vercel)
**What:** Serverless PostgreSQL database — the system's CRM.  
**Why:** Already integrated with Vercel, serverless scale, Prisma ORM support.  
**Cost:** Free tier (Vercel Postgres)  
**Setup status:** ✅ Connected to `waypoint-core-system` project (`ep-silent-sky-...` instance)

**Database:** `waypoint-core-system` uses the `ep-silent-sky-...` Neon instance.  
**Note:** `waypoint-cold-email-dashboard` uses a SEPARATE database (`ep-tiny-math-...`) — do not mix them.

**Key tables (defined in `prisma/schema.prisma`):**
- `Lead` — all prospect data, status lifecycle, score, draft email
- `Reply` — inbound reply content and classification
- `SuppressionList` — global opt-out list (email + domain)
- `SystemSettings` — singleton row with configurable API keys and caps

**Lead status lifecycle:**
```
RAW → SCORED → (suppressed if < 70) → SEQUENCED → REPLIED → (booked)
              → SUPPRESSED (at any point)
```

**Env vars:**
```
POSTGRES_PRISMA_URL=postgresql://neondb_owner:...@ep-silent-sky-...  ✅ set
POSTGRES_URL_NON_POOLING=postgresql://neondb_owner:...@ep-silent-sky-...  ✅ set
```

**Migrations:** Run automatically on every Vercel deploy via build command: `prisma migrate deploy && next build`

---

### 9. Inngest
**What:** Background job orchestration platform — runs the pipeline's async step functions.  
**Why:** Step-based execution with automatic retry, sleep, and event-driven triggers. Perfect for multi-step lead processing without managing queues.  
**Cost:** Free tier (sufficient at current volume)  
**Setup status:** ✅ Fully configured

**Functions registered (`src/app/api/inngest/route.ts`):**
| Function | Trigger | Purpose |
|---|---|---|
| `leadHunterProcess` | event: `workflow/lead.hunter.start` | Enriches + scores a RAW lead |
| `personalizerProcess` | event: `workflow/lead.personalize.start` | GPT-4o writes email for scored lead |
| `senderProcess` | event: `workflow/lead.send.start` | Adds lead to Instantly campaign |
| `replyGuardianProcess` | event: `workflow/reply.received` | Classifies reply, triggers HITL if hot |
| `monitorProcess` | event: `workflow/monitor.check` | Pipeline health checks |
| `warmupScheduler` | cron: `0 14 * * 1-5` (8 AM MT) | Fires daily send events up to dailyCap |
| `contentRefreshFunction` | cron: monthly + manual | Rewrites stale articles via GPT-4o |
| `tidycalBookingSync` | cron: `0 16 * * 1-5` (10 AM MT) | Polls TidyCal API, syncs bookings to leads |

**Env vars:**
```
INNGEST_EVENT_KEY=    ✅ set in Vercel
INNGEST_SIGNING_KEY=  ✅ set in Vercel
```

---

### 10. Vercel
**What:** Hosting and deployment platform for the Next.js application.  
**Why:** Seamless GitHub integration, automatic deploys, environment variable management.  
**Cost:** Hobby plan (free)  
**Setup status:** ✅ Fully configured

**Project:** `waypoint-core-system` → `www.waypointfranchise.com`  
**Build command:** `prisma migrate deploy && next build`  
**Separate project:** `waypoint-cold-email-dashboard` — different codebase, different database, different purpose

---

## Lead Sourcing: WARN Act + Layoff Trackers

**What:** Free weekly data sources for identifying executives at companies undergoing mass layoffs.  
**Why:** WARN Act filings give a 60-day advance notice window — targets are still employed, severance is incoming, capital is available, and transition mindset is active. Best franchise buyer archetype (FranChoice documented).  
**Cost:** $0  
**Setup status:** ⏳ Not yet — sign up and bookmark all three

**Sources:**
| Source | URL | What it gives | Signal quality |
|---|---|---|---|
| WARNTracker.com | https://warntracker.com | Federal + 39 state WARN filings, company name, location, headcount, notice date | High |
| Layoffs.fyi | https://layoffs.fyi | Tech/startup layoffs, often below WARN threshold | High (tech layer) |
| TheLayoff.com | https://www.thelayoff.com | Discussion boards — catches early rumors before WARN is filed | Medium |

**Weekly workflow (15 min):**
1. Check all three sources for new company names
2. Search each company by name in Sales Navigator
3. Filter: VP/Director/CXO + "Posted on LinkedIn in past 30 days"
4. Export CSV → import via admin panel

---

## Compliance Checklist

Every cold email must include:
- [x] Accurate From: name and domain (not deceptive)
- [ ] **Physical mailing address** — add to template footer (CAN-SPAM required)
- [ ] **Clear opt-out mechanism** — "Reply 'unsubscribe'" is sufficient at this volume
- [x] Non-deceptive subject line
- [x] Identity as franchise consultant disclosed

Opt-outs must be honored within 10 business days (handled by `SUPPRESSED` status + SuppressionList).  
GDPR: US-to-US by default. If targeting EU/UK, document a Legitimate Interest Assessment.

---

## Tools to Add Later (Stage 2)

| Tool | Trigger to buy | Purpose | Cost |
|---|---|---|---|
| Evaboot | Sends > 50/day | Automated Sales Nav export + email finding bundled | $9–49/mo |
| Apollo.io | Need enrichment scale | Enrichment + sequences in one tool | $49/mo |
| Clay.com | Sends > 50/day + 1,100+ leads/mo | Waterfall enrichment, intent signals, automation | Variable |
| LeadIQ | After WARN workflow established | Job change alerts for executives 30–45 days post-WARN | Paid |
| Google Postmaster Tools | Now (free) | Domain reputation monitoring for Gmail deliverability | Free |
| GlockApps | Sends > 50/day | Inbox placement testing across all major providers | $80/mo |

## Tools Evaluated and Rejected

| Tool | Decision | Reason |
|---|---|---|
| **Bombora** | ❌ Skip permanently | $30K–$100K/yr; account-level SaaS intent only; wrong buyer type |
| **Apify** | ❌ Skip permanently | Never purchased; ToS risk; native CSV export is safer |
| **Hunter.io** | ❌ Replaced by SuperSearch | Already have SuperSearch in Instantly plan |
| **HubSpot CRM** | ❌ Skip | Prisma DB is the CRM; duplicate data problem |
| **EmailBison** | ❌ Skip | Grok-only recommendation, no consensus from other models |
| **lemlist** | ❌ Skip | Already have Instantly for multi-channel; no second platform |

---

## Environment Variables — Complete Reference

All variables set in Vercel → `waypoint-core-system` → Settings → Environment Variables.

| Variable | Status | Used by |
|---|---|---|
| `INSTANTLY_API_KEY` | ✅ Set | `senderProcess`, Instantly API calls |
| `INSTANTLY_CAMPAIGN_ID` | ✅ Set (e969de1c...) | `senderProcess` |
| `OPENAI_API_KEY` | ✅ Set | `personalizerProcess`, `replyGuardianProcess`, content refresh |
| `RESEND_API_KEY` | ✅ Set | HITL alerts, content refresh summary, system emails |
| `TIDYCAL_API_KEY` | ✅ Set | `tidycalBookingSync` cron |
| `TIDYCAL_WEBHOOK_SECRET` | ✅ Set | `/api/webhooks/tidycal` route (query param auth) |
| `POSTGRES_PRISMA_URL` | ✅ Set | Prisma client (pooled) |
| `POSTGRES_URL_NON_POOLING` | ✅ Set | Prisma migrations |
| `INNGEST_EVENT_KEY` | ✅ Set | Inngest event publishing |
| `INNGEST_SIGNING_KEY` | ✅ Set | Inngest webhook verification |
| `GITHUB_TOKEN` | ✅ Set | Content refresh GitHub commits |
| `GITHUB_REPO_OWNER` | ✅ Set | Content refresh GitHub commits |
| `GITHUB_REPO_NAME` | ✅ Set | Content refresh GitHub commits |
| `GITHUB_BRANCH` | ✅ Set | Content refresh GitHub commits |
| `AUTH_SECRET` | ✅ Set | NextAuth admin login |
| `AUTH_URL` | ✅ Set | NextAuth |
| `AUTH_TRUST_HOST` | ✅ Set | NextAuth |
| `AUTH_GOOGLE_ID` | ✅ Set | Google OAuth for admin |
| `AUTH_GOOGLE_SECRET` | ✅ Set | Google OAuth for admin |
| `TIDYCAL_WEBHOOK_SECRET` | ✅ Set | Webhook auth (query param) |
| `APIFY_WEBHOOK_SECRET` | ✅ Set | Inert — Apify not used; route exists but receives no traffic |
| `INBOUND_WEBHOOK_SECRET` | ✅ Set | Inbound reply webhook auth |
| `HUNTER_API_KEY` | ❌ Not set | Not needed — replaced by Instantly SuperSearch |
