---
description: Periodic SEO and AEO health check for waypointfranchise.com — run monthly once the site has organic traffic data in Google Search Console. Reviews rankings, finds optimization opportunities, checks AI citation status, and updates the keyword map.
---

# SEO/AEO Monthly Review Workflow

Run this workflow once per month, after the site has at least 90 days of data in Google Search Console. Before the 90-day mark, the data is too sparse to act on.

**Who runs each step:** Most steps are agent-executable. Steps marked `[KELSEY]` require manual action.

---

## Step 1 — Pull Google Search Console data [KELSEY]

Export the following reports from GSC and save them (or copy the data) for the agent to analyze:

**Performance report → Pages:**
- Date range: last 28 days vs. prior period
- Columns: URL, Clicks, Impressions, CTR, Position
- Export as CSV

**Performance report → Queries:**
- Date range: last 28 days
- Filter: Position < 30 (anything below 30 is worth acting on)
- Columns: Query, Clicks, Impressions, CTR, Position
- Export as CSV

Save both files to a date-stamped folder: e.g., `/docs/seo-reviews/2026-04/`

**Note:** If you don't have time to export CSVs, even a screenshot of the top 20 pages by impressions is enough to start.

---

## Step 2 — Identify "low-hanging fruit" pages

Pages in position **8–20** with meaningful impressions are the highest-leverage optimization targets. They're close to the top but not there yet — a targeted improvement can jump them several positions.

For each page in position 8–20:

1. Open the article file in `content/articles/`
2. Check that the primary keyword (from `content/keyword-map.md`) appears:
   - In the `<h1>` (title)
   - In the first paragraph
   - In at least one subheading
3. Check that the article has at least 2–3 internal links pointing to it from other articles
4. Check that the meta description (the `excerpt` field) includes the keyword and is 150–160 characters

If any of these are missing, make the update directly in the article `.md` file.

---

## Step 3 — Fix low-CTR pages

Pages with **high impressions but low CTR** (below 2%) are ranking but not earning clicks. The fix is almost always the title tag or meta description.

For each identified page:
1. Rewrite the title to be more specific and click-worthy while keeping the keyword
2. Rewrite the meta description (the `excerpt` frontmatter) to be more specific and include a benefit or provocative claim
3. Do not change the slug — that would break existing rankings

---

## Step 4 — Strengthen internal links

Review the current article pool in `content/new-article-checklist.md`.

For any article that has improved in rankings (moved from position 15+ to 8–15), add 1–2 more internal links pointing to it from other articles where it's contextually relevant. More internal links = more PageRank flow = continued climbing.

---

## Step 5 — Check AI citation status [KELSEY]

Manually test the following queries in ChatGPT (GPT-4), Perplexity, and Google Gemini. Note whether Waypoint or Kelsey Stuart is cited, and which article (if any) is referenced.

**Queries to test:**
- "What does a franchise consultant do?"
- "How much does a franchise cost?"
- "What is an FDD in franchising?"
- "Semi-absentee franchise ownership"
- "Best home services franchises"
- "How to finance a franchise"
- "Is franchise ownership passive income?"
- "Franchise red flags to watch for"

**Log results in:** `docs/seo-reviews/[month]/ai-citation-check.md`

Format:
```
| Query | Tool | Cited Waypoint? | URL cited (if any) | Notes |
```

If Waypoint is not being cited for a query where you have a strong article, note it — those articles may need stronger AEO signals (more direct answer in first paragraph, FAQ block review).

---

## Step 6 — Update the keyword map

After reviewing GSC data, update `content/keyword-map.md`:

1. Add a "GSC Position" column entry for any article that now has real ranking data (replacing the volume tier estimate with actual data)
2. Flag any article that has moved off-target (e.g., ranking for a different keyword than intended)
3. Remove ⚠️ flags from any title tag issues that have been fixed

---

## Step 7 — Review and publish social drafts queue

Open `content/social/` and check which article drafts haven't been posted yet.

For any articles that have real GSC ranking data, prioritize posting those — articles that are ranking in positions 5–15 get a meaningful traffic boost when distributed socially (social sharing creates fresh signals that can push a page from position 12 to 8).

Drafts are in:
- `content/social/social-drafts-part-1.md`
- `content/social/social-drafts-part-2.md`

---

## Step 8 — Article queue review

Open `content/ARTICLE-QUEUE.md` and identify the next 2–4 articles to publish based on:
1. Articles that fill gaps in the keyword map (topics not covered yet)
2. Industry Spotlight articles with `[ ]` status that complement existing published articles
3. `[~]` articles that now have the source information needed (check with Kelsey)

Mark selected articles as `[>]` In Progress in `ARTICLE-QUEUE.md`, then run the `/new-article` workflow for each.

---

## Step 9 — Update ROADMAP.md

Open `ROADMAP.md` and update the "Recent Work Completed" section with:
- What was optimized this month
- Which articles were published
- Any significant ranking milestones (e.g., "do-you-need-a-franchise-consultant moved to position 6")

This keeps the roadmap current as a context document for future agents.

---

## Frequency

| Review type | Frequency | Who |
|---|---|---|
| Full SEO review (all 9 steps) | Monthly | Agent + Kelsey (Steps 1, 5) |
| AI citation check only | Monthly | Kelsey |
| GSC data pull | Monthly | Kelsey |
| Keyword map update | After every new article + monthly | Agent |
| Social draft posting | Weekly | Kelsey (via Typefully) |
