# Waypoint Off-Site Distribution SOP

> **Purpose:** Get Waypoint's expertise into the "citation pool" that AI answer engines read, not just onto our own website. Since Google I/O 2026, Information Agents and LLMs (Google AI Mode, ChatGPT, Perplexity, Gemini) synthesize answers from across LinkedIn, YouTube, Reddit, and trade press around the clock. A brand that only publishes to its own domain is invisible to that layer. This SOP turns every article we already publish into off-site signals AI systems can find and attribute.

This complements, and does not replace, on-site content. On-site work makes us *crawlable and structured*; off-site work makes us *present where the agents are looking*.

---

## The one principle that governs everything here

**Authentic participation only.** Google's May 2026 guidance explicitly rejects inauthentic "mentions" campaigns: paid placements without disclosure, review-farm posts, and AI-generated low-effort comments. These *hurt* rather than help. Every off-site action in this SOP must be:

- Genuinely useful to the person reading it on its own,
- Posted under a real, named identity (Kelsey, or a named team member),
- Transparent about the consultant relationship when relevant,
- Compliant with the same rules as on-site content: **no brand names, no profitability/earnings claims, no FDD item numbers, no em dashes** (see `content/CONTENT-STANDARDS.md`).

If a post would only make sense as link-bait, do not publish it.

---

## Channels and what each is for

| Channel | Role in the citation pool | Owner | Cadence |
|---|---|---|---|
| **LinkedIn (Kelsey's named profile)** | Primary. First-person POV posts; strongest E-E-A-T signal and most-crawled by Information Agents. | Kelsey | 1 per published article + 1 standalone/week |
| **YouTube (long-form + Shorts)** | Ask YouTube makes transcripts/chapters conversationally searchable. Highest-effort, highest-durability. | Kelsey | Opportunistic; clip from existing video assets |
| **Reddit / niche communities** | Real answers in threads where buyers research. Disclose the consultant role. | Kelsey | Only when genuinely helpful; never scheduled spam |
| **Trade press / podcasts** | Third-party authority and backlinks. | Kelsey + outreach | Pitch monthly |

---

## The per-article repurposing workflow

Run this every time an article ships from `content/articles/`. Mirror the publish cadence already tracked in `content/CONTENT-CALENDAR.md`.

1. **Pull the non-commodity core.** Identify the one decision-process insight, first-hand observation, or framework in the article (see Section 13 of `content/CONTENT-STANDARDS.md`). That insight, not a summary, is what gets repurposed.
2. **LinkedIn post (always).** Kelsey, first person, 120–200 words. Lead with the insight, not "I wrote a new article." End with a soft link to the article on `waypointfranchise.com`. The post must stand on its own even if no one clicks.
3. **Community answer (when a real thread exists).** Find an actual question being asked (r/franchise and similar). Answer it directly and helpfully. Link the article only if it genuinely adds depth, and disclose that Kelsey is a franchise consultant.
4. **Video angle (optional).** If the topic suits video, note it for the next recording session. When a video exists, ensure the transcript is captured so it can also live on-site (see the `VideoObject` + transcript pattern in `src/app/(marketing)/about/page.tsx`).
5. **Trade-press angle (log it).** If the insight is pitch-worthy, add a one-line angle to the outreach list for the monthly pitch pass.

---

## Compliance checklist (every off-site post)

- [ ] No franchise brand names
- [ ] No profitability, ROI, income, or earnings language (investment/revenue ranges OK)
- [ ] No FDD item numbers
- [ ] No em dashes
- [ ] Posted under a real, named identity
- [ ] Consultant relationship disclosed where relevant
- [ ] Useful on its own, not just a link wrapper

---

## How we know it is working

Off-site distribution is measured by *citation and presence*, not clicks. Track it through the tools we already run:

- **AI Share of Voice:** `scripts/ai-citation-check.mjs` (monthly via `.github/workflows/monthly-seo-review.yml`). Rising presence/average SOV on advisor-selection queries is the leading indicator that the off-site pool is being synthesized.
- **Referral + branded traffic:** GA4 referrals from `linkedin.com`, `reddit.com`, AI platforms; and branded-search growth in `scripts/gsc-report.mjs` (people who encountered Waypoint off-site and later searched the name).
- **Backlinks / mentions:** track new third-party mentions from trade press and podcasts as an E-E-A-T signal.

If presence SOV is flat while we are publishing consistently, the likely cause is commodity content (see the commodity test in Section 13) or distribution that is not reaching where buyers actually research.
