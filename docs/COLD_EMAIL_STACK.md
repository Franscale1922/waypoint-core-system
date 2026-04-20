# Waypoint Cold Email System — Tech Stack Reference

**Last updated:** March 25, 2026 — Pipeline live. Daily cap raised to 25/day. All QA issues resolved (March 25 session). Evaboot is the only email source; Hunter.io, Apollo, and Apify are not used and not subscribed.  
**Volume target:** 25 sends/day, Mon–Fri  
**Goal:** Book franchise advisory consultations with VP/Director/CXO corporate executives in career transition

> This document is the source of truth for any AI session or developer working on the cold email pipeline. Read this before touching any code related to lead gen, outreach, or booking.

---

## Pipeline Overview

```
1. Sales Navigator — filter by seniority, company size, function, behavioral spotlights
    ↓
2. Evaboot Chrome extension — "Extract with Evaboot" → CSV with server-verified emails
   Export "safe emails only" during warmup phase
    ↓
3. Admin dashboard — ImportLeadForm → POST /api/leads → DB (PENDING_CLAY status)
    ↓
4. Clay — Evaboot CSV manually imported into Clay table for enrichment
   Clay runs: recentPostSummary, companyNewsEvent, yearsInCurrentRole, company attributes
    ↓
5. Google Apps Script (Code.gs) — fires on Clay export to Google Sheet
   POSTs each row to POST /api/webhooks/clay (auth: x-clay-secret header)
    ↓
6. Clay webhook — updates Lead record with enrichment signals → status: RAW
   Fires Inngest event: workflow/lead.hunter.start
    ↓
7. Inngest: leadHunterProcess — scores (0–100) using enriched signals
   No external email API — Evaboot email already present. Score < 50 → SUPPRESSED
    ↓ (gate: score ≥ 50)
8. Inngest: personalizerProcess — GPT-4o writes email → status: SEQUENCED
    ↓
9. Inngest: warmupScheduler (8 AM MT, Mon–Fri) — fires top 25 SEQUENCED leads by score
   senderProcess → Instantly v2 API → lead added to campaign → status: SENT
    ↓
10. Instantly sends email from sending domain (getwaypointfranchise.com / meetwaypointfranchise.com)
    ↓
11. Inngest: replyGuardianProcess — classifies reply, Resend/Slack HITL alert to Kelsey
    ↓
12. HITL: Kelsey replies, shares TidyCal link
    ↓
13. TidyCal booking → tidycalBookingSync cron → lead → BOOKED status
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

### 2. Lead Export & Import — Evaboot
**What:** Evaboot Chrome extension adds an "Extract with Evaboot" button inside Sales Navigator. Extracts and cleans Sales Navigator search results into a structured CSV, including emails with built-in server verification.  
**Why:** Preserves LinkedIn behavioral signals at the list level (OpenToWork badge, "Posted 30 days" filter). Ban-safe — uses Kelsey's own LinkedIn session. Critically: Evaboot verifies email format against the actual mail server before export — unlike Clay's waterfall which pattern-guesses and can produce wrong formats for executive accounts.  
**Cost:** Paid subscription — active  
**Setup status:** ✅ Active — Chrome extension installed

**How it works:**
1. In Sales Navigator: run filtered search (seniority, company size, OpenToWork, Posted 30d, function)
2. Click "Extract with Evaboot" → Evaboot exports and cleans the list, deduplicates, and verifies emails
3. **Export with "safe emails only"** — do NOT include riskier (catch-all) emails during warmup phase
4. Download CSV → upload via `ImportLeadForm.tsx` or directly into Instantly
5. Leads enter database as `RAW` status and trigger `leadHunterProcess` via Inngest event

**Email status tiers:**
- `safe` — server confirmed the email exists (97% deliverability) ✅ Use these
- `riskier` — catch-all server, cannot be verified without sending (~83% deliverability) ⚠️ Max 30% of list, post-warmup only
- no email — Evaboot couldn't find one → send to Clay for enrichment fallback

**Confirmed bounce prevention:** March 2026 — Evaboot found `dharris@revspring.com` (verified safe) for Daniel Harris. Clay's waterfall guessed `daniel.harris@revspring.com` (wrong format) — that email bounced. Evaboot's server verification catches format mismatches that pattern-guessing tools miss.

**Email match rate:** ~60–70% at safe tier. For leads with no email: pass to Clay enrichment (Findymail waterfall) as fallback.

**Do NOT use:**
- Apify `curious_coder` actor — community actor with ToS risk, not purchased, don't start
- [qtecsolution/LinkedIn-Sales-Navigator-Scraper](https://github.com/qtecsolution/Linkedin-Sales-Navigator-Scraper) Chrome extension — same ToS risk, v1.0.0 release, low-quality data

---

### 3. Clay.com — Email Enrichment Fallback (Active)
**What:** Clay Launch plan ($185/mo, 15,000 actions/mo, 2,500 data credits/mo). Used as the enrichment fallback for leads where Evaboot did not find an email. Clay's waterfall queries Findymail and other built-in sources using Clay's own data credits — **no standalone Hunter or Apollo accounts exist or are needed.**  
**Setup status:** ✅ Active — Clay Launch plan, "Cold Email Test 1" table (103 leads)  

> ⚠️ **NOTE: No standalone Hunter.io or Apollo.io subscriptions.** References elsewhere in this doc to Hunter API keys or Apollo API keys are legacy planning notes. The actual enrichment in production uses Clay's built-in data credit waterfall (Findymail primary).

**Current table setup — "Cold Email Test 1" (audited March 2026):**
| Column | Source | Status |
|---|---|---|
| `email` | Evaboot import | ✅ Primary source |
| `Email Status` | Evaboot import | ✅ safe / riskier / blank |
| `work email` | Formula: `{{email}}` | ⚠️ Only mirrors Evaboot — does NOT use Findymail fallback |
| `Email (3)` | Formula: `{{email}}` | ⚠️ Same — only mirrors Evaboot |
| `Find Work Email` | Findymail | ⚠️ Runs enrichment but output is SILOED — not used in export column |
| `Find work email (2)` | Findymail (duplicate) | ⚠️ Redundant — wasting data credits |
| ZeroBounce verify | — | ❌ NOT SET UP — available in Clay Tools at 0.1 credits/row |

**Three critical issues found in Clay audit (March 2026):**
1. **Broken waterfall:** Findymail finds emails for ~30% of Evaboot misses, but its output column is never used in `work email` or `Email (3)`. Those export columns only mirror the Evaboot `email` column. Leads where Evaboot found nothing export with a blank email.
2. **Duplicate enrichment:** Two Findymail columns running the same enrichment — wasting ~30 data credits/run. Remove `Find work email (2)`.
3. **No verification step:** ZeroBounce is available in Clay Tools (0.1 credits/row) but not added. Without it, Clay-enriched emails are pattern-guessed and unverified — root cause of the March 2026 bounce problem.

**Required Clay table fixes:**
- [ ] Update `work email` formula to waterfall: `{{email}} OR {{Find Work Email result}}`
- [ ] Delete `Find work email (2)` — duplicate of `Find Work Email`
- [ ] Add ZeroBounce "Verify Email" column after `work email` is populated
- [ ] Add filter on export/Google Sheet action: only export rows where ZeroBounce status = `valid`
- [ ] Rename `Email (3)` → `Final Email` and wire to verified email output

**Credit cost for verification:** 103 leads × 0.1 credits = ~10 data credits. Negligible on Launch plan.

**Env var:**
```
CLAY_WEBHOOK_SECRET=  ⚠️ Must set in Vercel AND as Script Property in Apps Script
```

---

### 3b. Instantly SuperSearch (Sending Layer — Backup Only)
**What:** Built-in B2B contact database inside Instantly.ai. Already paid for (Growth Credits tier).  
**Role in current stack:** Backup/convenience use only — NOT a primary enrichment engine.  
**Cost:** $47/mo Growth Credits tier (1,500 credits) — already active  
**Setup status:** ✅ Purchased March 2026 — Growth Credits active.

**Why SuperSearch is backup, not primary:**  
Multiple independent reviews flag data accuracy concerns (outdated emails, wrong titles, elevated bounce rates for executive-level contacts). Pattern-guesses email formats for executive accounts — the same root cause as the March 2026 bounce issue. For a 15–20/day precision executive program, even a modest bounce rate increase is a meaningful deliverability risk.

**Remaining valid uses for SuperSearch credits:**
- Quick segment tests (new geography, new function — before committing a full Evaboot run)
- Discovery of low-risk supplemental lists (broad ICP, not primary executive targets)
- Do NOT use as a gap-fill for leads Clay couldn't enrich — unverified guesses will bounce

**SuperSearch has no public API** — dashboard-only. Any use of SuperSearch remains a manual step.

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
| Stop on auto-reply | **Enabled** | ✅ Updated April 2026 — required for multi-step sequence |

**Schedule** (verified March 2026 — was unchecked on all days, now fixed):
- Days: **Monday–Friday** ✅
- Window: **8:00 AM – 5:00 PM Mountain Time** ✅
- Start: Now | End: No end date

**Sequence** (Campaigns → Waypoint Outbound → Sequences) — 3 steps as of April 2026:

#### Step 1 — Day 0 (GPT-4o personalized)
- Subject: `quick thought`
- Body: `{{personalization}}` — maps to the GPT-4o draft generated by `personalizerProcess` and stored on the Lead record. Injected via Instantly v2 API by `senderProcess`.
- Job: Break pattern. Signal-anchored observation. Soft CTA (one of 3 approved closers).

#### Step 2 — Day 5–6 (Transparency/meta — static template, Instantly-native)
- Subject: *(blank — continues same thread)*
- Body:
```
Hi {{first_name}},

Ok, we all know this is a "cold" outreach email...and you didn't ask for it. I hate spam too, and if this isn't interesting, I genuinely apologize!

I know the "future business owner avatar" very well, and frankly, from what I can see online, you have a lot of the characteristics. Thus the outreach...

Business isn't right for everyone
Timing can be sensitive

If you have any interest in building something of your own
This is my expertise and super power

Franchise brands pay referral fees
So you don't have to pay for expertise

One question, two possibilities:  do you reply or unsubscribe?

Kelsey Stuart
waypointfranchise.com
214-995-1062
```
- Job: Pattern interrupt — name the cold email before the prospect can resent it. Binary CTA removes ambiguity and reduces spam reports (explicit unsubscribe path). No-cost model reinforced.
- Personalization: `{{first_name}}` only.

#### Step 3 — Day 12 (Graceful close — static template, Instantly-native)
> Add simultaneously with Step 2. Instantly manages the timer automatically.
- Subject: *(blank — continues same thread)*
- Body:
```
Hi {{first_name}},

Nobody wants your opinion until they ask for it...it's a universal truth

And my emails have violated it. I wish business had an "easy button" like the old Staples commercials...

I'll step back now so that I'm not a bother, but if that quiet ambition in the back of your mind gets too noisy, I'd be happy to get together and see if there is a way for me to be helpful.

My superpower: helping people find a business that they actually enjoy operating.

Thanks for your time and the space in your inbox!

Kelsey
waypointfranchise.com
214-995-1062
```
- Job: Self-aware, graceful close. "Quiet ambition in the back of your mind" names the ICP's exact psychological state — the line that makes someone save an email. Steps back with dignity, no false promises, long-game hook for future re-engagement.

**Long-tail Subsequence** (Campaigns → Waypoint Outbound → Subsequences):
- Trigger: "Has completed campaign without a reply"
- Wait: 18 days after campaign completion (= Day 30 from original send)
- Built directly in Instantly Subsequences editor — NOT a separate campaign
- 4 steps at 30-day intervals (Days 30, 60, 90, 120 from original send)

##### Subsequence Step 1 — Day 30 | Subject: `Where do you stand?`
```
Hi {{first_name}},

Kelsey at Waypoint Franchise Advisors. I reached out a few weeks back.

One thing I hear a lot from people at your level: they've thought about owning something for years but never actually sat down to figure out whether they're in a position to do it. Usually because they don't know where to start.

I built a short assessment for that moment. Five minutes, gives you a real number, no call required.

waypointfranchise.com/scorecard

Kelsey
```

##### Subsequence Step 2 — Day 60 | Subject: `Something worth reading`
```
Hi {{first_name}},

Kelsey at Waypoint Franchise, again.

I've guided 100's of conversations about franchise ownership, the thing that surprises most new business owners isn't the financial side...It's how different running a business is from being inside one.

Different skills
Different energy
Different days

It's a purposeful re-invention...

It's definitely a conversation worth having first, before you look at brands or numbers.

I've been self-employed for 25 years and helped over 200 people start successful businesses. If you want to talk about your goals and stage of life, just reply here.

No pitch, no obligation.

Kelsey
waypointfranchise.com
214-995-1062
```

##### Subsequence Step 3 — Day 90 | Subject: `A question worth sitting with`
```
My personal theory:

There are two kinds of lions in the world; ones for the zoo, ones for the pride.

There's plenty of room for every lion to be where they need to be, but it's always a terrible outcome when you mix them up and put a lion in the wrong environment.

For the lions that belong on the pride (business ownership), if you put them in a zoo, they will claw their eyes out. If you put a "zoo" lion (employee) in the pride, they are likely going to be someone's dinner...

There's room for all lions, you just have to realize which one you are, and honor it.

I'm a lion built for the pride, I've always known it and once I embraced it, I couldn't be happier. I may get wet when it rains, I may go hungry if I don't hunt, and everything, everywhere, is tying to turn me into dinner...but I love it.

Instinctually...what kind of lion are you meant to be?

Kelsey
waypointfranchise.com
214-995-1062
```

##### Subsequence Step 4 — Day 120 | Subject: `What kind of owner would you be?`
```
You don't have to wear capes and leotards to have superpowers...

Everyone has natural skills and developed skills.
Everyone has activities that fill them and drain them.

Secret to "work success"...
Figure out your superpower, listen to what drains/fills you...

Stay in those lanes as often as possible!

I am a builder, I love the creativity of something new, and I have a higher than average risk tolerance. It's been a blessing, far more than a curse (sometimes a curse if I'm honest). These started as natural little buds in my tree of life. Through time and intention, those buds have become the branches in which my kids hang a swing and giggle in the afternoons.

We only get one trip around, one life to live...no redos. I LOVE helping people build freedom that allows them to be who they want to be and do what they want to do. It fills me up so I keep running towards it.

Chase your dreams, make the most of everyday, be honest about what you want, and chase it like your life depended on it!

Kelsey
waypointfranchise.com
214-995-1062
```

**Re-engagement batch (April 2026 — one-time, for existing 447 SENT leads):**
- Existing SENT leads do NOT auto-advance into the subsequence — they completed before it was created.
- Script: `scripts/export-reengagement-leads.ts` — exports non-replied SENT leads > 5 days old as CSV.
- Run command: `npx ts-node --project tsconfig.json scripts/export-reengagement-leads.ts`
- Upload output CSV directly to the Instantly subsequence as a manual lead import.

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

**Post-Launch Optimization Backlog** (April 2026 — do not change until sequence has real reply data)

Sequence reviewed by 4 LLMs (ChatGPT, Claude, Gemini, Perplexity) after finalization. Emails launched as-is to test authentic voice first. The following changes are candidates for Version 2 once open/reply data exists:

1. **Step 3 "step back" phrasing** — current copy says "I'll step back now." Phase 2 subsequence then emails again 18 days later. Soften to "step back for now" or "give you some space" to avoid a credibility break. Hold until sequence has run a full cycle.

2. **Explicit neutrality line** — nowhere in the sequence does Kelsey say she sometimes advises people to stay in their corporate role. One sentence to this effect removes the "I'll get sold something" objection that analytical ICPs carry silently. Candidate placement: Step 2 or Step 4.

3. **Spouse/partner acknowledgment** — 45-55 year old executives don't make this decision alone. One line in Phase 2 (e.g., "most of the real conversation ends up happening at the dinner table") addresses the silent objection. Candidate placement: Subsequence Step 2 or 3.

4. **Lion email softening** — "claw their eyes out" and "someone's dinner" are the two lines most likely to alienate analytical, corporate-proud executives. The zoo/pride metaphor itself is strong. If data shows Step 6 has low engagement, soften those two images while keeping the rest.

5. **"100's" → "hundreds"** — minor credibility note. Apostrophe-s for plurals reads as a typo to detail-oriented executives.

6. **Timing compression (contested)** — ChatGPT and Perplexity said compress Phase 1 to Days 0/3/7. Claude said stretch to Days 0/7/18. Gemini said timing is excellent as-is. Inconclusive. Run current timing first; adjust if Phase 1 reply rate is below 1%.

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
| `leadHunterProcess` | event: `workflow/lead.hunter.start` | ✅ Live | Scores a RAW lead using the fully-implemented scoring rubric (title, career trigger, company news, post content, persona fit, tenure). No external enrichment API — Evaboot-verified emails are already present on import. |
| `personalizerProcess` | event: `workflow/lead.personalize.start` | ✅ Live | GPT-4o writes email for scored lead |
| `senderProcess` | event: `workflow/lead.send.start` | ✅ Live | Adds lead to Instantly campaign |
| `replyGuardianProcess` | event: `workflow/lead.reply.received` | ✅ Live | Classifies reply; HITL Resend alert implemented March 2026 |
| `monitorProcess` | cron: `0 9 * * *` | ✅ Live | Pulls real bounce/complaint data from Instantly v2 analytics API. Alerts Slack at warning (2%/0.08%) and critical (5%/0.3%) thresholds. Fixed April 2026 — was previously mocked with Math.random(). |
| `warmupScheduler` | cron: `0 14 * * 1-5` (8 AM MT) | ✅ Live | Fires daily send events up to dailyCap |
| `contentRefreshFunction` | cron: `0 14 1 * *` + event: `content/refresh.run` | ✅ Live | Rewrites stale articles via GPT-4o |
| `tidycalBookingSync` | cron: `0 16 * * 1-5` (10 AM MT) | ✅ Live | Polls TidyCal API, syncs bookings to leads |
| `pendingClayFallback` | cron: `0 13 * * 1-5` (7 AM MT) | ✅ Live (fixed March 21, 2026) | Advances PENDING_CLAY leads stuck >24h to RAW — safety net so no lead is lost if Clay doesn't enrich |
| `socialNurtureQueue` | cron: `0 15 * * 1-5` (9 AM MT) | ✅ Live | Finds leads in WARMING status and advances them through the 2-week social proof sequence. Posts actionable Slack checklist. Advances to SEQUENCED when done. |
| `ghostRecoveryAlert` | cron: `0 16 * * 1` (10 AM MT, Mon) | ✅ Live | Finds REPLIED leads gone quiet 30+ days; posts ghost recovery scripts to Slack |

**Env vars:**
```
INNGEST_EVENT_KEY=    ✅ set in Vercel
INNGEST_SIGNING_KEY=  ✅ set in Vercel
```

**LinkedIn Connection Request Queue — script format (`linkedInDmQueue`):**

These are the scripts Kelsey receives in Slack each morning (Mon–Fri, 9 AM MT) for leads in SENT status for 5+ days with no reply. Each lead shows two copy-paste-ready fields.

**Why connection requests, not InMail:**
- Sales Navigator Core provides only 20 InMail credits/month — insufficient at 20+ leads/day queue volume
- Accepted connections compound: free DMs forever, feed presence, re-approach rights if they don't convert immediately
- WARN Act / career-transition leads are more receptive to connecting with advisory professionals than to cold InMail

**Voice principles (apply to all scripts):**
- Pattern interrupt opener — acknowledge the situation honestly before making any ask
- "Financial off-ramp through franchising" is the core value prop phrase — use it where natural
- Permission-based offer — "could I send you" not "here is"
- Curious close — "I am curious if you would find value in it" — removes pressure entirely
- Short sentences, natural rhythm. No em dashes. No exclamation points. No corporate language.

**Two-step flow:**

**Step 1 — Connection request note** (paste into LinkedIn "Add a note" field — verified at 295 chars with a 5-letter first name, ~5 char buffer for longer names):
> Hi [FirstName], I realize this is a random connection request. I help professionals build a financial off-ramp through franchising. Could I send you a copy of my guide? It is called "5 Things That Actually Determine If Franchise Ownership Makes Sense For You." I'm curious if you'd see value in it.

Universal for all leads. No variation needed at this step — the pattern interrupt and offer are the hook.

**Step 2 — Follow-up DM** (send only after they accept — free DM, no InMail credits):

| Variant | Trigger | Message |
|---|---|---|
| **Owner / Founder** | Title: owner, founder, president, CEO, principal | Thanks for connecting, [FirstName]. Happy to send that guide over. It is a short read. I wrote it for people who have already built something and are evaluating what a different kind of ownership looks like. I am curious if any of it resonates with where you are right now. |
| **Senior Executive** | Score >= 85, or title: VP, director, managing director | Thanks for connecting, [FirstName]. Happy to send that guide your way. I wrote it for people who have built real careers in corporate and are starting to evaluate what a different financial trajectory could look like. I am curious whether the framing applies to where you are at. |
| **Strong ICP / Mid-level** | Score >= 75 | Thanks for connecting, [FirstName]. Happy to send the guide over. It covers the five things that actually determine whether franchise ownership makes sense for someone. I am curious what you think after reading it. |
| **Broader ICP** | Score < 75 | Thanks for connecting, [FirstName]. Happy to drop that guide here if you are curious. It is a short read. It covers what most people never think to evaluate before making a decision like this. No obligation at all. |

Rules: No em dashes in any script. No subject line needed (connection requests and DMs have no subject field). Each lead appears only once (`dmStatus` filter — SENT or SKIPPED leads are excluded from future alerts).


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

## Lead Sourcing Decision — March 2026

> Documented after tri-model LLM research synthesis (ChatGPT, Claude, Perplexity). All three models reached the same conclusion independently.

### The three paths evaluated

| Path | Stack | Monthly cost | Verdict |
|---|---|---|---|
| **A — Apollo only** | Apollo $49 + Instantly $47 (+ Sales Nav $80 if kept) | ~$176–196/mo | Loses LinkedIn behavioral signals for list-building. Not aligned with exec ICP requiring timing precision. |
| **B — Evaboot + Instantly SuperSearch** | Sales Nav $80 + Evaboot $79 + Instantly $47 | ~$206/mo | Keeps signals but uses SuperSearch (weak enrichment). Highest cost for weakest enrichment layer. |
| **C — SuperSearch only** | Instantly $47 | ~$47/mo | No behavioral signals, lowest data quality. Wrong for executive precision ICP. |
| **✅ Modified B (chosen)** | Sales Nav $80 + Evaboot ~$35 + Apollo $49 + Instantly $47 | ~$211/mo | Best targeting precision + best email accuracy + behavioral signals preserved. |

### Why modified Path B

**1. Behavioral signals are not optional for this ICP.**  
LinkedIn's own data: OpenToWork badge = 3× higher positive response rate vs. non-badge profiles. "Posted in last 30 days" filter is a live intent signal unavailable in any static database. At 15–20 emails/day, a 3× response rate lift per lead is the whole ballgame — this is not a marginal gain.

**2. Database quality ranking is unambiguous.**  
All three models independently ranked: Sales Navigator > Apollo > Instantly SuperSearch. The gap widens at senior levels (VP/Director/CXO) because static databases lag job changes; LinkedIn reflects them in near-real time (users update their own profiles).

**3. Apollo beats SuperSearch for enrichment.**  
SuperSearch is rated ~3/5 for data accuracy in independent reviews. Apollo achieves ~85–90% email accuracy with a 7-step verification process + waterfall enrichment (rolled out 2025). Apollo at $49/mo is actually cheaper than the $79/mo Evaboot+SuperSearch combo originally priced for Path B.

**4. Evaboot lower tier is sufficient.**  
Evaboot pricing is credit-based. At 400–500 leads/month (15–20/day), the Entry/Starter tier (~$29–39/mo) covers the volume. The $79/mo Growth tier is for 50+/day operations.

**5. Cost delta from current stack:** ~+$84/mo net (Evaboot ~$35 + Apollo $49, minus Hunter.io upgrade that is no longer needed). One booked consultation exceeds 12 months of this cost.

### Actions — Status (March 24, 2026)
- [x] Evaboot Chrome extension installed and active — "Extract with Evaboot" confirmed in Sales Navigator
- [x] Evaboot "safe emails only" export is the primary email source — server-verified before CSV download
- [x] `leadHunterProcess` uses Evaboot emails directly — no external enrichment API call. Scoring rubric fully implemented.
- [x] Apollo Basic plan evaluated but **not purchased** — Evaboot's server-side verification provides sufficient deliverability at Stage 1 volume. Apollo remains an option if find-rate drops below 60% at scale.
- [x] Hunter.io key inert in env — no active code path calls Hunter.io. Leave set but do not upgrade.

---

## Pre-Launch Checklist

**Instantly Setup**
- [x] Purchase SuperSearch Growth Credits tier ($47/mo) in Instantly dashboard — ✅ Purchased March 2026
- [x] Verify campaign tracking settings: open tracking OFF, click tracking OFF, plain text only — ✅ Verified March 2026
- [x] Confirm reply routing: replies land in the same sending inbox — ✅ Verified
- [x] Register inbound reply webhook in Instantly dashboard — ✅ Verified active March 2026 — URL: `https://www.waypointfranchise.com/api/webhooks/resend`, Bearer auth with `INBOUND_WEBHOOK_SECRET`

**Code — Fixed March 2026**
- [x] Implement Resend HITL email in `notify-human` step of `replyGuardianProcess` — ✅
- [x] Fix gender pronouns in VOICE_RULES system prompt (`He` → `She`) — ✅ Fixed March 2026
- [x] Fix `maxSendsPerDay` schema default (50 → 15) to match warmup phase — ✅ Fixed March 2026
- [x] Clarify inbound reply webhook route comment + fix auth var (`RESEND_WEBHOOK_SECRET` → `INBOUND_WEBHOOK_SECRET`) — ✅ Fixed March 2026
- [x] Full scoring rubric implemented in `leadHunterProcess` — replaces mock. Title, career trigger, company news, post content, persona fit, tenure all live. ✅ March 2026

**Code — Fixed March 21, 2026 (QC Audit)**
- [x] Register `pendingClayFallback` in Inngest serve() — was defined but never firing — ✅ Fixed
- [x] Added `Send Now` button to admin lead detail page — triggers `senderProcess` manually for a single SEQUENCED lead. Route: `POST /api/admin/send-now` ✅

**Lead Sourcing — Finalized March 23–24, 2026**
- [x] Evaboot "safe emails only" export configured — server-verified emails only; no catch-all (riskier) emails during warmup ✅
- [x] ZeroBounce validation mapped to verified email column in Clay ✅
- [x] Old bounce-causing lead list cleared from Instantly pipeline ✅
- [x] Clean Evaboot-exported list loaded and scored ✅
- [x] Two days of sends completed at 15/day pace ✅
- [x] `emailStatus` field added to schema — gates `riskier` emails before Instantly push ✅ Fixed April 2026
- [x] `senderProcess` now checks `SuppressionList` before pushing to Instantly ✅ Fixed April 2026
- [x] Fabricated-email score cap lowered to 49 — leads with no verified email auto-suppress ✅ Fixed April 2026

**Google Postmaster Tools**
- [x] ~~Contact Instantly support to add TXT verification records~~ — ❌ Permanently blocked (March 2026)
- [ ] **Pending:** Run one test send through [mail-tester.com](https://mail-tester.com) — **MANUAL (Kelsey)** — held due to website issue; not a launch blocker

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
| LeadIQ | After WARN workflow established | Job change alerts for executives 30–45 days post-WARN | Paid |
| GlockApps | Sends > 50/day | Inbox placement testing across all major providers | $80/mo |

---

### Clay.com — Enrichment (Active, Free Tier)
**What:** Enrichment waterfall that queries Hunter, Findymail, LinkedIn, PredictLeads, Google News and 50+ sources in sequence.  
**Setup status:** ✅ Active — "Cold Email Test 1" table (103 leads). Free tier in use.  
**Enrichment columns configured (March 2026):**
- Hunter "Find work email" → `work email` column (primary, ~50% hit rate)
- Findymail "Find Work Email" → fallback when `!{{work email}}` (~+15%)
- "Get person's professional posts" → `Recent Post Summary` column (`posts[0].text`)
- Company News waterfall: PredictLeads primary → Google News fallback → `Company News` column

**Bridge to pipeline:** Clay's native "Add row to Google Sheet" action (available on free tier) exports enriched data to the Google Sheet. Apps Script then POSTs each row to the webhook.
1. Clay "Add row to Google Sheet" action exports enriched data to [Cold Email Test 1 Sheet](https://docs.google.com/spreadsheets/d/1YF73at-vjjXPvfYuUEmiP7NeGI7Ku4G3gskJcUSr-ko/edit)
2. Google Apps Script (`Code.gs` attached to sheet) POSTs each row to `POST /api/webhooks/clay`
3. Auth: `x-clay-secret` header = `CLAY_WEBHOOK_SECRET` env var (stored as Script Property in Apps Script)

**Google Sheet columns (must match Apps Script column map):**
| Col | Header | Clay source |
|-----|--------|-------------|
| A | First Name | Clay `First Name` |
| B | Last Name | Clay `Last Name` |
| C | LinkedIn URL | Clay `LinkedIn URL (Slash)` |
| D | Email | Clay `work email` |
| E | Title | Clay `Job Title` |
| F | Company | Clay `Company Name` |
| G | Country | Clay `Country` |
| H | Recent Post Summary | Clay `Recent Post Summary` |
| I | Company News Event | Clay `Company News` |
| J | Years in Position | Clay native `Years in Position` enrichment |
| K | Company Size Range | Clay `Company Headcount` → bucket manually or via formula (see note below) |
| L | Industry Vertical | Clay `Industry` |
| M | Function Area | Clay `Department` |
| N | Seniority Level | Clay `Seniority` |
| O | Is Open To Work | Clay `Open To Work` (boolean — "TRUE"/"FALSE") |
| P | Was Recently Promoted | Clay formula: `=IF(DATEDIF(start_date, TODAY(), "M") < 6, "TRUE", "FALSE")` |

> **Company Size Range note:** Clay returns raw headcount numbers. Add a formula column in the Sheet to bucket them:
> `=IF(D2="","",IF(D2<=10,"1-10",IF(D2<=50,"11-50",IF(D2<=200,"51-200",IF(D2<=500,"201-500",IF(D2<=1000,"501-1000",IF(D2<=5000,"1001-5000",IF(D2<=10000,"5001-10000","10000+"))))))))`
> Reference whichever column Clay exports headcount to.

> **Clay native columns available on free tier (no HTTP API add-on needed):** `Company Headcount`, `Industry`, `Department/Function`, `Seniority`, `Open To Work`. These are enriched directly in Clay and exported to Columns K–P via the "Add row to Google Sheet" action.

> **`Years in Position` note:** Clay outputs values as quoted strings (`"5"` instead of `5`). The Apps Script strips these quotes before sending to the webhook.

**Scoring for `yearsInCurrentRole`:** ≥8 years = +20 pts | ≥5 years = +10 pts

**Env var:**
```
CLAY_WEBHOOK_SECRET=  ⚠️ Must set in Vercel AND as Script Property in Apps Script
```

**Final Apps Script (paste into Extensions → Apps Script → Code.gs):**

> ⚠️ This script reads column positions by **header name**, not by index — so it is immune to column reordering. It works with the full 64-column Evaboot sheet layout. Custom Clay enrichment columns (Recent Post Summary, Company News) must be present as columns in the sheet (Clay maps them via "Add row to Google Sheet" action).

```javascript
const WEBHOOK_URL = "https://www.waypointfranchise.com/api/webhooks/clay";
const SHEET_NAME = "Sheet1";

// ── Column header → payload field mapping ────────────────────────────────────
// Left side: exact header text in the Google Sheet (case-sensitive)
// Right side: payload key sent to /api/webhooks/clay
const COLUMN_MAP = {
  "First Name":             "firstName",
  "Last Name":              "lastName",
  "Linkedin URL Public":    "linkedinUrl",       // primary match key — required
  "Email":                  "email",
  "Current Job":            "title",
  "Company Name":           "company",
  "Location":               "geoMarket",         // person's city/state → geoMarket
  "Company Employee Range": "companySizeRange",
  "Company Industry":       "industryVertical",
  "Is Open To Work":        "isOpenToWork",       // boolean
  "Has New Position":       "wasRecentlyPromoted",// boolean proxy for recently promoted
  "Years in Position":      "yearsInCurrentRole", // numeric — strip quotes
  "Years in Company":       "yearsAtCompany",     // numeric — strip quotes
  // ── Clay enrichment columns (appended by Clay "Add row" action) ────────────
  "Recent Post Summary":    "recentPostSummary",
  "Company News":           "companyNewsEvent",
};

// Boolean fields — parsed from "TRUE"/"FALSE"/1/0/true/false
const BOOL_FIELDS = new Set(["isOpenToWork", "wasRecentlyPromoted"]);

// Numeric fields — strip quotes and parse as integer
const NUMERIC_FIELDS = new Set(["yearsInCurrentRole", "yearsAtCompany"]);

// ── Build header → column-index map from row 1 ───────────────────────────────
function buildHeaderMap(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    if (h) map[h.toString().trim()] = i;
  });
  return map;
}

// ── Parse boolean-like values from Clay ──────────────────────────────────────
function parseBool(val) {
  if (typeof val === "boolean") return val;
  const s = String(val).trim().toUpperCase();
  return s === "TRUE" || s === "1" || s === "YES";
}

// ── Parse numeric values — strip surrounding quotes Clay sometimes adds ───────
function parseNum(val) {
  const stripped = String(val).replace(/[^0-9.]/g, "");
  const n = parseInt(stripped, 10);
  return isNaN(n) ? undefined : n;
}

// ── Post a single row to the webhook ─────────────────────────────────────────
function postRow(sheet, row, secret, headerMap) {
  const lastCol = sheet.getLastColumn();
  const values = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

  // linkedinUrl is the match key — skip row if missing
  const linkedinIdx = headerMap["Linkedin URL Public"];
  if (linkedinIdx === undefined) {
    Logger.log(`Row ${row} → SKIPPED: "Linkedin URL Public" column not found in sheet`);
    return;
  }
  const linkedinUrl = (values[linkedinIdx] || "").toString().trim();
  if (!linkedinUrl) {
    Logger.log(`Row ${row} → SKIPPED: empty LinkedIn URL`);
    return;
  }

  const payload = {};

  for (const [header, payloadKey] of Object.entries(COLUMN_MAP)) {
    const colIdx = headerMap[header];
    if (colIdx === undefined) continue;        // column not in sheet — skip
    const raw = values[colIdx];
    const isEmpty = raw === "" || raw === null || raw === undefined;
    if (isEmpty) continue;                     // blank — omit from payload

    if (BOOL_FIELDS.has(payloadKey)) {
      payload[payloadKey] = parseBool(raw);
    } else if (NUMERIC_FIELDS.has(payloadKey)) {
      const n = parseNum(raw);
      if (n !== undefined) payload[payloadKey] = n;
    } else {
      const str = raw.toString().trim();
      if (str) payload[payloadKey] = str;
    }
  }

  const body = JSON.stringify(payload);
  const options = {
    method: "post",
    contentType: "application/json",
    payload: body,
    headers: { "x-clay-secret": secret },
    muteHttpExceptions: true,
  };

  const res = UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log(`Row ${row} → ${res.getResponseCode()} ${res.getContentText()}`);
}

// ── Manual run: post every data row (use to backfill existing rows) ───────────
function postAllRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const secret = PropertiesService.getScriptProperties().getProperty("CLAY_WEBHOOK_SECRET");
  const headerMap = buildHeaderMap(sheet);
  for (let row = 2; row <= lastRow; row++) {
    postRow(sheet, row, secret, headerMap);
    Utilities.sleep(800);
  }
}

// ── Installable trigger: fires automatically when Clay adds a new row ─────────
// Set up: Apps Script → Triggers → Add Trigger → onRowAdded → Spreadsheet → On row added
function onRowAdded(e) {
  const sheet = e.source.getSheetByName(SHEET_NAME);
  if (!sheet) return;
  const row = e.range.getRow();
  if (row < 2) return;  // skip header row
  const secret = PropertiesService.getScriptProperties().getProperty("CLAY_WEBHOOK_SECRET");
  const headerMap = buildHeaderMap(sheet);
  postRow(sheet, row, secret, headerMap);
}
```

**Script Properties setup** (Extensions → Apps Script → Project Settings → Script Properties):
| Property | Value |
|---|---|
| `CLAY_WEBHOOK_SECRET` | *(copy from Vercel env var of same name)* |

**Trigger setup** (Extensions → Apps Script → Triggers → Add Trigger):
| Setting | Value |
|---|---|
| Function | `onRowAdded` |
| Event source | From spreadsheet |
| Event type | On row added (installable) |

> **Why installable trigger, not simple trigger:** Simple `onEdit` / `onChange` triggers cannot make external HTTP requests. The installable "On row added" trigger runs under your Google account permissions and has full `UrlFetchApp` access.



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
| **Apify** | ❌ Skip permanently | Never purchased; ToS risk; Evaboot is the safe extraction path |
| **Hunter.io** | ⛔ Superseded by Apollo | Key set in Vercel but code path will be replaced by Apollo enrichment API. Do not upgrade. |
| **HubSpot CRM** | ❌ Skip | Prisma DB is the CRM; duplicate data problem |
| **EmailBison** | ❌ Skip | Grok-only recommendation, no consensus from other models |
| **lemlist** | ❌ Skip | Already have Instantly for multi-channel; no second platform |
| **Clay** | ✅ Active — enrichment layer | Launch plan ($185/mo). Enriches recentPostSummary, companyNewsEvent, yearsInCurrentRole, and company attributes. Bridges to pipeline via Google Apps Script → /api/webhooks/clay. Not used for email finding — Evaboot is the email source. See §3. |
| **Apollo.io** | ❌ Not subscribed | Evaluated March 2026 — not purchased. Evaboot server-verified emails at Stage 1 volume made Apollo unnecessary. Revisit if Evaboot find rate drops below 60% sustained. |
| **Hunter.io** | ❌ Not subscribed | Key set in Vercel as legacy artifact — no active code path calls Hunter. Do not upgrade. Leave key in place but treat as inert. |
| **Evaboot** | ✅ Active — extraction + email source | Chrome extension. Exports Sales Nav results into clean CSV with server-verified emails (~65% match at safe tier). Ban-safe. Preserves LinkedIn behavioral signals. See §2. |
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
**What:** Enrichment waterfall that queries Findymail, LinkedIn, PredictLeads, Google News and 50+ sources in sequence.  
**Account:** Launch plan ($185/mo, 15,000 actions/mo, 2,500 data credits/mo).  
**Reviewed:** March 2026  
**Decision:** ✅ Complete — activated April 2026

**What was completed:**
- Clay Launch plan active ($185/mo)
- "Cold Email Test 1" table (103 leads) configured with Findymail enrichment waterfall
- Broken waterfall fixed: `work email` formula now waterfalls `{{email}} OR {{Find Work Email result}}`
- Duplicate `Find work email (2)` column deleted — was wasting data credits
- ZeroBounce email verification added (0.1 credits/row); export filtered to `valid` only
- `Email (3)` renamed to `Final Email`, wired to verified email output
- Google Apps Script bridge live: Clay → Google Sheet → `/api/webhooks/clay`
- `onRowAdded` trigger active — each new Clay row POSTs to pipeline automatically

**See §3 in this document for full Clay setup detail.**

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
| `HUNTER_API_KEY` | ⛔ Inert — do not upgrade | No active code path calls Hunter.io. Superseded by Evaboot as email source. |
| `APOLLO_API_KEY` | ⛔ Not set — not needed at Stage 1 | Apollo not purchased. Evaboot server-verified emails provide sufficient deliverability. Revisit if find-rate drops below 60% at scale. |
| `CLAY_WEBHOOK_SECRET` | ✅ Set in Vercel | Auth header for `/api/webhooks/clay` — must match `x-clay-secret` header from the Google Apps Script bridge. |
| `SLACK_WEBHOOK_URL` | ✅ Set in Vercel + local | Incoming Webhook → `#waypoint-hot-replies` — HITL push notifications |
| `BEEHIIV_API_KEY` | ✅ Set in Vercel + local | Phase 2 — newsletter subscriber API |
| `BEEHIIV_PUBLICATION_ID` | ✅ Set in Vercel + local | `pub_8ea1ac6a-23e9-4e14-b0ad-06854119620d` |
