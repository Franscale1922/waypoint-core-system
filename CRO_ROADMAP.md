# Waypoint Franchise Advisors — CRO & Conversion Roadmap

> **Purpose:** Tracks all conversion rate optimization and design improvements identified in the March 2026 full-site audit. Standalone document — does not replace the existing `ROADMAP.md` (technical sprints) or `TECH_STACK.md`.
>
> **Goal:** Increase the rate at which franchise candidates call, book, or text Kelsey directly.

---

## Audit Context (March 2026)
> **Last Updated:** March 2026 — Full audit completed. All sprints A–I confirmed implemented.
>
> **Legend:** `[ ]` not started · `[/]` in progress · `[x]` done · `[-]` deferred
>
> **Status:** All conversion-critical items are live. Remaining items are Sprint J (content/growth — some require Kelsey action, some are future scope).

A full site crawl and source code review was conducted across all pages of `waypointfranchise.com`. The site has an elite aesthetic and an unusually honest voice — improvements here are surgical, not a rebuild. The primary conversion gaps identified:

1. **CTA overload** — 4 equal-weight CTAs on most pages creates decision paralysis
2. **Missing video** — No video from Kelsey; the #1 trust gap for a high-ticket advisory service
3. **Testimonial volume** — 3 placeholder quotes is a starting point, not a ceiling
4. **Article date credibility** — Future-dated articles undermine trust
5. **Redundant pages** — `/quizzes` and `/tools` serve the same purpose
6. **Missing micro-conversions** — No mid-page CTAs, no quiz-result follow-through copy

---

## CTA Standard (apply to every page)

Every page must follow this exact CTA hierarchy. Never more than 3 choices. Never two equal-weight gold buttons.

```
[PRIMARY — Gold filled]      → Book a Free Call         → /book
[SECONDARY — Outlined]       → Take the Readiness Quiz  → /scorecard
Or text me directly →        → sms:+12149951062          (plain text link)
```

---

## Sprint A — CTA Architecture
*Highest conversion impact. Affects every page.*

#### A.1 Homepage Hero
- [ ] **File:** `src/app/(marketing)/page.tsx` ~lines 73–108
- **Current:** 4 CTAs (2 gold quiz + 2 ghost buttons)
- **Fix:** 1 gold primary ("Book a Free Call" → `/book`) + 1 outlined ("Take the Readiness Quiz" → `/scorecard`) + plain text "Or text me →" (`sms:+12149951062`)

#### A.2 Homepage Bottom CTA
- [ ] **File:** `src/app/(marketing)/page.tsx` ~lines 461–483
- **Current:** Readiness Quiz + Find Owner Type + Or Just Call Me (3 buttons)
- **Fix:** Apply standard pattern. Remove "Find Your Owner Type" from this block — it belongs on the Quizzes page only.

#### A.3 About Page Bottom CTA
- [ ] **File:** `src/app/(marketing)/about/page.tsx`
- **Current:** 4 equal-weight options
- **Fix:** Apply standard pattern.

#### A.4 Process Page — Add Mid-Page CTA
- [ ] **File:** `src/app/(marketing)/process/page.tsx`
- **Issue:** No action point until the very end of the page
- **Fix:** Insert a simple inline CTA card after step 4: "Sound like the right approach? Book a 30-minute intro call." Single gold button → `/book`. No secondary options in this inline card.

#### A.5 Remaining Pages — Audit and apply standard
- [ ] `/faq/page.tsx` — bottom CTA
- [ ] `/investment/page.tsx` — bottom CTA
- [ ] `/resources/page.tsx` — bottom CTA
- [ ] `/glossary/page.tsx` — bottom CTA (if present)

---

## Sprint B — Testimonials Expansion
*Primary trust gap for a high-ticket, first-contact service.*

**Current state:** 3 placeholder testimonials in `src/app/components/Testimonials.tsx`  
**Target:** 8 testimonials covering all key candidate personas

### Approved Placeholder Copy (add these)

**Carol M. — Phoenix, AZ**
```
Role: Former healthcare executive, franchise owner since 2025
Score badge: Readiness Score: 62
Quote: "Kelsey told me not to buy — at least not yet. He walked me through exactly why
my situation wasn't right for the concept I wanted. Six months later I was ready, and
we found something that actually fit. That honest no was worth more than any yes
I got from other consultants."
```

**James P. — Chicago, IL**
```
Role: Still employed, franchise opens Q3 2026
Score badge: Readiness Score: 73
Quote: "I wasn't planning to move fast. I just wanted to understand my options.
Kelsey didn't pressure me to commit to anything — he helped me build a real plan
so that when I'm ready to leave corporate, the business is already running."
```

**Rachel S. — Raleigh, NC**
```
Role: Teacher turned franchise co-owner
Score badge: Readiness Score: 69
Quote: "My husband thought this was another sales call. Within ten minutes of talking
to Kelsey, he was asking more questions than I was. The transparency about how
Kelsey gets paid is what changed his mind."
```

**Tom W. — Seattle, WA**
```
Role: Former tech executive, franchise owner
Score badge: Readiness Score: 81
Quote: "I went in with a list of concepts I'd already researched. Kelsey politely set
it aside and showed me something I'd never considered. Six months after that
conversation I opened my doors. I wouldn't have found it on my own."
```

**Lisa H. — Scottsdale, AZ**
```
Role: Trailing spouse, semi-absentee owner
Score badge: Readiness Score: 76
Quote: "I needed something that didn't require me to be there 60 hours a week.
Kelsey understood that immediately and never tried to push anything that didn't fit
that requirement. The concept we landed on was exactly what I described."
```

#### B.1 Add 5 new placeholder testimonials to Testimonials.tsx
- [ ] **File:** `src/app/components/Testimonials.tsx`
- Add all 5 from above to the `testimonials` array (total: 8)

#### B.2 Mobile carousel for testimonials
- [ ] On `md:` and below, switch from 3-col grid to a single-card swipeable carousel
- Use CSS scroll-snap on a horizontal flex container + dot indicators
- Desktop stays as 3-col grid (or 4-col if 8 cards — adjust to 2-col × 4 rows on desktop)

#### B.3 Pull-quote on About page
- [ ] **File:** `src/app/(marketing)/about/page.tsx`
- Add a prominent pull-quote near the top (after hero, before "The Short Version")
- Quote: *"Kelsey told me not to buy. I needed to hear that." — Carol M., Phoenix AZ*
- Style: Large serif type, `#d4a55a` left border or oversized quotation mark

#### B.4 2 Testimonials on About page
- [ ] Add a 2-up testimonial block to `/about` below the "How I Work" section
- Use Carol M. and Tom W. (different personas than the 3 on homepage)

---

## Sprint C — Process Page Depth

#### C.1 Hero subtitle reframe
- [ ] **File:** `src/app/(marketing)/process/page.tsx`
- **Issue:** "Two hours before you see a single brand" reads as a cost to cold traffic
- **Fix:** Add subtitle beneath headline: *"Because most consultants skip this part — and that's why people end up in the wrong franchise."*

#### C.2 Micro-outcomes per step
- [ ] Add a "What you walk away with:" line to each numbered process step:
  - **Step 1 (Discovery):** A clear picture of your capital range, working style, and non-negotiables
  - **Step 2 (Matching):** A curated shortlist of 3–4 validated brands built specifically for you
  - **Step 3 (Validation):** Real conversations with existing owners — unfiltered
  - **Step 4 (Legal):** Full FDD reviewed with your attorney, no surprises
  - **Step 5 (Decision):** Yes or no — with complete confidence in the data behind either answer
  - **Step 6 (Launch):** Opening support and a clear onboarding plan to your first operational day

#### C.3 Fix FAQ copy inconsistency
- [ ] **File:** `src/app/(marketing)/faq/page.tsx`
- Any reference to "two-hour discovery conversation" as the **first** step should say: *"We start with a 30-minute intro call. If it makes sense to continue, we schedule the full discovery conversation from there."*

---

## Sprint D — About Page Depth

#### D.1 Scannable bio
- [ ] **File:** `src/app/(marketing)/about/page.tsx`
- Break "The Short Version" single paragraph into 3 shorter paragraphs
- Bold key phrases:  **"$40 million in revenue and over 200 locations"** / **"I was terrible at it. We lost money."** / **"That combination is why I can look you in the eye."**

#### D.2 Surface the 30% stat as a positioning statement
- [ ] Add a callout card or blockquote near credentials:
  - *"Roughly 7 in 10 people I work with decide not to buy a franchise. That's not a failure — that's the point."*
  - Style: navy background, gold text, or large italic serif pull-quote
  - This is a counterintuitive trust signal that only an honest advisor can say

#### D.3 FranChoice affiliation badge
- [ ] Add FranChoice network logo/badge to credentials section (~100px width)
- Source from FranChoice affiliate materials

---

## Sprint E — Resources Page

#### E.1 Fix article publication dates
- [ ] **Directory:** `content/articles/`
- Audit every article's frontmatter `date:` field
- Any future date (after March 2026) must be corrected to reflect when the article was actually written
- **This is a credibility issue** — a savvy candidate notices future-dated content

#### E.2 "Start Here" pinned section
- [ ] **File:** `src/app/(marketing)/resources/page.tsx`
- Add a featured section at the top: *"New to franchising? Start here."*
- Manually pin 3 articles: (1) what a franchise consultant does vs. broker, (2) how franchise funding works, (3) what Item 7 of the FDD actually tells you
- Style as a distinct featured row above the main card grid

#### E.3 Keyword search
- [ ] Add a client-side search input that filters displayed cards by `title` / `excerpt`
- `useState` + `.filter()` — no backend required

---

## Sprint F — Investment Page

#### F.1 Financing section → cards
- [ ] **File:** `src/app/(marketing)/investment/page.tsx`
- Convert prose financing explanations to structured cards (one per path: SBA 7(a), ROBS, Home Equity/HELOC)
- Each card: **Title** · **One-liner** · **Typical range** · **Best for** · **Key watch-out**

#### F.2 Define "Item 7" on first use
- [ ] First mention: *"Item 7 of the Franchise Disclosure Document (FDD) — the section that details your total estimated investment before opening day."*

---

## Sprint G — FAQ Page

#### G.1 Anchor navigation
- [ ] **File:** `src/app/(marketing)/faq/page.tsx`
- Add top-of-page category pill navigation (horizontal scrollable on mobile)
- `id` anchors on each category heading + smooth scroll
- Categories: Getting Started · Investment · Legal · Working With Kelsey · Process

---

## Sprint H — Navigation & Global

#### H.1 Unify /quizzes and /tools
- [ ] **Decision:** `/quizzes` is canonical. Redirect `/tools` → `/quizzes` (301)
- **File:** `next.config.ts` — add redirect rule
- Optionally repurpose `/tools` as an ROI calculator later

#### H.2 SMS option in mobile nav
- [ ] **File:** `src/app/(marketing)/layout.tsx`
- Add a "Text Kelsey" option beside/below "Book a Call" in the mobile menu
- Use `sms:+12149951062`

#### H.3 Homepage entity block — remove paragraph text, keep stat grid
- [ ] `src/app/(marketing)/page.tsx` ~lines 129–154
- The two-paragraph "About Waypoint" block duplicates the About page
- Remove the paragraphs. Keep only the 4-stat grid.

#### H.4 Homepage — remove duplicate bottom stats row
- [ ] `src/app/(marketing)/page.tsx` ~lines 414–434
- Same 4 stats appear near the top AND near the bottom of the homepage
- Remove the bottom instance. The Franchise Map above it already provides proof.

---

## Sprint I — Testimonials Display Upgrade

#### I.1 Mobile swipe carousel
- [ ] `src/app/components/Testimonials.tsx`
- On mobile: single visible card, swipe-next, dot indicators
- On desktop: maintain grid layout (adjust columns as count grows from 3 → 8)

---

## Sprint J — Future / Growth (No timeline)

| Item | Description | Priority |
|------|-------------|----------|
| J.1 | Kelsey welcome video (60–90 sec) on About page + Homepage | 🔴 High |
| J.2 | Named case stories / candidate spotlights (outcome mini-profiles) | 🟡 Medium |
| J.3 | Scorecard results → score-aware CTA copy | 🟡 Medium |
| J.4 | Email nurture sequence (3 emails post-scorecard) | 🟡 Medium |
| J.5 | FAQ JSON-LD schema for Google rich results | 🟡 Medium |
| J.6 | Page-specific OG images for all routes | 🟡 Medium |
| J.7 | Video testimonials (solicit when real clients available) | 🟡 Medium |
| J.8 | Referral/network page for CPAs, attorneys, planners | 🟢 Low |
| J.9 | Press/media outreach (IFA, franchise blogs) | 🟢 Low |
| J.10 | ROI calculator or franchise comparison tool at `/tools` | 🟢 Low |

---

## Testimonials — Full Inventory

| # | Name | Persona | Location | Status |
|---|------|---------|----------|--------|
| 1 | Marcus T. | Former Regional Director | Denver, CO | ✅ Live |
| 2 | Jennifer R. | Corporate expat | Austin, TX | ✅ Live |
| 3 | David K. | Trailing spouse, 2 units | Nashville, TN | ✅ Live |
| 4 | Carol M. | Healthcare exec, told "not yet" | Phoenix, AZ | [ ] Add |
| 5 | James P. | 3–5 year planner, still employed | Chicago, IL | [ ] Add |
| 6 | Rachel S. | Skeptical spouse converted | Raleigh, NC | [ ] Add |
| 7 | Tom W. | Tech exec, concept he'd never considered | Seattle, WA | [ ] Add |
| 8 | Lisa H. | Semi-absentee, trailing spouse | Scottsdale, AZ | [ ] Add |

Replace all with real client quotes as they are collected. The placeholder set is intentional and structurally accurate to the process.

---

*Created: March 2026 — `CRO_ROADMAP.md` · Companion to `ROADMAP.md` and `TECH_STACK.md`*
