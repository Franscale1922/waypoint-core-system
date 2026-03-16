---
description: Periodic SEO and AEO health check for waypointfranchise.com — run monthly once the site has organic traffic data in Google Search Console. Reviews rankings, finds optimization opportunities, checks AI citation status, and updates the keyword map.
---

# SEO/AEO Monthly Review Workflow

Run this workflow once per month, after the site has at least 90 days of data in Google Search Console.

**First time running this?** Complete the one-time setup in `docs/seo-reviews/SETUP.md` first. It takes about 20 minutes and never needs to be repeated.

---

## Step 1 — Pull Google Search Console data

// turbo
```bash
cd "/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system" && node scripts/gsc-report.mjs
```

This script:
- Authenticates with the GSC API using the service account credentials in `.env`
- Pulls Page-level and Query-level performance data for the last 28 days
- Identifies position 8–20 "opportunity" pages and low-CTR pages automatically
- Saves the report to `docs/seo-reviews/[YYYY-MM]/gsc-report.md`
- Pings Google with the current sitemap (equivalent of hitting "Request Indexing" for the sitemap)

---

## Step 2 — Run the AI citation check

// turbo
```bash
cd "/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system" && node scripts/ai-citation-check.mjs
```

This script:
- Queries GPT-4o, Perplexity, and Google Gemini with 8 test franchise questions
- Checks whether "waypointfranchise.com", "Waypoint Franchise", or "Kelsey Stuart" appears in each response
- Saves results to `docs/seo-reviews/[YYYY-MM]/ai-citation-check.md`

Read the output report. For any query that returned ❌ (not cited) across all tools, note the topic — that article needs stronger AEO signals (see Step 3).

---

## Step 3 — Identify and fix "low-hanging fruit" pages

Read the `gsc-report.md` generated in Step 1. The **Optimization Opportunities** section lists pages in position 8–20.

For each opportunity page:

1. Open the article file in `content/articles/`
2. Check that the primary keyword (from `content/keyword-map.md`) appears:
   - In the `<h1>` (the `title` frontmatter field)
   - In the first paragraph (within the first 100 words)
   - In at least one subheading
3. Check that the article has a `faqs` frontmatter block with 3+ complete, standalone answers
4. If the article is missing `faqs`, add them — this generates FAQPage schema which is the #1 AEO signal
5. Check that the `excerpt` (meta description) is 150–160 characters and includes the keyword

Make changes directly in the `.md` file.

---

## Step 4 — Fix low-CTR pages

From `gsc-report.md`, read the **Low CTR Pages** section (impressions > 100, CTR < 2%).

For each low-CTR page:
1. Rewrite the `title` frontmatter to be more specific and click-worthy
2. Rewrite the `excerpt` to include a concrete benefit, number, or provocative claim
3. Do not change the `slug` — that would break existing rankings

---

## Step 5 — Strengthen internal links

For any article that has climbed in position since last month:
- Identify 1–2 other articles where this article is a relevant "next read"
- Add the slug to those articles' `relatedSlugs` (if not already present)
- More internal links = more PageRank flow = continued climbing

Use `content/new-article-checklist.md` as the article pool reference.

---

## Step 6 — Fix AEO weaknesses from citation check

For any query in `ai-citation-check.md` that returned ❌ across all AI tools:

1. Identify which article is the best match for that query
2. Open the article
3. Confirm the **first paragraph directly and completely answers the query** in 2–3 sentences
4. Confirm the `faqs` block has a question that matches or closely mirrors the query, with a complete answer
5. Confirm the article has at least 2 inbound `relatedSlugs` references from other articles

These are the three signals AI crawlers use most when deciding whether to cite a source.

---

## Step 7 — Update the keyword map

After reviewing GSC data, update `content/keyword-map.md`:

1. Add the actual GSC position for any article that now has ranking data
2. Flag any article ranking for an unintended keyword (update the map accordingly)
3. Remove ⚠️ flags from title tag issues that have been fixed

---

## Step 8 — Review social drafts queue

Open `content/social/` and note which article drafts haven't been posted yet.

**Priority:** Articles ranking in positions 5–15 benefit most from social distribution — fresh engagement signals can push them several positions. Post those first.

If a new article was published this month and doesn't have a social draft yet, generate one using the format in Step 8 of the `/new-article` workflow.

---

## Step 9 — Article queue review

Read `content/ARTICLE-QUEUE.md` and identify the next 2 articles to publish based on:
1. Topics that fill keyword gaps in `content/keyword-map.md`
2. Industry Spotlight articles with unchecked status that complement existing published pieces

Mark selected articles as In Progress and run the `/new-article` workflow for each.

---

## Step 10 — Commit all changes

```bash
cd "/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system" && git add -A && git commit -m "seo: monthly review [$(date +%Y-%m)] — keyword optimizations and AEO improvements" && git push
```

---

## Frequency Summary

| Task | Frequency | How |
|---|---|---|
| Full review (all 10 steps) | Monthly | Agent runs this workflow |
| GSC data pull (`gsc-report.mjs`) | Monthly | Agent auto-runs |
| AI citation check (`ai-citation-check.mjs`) | Monthly | Agent auto-runs |
| Keyword map update | Per new article + monthly | Agent |
| Social draft posting | Weekly | Kelsey (via Typefully, using drafts in `content/social/`) |
