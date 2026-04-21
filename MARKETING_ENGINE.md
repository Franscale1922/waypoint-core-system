# Waypoint Franchise Advisors — Marketing Engine

> **Purpose:** This is the single source of truth for the entire Waypoint marketing system — every channel, every tool, every automation, and everything that still needs to be built. No other document covers this scope. Start here.
>
> **Last Updated:** April 2026
> **Owner:** Kelsey Stuart
> **Maintained by:** Antigravity agent sessions

---

## Table of Contents

1. [The Engine Overview](#1-the-engine-overview)
2. [Funnel Map — From Stranger to Booked Client](#2-funnel-map--from-stranger-to-booked-client)
3. [Lead Sourcing](#3-lead-sourcing)
4. [Cold Email Pipeline](#4-cold-email-pipeline)
5. [Website & SEO](#5-website--seo)
6. [Content Publishing (articles)](#6-content-publishing-articles)
7. [Newsletter — beehiiv](#7-newsletter--beehiiv)
8. [YouTube Channel](#8-youtube-channel)
9. [Podcast](#9-podcast)
10. [AI Avatar Video (HeyGen)](#10-ai-avatar-video-heygen)
11. [Social Media Distribution](#11-social-media-distribution)
12. [Personalized Video Outreach](#12-personalized-video-outreach)
13. [Community — Horizon 2 (Skool)](#13-community--horizon-2-skool)
14. [Full Tool Stack Reference](#14-full-tool-stack-reference)
15. [Phase Tracker](#15-phase-tracker)
16. [Horizon Map](#16-horizon-map)

---

## 1. The Engine Overview

Waypoint's marketing engine has one job: move a franchise-curious corporate professional from **first awareness** to a **booked consultation** with Kelsey — and then keep them warm until they are ready to move.

The engine is built in three horizons:

| Horizon | Focus | Status |
|---------|-------|--------|
| **H1 — Direct Outreach** | Cold email pipeline, website, content library | ✅ Live |
| **H2 — Inbound Authority** | YouTube, podcast, newsletter, social distribution | ⏳ Building |
| **H3 — Community & Scale** | Skool community, affiliate/referral flywheel, paid content | 🔲 Future |

**The logic:** H1 generates bookings now. H2 compounds authority so that inbound replaces a growing share of outbound over time. H3 converts authority into a scalable, monetizable community that creates its own lead flow.

**The funnel in one sentence:** Cold outreach drives immediate bookings → content and YouTube build authority → newsletter captures the "not yet" audience → community retains and converts long-tail → referral partners generate a parallel inbound channel.

---

## 2. Funnel Map — From Stranger to Booked Client

```
AWARENESS
────────────────────────────────────────────────────────────────────────
  Cold Email (H1)          YouTube / Podcast (H2)      Referral Partners (H2)
  Sales Nav → Evaboot      Organic search + YouTube     CPAs, attorneys,
  → GPT-4o outreach        algorithm                    financial planners
         │                         │                          │
         ▼                         ▼                          ▼
ENGAGEMENT
────────────────────────────────────────────────────────────────────────
  Reply / Interest         Article read / Scorecard     /refer referral page
                           Checklist download           Lead form fill
         │                         │                          │
         ▼                         ▼                          ▼
NURTURE
────────────────────────────────────────────────────────────────────────
  HITL Slack alert         5-email checklist nurture    beehiiv newsletter
  Kelsey replies           3-email scorecard nurture    subscribe → warm drip
  LinkedIn DM follow-up    beehiiv "not now" rescue
         │                         │                          │
         ▼                         ▼                          ▼
CONVERSION
────────────────────────────────────────────────────────────────────────
                   TidyCal booking — /book page
                   90-min Zoom franchise consultation
                          │
                          ▼
POST-BOOKING
────────────────────────────────────────────────────────────────────────
               Franchise exploration process begins
               Kelsey-managed advisory workflow
               → Candidate Navigator CRM
```

---

## 3. Lead Sourcing

### Status: ✅ Live (H1)

The lead sourcing layer feeds the cold email pipeline with high-quality franchise-buyer-fit prospects. All sourcing targets VP/Director/CXO-level executives showing transition signals.

### Primary Source: Sales Navigator + Evaboot

| Step | Action | Tool |
|------|--------|------|
| 1 | Run filtered search in Sales Navigator (seniority: VP/Director/CXO, function, Posted 30d, OpenToWork badge) | LinkedIn Sales Navigator |
| 2 | Click "Extract with Evaboot" → export clean CSV with server-verified emails | Evaboot Chrome extension |
| 3 | Export **safe emails only** (server-confirmed, ~97% deliverability) during warmup phase | Evaboot |
| 4 | Import CSV via admin dashboard → `/admin` → leads enter pipeline as `PENDING_CLAY` | Waypoint Admin |

**Why Evaboot over alternatives:** Server-side email verification catches format mismatches that pattern-guessing tools (Apollo, Instantly SuperSearch, Clay waterfall) miss. March 2026 confirmed: Clay guessed `daniel.harris@revspring.com` — bounced. Evaboot found `dharris@revspring.com` — delivered.

### Secondary Source: WARN Act / Layoff Trackers

Executives at companies announcing mass layoffs are franchise buyer archetypes — still employed, severance incoming, capital available, transition mindset active. 60-day window from WARN filing to separation.

**Weekly workflow (15 min):**
1. Check WARNTracker.com, Layoffs.fyi, TheLayoff.com for new company names
2. Search each company in Sales Navigator → filter VP/Director/CXO + Posted 30d
3. Export via Evaboot → import to admin dashboard

### Future Source: Social Comment Lead Mining (Stage 2)

Monitor replies to WARNTracker/Layoffs.fyi Twitter posts for employees self-identifying as affected. Warmer than cold WARN lookup — public transition signal.

**Trigger to build:** 4+ weeks of consistent pipeline volume at 20/day + first bookings confirmed.

### Clay Enrichment (Active — enrichment fallback)

Clay Launch plan ($185/mo) enriches leads where Evaboot found no email. Also provides: `recentPostSummary`, `companyNewsEvent`, `yearsInCurrentRole`. Bridges to pipeline via Google Apps Script → `/api/webhooks/clay`.

**Active Clay table:** "Cold Email Test 1" (103 leads)  
**Bridge:** Google Apps Script → `/api/webhooks/clay` → `leadHunterProcess` Inngest function

---

## 4. Cold Email Pipeline

### Status: ✅ Live (H1)

The end-to-end automated outreach system. Runs Monday–Friday, 8 AM–5 PM MT, capped at 15–25 sends/day during warmup.

### Pipeline Flow

```
Admin imports CSV (Evaboot export)
       ↓
Lead enters DB → status: PENDING_CLAY
       ↓
Clay enrichment (Google Apps Script → webhook) OR pendingClayFallback cron (7 AM MT)
       ↓
leadHunterProcess (Inngest) → scoring rubric
  · Title/seniority score
  · Career trigger score
  · Company news score
  · Recent post score
  · Persona fit score
  · Tenure score
       ↓
Score ≥ 50 → status: ENRICHED → personalizerProcess (Inngest)
  · Signal priority: Priority A (companyNewsEvent) → B (recentPostSummary) → C (universal)
  · GPT-4o writes 50–90 word plain-text email (6 template variants)
  · Email stored as draft on lead record
       ↓
status: SEQUENCED

warmupScheduler cron (8 AM MT, Mon–Fri)
       ↓
senderProcess → adds lead to Instantly campaign → email sends
       ↓
status: SENT

Instantly inbound reply webhook → replyGuardianProcess (Inngest)
  · GPT-4o classifies reply:
    Interested / Curious / Ambiguous → HITL alert (Resend email + Slack #waypoint-hot-replies)
    Not now → beehiiv newsletter opt-in rescue email
    Unsubscribe / Not a fit → status: SUPPRESSED
       ↓
Kelsey replies within 15 min → prospect books via TidyCal link
       ↓
tidycalBookingSync cron (10 AM MT) → status: BOOKED

linkedInDmQueue cron (9 AM MT, Mon–Fri)
  · SENT leads with no reply after 5+ days → Slack DM script alert
  · Admin dashboard: /admin/linkedin

ghostRecoveryAlert cron (10 AM MT, Mon)
  · REPLIED leads gone quiet 30+ days → Slack ghost recovery script
```

### Sending Infrastructure

| Inbox | Domain | Daily Limit | Health |
|-------|--------|-------------|--------|
| kelsey.stuart@getwaypointfranchise.com | getwaypointfranchise.com | 30 | 100% |
| kelsey@getwaypointfranchise.com | getwaypointfranchise.com | 30 | 100% |
| kstuart@getwaypointfranchise.com | getwaypointfranchise.com | 30 | 100% |
| kelsey.stuart@meetwaypointfranchise.com | meetwaypointfranchise.com | 30 | 100% |
| kelsey@meetwaypointfranchise.com | meetwaypointfranchise.com | 30 | 100% |
| kstuart@meetwaypointfranchise.com | meetwaypointfranchise.com | 30 | 100% |

**Campaign daily cap:** 35 (set in `/admin/settings` → `maxSendsPerDay`)  
**Campaign ID:** `e969de1c-e244-488a-8b29-6278f1ea39a2`

### Email Voice Rules

Kelsey's email voice is non-negotiable. Full rules in `docs/VOICE_GUIDE.md`. Summary:

- Direct, first-person, never salesy
- Short sentences. No em dashes. No exclamation points.
- NLP pacing/leading structure (mirror + shift)
- Identity-level framing ("franchise ownership as total reinvention")
- No corporate clichés: no "leverage," "synergy," "delve," "navigating," "foster," "catalyst," "checking in"
- Do not start 3 consecutive sentences with "I" or "Most"

### Phase 2 Additions (Planned)

- **Follow-up sequence steps** in Instantly (Step 2, 3) — activate after 4+ weeks clean metrics
- **RepliQ/Sendspark personalized video** as a second touch after `Curious` reply classification
- **Raise daily cap** from 35 toward 50–100 as deliverability data matures

---

## 5. Website & SEO

### Status: ✅ Live (H1)

The website is the conversion hub for all inbound channels. Live at `waypointfranchise.com`.

### Pages Live

| Page | Purpose |
|------|---------|
| `/` | Homepage — hero, social proof, scorecard CTA |
| `/about` | Kelsey's story, credibility |
| `/process` | 5-step advisory process |
| `/scorecard` | Franchise readiness quiz → personalized result + 3-email nurture |
| `/book` | TidyCal embed — schedule consultation |
| `/resources` | Article library (34+ articles, MDX) |
| `/faq` | 30-question FAQ with JSON-LD FAQPage schema |
| `/investment` | Investment ranges and funding overview |
| `/glossary` | Franchise glossary — AEO/LLM discovery |
| `/checklists` | Lead magnet — email capture → 5-email nurture |
| `/refer` | Referral page for CPAs, attorneys, financial planners |
| `/map` | 146-city franchise map (Google Sheet, ISR cached hourly) |
| `/tools` | Franchise calculator tools |
| `/privacy`, `/terms` | Legal |

### Technical SEO Status

| Item | Status |
|------|--------|
| All images using `next/image` with priority/sizes | ✅ Complete |
| FAQ JSON-LD schema (FAQPage, 30 questions) | ✅ Complete |
| Page-specific OG images | ✅ Complete |
| Internal linking audit (5 pages, 111 insertions) | ✅ Complete |
| Sitemap at `/sitemap.xml` | ✅ Complete |
| robots.txt | ✅ Complete |
| llms.txt for AI crawlers | ✅ Complete |
| Structured data (Organization, BreadcrumbList, Article) | ✅ Complete |

### Lead Capture on Site

| Mechanism | Location | Funnel |
|-----------|----------|--------|
| Scorecard quiz | `/scorecard` | Completes quiz → personalized result + 3-email nurture → book |
| Checklist download | `/checklists` | Email gate → branded HTML delivery → 5-email nurture |
| Book a call | `/book` | TidyCal widget → 90-min Zoom |
| beehiiv newsletter subscribe | Every article page | Subscribe → newsletter nurture |

### Remaining Website Work

- **FAQ copy fix:** First FAQ answer references "two-hour discovery conversation" — update to "short intro call — usually 20–30 minutes" framing (matches `/process` page)

---

## 6. Content Publishing (Articles)

### Status: 🟡 Ongoing (H1/H2)

The article library builds SEO topical authority and feeds inbound from search and AI discovery engines (Perplexity, ChatGPT, Gemini).

**34 articles currently live.** ~40 more queued across 3 phases.

### Publishing Rules

- **Cadence:** 3 articles/week (min 2, max 4)
- **Phase order:** Never publish out of phase order — Phase 1 must be fully live before Phase 2 articles begin
- **One article per session:** Complete the full workflow per article (draft → back-links → pool update → social drafts → commit → GSC submit)
- **After publish:** Submit URL to Google Search Console manually via URL Inspection tool

Full workflow: `.agents/workflows/new-article.md`  
Full calendar + queue: `content/CONTENT-CALENDAR.md`

### Content Phase Summary

| Phase | Focus | Articles | Status |
|-------|-------|----------|--------|
| 1 | Foundation — broadest intent, hub content | ~12 | 4 needing Kelsey input; 8 agent-ready |
| 2 | Cluster expansion — industry spotlights, Going Deeper | ~15 | Not started (gated on Phase 1 complete) |
| 3 | Long tail & niche — regulated categories, niche verticals | ~13 | Not started |
| Unphased | Additional categories | ~9 | Not started |

### Article Categories

- **Getting Started** — Foundational franchise buyer education
- **Industry Spotlights** — Category-specific deep dives (cleaning, staffing, fitness, senior care, etc.)
- **Going Deeper** — Process, psychology, advisory nuance
- **Tools** — Calculators, comparison pieces

---

## 7. Newsletter — beehiiv

### Status: ⏳ Phase 2 — Not yet active

### What It Is

A beehiiv newsletter that converts content readers, scorecard takers, and "not now" cold email replies into a warm, nurtured subscriber base. These are franchise-curious professionals not ready to book today but want to stay connected.

**Publication ID:** `pub_8ea1ac6a-23e9-4e14-b0ad-06854119620d`  
**Platform:** beehiiv (paid plan required — free tier does not include API write access)

### Use Cases

| Use Case | Mechanic | Value |
|----------|----------|-------|
| Brand newsletter | Franchise insights to subscribers → warm prospects over time | Long-term trust building |
| "Not now" rescue | `replyGuardianProcess` classifies reply as `Not now` → Resend opt-in email → if clicked, subscribe to beehiiv | Saves 44+ leads/month from full suppression |
| Post-scorecard nurture | Scorecard completion → auto-subscribe to newsletter | Turns quiz traffic into persistent audience |
| Content distribution | Each new article → newsletter issue → link back to site | SEO freshness + direct traffic |

**The math:** At 440 leads/month, 10% "Not now" rate = 44 leads/month who aren't ready but aren't opposed. After 6 months = 264 warm leads in the newsletter. Some convert without any additional cold outreach.

### Buildout Steps

- [ ] Activate beehiiv paid plan (required for API write access)
- [ ] Apply for beehiiv MCP early access (read + write integration with Claude/AI tools)
- [ ] Build Inngest step (or n8n workflow): `POST /v2/publications/{pub_id}/subscriptions` with lead email + name
- [ ] Wire into `replyGuardianProcess`: on `Not now` → send Resend opt-in email → if clicked → beehiiv subscribe
- [ ] Wire to scorecard form: on submission → auto-add to beehiiv
- [ ] Wire to checklist download: on email capture → add to beehiiv
- [ ] Build LinkedIn Newsletter as a parallel channel to beehiiv (same content, different distribution)
- [ ] Design the first newsletter issue — franchise market insights, Kelsey's voice
- [ ] Set cadence: weekly or biweekly? Document in `content/CONTENT-CALENDAR.md`

### Env Vars

```
BEEHIIV_API_KEY          ✅ Set in Vercel + .env (already configured)
BEEHIIV_PUBLICATION_ID   ✅ pub_8ea1ac6a-23e9-4e14-b0ad-06854119620d
```

---

## 8. YouTube Channel

### Status: ⏳ Phase 2 — Not yet built

### What It Is

A YouTube channel where Kelsey (via AI avatar or on-camera) publishes educational franchise content for corporate professionals considering ownership. Targets the same ICP as cold email but through organic discovery.

**The compounding math:** YouTube videos rank in Google search AND YouTube search AND get surfaced by AI answer engines. A 100-video library becomes a 24/7 inbound engine that generates awareness without ongoing effort.

### Content Strategy

| Format | Topic | Frequency |
|--------|-------|-----------|
| Talking-head education | "Is franchise ownership right for you?" type content | Weekly |
| Industry spotlights | Video versions of top-performing articles | 2x/month |
| Process walkthroughs | The 5-step advisory process, FDD explanation, discovery day prep | Monthly |
| Scorecard explainer | How the readiness scorecard works + what the bands mean | Once (evergreen) |
| Shorts | Clipped from long-form via Opus Clip | 3–5x/week |

### Full Production Stack

```
1. Subscribr → AI-generates YouTube script (keyword-researched, high-retention format)
2. Claude or GPT-4o → refine script in Kelsey's voice (VOICE_GUIDE.md rules apply)
3. HeyGen → avatar delivers script as talking-head video
4. ElevenLabs → voice clone ensures Kelsey's voice is used (connected to HeyGen)
5. Descript → final polish, remove filler words, add captions
6. Opus Clip → clips long-form into 3–5 shorts automatically
7. YouTube Studio → publish long-form with vidIQ-optimized title/description/tags
8. CapCut or Typefully → schedule/post shorts to YouTube Shorts, Instagram Reels, TikTok
```

### Buildout Steps

- [ ] Record HeyGen avatar training video (2–5 min, plain background, good lighting — see §10)
- [ ] Set up ElevenLabs voice clone and connect to HeyGen
- [ ] Upgrade HeyGen to Team plan ($89/mo) for API access + custom avatars
- [ ] Create YouTube channel — brand name, handle, channel art, about section, links
- [ ] Set up Subscribr — connect channel, run keyword research for franchise buyer ICP
- [ ] Run first 10 script briefs through Subscribr → refine in Kelsey's voice
- [ ] Produce first 5 videos through full stack (Subscribr → HeyGen → Descript → YouTube)
- [ ] Set up vidIQ — connect channel for keyword tracking, competitor analysis
- [ ] Set up Opus Clip — connect exports for automated short-form clipping
- [ ] Build n8n workflow: Script input → HeyGen API → video output → YouTube upload
- [ ] Add `HEYGEN_API_KEY` to Vercel env vars + `.env`
- [ ] Establish publishing cadence: 1 long-form/week + 3–5 shorts/week
- [ ] Add YouTube channel link to website header/footer/about page

### Tools

| Tool | Role | Status |
|------|------|--------|
| Subscribr | Script writing, keyword research, channel strategy | In stack — not configured |
| HeyGen | Avatar video generation | Free account exists — needs upgrade |
| ElevenLabs | Voice clone | In stack — not configured for HeyGen |
| Descript | Editing, captions, overdub | In stack |
| Opus Clip | Short-form clipping | In stack |
| vidIQ | YouTube SEO optimization | In stack |
| YouTube Studio | Publishing, analytics | Account exists |
| CapCut | Short-form polish | In stack |

---

## 9. Podcast

### Status: ⏳ Phase 2 — Not yet built

### What It Is

An audio (and video) podcast targeting Corporate Refugees — W2 executives exploring what comes next. Positions Kelsey as the go-to voice for franchise advisory in a long-form, trust-building format.

**Format options:**
- **Solo:** Kelsey talks through a single topic (franchise process, common mistakes, industry deep dives)
- **Interview:** Kelsey interviews franchise owners, franchisors, financial advisors relevant to buyers
- **HeyGen-hosted:** AI avatar hosts with Kelsey's voice for high-volume production without recording fatigue

### Production Stack

```
1. Episode concept + outline (Claude/ChatGPT based on content calendar)
2. Recording: Kelsey records audio via Plaud.ai or OBS
   OR HeyGen avatar hosts → video podcast character (async production)
3. Plaud.ai / Whisper Flow → full transcript
4. Descript → edit audio/video, remove filler, add chapters, generate transcript doc
5. NotebookLM → ingest transcript for secondary content (related article seeds, Q&A extraction)
6. Opus Clip → clips best moments into shorts
7. Distribution:
   - Audio: Spotify, Apple Podcasts (via RSS)
   - Video: YouTube (full episode)
   - Shorts: YouTube Shorts, Instagram, TikTok
8. Newsletter: Each episode → beehiiv issue with episode summary + key takeaways
```

### Buildout Steps

- [ ] Decide on format: solo / interview / AI-hosted (or combination)
- [ ] Choose podcast name (separate from "Waypoint" brand or tied to it?)
- [ ] Create Spotify for Podcasters account + Apple Podcasts Connect account
- [ ] Set up RSS feed (Spotify for Podcasters hosts OR self-hosted via website)
- [ ] Design podcast cover art (Canva/Lovart — must meet Apple 3000×3000 px spec)
- [ ] Record first 3 episodes before launch (never launch with 1 episode only)
- [ ] Set up Descript workspace for podcast editing workflow
- [ ] Build episode → article pipeline: transcript → content seed for new article
- [ ] Add podcast page to website (`/podcast`)
- [ ] Add podcast to `sitemap.ts` + cross-link from `/resources` and `/about`
- [ ] Establish publishing cadence: weekly or biweekly — document in `content/CONTENT-CALENDAR.md`

---

## 10. AI Avatar Video (HeyGen)

### Status: ⏳ Phase 2 — Account exists, upgrade needed

### What It Is

HeyGen allows Kelsey to train a photorealistic AI avatar from a single 2–5 minute recording session. Once trained, the avatar can deliver any typed script as a natural talking-head video — unlimited, on demand, via API.

**Account:** Free account exists. Upgrade to Team ($89/mo) required for API access and custom avatar production.

### Use Cases

| Use Case | Phase | Channel |
|----------|-------|---------|
| YouTube content (weekly talking-head videos) | Phase 2 | YouTube |
| Podcast video character (solo host) | Phase 2 | YouTube / Podcast |
| Website explainer videos (process, scorecard walkthrough) | Phase 2 | waypointfranchise.com |
| Personalized 1:1 video outreach (one per lead) | Phase 3 | Cold email follow-up |

### Setup Sequence

1. **Record avatar training video** — 2–5 minutes, plain background, good lighting, natural delivery, multiple expressions, varied pacing
2. **Upload to HeyGen** → trigger avatar training (takes ~24 hours)
3. **Set up ElevenLabs voice clone** — record 3 min of clean audio in Kelsey's natural voice → train clone
4. **Connect ElevenLabs to HeyGen** — select Kelsey's voice clone as the audio source for avatar videos
5. **Upgrade to Team plan ($89/mo)** — unlocks API access and custom avatar
6. **Add `HEYGEN_API_KEY` to Vercel env vars + `.env`**
7. **Build n8n workflow:** Script text → HeyGen API → video render → download → route to YouTube/storage

### Pricing

| Plan | Monthly | API | Custom Avatar | Credits |
|------|---------|-----|---------------|---------|
| Creator | $29 | ❌ | 1 | 5 |
| Team | $89 | ✅ | Unlimited | More |

**Decision:** Team plan is the minimum for production use. Creator can be used for quality testing before committing.

### Integration Points

- **Subscribr** → writes YouTube scripts → fed into HeyGen as script input
- **ElevenLabs** → voice clone → connected to HeyGen for audio output
- **Opus Clip** → receives HeyGen video output → auto-clips into shorts
- **n8n** → orchestrates Script → HeyGen API → Video → YouTube/Typefully pipeline
- **Descript** → optional final polish if captions or overdub needed

---

## 11. Social Media Distribution

### Status: ⏳ Partially live — content drafted, not consistently posting

### Platforms

| Platform | Format | Tool | Status |
|----------|--------|------|--------|
| LinkedIn (personal) | Long-form posts, carousels, article shares | Typefully | Framework defined |
| LinkedIn Newsletter | Long-form newsletter (parallel to beehiiv) | LinkedIn native | Not launched |
| Twitter / X | Threads, short posts, article snippets | Typefully | Framework defined |
| YouTube Shorts | Short video clips | Opus Clip → CapCut | Not started |
| Instagram Reels | Short video clips | Opus Clip → CapCut | Not started |
| TikTok | Short video clips | Opus Clip → CapCut | Not started |

### Content Production Flow

Every article, YouTube video, and podcast episode produces social content as a byproduct:

```
New Article published
  └── Twitter/X thread (5–8 tweets, key insights)
  └── LinkedIn post (narrative angle, 150–300 words)

New YouTube video published
  └── Opus Clip → 3–5 shorts
  └── Shorts posted: YouTube Shorts + Instagram Reels + TikTok
  └── LinkedIn post: "New video: [title]" + key insight

New Podcast episode published
  └── Opus Clip → 2–3 audio/video clips
  └── Twitter thread: episode highlights
  └── LinkedIn post: episode summary + quote
  └── beehiiv issue: episode deep dive for subscribers
```

### Buildout Steps

- [ ] Draft social media cadence document in `content/CONTENT-CALENDAR.md` (currently placeholder)
- [ ] Set up Typefully — connect LinkedIn + Twitter/X, enable scheduling
- [ ] Establish posting cadence: LinkedIn 4–5x/week, Twitter/X 3–5x/week
- [ ] Set up Opus Clip — connect YouTube channel for automatic short-form generation
- [ ] Create evergreen re-promotion schedule (republish top-performing articles on social 30/60/90 days after publish)
- [ ] Activate LinkedIn Newsletter as a parallel distribution channel to beehiiv
- [ ] Configure Typefully — schedule social posts to go live within 48 hours of a new article publishing

---

## 12. Personalized Video Outreach

### Status: 🔲 Phase 3 — Not yet scoped

### What It Is

1:1 AI-generated personalized video for each cold outreach lead. At scale: 440+ prospects/month each receives a short, individualized video featuring Kelsey's avatar speaking to them specifically — name, company, career situation, and franchise angle — before or after the initial cold email.

### Options Evaluated

| Tool | Mechanic | Fit | Cost |
|------|---------|-----|------|
| **HeyGen** (custom API) | Full avatar per lead, ElevenLabs voice, personalized script | Best quality, highest effort | $89+/mo + credits |
| **RepliQ** | One video → CSV → auto-generates personalized GIF thumbnails with prospect's website in background | Medium quality, easiest workflow | AppSumo LTD $49–399 one-time |
| **SendPotion** | AI face + voice clone, highest personalization | Premium tier, pricier | Custom |
| **Sendspark** | Better CRM integrations (HubSpot/Salesforce) | Best for scaled ops | $39/mo |

**Decision:** Deferred to Phase 3 (after cold email matures and first bookings are confirmed). RepliQ is not compatible with Instantly — would only work for LinkedIn DM outreach. HeyGen via API is the long-term play.

**Trigger to build:** HeyGen avatar is trained and tested for YouTube → extend to personalized video outreach once avatar quality is confirmed.

---

## 13. Community — Horizon 2 (Skool)

### Status: 🔲 Horizon 2 — Not yet planned in detail

### What It Is

A paid or free community for franchise-curious corporate professionals — a place where they can learn, ask questions, connect with others in exploration, and engage with Kelsey on an ongoing basis without yet being ready for a 1:1 consultation.

**Platform:** Skool (chosen for course + community combination, clean UX, creator monetization)

### Why This Matters

The newsletter captures "not now" leads. The community *deepens* the relationship. A community member who spends 6 months engaging with Kelsey's content, asking questions, and seeing other members make moves is far more likely to book a consultation than a passive newsletter subscriber.

**Monetization angle:** A paid community tier creates recurring revenue independent of consultation bookings — important for business stability as advisory scales.

### Content Inside the Community

- Weekly franchise insight post (can mirror newsletter)
- Monthly "office hours" — Kelsey answers member questions live (recorded → clips → YouTube/podcast)
- Franchise brand spotlights — curated, Kelsey-reviewed (becomes a deal sourcing pipeline)
- Peer member discussions — franchise explorers helping each other
- Exclusive early access to checklists, tools, scorecards not on the public site

### Buildout Steps (when ready)

- [ ] Define membership model: free vs. paid ($X/month or one-time)
- [ ] Create Skool community — name, description, branding
- [ ] Build onboarding sequence for new members
- [ ] Establish weekly content rhythm inside the community
- [ ] Add "Join the Community" CTA to website (header, about page, resources)
- [ ] Wire beehiiv: top subscribers get community invite as upgrade path
- [ ] Wire scorecard: high-score (70+) results offer community membership as next step

---

## 14. Full Tool Stack Reference

### Outreach & CRM

| Tool | Role | Status |
|------|------|--------|
| LinkedIn Sales Navigator | Prospecting, ICP filtering | ✅ Active |
| Evaboot | Lead export + server-verified email extraction | ✅ Active |
| Clay | Lead enrichment fallback (post, news, tenure) | ✅ Active ($185/mo Launch) |
| Instantly | Cold email sending + inbox warmup | ✅ Active (Growth plan) |
| Resend | Transactional email (HITL alerts, nurture) | ✅ Active |
| TidyCal | Consultation booking | ✅ Active ($29 lifetime) |
| Neon PostgreSQL | CRM database (via Prisma) | ✅ Active |
| Inngest | Background job orchestration | ✅ Active |
| Slack | HITL push notifications | ✅ Active |
| n8n | Workflow automation (future content pipeline) | In stack — not yet used for content |

### Website & Content

| Tool | Role | Status |
|------|------|--------|
| Vercel | Hosting + auto-deploy | ✅ Active |
| Cloudflare | DNS + CDN | ✅ Active |
| GitHub | Version control | ✅ Active |
| GA4 | Analytics | ✅ Active |
| Next.js (App Router) | Web framework | ✅ Active |
| Prisma | ORM | ✅ Active |
| OpenAI GPT-4o | Email personalization + reply classification + content refresh | ✅ Active |

### Newsletter & Social

| Tool | Role | Status |
|------|------|--------|
| beehiiv | Newsletter platform | Account active — not yet publishing |
| Typefully | LinkedIn + Twitter scheduling | In stack — not yet consistently used |

### Video & Audio

| Tool | Role | Status |
|------|------|--------|
| HeyGen | AI avatar video generation | Free account — needs upgrade |
| ElevenLabs | Voice cloning + TTS | In stack — not yet configured |
| Subscribr | YouTube script writing + keyword research | In stack — not yet configured |
| Opus Clip | Short-form clipping from long-form | In stack — not yet configured |
| Descript | Video/audio editing + transcription | In stack |
| vidIQ | YouTube SEO + analytics | In stack |
| YouTube Studio | YouTube channel management | Account exists |
| OBS | Screen recording + live streaming | In stack |
| CapCut | Short-form video editing | In stack |
| Remotion | Code-based video (future: dynamic video reports) | In stack |
| Higgsfield | AI cinematic video generation | In stack |
| Lovart | AI creative/design | In stack |
| Replicate | Open-source AI model hosting | In stack |
| Canva | Graphic design | In stack |

### Research & AI

| Tool | Role | Status |
|------|------|--------|
| ChatGPT | Content creation, research | ✅ Active |
| Claude | Long-form writing, analysis | ✅ Active |
| Perplexity | AI research + web synthesis | ✅ Active |
| NotebookLM | Long-doc synthesis, research | ✅ Active |
| Gemini | Google AI, multimodal | ✅ Active |
| Antigravity | AI coding agent (Waypoint codebase) | ✅ Active |

### Meetings & Calls

| Tool | Role | Status |
|------|------|--------|
| Plaud.ai | AI voice recording for meetings | In stack |
| Whisper Flow | Real-time transcription | In stack |
| Zoom | Client discovery calls | ✅ Active |
| Google Meet | Internal calls | ✅ Active |

### Community & Monetization (Future)

| Tool | Role | Status |
|------|------|--------|
| Skool | Community platform | Not started |
| Go High Level | All-in-one fallback (if custom CRM cannot scale) | Contingency only |

---

## 15. Phase Tracker

### Phase 1 — Direct Outreach & Website Foundation

| Item | Status | Notes |
|------|--------|-------|
| Cold email pipeline (end-to-end) | ✅ Complete | Clay → scoring → GPT-4o → Instantly → reply → HITL |
| Admin dashboard | ✅ Complete | `/admin`, `/admin/leads`, `/admin/leads/[id]`, `/admin/linkedin` |
| Checklist lead magnet + 5-email nurture | ✅ Complete | Email capture → HTML delivery → Resend sequence |
| Scorecard + 3-email nurture | ✅ Complete | 4 score bands → personalized CTA → Resend sequence |
| Website (all pages) | ✅ Complete | 15+ marketing pages live |
| Technical SEO (images, schema, OG, links) | ✅ Complete | All Sprint 3 items done |
| Sitemap + robots.txt + llms.txt | ✅ Complete | — |
| Franchise map (146 cities, Google Sheet) | ✅ Complete | ISR cached, updates hourly |
| Content library (34+ articles) | 🟡 Ongoing | ~40 remaining in queue |
| FAQ copy fix | ⚠️ Pending | First FAQ answer needs "intro call" framing |
| beehiiv newsletter subscribe on articles | ✅ Complete | Subscribe form on all 34+ article pages |
| LinkedIn DM queue + ghost recovery | ✅ Complete | `/admin/linkedin` + Slack alerts |

### Phase 2 — Inbound Authority Engine

| Item | Status | Notes |
|------|--------|-------|
| beehiiv newsletter (first issue + system wiring) | 🔲 Not started | Needs paid plan and Inngest wiring |
| LinkedIn Newsletter | 🔲 Not started | Parallel to beehiiv |
| HeyGen avatar training | 🔲 Not started | Record 2–5 min training video |
| ElevenLabs voice clone | 🔲 Not started | Record 3 min clean audio |
| YouTube channel creation | 🔲 Not started | Handle, art, links, SEO |
| Subscribr configuration | 🔲 Not started | Keyword research, script briefs |
| First 5 YouTube videos | 🔲 Not started | Full stack: Subscribr → HeyGen → YouTube |
| Opus Clip configuration | 🔲 Not started | Auto-clips from YouTube |
| vidIQ configuration | 🔲 Not started | Channel SEO tracking |
| Podcast launch (3 episodes) | 🔲 Not started | Format decision first |
| Typefully — consistent schedule | 🔲 Not started | LinkedIn + Twitter cadence |
| Social media cadence document | 🔲 Not started | Add to `content/CONTENT-CALENDAR.md` |
| n8n workflow: Script → HeyGen → YouTube | 🔲 Not started | Automation pipeline |
| beehiiv "not now" rescue wiring | 🔲 Not started | `replyGuardianProcess` integration |
| Cold email follow-up steps (Step 2, 3) | 🔲 Not started | Activate after 4+ weeks clean metrics |
| Daily cap raise (25 → 50+) | 🔲 Not started | After deliverability data confirmed |

### Phase 3 — Personalization at Scale

| Item | Status | Notes |
|------|--------|-------|
| Personalized 1:1 video per lead (HeyGen API) | 🔲 Not started | Requires Phase 2 HeyGen avatar |
| RepliQ/Sendspark for LinkedIn DM video | 🔲 Not started | After first bookings confirmed |
| Social comment lead mining (WARN Act Twitter) | 🔲 Not started | n8n or Clay workflow |
| GlockApps inbox placement testing | 🔲 Not started | Trigger: sends > 50/day |

### Horizon 2 — Community & Scale

| Item | Status | Notes |
|------|--------|-------|
| Skool community setup | 🔲 Not started | Free or paid model decision |
| Podcast → community office hours loop | 🔲 Not started | Requires podcast launch |
| beehiiv → Skool upgrade path | 🔲 Not started | Requires both platforms active |

---

## 16. Horizon Map

```
TODAY — H1                    MONTH 3–6 — H2               MONTH 9–12 — H3
──────────────────────────   ──────────────────────────    ──────────────────────────
Cold email pipeline ✅        YouTube channel               Personalized 1:1 video
Website + articles ✅         Podcast                       outreach via HeyGen API
Checklist lead magnet ✅      HeyGen avatar                 
Scorecard + nurture ✅        ElevenLabs voice clone        HORIZON 2
LinkedIn DM queue ✅          beehiiv newsletter live       ──────────────────────────
                              "Not now" rescue wiring       Skool community
CONTENT ONGOING               LinkedIn newsletter            Paid tier / office hours
──────────────────────────   Social media cadence          beehiiv → community upgrade
34 articles live              Typefully consistent          Referral affiliate program
~40 remaining in queue        n8n content automation        Franchise brand partnerships
3 per week, phase order
                              METRICS TARGET
                              ──────────────────────────
                              50+ YouTube subscribers
                              100+ newsletter subscribers
                              2–3 bookings/month inbound
```

---

## Guiding Principles

1. **Kelsey's voice is non-negotiable across every channel.** Cold email, YouTube script, podcast narration, newsletter, social post — all of it must sound like Kelsey wrote it by hand. Direct, honest, first-person, never salesy. "I'll tell you if this isn't right for you" energy. See `docs/VOICE_GUIDE.md`.

2. **H1 funds H2.** Do not build YouTube or podcast infrastructure before cold email is generating bookings. The pipeline is the revenue engine. Content is the compounding asset. Get one deal closed first.

3. **Staged publishing beats bulk drops.** This applies to articles, YouTube videos, and podcast episodes alike. Google and YouTube both reward consistent signals over time. A 52-video YouTube library published over a year outperforms 52 videos published in a week.

4. **The avatar is Kelsey, not a replacement for Kelsey.** HeyGen + ElevenLabs produces high-quality content, but Kelsey's judgment, voice tonality, and presence should be preserved in every piece. AI generates the volume; Kelsey provides the brand.

5. **Every channel should funnel to the same outcome: a booking.** Newsletter links → `/book`. YouTube description → `/book`. Podcast show notes → `/book`. LinkedIn posts → `/book` or `/scorecard`. The entire engine exists to move people toward a conversation with Kelsey.

6. **Document everything an agent needs to operate independently.** This document, `ROADMAP.md`, `COLD_EMAIL_STACK.md`, `VOICE_GUIDE.md`, `CONTENT-CALENDAR.md`, and `.agents/workflows/` are the complete context an AI agent needs to build, maintain, and extend this system without a handoff call.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [`ROADMAP.md`](ROADMAP.md) | Website sprints — what's been built and what's remaining for the web app |
| [`TECH_STACK.md`](TECH_STACK.md) | Full tool list across all business operations |
| [`docs/COLD_EMAIL_STACK.md`](docs/COLD_EMAIL_STACK.md) | Cold email pipeline detail — tools, code, compliance, env vars |
| [`docs/NEWSLETTER_BUILD.md`](docs/NEWSLETTER_BUILD.md) | beehiiv newsletter strategy and MCP integration |
| [`docs/VOICE_GUIDE.md`](docs/VOICE_GUIDE.md) | Email and content voice rules. Prohibited phrases. |
| [`content/CONTENT-CALENDAR.md`](content/CONTENT-CALENDAR.md) | Article publishing cadence, queue, phase tracker |
| [`content/CONTENT-STANDARDS.md`](content/CONTENT-STANDARDS.md) | Quality rules every article must pass |
| [`.agents/workflows/new-article.md`](.agents/workflows/new-article.md) | Full 9-step article creation workflow |
| [`.agents/workflows/publish-articles.md`](.agents/workflows/publish-articles.md) | Article publishing session workflow |
| [`.agents/workflows/seo-review.md`](.agents/workflows/seo-review.md) | Monthly SEO health check |
