---
description: Creating a new resource article for the Waypoint Franchise Advisors website, including drafting content, setting up all required frontmatter, mapping related articles, and back-linking from existing articles into the related pool.
---

# New Resource Article Workflow

Use this workflow any time the intent is to add a new resource article to the site. This includes requests phrased as:
- "Write/draft/create an article about X"
- "Add a new resource on X"
- "We need a piece on X"
- "Cover X in the resources section"
- "Publish something about X"
- Any variation where the output is a new `.md` file in `content/articles/`

---

## ⚠️ MANDATORY — Read Before Writing Anything

**Before drafting a single word, read the full content standards:**

```
cat "/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system/content/CONTENT-STANDARDS.md"
```

This document defines four hard requirements that apply to every article without exception:
1. **Profitability Restriction** — specific prohibited language list. Non-negotiable.
2. **No Brand Names** — industry and category only, never specific franchise brand names. Non-negotiable.
3. **Reader-First Writing** — WIIFM mindset, tone, and structure rules.
4. **SEO and AEO Optimization** — keyword, structure, and answer-engine requirements.
5. **Related Article Library** — `relatedSlugs` requirements and pool maintenance.

No article is complete until it passes the pre-publication checklist at the bottom of that document. Run the checklist explicitly before declaring the article done.



Before drafting, read the voice and tone guidelines so the article matches the existing body of work:

```
cat "/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system/content/new-article-checklist.md"
```

Also briefly review 1–2 existing articles in `content/articles/` to calibrate voice. The writing is direct, first-person where appropriate, avoids hype, and treats the reader as a capable adult making a real business decision.

---

## Step 2 — Determine the article's metadata

Before writing, establish:

- **Title** — clear, descriptive, no clickbait
- **Slug** — lowercase, hyphenated, derived from the title
- **Category** — one of: `Getting Started`, `Going Deeper`, `Industry Spotlights`
  - Getting Started: foundational concepts for someone new to franchising
  - Going Deeper: operational, financial, or due-diligence topics for someone actively evaluating
  - Industry Spotlights: analysis of a specific franchise category or concept
- **Tier** — matches category: 1 = Getting Started, 2 = Going Deeper, 3 = Industry Spotlights
- **Date** — today's date in `YYYY-MM-DD` format
- **Excerpt** — 1–2 sentence teaser, written in the same voice as the article body. This appears on the resources index page and in related article cards.

---

## Step 3 — Choose 3 related slugs for the new article

Read `content/new-article-checklist.md` for the current article pool table. Choose 3 slugs that would be genuinely valuable next reads for someone who just finished this article.

Criteria:
- Related by topic, decision stage, or natural reader progression — not just same category
- Do not create closed loops (A → B → A)
- Check that the slugs you pick actually exist in `content/articles/`

---

## Step 4 — Draft and save the article

Create the file at `content/articles/{slug}.md` with the following structure:

```markdown
---
title: "Article Title Here"
slug: "article-slug-here"
date: "YYYY-MM-DD"
category: "Getting Started"
tier: 1
excerpt: "One to two sentence teaser written in the article's voice."
relatedSlugs:
  - "related-slug-one"
  - "related-slug-two"
  - "related-slug-three"
---
Opening paragraph — no heading, drops the reader straight into the substance.

---

## Section Heading

Body content...

---

## Section Heading

Body content...

---

[CTA link text](/book)
```

Writing guidelines:
- Open without restating the title. Drop straight into the substance.
- Use `---` horizontal rules between major sections (this matches the site's prose styling)
- End with a contextual CTA linking to `/book` — phrased naturally, not as a button label
- Aim for 800–1,200 words
- No filler, no hedging phrases like "it's important to note that"

---

## Step 5 — Back-link from existing articles

Open `content/new-article-checklist.md` and review the article pool. Identify 1–3 existing articles where the new article is a genuinely better recommendation than one of their current `relatedSlugs`.

For each match:
- Open the existing article's `.md` file
- Add the new article's slug to its `relatedSlugs`, replacing the weakest existing related slug if the set is already at 3
- Only replace if the new article is meaningfully more relevant — don't force it

**Target:** the new article should appear in at least 1 existing article's related set.

---

## Step 6 — Update the checklist pool table

Open `content/new-article-checklist.md` and add the new article to the pool table at the bottom of the file:

```markdown
| your-new-article-slug | Category Name |
```

This keeps the checklist current for the next agent who runs this workflow.

---

## Step 7 — Verify

Start the dev server if it's not already running:

```bash
cd "/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system" && npm run dev
```

Visit `http://localhost:3000/resources/{slug}` and confirm:
- Article renders correctly
- "Keep Reading" section appears above the footer CTA with 3 cards
- All 3 card links resolve (no 404s)
- The article appears correctly on `http://localhost:3000/resources` under the right category
