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
- **Email/Webhooks:** Inngest functions for inbound webhooks
- **Hosting:** Vercel (assumed, GitHub-connected)
- **Repo:** `github.com/Franscale1922/waypoint-core-system`

### Pages Live
| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ Live | Homepage — hero, process steps, "Let's Be Honest" section, CTA |
| `/about` | ✅ Live | Kelsey bio, hero bg image, campfire photo, valley photo |
| `/process` | ✅ Live | 5-step process, intro call framing, statistics bar, map image |
| `/faq` | ✅ Live | Accordion FAQ, no schema markup yet |
| `/book` | ✅ Live | TidyCal embed, trust bullets |
| `/scorecard` | ✅ Live | 5-question quiz, name+email capture before results, GA4 events |
| `/blog` | ⚠️ Shell | Hero and layout exist, `posts[]` array is empty, no CMS wired |
| `/privacy` | ✅ Live | — |
| `/terms` | ✅ Live | — |

### Recent Work Completed (March 2026)
- Full mobile audit (390px, 430px, 768px) — no critical layout bugs
- Image compression: 14 PNGs → JPEGs (~95MB → ~12MB combined), code references updated
- Process hero: background position fixed (`center 65%`) to show mountains not sky
- About hero: `backgroundPosition: 'center 35%'` added to show Kelsey's face on mobile
- Process page: Step 01 renamed "The Intro Call" ("Thirty minutes to see if this makes sense") to reduce perceived commitment before booking
- FAQ copy note: still references "two-hour discovery" as first step — needs update (see Sprint 1 below)

---

## Decision Log

### Blog vs. Resources Page
**Decision: Rename `/blog` → `/resources`**

**Rationale:**
- Waypoint will publish articles, guides, checklists, and candidate-facing tools — not just blog posts
- `/resources` frames content as utility, not opinion, which matches Kelsey's voice
- No SEO disadvantage: Google ranks individual page slugs, not parent URL names
- "Resources" does not imply a posting cadence, which removes pressure on a one-person operation
- A single hub (`/resources`) is better than splitting `/blog` + `/resources` at this traffic volume — consolidates page authority

**What this means in code:**
1. Rename `src/app/(marketing)/blog/` → `src/app/(marketing)/resources/`
2. Update metadata: canonical URL, OG URL, title, description in `resources/page.tsx`
3. Update hero section label from "Franchise Insights" to "Franchise Resources"
4. Add 301 redirect in `next.config.js`:
   ```js
   async redirects() {
     return [{ source: '/blog/:path*', destination: '/resources/:path*', permanent: true }]
   }
   ```
5. Add "Resources" to: desktop nav, mobile nav, footer NAVIGATE column
6. Update any internal links pointing to `/blog`

---

## Optimization Roadmap

Items ordered by **impact × effort ratio** (highest first within each sprint).

---

### Sprint 1 — Quick Wins (1–3 hours total, high impact)

#### 1.1 Fix FAQ Discovery Call Copy
**File:** `src/app/(marketing)/faq/page.tsx`
**Issue:** First FAQ answer still says "We schedule a two-hour discovery conversation" — contradicts the new intro call framing on `/process` page.
**Fix:** Update to: *"We start with a short intro call — usually 20 to 30 minutes — to understand where you are in the process and whether going deeper makes sense. If it does, we schedule the two-hour discovery conversation from there."*

#### 1.2 Add `Resources` Link to Navigation
**File:** `src/app/(marketing)/layout.tsx`
**Issue:** `/blog` (soon `/resources`) is not in the desktop nav, mobile nav, or footer.
**Fix:** Add "Resources" link between FAQ and Quiz in desktop nav. Mirror in mobile menu and footer NAVIGATE column.

#### 1.3 Add `loading` Attributes to Images
**Files:** `page.tsx`, `about/page.tsx`, `process/page.tsx`
**Issue:** All `<img>` tags have no `loading` attribute — browser fetches all images at first paint.
**Fix:** Add `loading="eager"` to first visible hero image, `loading="lazy"` to all below-fold images.

---

### Sprint 2 — High Impact (4–8 hours, highest conversion value)

#### 2.1 Testimonials Section — Homepage
**File:** `src/app/(marketing)/page.tsx`
**Location:** Line ~273 — currently a comment placeholder: `TESTIMONIALS — social proof after process steps`
**Issue:** Zero social proof on the site. For a high-ticket, long-cycle service this is the #1 trust gap.
**Design spec:**
- 2–3 short quotes in a dark (`#0c1929`) section
- Each card: short 1–2 sentence quote, name/attribution (e.g., "Former teacher, Kansas City"), optional photo or initials avatar
- Style consistent with the dark quote divider already on `/process`
- **Source:** Kelsey provides real quotes from candidates/clients

#### 2.2 Rename /blog → /resources + 301 Redirect
**See full steps in Decision Log above.**
**Affected files:** `blog/page.tsx`, `layout.tsx` (nav + footer), `next.config.js`, any pages with `/blog` hrefs.

#### 2.3 Wire Resources Page to Content
**File:** `src/app/(marketing)/resources/page.tsx` (after rename)
**Issue:** `posts[]` array is empty — content exists (Tier 1, 2, 3 articles drafted in repo) but not published to the page.
**Options:**
- **Option A — Static array (fastest):** Manually populate `posts[]` with article metadata (slug, title, date, category, excerpt). Store articles as MDX in `/content/articles/`.
- **Option B — MDX auto-import (recommended):** Use `contentlayer` or `next-mdx-remote` to auto-read all `.mdx` files from `/content/articles/`. Frontmatter drives the index. No manual array maintenance.
- **Decision needed:** Confirm content authoring workflow — markdown files in repo (simplest, stays in GitHub) vs. headless CMS.

#### 2.4 Scorecard Results → Personalized Book CTA
**File:** `src/app/(marketing)/scorecard/ScorecardClient.tsx`
**Current:** Score is shown with a generic "Book a Free Call" button.
**Improvement:** Make the CTA score-aware:
- 80–100: "You look like a strong candidate — let's talk." → Book button
- 60–79: "Promising fit — a few things worth discussing." → Book button
- 40–59: "Worth exploring, with some questions to work through." → Book button
- <40: "Honest answer: right now may not be the right time. Here's why." → Resource links instead of booking push

---

### Sprint 3 — Performance & Technical SEO (4–8 hours)

#### 3.1 Migrate `<img>` Tags to Next.js `<Image>` Component
**Files:** `page.tsx`, `about/page.tsx`, `process/page.tsx`, `resources/page.tsx`
**Why:** Automatic WebP conversion, responsive srcsets, LCP optimization, blur-up placeholders — no visual changes.
**Note:** CSS background images (`div` with `style.backgroundImage`) cannot use `<Image>` — those stay as-is.
**Expected improvement:** Current JPEGs are 600KB–1.4MB. WebP auto-conversion brings these to ~200–400KB.

#### 3.2 FAQ Schema Markup (JSON-LD)
**File:** `src/app/(marketing)/faq/page.tsx`
**Issue:** No structured data — missing opportunity for FAQ rich results in Google SERP.
**Fix:** Add `FAQPage` JSON-LD schema block adjacent to existing `HowTo` schema pattern (already used on `/process`).
**Template:**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "How do I get started?",
    "acceptedAnswer": { "@type": "Answer", "text": "..." }
  }]
}
```

#### 3.3 Page-Specific Open Graph Images
**Current:** All pages share one OG image (`og_default_1773343895292.png`).
**Fix:** Generate unique 1200×630px OG images for: `/about`, `/process`, `/faq`, `/scorecard`, `/resources`.
**Approach:** Text overlay on relevant photo. Save to `/public/og/[page].jpg`. Update each page's `metadata.openGraph.images`.

#### 3.4 Sitemap + robots.txt
**Current:** No `sitemap.xml` or `robots.txt` in public directory.
**Fix:**
- Add `src/app/sitemap.ts` (Next.js 14 native) — auto-generates from all marketing routes
- Add `src/app/robots.ts` — allow all crawlers, point to sitemap

#### 3.5 Internal Linking
**Current:** Pages are siloed — FAQ doesn't link to Process, Process doesn't link to Resources, etc.
**Priority links to add:**
- FAQ answers referencing "the process" → link to `/process`
- `/process` Step 4 (Validation Calls) → mention + link to relevant resource articles
- `/about` → link to `/process` and `/scorecard`
- Homepage "The Process" section → "See exactly how this works →" → `/process`
- `/scorecard` results page → link to relevant resources based on score band

---

### Sprint 4 — Content & Growth (Ongoing)

#### 4.1 Publish Articles to /resources
**Status:** Tier 1, 2, 3 articles all drafted and in repo. ~40 additional articles in queue.
**Blocked on:** Sprint 2.3 content delivery decision.
**Publishing priority:** See `content/CONTENT-CALENDAR.md` for the full phased rollout plan, cadence rules (3/week), and internal linking sequencing. Do not publish out of phase order or in bulk.

#### 4.2 Email Nurture Sequence (Post-Scorecard)
**Trigger:** Scorecard completion → name + email sent to `/api/scorecard-complete`
**Inngest function:** Already exists — confirm what it does on receipt.
**Proposed 3-email sequence:**
1. **Day 0:** "Your results + what they actually mean" — score recap, personalized interpretation
2. **Day 3:** "The question I ask everyone on the first call" — warm toward booking
3. **Day 7:** "Still thinking? Here's the honest answer." — re-engagement for non-bookers

#### 4.3 Referral / Network Page (Deferred)
**Concept:** A page for professionals (CPAs, attorneys, financial planners) who refer clients to Kelsey.
**Status:** In original blueprint, deferred to Phase 2.

---

## Go-Live Checklist

Run through all of these before pointing a domain at production. This list is written host-agnostically — it applies to Vercel, Netlify, Railway, or any other provider.

### Hosting & Build

- [ ] **Connect GitHub repo to host.** Authorize the host to access `github.com/Franscale1922/waypoint-core-system`.
- [ ] **Set build command:** `prisma generate && prisma db push --accept-data-loss && next build`
- [ ] **Set output directory:** `.next` (Next.js default — most hosts detect this automatically)
- [ ] **⚠️ Enable auto-deploy on push to `main`.** This is required for the automated content refresh system. Every time the content refresh Inngest function rewrites articles, it commits them to GitHub. Your host must detect that push and rebuild — otherwise the refreshed articles never appear on the live site. On Vercel: Settings → Git → Production Branch = `main`, auto-deploy enabled. On Netlify: Site Settings → Build & Deploy → Auto publishing = on.

### Environment Variables

Copy all of the following from `.env` into your host's environment variable settings. **None of these are in the deployed code — they must be set in the host dashboard.**

| Variable | Where to get it |
|---|---|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
| `DATABASE_URL` | Your production DB connection string (not the local `file:./dev.db`) |
| `AUTH_SECRET` | Copy from `.env` — already set |
| `AUTH_GOOGLE_ID` | Google Cloud Console → OAuth credentials |
| `AUTH_GOOGLE_SECRET` | Google Cloud Console → OAuth credentials |
| `GITHUB_TOKEN` | Create at [github.com/settings/tokens](https://github.com/settings/tokens) — Fine-grained, Contents: Read and Write on this repo |
| `GITHUB_REPO_OWNER` | `Franscale1922` |
| `GITHUB_REPO_NAME` | `waypoint-core-system` |
| `GITHUB_BRANCH` | `main` |
| `TIDYCAL_WEBHOOK_SECRET` | TidyCal dashboard → Webhooks → signing secret |
| `RESEND_WEBHOOK_SECRET` | Resend dashboard → Webhooks → signing secret |

### Inngest (Production)

- [ ] Create a production Inngest app at [app.inngest.com](https://app.inngest.com)
- [ ] Add the production Inngest signing key (`INNGEST_SIGNING_KEY`) and event key (`INNGEST_EVENT_KEY`) to your host environment variables
- [ ] Set the Inngest webhook URL in the Inngest dashboard to: `https://yourdomain.com/api/inngest`
- [ ] Verify the `content-refresh` cron function appears active in the Inngest dashboard

### Domain & DNS

- [ ] Point domain DNS to host nameservers or add A/CNAME records as instructed
- [ ] Confirm SSL certificate issues automatically (all major hosts do this)
- [ ] Update `AUTH_GOOGLE_ID` OAuth redirect URI in Google Cloud Console to include the production domain

### Post-Deploy Smoke Test

- [ ] `/` loads — hero, sections, CTA visible
- [ ] `/book` — TidyCal calendar loads
- [ ] `/scorecard` — quiz completes and shows results
- [ ] `/resources/[slug]` — one article loads correctly with "Keep Reading" section
- [ ] `/api/inngest` returns 200 (Inngest health check)
- [ ] Admin panel at `/admin` redirects to Google login and then loads dashboard

---

## Guiding Principles for Future Agents


1. **Write access restriction:** The agent sandbox cannot write directly to `/Desktop/`. Provide all file edits as `python3 << 'EOF' ... EOF` heredoc commands for Kelsey to paste into Terminal.

2. **Kelsey's voice:** Direct, honest, first-person, never salesy. Short sentences. "I'll tell you if this isn't right for you" energy.

3. **Design system:**
   - Navy: `#0c1929`
   - Gold: `#d4a55a`
   - Cream: `#FAF8F4`
   - Body text: `#3a3a2e` / `#4a4a4a`
   - Fonts: Playfair Display (headings), system sans (body)

4. **Image rules:** Hero images as CSS `background-image` with explicit `backgroundPosition`. Section images as `<img>` with `object-cover` and `objectPosition`. Migrate to `next/image` in Sprint 3.

5. **Git commit pattern:** `git add -A && git commit -m "type: short description" && git push`. Types: `feat`, `fix`, `perf`, `content`, `refactor`.

6. **Dev server:** `npm run dev` from `/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system/`

7. **Repo:** `github.com/Franscale1922/waypoint-core-system`
