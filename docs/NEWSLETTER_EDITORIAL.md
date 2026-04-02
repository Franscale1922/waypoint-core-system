# The Franchise Dispatch — Editorial Engine

> **How to decide what to write for each issue.**
> This is the intelligence layer on top of NEWSLETTER_SYSTEM.md. Read this before every drafting session.

---

## Intelligence Sources

Before selecting a topic, consult these three sources in order:

### 1. Reddit Intelligence — Video_Ideas_Queue Tab (Start Here)
**Sheet:** [Reddit Results](https://docs.google.com/spreadsheets/d/1LZd38540-NPK326-i1l9t3ZtnyEctaA3NxEN3BPhHx4/edit?usp=sharing) → `Video_Ideas_Queue` tab

**~35 pre-processed content ideas** already formatted with hooks, content types, and target pain points. This is the fastest path to a newsletter topic. Columns:
- `hook` — verbatim or near-verbatim hookable language from real posts
- `content_type` — already classified (insight, myth-bust, story, etc.)
- `target_pain_point` — the specific fear or confusion being addressed
- `pillars` — theme tags (burnout-escape, capital-funding, semi-absentee, etc.)

**How to use:** Scan for pain points that align with the Stage 1-2 audience (pre-investigation). Cross-check against the Issue Registry to confirm the angle is new. The hook in this tab is often directly adaptable as a newsletter opener.

### 2. Reddit Intelligence — Video_Ideas_Queue2 Tab (Deep Signal)
**Sheet:** [Reddit Results](https://docs.google.com/spreadsheets/d/1LZd38540-NPK326-i1l9t3ZtnyEctaA3NxEN3BPhHx4/edit?usp=sharing) → `Video_Ideas_Queue2` tab

**~250 scored posts** from 29 subreddits. More granular than the processed tab. Use when you want raw verbatim language or need to validate that a theme is currently active. Filter `buyer_journey_stage` to 1 or 2 (the sheet predominantly contains Stage 0-1 posts — this is confirmed as the pre-investigation audience). Useful columns:
- `trigger_excerpt` — verbatim language from real posts, often hookable directly
- `primary_theme` + `all_themes` — what the person was wrestling with
- `intent_score` — all posts ≥ 7 (minimum set in Config_Params), sort descending for strongest signal
- `audience_confidence` — high/medium; prefer high for language mining

**Dominant themes in live data:** burnout-escape, corporate exit, salary-fear, capital-funding anxiety. This maps directly to the Stage 1-2 pre-investigation audience the newsletter serves.

### 3. LinkedIn Content Engine — Question_History Tab
**Sheet:** [LinkedIn Content Engine](https://docs.google.com/spreadsheets/d/1ooMCiVFEW3Uz3lX3vkXYk8OT2PSBlb-lw4S4QKrzBkM/edit?usp=sharing) → `Question_History` tab

**~50 processed Reddit-derived questions** already organized by `primary_theme`. Useful as a secondary language signal and to see how Reddit questions have been translated into audience-facing framing. The `question` field often contains language that maps directly to newsletter hook territory.

### 4. Issue Registry (below)
Check what's already been covered before selecting. Topics can repeat; specific angles cannot.

---

## Issue Registry

| # | Date | Content Type | Theme | Specific Angle | Section 2 Type |
|---|---|---|---|---|---|
| 1 | 2026-03-25 | Both Sides of the Table | franchise-process | What franchisors actually evaluate: uncertainty tolerance, setback framing, early help-seeking | Question analogy |

---

## Content Type Rotation Rules

Don't use the same content type twice in a row. Suggested rotation:

| Issue | Content Type |
|---|---|
| 1 | Both Sides of the Table |
| 2 | Myth-Busting |
| 3 | Story-Driven |
| 4 | Educational/Insight |
| 5 | Industry Observation |
| 6 | Both Sides of the Table |
| ... | repeat rotation |

---

## Topic Queue

Pre-seeded issue ideas organized by theme. Pull from here when the Reddit sheets don't surface a clear winner for that cycle. Check the Issue Registry first to confirm the specific angle hasn't been run.

### burnout-escape / salary-fear (Stages 1-2)
- The golden handcuffs are real — but they're also a story you're telling yourself (myth-bust)
- What "secure" actually costs you, long-term (insight)
- The Sunday dread is a signal, not a character flaw (story-driven)

### identity-purpose / midlife-transition (Stage 2)
- The identity question nobody asks before they start researching franchises (insight)
- What I saw in candidates who already knew what they wanted vs. the ones who were running from something (both sides)
- The difference between buying a business and building one — and why it matters for who you are (insight)

### franchise-process / readiness-assessment (Stages 2-3)
- The process has more structure than it looks like from the outside (myth-bust)
- What the Discovery Day is actually for — and what most people miss about it (both sides)
- How to know if you're actually ready, without asking someone who makes money if you say yes (myth-bust)

### capital-funding / startup-vs-franchise (Stage 3)
- The number people fixate on, and the number that actually matters (insight)
- What a franchisor's support system is actually worth in dollar terms — without naming a number (both sides)
- Buying a franchise vs. buying yourself a job: how to tell the difference (myth-bust)

### analysis-paralysis / timing-economy (Stage 5)
- Why the right time is a myth and what actually moves people forward (myth-bust)
- The three questions that are worth more than six months of research (insight)

### family-pressure (Stages 1-2)
- What spouses are actually afraid of — and what they're not saying (story-driven)
- The conversation to have before you start looking (insight)

---

## Pre-Draft Checklist

Before each drafting session:

1. **Check the Issue Registry** — confirm the angle you're considering hasn't been covered
2. **Consult Question_History** — filter by relevant theme, note the raw language audience uses
3. **Check Video_Ideas_Queue2** — look for high-intent Stage 1-2 posts from the past 14 days
4. **Confirm content type rotation** — no two consecutive issues of the same type
5. **State the specific angle in one sentence** before drafting — if you can't, narrow the topic

---

## Deduplication Rule

**Topics can repeat. Angles cannot.**

"What franchisors look for" can appear multiple times — as long as each issue opens a different door. Track the specific angle, not the topic name, in the Issue Registry.
