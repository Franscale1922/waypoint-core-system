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
**Cost:** $47/mo Growth Credits tier (1,500–2,000 credits)  
**Setup status:** ✅ Purchased March 2026 — Growth Credits active

**How it works:**
- After CSV import, leads have LinkedIn data but no verified email
- SuperSearch finds work email by name + company (1 credit per lookup)
- At 20 leads/day × 22 working days = ~440 lookups/mo → ~630 credits needed (70% hit rate)
- Growth Credits (1,500) provides comfortable buffer

**⚠️ Important — SuperSearch has no public API:**  
SuperSearch is a **dashboard-only** tool inside Instantly. There is no API endpoint to call it programmatically. This means the enrichment flow works as follows:

1. After CSV import, leads are in the DB with `RAW` status and a guess-format email
2. **Manual step:** Go to Instantly dashboard → SuperSearch → bulk-enrich by name + company → export verified emails
3. Re-import verified emails into the Lead table (or update via admin panel)
4. Only then does `leadHunterProcess` promote leads through the score gate

**Current code behavior (as of March 2026):**  
The `leadHunterProcess` in `functions.ts` calls **Hunter.io** (`HUNTER_API_KEY`) as its programmatic email-finding step. **Key is now set in Vercel (March 2026)** — the enrichment block is active. Hunter.io takes first name + last name + company domain → returns a verified email confidence score. Leads with verified emails pass the 70-point gate; unverified leads are capped at 60 and suppressed.

**To do after purchasing SuperSearch credits:**
- [ ] Buy Growth Credits tier ($47/mo) in Instantly dashboard
- [ ] Enrich leads via SuperSearch UI before importing to DB via admin panel
- [ ] Update `functions.ts` line 121:
```typescript
// Change from:
if (!foundEmail || emailConfidence < 60) {
// Change to:
if (!foundEmail || emailConfidence < 90) {  // ← raise gate from 60 to 90
```
- [ ] Update line 126:
```typescript
score = Math.min(score, 50); // ← lower cap from 60 to 50 (unverified email cannot clear 70-point gate)
```

**Env var:** `HUNTER_API_KEY` — ✅ Set in Vercel (March 2026, free tier). Upgrade to Starter ($49/mo, 500/mo) before first production run at 440 leads/month.

---

### 4. Instantly.ai
**What:** Email delivery platform with built-in inbox warmup, sending schedules, and campaign management.  
**Why:** Flat Growth pricing with unlimited inboxes, Gen-2 warmup, and API for programmatic lead injection and status tracking.  
**Cost:** Included (Growth plan already active)  
**Setup status:** ✅ Fully configured

**Current inbox setup** (verified March 2026 — all Gen-2 warmup, 80 warmup emails/inbox):
| Email | Domain | Health | Daily Limit |
|---|---|---|---|
| kelsey.stuart@getwaypointfranchise.com | getwaypointfranchise.com | 100% | 0/30 |
| kelsey@getwaypointfranchise.com | getwaypointfranchise.com | 100% | 0/30 |
| kstuart@getwaypointfranchise.com | getwaypointfranchise.com | 100% | 0/30 |
| kelsey.stuart@meetwaypointfranchise.com | meetwaypointfranchise.com | 100% | 0/30 |
| kelsey@meetwaypointfranchise.com | meetwaypointfranchise.com | 100% | 0/30 |
| kstuart@meetwaypointfranchise.com | meetwaypointfranchise.com | 100% | 0/30 |

**Important notes:**
- Sending domains (`getwaypointfranchise.com`, `meetwaypointfranchise.com`) are NOT the primary domain (`waypointfranchise.com`) — correct approach
- 6 inboxes × 30/day max = 180 capacity; campaign daily limit set to 15 — massive headroom
- SPF, DKIM, DMARC confirmed on both sending domains

**Campaign settings — verified March 2026** (Campaigns → Waypoint Outbound → Options):
| Setting | Value | Status |
|---|---|---|
| Open tracking | Disabled | ✅ |
| Link tracking | Disabled | ✅ |
| Send emails as text-only (no HTML) | Enabled | ✅ Fixed |
| Stop sending on reply | Enabled | ✅ |
| Insert unsubscribe link header | Enabled | ✅ Fixed |
| Provider matching (ESP routing) | Enabled | ✅ Fixed |
| Daily campaign limit | 15/day | ✅ |
| Time gap between emails | 9 min + 5 min random | ✅ |
| Stop on auto-reply | Disabled | ⏳ Phase 2 — enable when follow-up steps are added |

**Schedule** (verified March 2026 — was unchecked on all days, now fixed):
- Days: **Monday–Friday** ✅
- Window: **8:00 AM – 5:00 PM Mountain Time** ✅
- Start: Now | End: No end date

**Sequence** (Campaigns → Waypoint Outbound → Sequences):
- Step 1 only (no follow-up steps — correct for Stage 1)
- Subject: `quick thought`
- Body: `{{personalization}}` — ✅ Verified March 2026 — maps directly to the `personalization` field sent by `senderProcess` via Instantly v2 API

**Phase 2 — when adding follow-up steps:**
- Enable "Stop Sending Emails on Auto-Reply" in Options (currently off — irrelevant with single-step sequence, but correct behavior for multi-step)
- Consider enabling "Stop Campaign for Company on Reply" to avoid burning entire company relationships
- Revisit daily limit (raise from 15 toward 30–50 after 4+ weeks clean metrics)

**Inbound Reply Webhook** (connects Instantly replies → `replyGuardianProcess`):
- Route: `src/app/api/webhooks/resend/route.ts` (receives Instantly payloads, NOT Resend events)
- Auth: Bearer token = `INBOUND_WEBHOOK_SECRET` (✅ already set in Vercel)
- **Setup in Instantly dashboard:** Settings → Inbound Webhooks → add:
  ```
  https://www.waypointfranchise.com/api/webhooks/resend
  Authorization: Bearer {INBOUND_WEBHOOK_SECRET value}
  ```
- On receipt: creates `Reply` DB record → fires `workflow/lead.reply.received` → triggers `replyGuardianProcess`
- ⚠️ **Pre-launch check:** Verify this webhook URL is registered in Instantly before first send

**Env vars:**
```
INSTANTLY_API_KEY=    ✅ set in Vercel (waypoint-core-system)
INSTANTLY_CAMPAIGN_ID=e969de1c-e244-488a-8b29-6278f1ea39a2  ✅ set in Vercel
INBOUND_WEBHOOK_SECRET=  ✅ set in Vercel — used by the inbound reply webhook route
```

**Code integration:** `src/inngest/functions.ts` → `senderProcess` — calls Instantly v2 API to add lead to campaign.

---

### 5. OpenAI GPT-4o
**What:** Large language model used for email personalization and reply classification.  
**Why:** Produces above-average copy quality from structured context slots. Also classifies inbound replies into actionable categories.  
**Cost:** Pay-per-use (API) — at ~440 personalizations/mo + classification calls, expect under $15/mo at GPT-4o pricing  
**Setup status:** ✅ API key verified live (HTTP 200, March 2026)

**Model selection — current and future:**
- `gpt-4o` is correct for both tasks at Stage 1 volume — fast, cost-effective, strong writing quality
- **Phase 1+ benchmark:** After 2–3 weeks of live sends, test `claude-3-7-sonnet-20250219` (Anthropic) against GPT-4o on the personalization task. Claude is rated as the top model for natural, human-sounding prose — directly aligned with the pacing/leading tone strategy. If output reads more authentically, swap the personalizer. Keep GPT-4o for reply classification.
- Do NOT use: `o1`, `o3-mini` (reasoning models, wrong task type), `gpt-4.5` (10–15× more expensive, not justified)

**Two use cases in the pipeline:**

**A — Personalization** (`personalizerProcess`):
- Input: 8 context slots — `name`, `title`, `company`, `careerTrigger`, `recentPostSummary`, `pulledQuoteFromPost`, `specificProjectOrMetric`, `placeOrPersonalDetail`
- Note: `specificProjectOrMetric` and `placeOrPersonalDetail` were missing from `ImportLeadForm.tsx` — fixed March 2026
- Output: 50–90 word plain text cold email, NLP pacing/leading structure, identity-level framing
- No links. No formatting. No em dashes. No exclamation points. No starting 3 sentences with "I" or "Most"

**Templates** (`src/lib/templates.ts` — 6 variants, audited March 2026):\
| Template | ICP Trigger |
|---|---|
| A — Job Change / Transition | Publicly announced departure |
| B — Sales Leader, Burned Out | Post about burnout / corporate grind |
| C — Ops Builder | Led a major project/transformation |
| D — Finance / Risk-Oriented | P&L background, analytical persona |
| E — Layoff / Open to Work | "Open to Work" badge or layoff post |
| F — Framework / Curiosity | General "what's next" mindset post |

**Prohibited phrases** (`PROHIBITED_PHRASES` array in `templates.ts`) — GPT-4o is instructed to avoid 20 banned phrases including: "I hope this email finds you well", "leverage", "synergy", "delve", "navigating", "tapestry", "foster", "catalyst", "checking in" and similar AI/corporate clichés.

**B — Reply classification** (`replyGuardianProcess`):
- Input: prospect's reply text
- Output: one of: `Interested`, `Curious`, `Not now`, `Not a fit`, `Unsubscribe`, `Out of office`, `Ambiguous`
- Triggered by event: `workflow/lead.reply.received` (injected by the inbound reply webhook)
- Interested/Curious/Ambiguous → triggers HITL alert to Kelsey
- Unsubscribe / Not a fit → sets lead status to `SUPPRESSED`

**HITL alert implemented** (March 2026): `notify-human` step now sends a real Resend email via `replyGuardianProcess`. See §6 for email format.

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
1. **HITL (Human-in-the-Loop) hot reply alerts** — ✅ Implemented March 2026. When a lead replies as `Interested`, `Curious`, or `Ambiguous`, Resend sends `kelsey@waypointfranchise.com` a plain-text email containing:
   - Urgency label (🔥 INTERESTED / 👀 CURIOUS / 💬 AMBIGUOUS) in the subject line
   - Lead name, title, company, LinkedIn URL, score
   - Full reply text
   - AI-drafted follow-up (40–60 words, Kelsey's voice, written by GPT-4o in real time)
   - TidyCal booking link for sharing on reply
   - **Target response time: 15 minutes from receipt**
2. **Content refresh summaries** — ✅ Implemented — monthly report of article rewrites sent via Resend
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
- Updates matched lead status → `BOOKED` (previously `REPLIED` — bug fixed March 2026)
- 2-day lookback handles timezone drift and any missed runs
- Skips cancelled bookings; skips leads already `BOOKED` or `SUPPRESSED`
- **Bug fixed March 2026:** Previously skipped `REPLIED` leads, so a booking after an email reply was silently ignored. Now correctly advances `REPLIED` → `BOOKED`.

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
RAW → ENRICHED → SEQUENCED → SENT → REPLIED → BOOKED  (ideal path)
                                      ↓
                               SUPPRESSED (unsubscribe / not a fit / at any point)
```
- `REPLIED` = prospect replied to the cold email (set by `replyGuardianProcess`)
- `BOOKED` = prospect booked a TidyCal consultation (set by `tidycalBookingSync` cron or `/api/webhooks/tidycal`)
- `SUPPRESSED` = removed from all outreach (unsubscribe, wrong person, non-serviceable market)

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
| Function | Trigger | Status | Purpose |
|---|---|---|---|
| `leadHunterProcess` | event: `workflow/lead.hunter.start` | ✅ Live | Enriches + scores a RAW lead via Hunter.io (key now set — March 2026) |
| `personalizerProcess` | event: `workflow/lead.personalize.start` | ✅ Live | GPT-4o writes email for scored lead |
| `senderProcess` | event: `workflow/lead.send.start` | ✅ Live | Adds lead to Instantly campaign |
| `replyGuardianProcess` | event: `workflow/lead.reply.received` | ✅ Live | Classifies reply; HITL Resend alert implemented March 2026 |
| `monitorProcess` | cron: `0 9 * * *` | ⏳ Mock | Pipeline health checks — bounce/complaint data is mocked random values |
| `warmupScheduler` | cron: `0 14 * * 1-5` (8 AM MT) | ✅ Live | Fires daily send events up to dailyCap |
| `contentRefreshFunction` | cron: `0 14 1 * *` + event: `content/refresh.run` | ✅ Live | Rewrites stale articles via GPT-4o |
| `tidycalBookingSync` | cron: `0 16 * * 1-5` (10 AM MT) | ✅ Live | Polls TidyCal API, syncs bookings to leads |

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

### 11. Google Postmaster Tools
**What:** Free Google tool for monitoring domain/IP reputation, spam rate, and delivery errors for Gmail recipients.  
**Why:** Gmail is the majority of B2B inboxes. Postmaster shows your reputation score before you hit spam filters.  
**Cost:** $0  
**Setup status:** ❌ Blocked — Instantly DFY domains do not allow custom DNS records

**What's done:**
- ✅ Primary domain (`waypointfranchise.com`) Cloudflare DNS fixed: duplicate SPF removed, DMARC placeholder email updated to real address

**Why sending domain verification is permanently blocked:**
Instantly confirmed (March 2026) that DFY/pre-warmed domains are fully managed by Instantly. They retain domain ownership and DNS administrator access. No custom DNS records (including TXT verification records) can be added by users under any circumstances. This is a hard architectural constraint of the DFY service.

Verification TXT records that were requested but cannot be added:
- `getwaypointfranchise.com` → `google-site-verification=MPbTGn7XTY7HMxvyL0wPpgHT77EeU28h8JzfEs8JSO4`
- `meetwaypointfranchise.com` → `google-site-verification=kHrn7XQd1fco82GWBxj5mLispMTkUJ_x4ikGiQsTkMc`

**Monitoring alternatives at current volume:**
- ✅ **Instantly health scores** — all 6 inboxes at 100% (the direct source of truth at 15 sends/day)
- ⏳ **mail-tester.com or GlockApps** — run a manual inbox placement test before launch (one-time check, free)
- ⏳ **Google Postmaster on primary domain** — `waypointfranchise.com` CAN be verified (we control Cloudflare), but will not reflect sending campaign data since emails send from the subdomain aliases
- ⏳ **Scale trigger** — Postmaster becomes useful above 100+/day. Revisit when volume scales.

**Note:** This is not a launch blocker. Postmaster shows "Not enough data" until volume exceeds 100+ sends/day to Gmail. At 15/day, Instantly's inbox health score is the best available signal.

---

## Lead Sourcing: WARN Act + Layoff Trackers

**What:** Free weekly data sources for identifying executives at companies undergoing mass layoffs.  
**Why:** WARN Act filings give a 60-day advance notice window — targets are still employed, severance is incoming, capital is available, and transition mindset is active. Best franchise buyer archetype (FranChoice documented).  
**Cost:** $0  
**Setup status:** ✅ Following on Twitter and LinkedIn. Subscribed to WARNTracker Substack + Layoffs.fyi newsletter. TheLayoff.com bookmarked.

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

## Pre-Launch Checklist

Complete every item below before sending the first cold email.

**Instantly Setup**
- [x] Purchase SuperSearch Growth Credits tier ($47/mo) in Instantly dashboard — ✅ Purchased March 2026
- [x] Verify campaign tracking settings: open tracking OFF, click tracking OFF, plain text only — ✅ Verified March 2026
- [x] Confirm reply routing: replies land in the same sending inbox — ✅ Verified
- [x] **Register inbound reply webhook in Instantly dashboard** — ✅ Verified active March 2026 — URL: `https://www.waypointfranchise.com/api/webhooks/resend`, Bearer auth with `INBOUND_WEBHOOK_SECRET`

**Code — Fixed March 2026**
- [x] Implement Resend HITL email in `notify-human` step of `replyGuardianProcess` — ✅
- [x] Fix gender pronouns in VOICE_RULES system prompt (`He` → `She`) — ✅ Fixed March 2026
- [x] Fix `maxSendsPerDay` schema default (50 → 15) to match warmup phase — ✅ Fixed March 2026
- [x] Clarify inbound reply webhook route comment + fix auth var (`RESEND_WEBHOOK_SECRET` → `INBOUND_WEBHOOK_SECRET`) — ✅ Fixed March 2026
- [x] Hunter.io enrichment active (key set March 2026). SuperSearch is manual fallback for misses.

**Google Postmaster Tools**
- [x] ~~Contact Instantly support to add TXT verification records~~ — ❌ **Permanently blocked** (March 2026)
- [ ] **Pre-launch alternative:** Run one test send through [mail-tester.com](https://mail-tester.com) — **MANUAL (Kelsey)**

**Compliance**
- [x] Add physical mailing address to email template footer — ✅ P.O. Box 3421, Whitefish, MT 59937
- [x] Add explicit opt-out line to email template — ✅ "Reply 'unsubscribe' to opt out"

---

## Compliance Checklist

Every cold email must include:
- [x] Accurate From: name and domain (not deceptive)
- [x] **Physical mailing address** — ✅ P.O. Box 3421, Whitefish, MT 59937 | appended via `CAN_SPAM_FOOTER` in `personalizerProcess`
- [x] **Clear opt-out mechanism** — ✅ "Reply 'unsubscribe' to opt out" | appended via `CAN_SPAM_FOOTER`
- [x] Non-deceptive subject line
- [x] Identity as franchise consultant disclosed

Opt-outs must be honored within 10 business days (handled by `SUPPRESSED` status + SuppressionList).  
GDPR: US-to-US by default. If targeting EU/UK, document a Legitimate Interest Assessment.

---

## Tools to Add Later (Stage 2)

| Tool | Trigger to buy | Purpose | Cost |
|---|---|---|
| Evaboot | Sends > 50/day | Automated Sales Nav export + email finding bundled | $9–49/mo |
| Apollo.io | Need enrichment scale | Enrichment + sequences in one tool | $49/mo |
| Clay.com | Sends > 50/day + 1,100+ leads/mo | Waterfall enrichment, intent signals, automation | Variable |
| LeadIQ | After WARN workflow established | Job change alerts for executives 30–45 days post-WARN | Paid |
| GlockApps | Sends > 50/day | Inbox placement testing across all major providers | $80/mo |

### Stage 2 Project: Social Comment Lead Mining
**Idea:** Monitor WARNTracker and Layoffs.fyi Twitter/LinkedIn post replies for employees at newly-announced layoff companies who comment on those posts.

**Why this is high-value:** Employees who publicly comment on a layoff announcement about their own company are self-identifying as affected. These are significantly warmer leads than a cold WARN filing lookup — they've already surfaced their situation publicly and are in an active transition mindset.

**How it would work:**
1. WARNTracker / Layoffs.fyi posts a layoff announcement on Twitter
2. Monitor replies to that tweet for commenters mentioning their company
3. Cross-reference commenter's LinkedIn profile against Sales Navigator (name + company match)
4. If VP/Director/CXO title confirmed → import as lead with `careerTrigger` pre-populated

**Automation options when ready:**
- Zapier + Twitter → filter replies containing company name → push to Inngest
- n8n workflow (self-hosted, no per-task pricing)
- Clay workflow (scrapes replies, enriches with LinkedIn data)

**Trigger to build:** After 4 weeks of consistent pipeline volume at 20/day and first bookings confirmed.

## Tools Evaluated and Rejected

| Tool | Decision | Reason |
|---|---|---|
| **Bombora** | ❌ Skip permanently | $30K–$100K/yr; account-level SaaS intent only; wrong buyer type |
| **Apify** | ❌ Skip permanently | Never purchased; ToS risk; native CSV export is safer |
| **Hunter.io** | ✅ Active (free tier) | Key set in Vercel March 2026. Free: 25/mo — upgrade to Starter ($49/mo, 500/mo) before production run. SuperSearch remains manual fallback for misses. |
| **HubSpot CRM** | ❌ Skip | Prisma DB is the CRM; duplicate data problem |
| **EmailBison** | ❌ Skip | Grok-only recommendation, no consensus from other models |
| **lemlist** | ❌ Skip | Already have Instantly for multi-channel; no second platform |
| **Clay** | ⏳ Defer to Phase 2 | Enrichment waterfall across 50+ sources; minimum useful plan $149/mo. Overkill at 15/day sends. Re-evaluate when volume scales past 50+ sends/day and email find rate becomes measurable bottleneck. |
| **Apollo (Search)** | ✅ Available when needed | Free People Search API (no credits consumed). Can supplement Apify as backup discovery source. Does not return emails — enrichment endpoint required for that. |
| **Slack** | ✅ Active — March 2026 | Incoming Webhook wired into `notify-human` step as instant push alert alongside Resend email. Channel: `#waypoint-hot-replies`. |
| **Go High Level (GHL)** | ⏸ Removed — contingency only | All-in-one platform (CRM, email, SMS, funnels, booking). Fully duplicates the current stack — custom CRM, Instantly, TidyCal, Inngest, n8n all do their respective jobs better. Only SMS adds net-new capability, but cold SMS to VP/Director ICP carries TCPA risk and brand risk at this stage. **Reactivate if:** the custom Waypoint CRM cannot scale to pipeline needs and a CRM replacement is required — GHL would be the all-in-one migration path. |

---

## Phase 2 Opportunities

Tools evaluated and deferred — good products, wrong timing for Stage 1.

---

### HeyGen — AI Avatar Video
**What:** AI avatar creation and text-to-video platform. Records a training video of Kelsey once, then generates unlimited talking-head videos from typed scripts. Highest-quality AI avatar output available commercially.  
**Account:** Free account exists. Paid required for API and custom avatar.  
**Reviewed:** March 2026  
**Decision:** ⏳ Deferred — activate at Phase 2 (YouTube + Podcast launch)

**Use cases for Waypoint:**
- **YouTube content** — GPT-4o or Claude writes scripts, HeyGen avatar delivers them as talking-head videos
- **Podcast video character** — AI avatar co-host or solo host for video podcast format
- **Personalized video cold outreach** — one-to-one intro video per lead (Phase 3, after cold email matures)
- **Website explainer videos** — franchise process, scorecard walkthrough

**Setup sequence when ready:**
1. Record avatar training video (2–5 min, plain background, good lighting, natural delivery)
2. Upgrade to **Team plan ($89/mo)** — minimum for API access and custom avatars
3. Set up **ElevenLabs voice clone** (already in stack) → connect to HeyGen for premium voice output
4. Add `HEYGEN_API_KEY` to Vercel env vars + `.env`
5. Build n8n workflow: **Script in → HeyGen API → video out → route to YouTube/Typefully**

**Integration with existing stack:**
- **Subscribr** (in stack) → generates YouTube scripts → feeds HeyGen
- **Opus Clip** (in stack) → clips HeyGen video output into shorts
- **Descript** (in stack) → final polish/overdub if needed
- **n8n** (in stack) → orchestrates the script → video pipeline

**Pricing:**
- Creator ($29/mo): 5 credits, no API, 1 avatar — good for testing quality
- Team ($89/mo): API access, custom avatars, more credits — minimum for production use

---

### Clay — Lead Enrichment Waterfall
**What:** Enrichment waterfall that queries Apollo, Hunter, LinkedIn, and 50+ sources in sequence until a verified email is found. Also includes AI personalization built in.  
**Account:** Free tier exists (~100 credits).  
**Reviewed:** March 2026  
**Decision:** ⏳ Defer — re-evaluate at 50+ sends/day

**Why deferred:** At 15/day sends, a single enrichment source (Hunter.io, now active) is sufficient. Clay's waterfall adds value only when single-source miss rates become a meaningful conversion bottleneck. Minimum useful plan ($149/mo) is not justified at current volume.

**Trigger to activate:** Email find rate from Hunter.io drops below 60% sustained over 2+ weeks of production sends.

---

### beehiiv — Newsletter / Subscriber List
**What:** Newsletter platform with subscriber automation, API access, and a built-in ad monetization network.  
**Account:** Active. API key and Publication ID set in Vercel + local `.env`.  
**Reviewed:** March 2026  
**Decision:** ⏳ Deferred — activate at Phase 2 (after cold email warm-up sequences are running)

**Use cases for Waypoint:**
1. **Newsletter / Brand channel** — franchise insights content to a subscriber list. Converts content readers into warm prospects over time.
2. **"Not now" subscriber rescue** — when `replyGuardianProcess` classifies a reply as `Not now`, instead of immediately suppressing the lead, send one low-pressure opt-in email offering the newsletter. If they click: subscribe to beehiiv, stay warm. If ignored: suppress as normal. Prevents permanently losing prospects who may convert in 3–12 months.
3. **Post-scorecard nurture** — scorecard completions can trigger a beehiiv subscriber add, turning quiz takers into newsletter readers automatically.

**The math:** At 440 leads/month, a 10% "Not now" rate = 44 prospects/month who aren’t ready but aren’t opposed. After 6 months that’s 264 warm leads reading Kelsey’s newsletter — some convert eventually without any additional cold outreach.

**Setup when ready:**
1. `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID` already set in Vercel + `.env`
2. Build one Inngest step or n8n webhook: `POST /v2/publications/{pub_id}/subscriptions` with lead email + name
3. Wire into `replyGuardianProcess`: on `Not now` classification → send opt-in email via Resend → if clicked, call beehiiv API
4. Optionally wire to scorecard form submission as auto-subscribe

**API endpoint:**
```
POST https://api.beehiiv.com/v2/publications/pub_8ea1ac6a-23e9-4e14-b0ad-06854119620d/subscriptions
Authorization: Bearer {BEEHIIV_API_KEY}
```

**Env vars:** ✅ Both set in Vercel + local
```
BEEHIIV_API_KEY
BEEHIIV_PUBLICATION_ID=pub_8ea1ac6a-23e9-4e14-b0ad-06854119620d
```

---

### RepliQ — Personalized Video Outreach
**What:** Record one video, upload a CSV of leads, auto-generate hundreds of unique personalized videos — each with the prospect's website, LinkedIn profile, or social page scrolling in the background. Generates personalized GIF thumbnails for email, plus AI-written icebreakers via GPT-4.  
**AppSumo LTD pricing:** Tier 1 ~$49 (100 videos/mo), Tier 2 ~$129 (500/mo), Tier 3 ~$399 (1,500/mo). 60-day money-back guarantee.  
**Reviewed:** March 2026  
**Decision:** ⏳ Deferred to Phase 2

**Why deferred:**
- Stage 1 is plain-text-only cold email — RepliQ requires a clickable link in the email, which triggers spam filters and breaks deliverability rules during inbox warmup
- RepliQ integrates with Smartlead, QuickMail, Mixmax, Salesflow, SalesBlink — **Instantly is not listed**
- Primary use case in RepliQ docs is agencies pitching SMBs and local businesses — our ICP (VP/Director/CXO at 500+ person companies) may perceive scrolling-website personalization as a mass tactic rather than genuine outreach

**When to revisit:**
- After 4+ weeks of live pipeline with first bookings confirmed
- If LinkedIn DM outreach becomes a secondary channel (RepliQ links work well in LinkedIn DMs — no deliverability concern)
- If warm follow-up sequences (post-reply) are added — a short personalized video as a second touch after a `Curious` reply classification could be compelling

**Alternatives at Phase 2:**
- **Sendspark** ($39/mo) — better CRM integration (HubSpot, Salesforce, Outlook), stronger fit if pipeline scales and needs CRM sync
- **SendPotion** — AI face + voice cloning per prospect, highest personalization tier, pricier


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
| `HUNTER_API_KEY` | ✅ Set in Vercel | Free tier (25/mo) — upgrade to Starter ($49/mo) before first production run |
| `SLACK_WEBHOOK_URL` | ✅ Set in Vercel + local | Incoming Webhook → `#waypoint-hot-replies` — HITL push notifications |
| `BEEHIIV_API_KEY` | ✅ Set in Vercel + local | Phase 2 — newsletter subscriber API |
| `BEEHIIV_PUBLICATION_ID` | ✅ Set in Vercel + local | `pub_8ea1ac6a-23e9-4e14-b0ad-06854119620d` |
