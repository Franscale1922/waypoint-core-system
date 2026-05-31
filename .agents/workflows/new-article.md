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

## Step 1 — Read Before Writing Anything

**Before drafting a single word, read the full content standards:**

```
cat "/Users/kelseystuart/Projects/waypoint-core-system/content/CONTENT-STANDARDS.md"
```

This document defines hard requirements that apply to every article without exception:
1. **Profitability Restriction** — specific prohibited language list. Non-negotiable.
2. **No Brand Names** — industry and category only, never specific franchise brand names. Non-negotiable.
3. **Reader-First Writing** — WIIFM mindset, tone, and structure rules.
4. **SEO and AEO Optimization** — keyword, structure, and answer-engine requirements.
5. **Related Article Library** — `relatedSlugs` requirements and pool maintenance.
6. **Freshness (Section 6):** date-qualify time-sensitive facts inline with "as of YYYY".
7. **No FDD item numbers (Section 10):** use plain-language equivalents, never "Item 7 / 19 / 20".
8. **No em dashes (Section 11):** use colons, commas, or periods. Verify with `grep -c "—"` = 0.
9. **Non-commodity content (Section 13):** the core must pass the commodity test (Kelsey's first-hand judgment, an aggregate Waypoint pattern, or a named framework, never a paraphrase of other franchise sites).

No article is complete until it passes the pre-publication checklist at the bottom of that document. Run the checklist explicitly before declaring the article done.

Also read the article pool checklist and briefly review 1–2 existing articles to calibrate voice:

```
cat "/Users/kelseystuart/Projects/waypoint-core-system/content/new-article-checklist.md"
```

The writing is direct, first-person where appropriate, avoids hype, and treats the reader as a capable adult making a real business decision.

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

**Also check `content/keyword-map.md`** to understand what keyword this article should target before writing the title and opening paragraph.

---

## Step 3 — Choose 3 related slugs for the new article

Read `content/new-article-checklist.md` for the current article pool table. Choose 3 slugs that would be genuinely valuable next reads for someone who just finished this article.

Criteria:
- Related by topic, decision stage, or natural reader progression — not just same category
- Do not create closed loops (A → B → A)
- Check that the slugs you pick actually exist in `content/articles/`

---

## Step 4 — Draft and save the article

Create the file at `content/articles/{slug}.md`. The quickest compliant start is to copy `content/_article-skeleton.md`. The structure:

```markdown
---
title: "Article Title Here"
slug: "article-slug-here"
date: "YYYY-MM-DD"
category: "Getting Started"
tier: 1
checklistSlug: "universal"   # see Step 4b, or delete this line for no widget
excerpt: "One to two sentence teaser written in the article's voice."
relatedSlugs:
  - "related-slug-one"
  - "related-slug-two"
  - "related-slug-three"
faqs:                         # REQUIRED: exactly 4, each answer standalone (FAQPage JSON-LD)
  - q: "Question one?"
    a: "A complete, standalone answer, used verbatim in FAQPage JSON-LD schema for AEO (AI citation). Date-qualify figures; no brand names or earnings claims."
  - q: "Question two?"
    a: "Answer two."
  - q: "Question three?"
    a: "Answer three."
  - q: "Question four?"
    a: "Answer four."
# Optional: updatedAt, escapeKit, and an opt-in `video:` block (deferred VideoObject capability). See content/_article-skeleton.md.
---
Opening paragraph (the atomic summary): no heading, answers the title question in 1-2 plain sentences. This is the AEO citation hook.

---

## Section Heading

Body content...

---

## Section Heading

Body content...

---

## Common Questions

**Question one?**

Answer one.

**Question two?**

Answer two.

**Question three?**

Answer three.

[CTA link text](/book)
```

Writing guidelines:
- Open without restating the title. Drop straight into the substance.
- **First paragraph must directly answer the title question** in 2–3 sentences. This is what AI models (ChatGPT, Perplexity, Gemini) quote verbatim — the AEO citation hook.
- Use `---` horizontal rules between major sections
- End with a contextual CTA linking to `/book` — phrased naturally, not as a button label
- Aim for 800–1,200 words. No filler, no hedging phrases like "it's important to note that"
- **Always include a `faqs` frontmatter block.** These render as both a visible "Common Questions" section AND as `FAQPage` JSON-LD schema automatically. Write answers as complete, standalone sentences.
- **Primary keyword must appear in the title AND within the first 100 words.**
- **Convert 2-3 of the highest-intent H2s into the actual question a buyer searches** (for example, "The Full Funding Picture" becomes "How much cash do you actually need to fund a franchise?"), and keep the answer in the first 1-2 sentences under each (the Island Test, Section 7). Leave list-label and synthesis headings as plain descriptors; do not turn every H2 into a question, and do not duplicate an FAQ question verbatim.
- **No em dashes (—)**: use colons, commas, or periods. Date-qualify time-sensitive facts with "as of YYYY" (Section 6). The core of the piece must be non-commodity (Section 13), not a paraphrase of other franchise sites.

---

## Step 4b — Assign Checklist

Every article must declare which checklist widget to show (or explicitly declare none). This is a **required** frontmatter field on all articles — set it before committing.

Add `checklistSlug` to the article's frontmatter, immediately after the `tier:` line:

```markdown
tier: 1
checklistSlug: "universal"
```

### Decision tree

**If `category: "Industry Spotlights"`:**
Check `content/downloads/` for a checklist matching the industry using this table:

| Industry | `checklistSlug` | Checklist file |
|----------|----------------|----------------|
| Food / restaurant / fast casual / QSR | `"food-and-beverage"` | `food-franchise-readiness-checklist.md` |
| Home services (cleaning, restoration, junk removal, landscaping, car wash, pest control, painting, etc.) | `"home-services"` | `home-services-franchise-readiness-checklist.md` |
| Fitness / gym / boutique studio / yoga / cycling | `"fitness-wellness"` | `fitness-wellness-franchise-readiness-checklist.md` |
| Wellness (massage, med spa, assisted stretch, chiropractic-adjacent) | `"fitness-wellness"` | `fitness-wellness-franchise-readiness-checklist.md` |
| Senior care / home care / companion care | `"senior-care"` | `senior-care-franchise-readiness-checklist.md` |
| B2B services (staffing, managed IT, fleet maintenance, logistics, business consulting) | `"b2b"` | `b2b-franchise-readiness-checklist.md` |
| Any other industry without a dedicated checklist yet | `"universal"` | `universal-franchise-readiness-checklist.md` |

If no dedicated checklist exists for the industry yet, use `"universal"` as a placeholder and add a comment in the PR description noting that an industry-specific checklist should be created before the article goes live.

**If `category: "Getting Started"` or `"Going Deeper"`:**
- Add `checklistSlug: "universal"` if the article covers: readiness, financial preparation, mindset, process overview, semi-absentee vs. owner-operator, funding, or general evaluation concepts.
- **Omit `checklistSlug` entirely** (no field, no widget) if the article covers: Discovery Day, post-signing, managing an existing franchise,  exit/sale strategy, or is a deep tactical late-stage piece.

### Content standards for assets
All checklists and downloadable assets stored in `content/downloads/` must follow the rules in `content/CONTENT-STANDARDS.md`, specifically:
- **Section 10** (No FDD Item Numbers) does NOT apply to downloads — items may use numbered labels
- **Section 12** (FDD Item References in Downloadable Assets) DOES apply — every Item number must include an inline explanation

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

Open `content/new-article-checklist.md` and add the new article to the pool table:

```markdown
| your-new-article-slug | Category Name |
```

---

## Step 7 — Update the keyword map

Open `content/keyword-map.md` and add the new article to the appropriate table section:

```markdown
| `your-new-article-slug` | Article Title | "primary keyword" | I or C | Low/Medium/High | ✅ or ⚠️ note |
```

- **Primary keyword:** the most natural query someone would type to find this article
- **Intent:** I = Informational, C = Commercial
- **Volume tier:** Low (<200/mo), Medium (200–2,000/mo), High (2,000+/mo) — estimate from topic specificity
- **Title tag:** ✅ if keyword appears naturally in title, ⚠️ + note if adjustment needed

---

## Step 8 — Generate social share drafts

Append social drafts for the new article to `content/social/social-drafts-part-1.md` (or start `social-drafts-part-3.md` if the file is getting long).

**Twitter/X thread:**
- 6–9 tweets
- First tweet = sharpest hook (counterintuitive claim, stat, or direct challenge to conventional wisdom)
- Each subsequent tweet = one key insight or section of the article
- Final tweet = 1 sentence summary + `Full piece: [link]`
- Voice: Kelsey's — direct, no hedging. 🧵 emoji at start of thread only.

**LinkedIn post:**
- 200–300 words
- Opens with the article's strongest insight or most surprising claim — not "I wrote an article about X"
- Link at end: `Full breakdown: [link]`
- Replace `[link]` with the article URL when posting

---

## Step 9 — Verify

First run the structural checks from the repo root:

```bash
npm run aeo-audit                         # new slug must be clean: FAQ present, has question H2s, relatedSlugs = 3, em dashes = 0
npm run test                              # related-slug link check
grep -c "—" content/articles/{slug}.md    # must be 0
```

Start the dev server if not already running:

```bash
cd "/Users/kelseystuart/Projects/waypoint-core-system" && npm run dev
```

Visit `http://localhost:3000/resources/{slug}` and confirm:
- [ ] Article renders correctly
- [ ] "Keep Reading" section appears above the footer CTA with 3 cards
- [ ] All 3 card links resolve (no 404s)
- [ ] Article appears on `http://localhost:3000/resources` under the right category
- [ ] View page source → confirm 3 `<script type="application/ld+json">` blocks: `Article`, `FAQPage`, `BreadcrumbList`
