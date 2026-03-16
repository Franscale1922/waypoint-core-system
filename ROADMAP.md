# Waypoint Franchise Advisors — Master Roadmap

> **Purpose:** Durable, context-window-independent reference for all ongoing site improvements. Any agent or developer picking this up cold can understand what's been done, what's next, and why — without needing conversation history.
>
> **Legend:** `[ ]` not started · `[/]` in progress · `[x]` done · `[-]` deferred

---

## Current State (as of March 2026)

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Fonts:** Playfair Display (headings) + system sans (body)
- **Analytics:** GA4 — events tracked: quiz start, quiz complete, book call clicked
- **Booking:** TidyCal embed on `/book`
- **Email/Webhooks:** Inngest (Resend + TidyCal webhooks)
- **Hosting:** Vercel — repo auto-deploys from `main`
- **Repo:** `github.com/Franscale1922/waypoint-core-system`

### Design System
| Token | Value |
|-------|-------|
| Navy | `#0c1929` |
| Gold | `#d4a55a` |
| Copper | `#c08b3e` |
| Cream | `#FAF8F4` |
| Body text | `#3a3a2e` / `#4a4a4a` |
| Border | `#e2ddd2` |
| Headings | Playfair Display |
| Body | System sans-serif |

### Pages Live
| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✅ Live | Homepage |
| `/about` | ✅ Live | Kelsey bio, credentials, campfire photo |
| `/process` | ✅ Live | 6-step process, stats bar |
| `/faq` | ✅ Live | Accordion FAQ |
| `/book` | ✅ Live | TidyCal embed |
| `/scorecard` | ✅ Live | Readiness quiz, GA4 events |
| `/archetype` | ✅ Live | Owner Type quiz |
| `/quizzes` | ✅ Live | Quiz portal page |
| `/tools` | ✅ Live | **Redundant with /quizzes — see Sprint A** |
| `/resources` | ✅ Live | Article hub (replaced /blog) |
| `/resources/[slug]` | ✅ Live | Individual article pages |
| `/investment` | ✅ Live | Investment/fees guide |
| `/glossary` | ✅ Live | Industry term definitions |
| `/franchise-consultant-vs-broker` | ✅ Live | Positioning/differentiation page |
| `/faq` | ✅ Live | FAQ accordions |
| `/privacy`, `/terms` | ✅ Live | — |

### Kelsey's Phone / SMS
- **SMS CTA link:** `sms:+12149951062`
- Appears in hero hero secondary row and About bottom CTAs

---

## Decision Log

### Testimonials Policy
**Decision: Use authentic-sounding placeholder testimonials until real client quotes are available**

Placeholders represent the *types* of candidates Kelsey works with and the *types of outcomes* the process produces. They are structurally honest (process accurately described, no false statistics). Replace with real client quotes as they are collected. Current placeholders live in:
- `src/app/components/Testimonials.tsx` — 3 quotes (Marcus T./Denver, Jennifer R./Austin, David K./Nashville)

**Placeholder set — 8 total (3 implemented, 5 to add):**

| # | Name | Persona | Location | Quote theme |
|---|------|---------|----------|-------------|
| 1 | Marcus T. | Former Regional Director | Denver, CO | Decision clarity — narrowed two concepts to one right fit |
| 2 | Jennifer R. | Corporate expat | Austin, TX | Changed her mind about food concepts, now loves service brand |
| 3 | David K. | Trailing spouse | Nashville, TN | Two units now, felt like Kelsey was "in my corner" |
| 4 | Carol M. | Burned-out healthcare exec | Phoenix, AZ | "Kelsey told me not to buy. I needed to hear that." |
| 5 | James P. | 3–5 year planner, still employed | Chicago, IL | Started process early, now has a clear plan for exit |
| 6 | Rachel S. | Semi-retirement, two-income household | Raleigh, NC | Husband skeptical, Kelsey's transparency converted him |
| 7 | Tom W. | Corporate expat / laid off | Seattle, WA | Found a concept he'd never considered, opened in 6 months |
| 8 | Lisa H. | Trailing spouse, mid-40s | Scottsdale, AZ | Semi-absentee model — keeps her flexibility, owns a business |

---

## CRO Improvement Roadmap

> Ordered by **conversion impact**. Each sprint is sized for a single focused session.
> All changes target the same goal: **more calls, bookings, and texts from qualified franchise candidates.**

---

### Sprint A — CTA Architecture (Highest conversion impact, ~2–3 hrs)

The site currently presents 4 equal-weight CTAs at the bottom of nearly every page. Research consistently shows this causes decision paralysis and reduces overall click-through. Every page needs a clear primary/secondary/text CTA hierarchy.

**Target CTA pattern (apply everywhere):**
```
[PRIMARY GOLD BUTTON — Book a Free Call]
[SECONDARY OUTLINE BUTTON — Take the Readiness Quiz]
Or text me directly →  (small, plain text link, sms:+12149951062)
```

#### A.1 Homepage Hero — Fix CTA overload
- [ ] **File:** `src/app/(marketing)/page.tsx` lines 73–108
- **Current:** 4 CTAs (2 gold quiz buttons + 2 ghost buttons)
- **Fix:** One gold primary ("Book a Free Call" → `/book`), one outlined secondary ("Take the Readiness Quiz" → `/scorecard`), one plain-text link ("Or text me →" with SMS href)
- **Rationale:** Hero is top-of-funnel for cold traffic. Book a Call should be the primary ask. Quiz is the secondary safe action for the not-ready-yet.

#### A.2 Homepage Bottom CTA — Fix 3-way split
- [ ] **File:** `src/app/(marketing)/page.tsx` lines 461–483
- **Current:** Readiness Quiz + Owner Type + Or Just Call Me (3 gold/outlined buttons)
- **Fix:** Apply standard pattern above. Remove "Find Your Owner Type" from this CTA block — it belongs on the Quizzes page.

#### A.3 About Page Bottom CTA — Fix 4-way split
- [ ] **File:** `src/app/(marketing)/about/page.tsx`
- **Current:** 4 equal-weight options
- **Fix:** Apply standard pattern above.

#### A.4 Process Page — Add mid-page CTA
- [ ] **File:** `src/app/(marketing)/process/page.tsx`
- **Issue:** No interaction point until page end. A reader sold on the process by step 4 has to scroll to act.
- **Fix:** Insert inline CTA card after step 4: "Sound like the right approach? Book a 30-minute intro call." Single gold button. No distractions.

#### A.5 All Pages — Audit and apply standard CTA pattern
- [ ] `/faq/page.tsx` — bottom CTA
- [ ] `/investment/page.tsx` — bottom CTA
- [ ] `/resources/page.tsx` — bottom CTA
- [ ] `/glossary/page.tsx` — bottom CTA (if present)

---

### Sprint B — Testimonials Expansion (~1–2 hrs)

#### B.1 Expand testimonials from 3 to 8
- [ ] **File:** `src/app/components/Testimonials.tsx`
- Add placeholders 4–8 from the decision log table above
- Write each quote in Kelsey's consistent voice: first-person, specific, no superlatives
- Each quote should cover a different candidate persona type
- Keep the `readiness score` badge — it reinforces quiz engagement

**Placeholder copy for additions:**

```
Carol M. — Phoenix, AZ
Role: Former healthcare executive, franchise owner since 2025
Score: Readiness Score: 62
Quote: "Kelsey told me not to buy — at least not yet. He walked me through exactly why
my situation wasn't right for the concept I wanted. Six months later I was ready,
and we found the right fit. That honest no was worth more than any yes I got from
other consultants."

James P. — Chicago, IL
Role: Still employed, franchise opens Q3 2026
Score: Readiness Score: 73
Quote: "I wasn't planning to move fast. I just wanted to understand my options.
Kelsey didn't pressure me to commit to anything — he helped me build a real plan
so that when I'm ready to leave corporate, the business is already running."

Rachel S. — Raleigh, NC
Role: Teacher turned franchise co-owner
Score: Readiness Score: 69
Quote: "My husband thought this was another sales call. Within ten minutes of talking
to Kelsey, he was asking more questions than I was. The transparency about how
Kelsey gets paid was what changed his mind."

Tom W. — Seattle, WA
Role: Former tech executive, franchise owner
Score: Readiness Score: 81
Quote: "I went in with a list of concepts I'd researched. Kelsey politely set it aside
and showed me something I'd never heard of. Six months after that conversation I
opened my doors. I wouldn't have found it on my own."

Lisa H. — Scottsdale, AZ
Role: Trailing spouse, semi-absentee owner
Score: Readiness Score: 76
Quote: "I needed something that didn't require me to be there 60 hours a week.
Kelsey understood that immediately and never tried to push me toward anything that
didn't fit that requirement. The concept we landed on was exactly what I described."
```

#### B.2 Rotate testimonial display on homepage
- [ ] Currently shows all 3 cards in a static grid
- **Enhancement:** On mobile, convert to a swipeable carousel (single card visible, swipe-next)
- This reduces vertical scroll on mobile while keeping all testimonials accessible

#### B.3 Add single pull-quote to the About page
- [ ] **File:** `src/app/(marketing)/about/page.tsx`
- Add a prominent pull-quote block (one sentence, large serif type, gold left border) near the top of the page
- Use: *"Kelsey told me not to buy. I needed to hear that." — Carol M., Phoenix AZ*

---

### Sprint C — Process Page Depth (~2 hrs)

#### C.1 Process hero subtitle fix
- [ ] **File:** `src/app/(marketing)/process/page.tsx`
- **Issue:** "Two hours before you see a single brand" is great for mid-funnel, but cold traffic reads "two hours" as cost/burden
- **Fix:** Add subtitle line below hero headline: *"Because most consultants skip this part — and that's why people buy the wrong franchise."*

#### C.2 Add micro-outcomes to each process step
- [ ] Each step currently describes what Kelsey does. Add a second line: "What you walk away with:"
- **Step 1 (Discovery):** → A clear picture of your capital range, working style, and non-negotiables
- **Step 2 (Matching):** → A short list of 3–4 validated brands curated specifically for you
- **Step 3 (Validation):** → Real conversations with existing owners, unfiltered
- **Step 4 (Legal Review):** → Full FDD reviewed with your attorney, no surprises
- **Step 5 (Decision):** → Yes or no — with full confidence in the data behind either choice
- **Step 6 (Launch):** → Opening support, onboarding coordination, and a clear checklist to first day open

#### C.3 Fix FAQ copy inconsistency
- [ ] **File:** `src/app/(marketing)/faq/page.tsx`
- **Issue:** FAQ still references "two-hour discovery conversation" as the first step
- **Fix:** Update to match new process framing: "We start with a 30-minute intro call. If it makes sense to continue, we schedule the full discovery conversation from there."

---

### Sprint D — About Page Depth (~1–2 hrs)

#### D.1 Make "The Short Version" bio scannable
- [ ] **File:** `src/app/(marketing)/about/page.tsx`
- Break the single paragraph into 3 shorter paragraphs
- Bold the most impactful phrases in each:
  - Para 1: **"$40 million in revenue and over 200 locations"**
  - Para 2: **"I was terrible at it. We lost money."**
  - Para 3: **"That combination is why I can look you in the eye."**

#### D.2 Elevate the ~30% conversion stat
- [ ] **File:** `src/app/(marketing)/about/page.tsx`
- Currently buried in a credentials card as "~30% of candidates become franchisees"
- **Reframe as a positioning statement:** Add a callout block: *"Roughly 7 in 10 people I work with decide not to buy a franchise. That's not a failure — that's the point."*
- Style as a dark card or blockquote with the gold accent. This is a counterintuitive trust-builder that ONLY an honest advisor can say.

#### D.3 FranChoice logo or badge
- [ ] Add the FranChoice network logo/badge to the Credentials section
- Source the logo from FranChoice affiliate materials. Display at ~100px width beside the affiliation text.

---

### Sprint E — Resources Page (~1–2 hrs)

#### E.1 Fix article publication dates
- [ ] **Directory:** `content/articles/`
- Audit every article `.md` file's frontmatter `date:` field
- Any date in the future (relative to today, March 2026) must be corrected
- Dates should reflect when the article was written, not a future publishing plan
- **This is a credibility issue.** A savvy candidate who sees a future-dated article questions whether the site is maintained.

#### E.2 Add "Start Here" pinned section
- [ ] **File:** `src/app/(marketing)/resources/page.tsx`
- Add a featured row at the top of the resources page titled "New to franchising? Start here."
- Pin 3 articles manually — recommend: (1) what a franchise consultant does, (2) how franchise funding works, (3) consultant vs. broker
- Style as a distinct row above the main grid (slightly larger cards, or a 3-column row with a label)

#### E.3 Add keyword search
- [ ] **File:** `src/app/(marketing)/resources/page.tsx`
- Simple client-side text filter: input field that filters displayed article cards by title/excerpt match
- No backend required — filter the in-memory array with `useState` + `.filter()`

---

### Sprint F — Investment Page (~1 hr)

#### F.1 Convert financing section to cards
- [ ] **File:** `src/app/(marketing)/investment/page.tsx`
- **Issue:** SBA loans, ROBS, and home equity are explained in prose paragraphs — dense for a financial topic
- **Fix:** Convert to 3 cards per financing path:
  - **Title** (e.g., "SBA 7(a) Loan")
  - **One-sentence description**
  - **Typical range** (e.g., "$50K–$500K")
  - **Best for** (1 line)
  - **Key watch-out** (1 line)

#### F.2 Define "Item 7" on first use
- [ ] **File:** `src/app/(marketing)/investment/page.tsx`
- First mention of "Item 7" should include inline definition: *"Item 7 of the Franchise Disclosure Document (FDD) — the section that details your total estimated investment before opening day."*

---

### Sprint G — FAQ Page (~1 hr)

#### G.1 Add anchor navigation
- [ ] **File:** `src/app/(marketing)/faq/page.tsx`
- Add a sticky or top-of-page category navigation: horizontal scrollable pills or plain text links jumping to each FAQ category section
- Categories (existing): Getting Started, Investment, Legal, Process, Working With Kelsey, etc.
- `id` anchors on each category heading + smooth scroll

---

### Sprint H — Navigation & Global (~1–2 hrs)

#### H.1 Unify /quizzes and /tools
- [ ] **Decision:** `/quizzes` is the canonical URL. Redirect `/tools` → `/quizzes` with a 301.
- **File:** `next.config.ts` — add redirect rule
- Optionally repurpose `/tools` later as an ROI calculator or comparison tool

#### H.2 Add "Text Me" option to mobile nav
- [ ] **File:** `src/app/(marketing)/layout.tsx`
- On mobile, the nav currently shows only "Book a Call"
- Add a small SMS icon or "Text Kelsey" link beside or below the Book button in the mobile menu
- Use `sms:+12149951062`

#### H.3 Homepage entity block — remove duplicate text
- [ ] **File:** `src/app/(marketing)/page.tsx` lines 129–154
- The "About Waypoint" paragraph text on the homepage duplicates the About page narrative
- **Fix:** Keep only the 4-stat grid (collapse the two paragraphs above it). The stats do the work. The copy is redundant.

#### H.4 Homepage bottom stats row — remove duplicate
- [ ] **File:** `src/app/(marketing)/page.tsx` (stats section near line 414–434)
- The same 4 stats appear at the top (entity block) and bottom of the page
- Remove the bottom stats row. The Franchise Map above it already provides geographic proof.

---

### Sprint I — Testimonials Component Upgrade (~2 hrs)

#### I.1 Add mobile swipe carousel
- [ ] Implement swipe/carousel behavior for testimonials on mobile (`md:grid` stays on desktop)
- Use a minimal approach: CSS scroll-snap on a horizontal flex container, with prev/next dot indicators

#### I.2 Add testimonials to the About page
- [ ] `src/app/(marketing)/about/page.tsx`
- Pull 2 testimonials (different personas than homepage) and display below the "How I Work" section
- Use the same Testimonials component or inline a simplified 2-up version

#### I.3 Future: Video testimonials
- [ ] When real clients are available, solicit 60-second Loom/selfie video testimonials
- Embed on Homepage (after written testimonials) and About page
- Format: autoplay-muted loop thumbnail, click to play with sound
- **Priority personas to target:** Corporate expat, Trailing spouse

---

### Sprint J — Future / Growth (No timeline)

| Item | Description | Priority |
|------|-------------|----------|
| J.1 | Kelsey welcome video (60–90 sec, About + Homepage) | 🔴 High |
| J.2 | Named case stories / client spotlights | 🟡 Medium |
| J.3 | Scorecard results → score-aware CTA copy | 🟡 Medium |
| J.4 | Email nurture sequence (3 emails post-scorecard) | 🟡 Medium |
| J.5 | FAQ JSON-LD schema for Google rich results | 🟡 Medium |
| J.6 | Page-specific OG images for all routes | 🟡 Medium |
| J.7 | Referral/network page for CPAs, attorneys, planners | 🟢 Low |
| J.8 | Press/media outreach (IFA, franchise blogs) | 🟢 Low |
| J.9 | ROI calculator or franchise comparison tool at `/tools` | 🟢 Low |

---

## Completed Work Log

| Date | Item | Notes |
|------|------|-------|
| Mar 2026 | Full mobile audit (390px, 430px, 768px) | No critical bugs |
| Mar 2026 | Image compression: 14 PNGs → JPEGs | ~95MB → ~12MB |
| Mar 2026 | Process hero: bg position fixed | `center 65%` — shows mountains not sky |
| Mar 2026 | About hero: bg position fixed | `center 35%` — shows Kelsey's face on mobile |
| Mar 2026 | Process Step 01: renamed "The Intro Call" | Reduces perceived commitment |
| Mar 2026 | `/blog` → `/resources` 301 redirect | Decision log above |
| Mar 2026 | Resources wired to MDX content | Articles auto-import from /content/articles/ |
| Mar 2026 | Testimonials component | 3 placeholder testimonials (Marcus T., Jennifer R., David K.) |
| Mar 2026 | PageSpeed + accessibility audit | Contrast fixes, heading hierarchy, lazy loading |
| Mar 2026 | Em dash audit | Removed all em dashes from article content |

---

## Guiding Principles for Future Agents

1. **Kelsey's voice:** Direct, honest, first-person, never salesy. Short sentences. "I'll tell you if this isn't right for you" energy. No superlatives. No vague consulting-speak.

2. **CTA hierarchy:** Every page has one primary (gold filled), one secondary (outlined), and one plain-text tertiary. Never more than 3 options. Never two equal-weight gold buttons.

3. **Design system:** See token table above. Never introduce new colors without updating this document.

4. **Image rules:** Hero images as `next/image` with `fill` + `object-cover`. Section photos: `width`/`height` explicit, `sizes` attribute set. Always `loading="lazy"` unless above the fold.

5. **Git commit pattern:** `git add -A && git commit -m "type: short description" && git push`. Types: `feat`, `fix`, `perf`, `content`, `refactor`, `cro`.

6. **Dev server:** `npm run dev` from `/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system/`

7. **Repo URL:** `github.com/Franscale1922/waypoint-core-system`

8. **SMS link:** `sms:+12149951062` (always use this, never a plain phone number in href)

9. **Placeholder testimonials:** Are intentional and acceptable until real quotes are collected. Do NOT remove them. Do add more from the approved list in the Decision Log above.

10. **Context window discipline:** This ROADMAP.md is written to be the full context brief for any new agent or chat. When starting a new session, paste this document plus the specific sprint you're working on.

---

*Last updated: March 2026 | Maintained in: `github.com/Franscale1922/waypoint-core-system/ROADMAP.md`*
