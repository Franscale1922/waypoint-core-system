# Waypoint Franchise Advisors — Content Standards

This document is the authoritative standard for all articles and reference content on waypointfranchise.com. Every piece of content produced — regardless of who or what writes it — must comply with all five sections before it can be published.

---

## 1. Profitability Restriction

**This is a hard rule with no exceptions.**

Waypoint content may never state, imply, suggest, or reference the profitability of owning a franchise. This includes any language — direct or indirect — that would lead a reader to form expectations about financial returns.

### Prohibited content

The following are banned in all forms, including paraphrases, approximations, or framing that implies the same meaning:

- Break-even timelines ("most owners break even within 18 months")
- ROI ("franchises in this category return 30% on invested capital")
- Net profit or net profit margins
- Gross profit or gross revenue projections
- EBITDA or earnings figures presented as typical or expected
- Payback periods
- Statements that a franchise "makes" or "earns" a specific amount
- Phrases like "highly profitable," "strong returns," "lucrative," or "financially rewarding" when applied to a specific franchise or category
- Any comparison of franchise income to prior W-2 income as a projection

### What is permitted

- Describing the *structure* of how a franchise model generates revenue (e.g., recurring vs. one-time, membership vs. transactional)
- Stating that a franchisor *provides* financial performance data in their FDD Item 19, without reproducing or editorializing on those figures
- Discussing *capital requirements* — how much it costs to get in — without projecting what comes back
- Referring readers to validate financial performance directly with franchisees during their due diligence, without providing numbers

### When in doubt

If a sentence could cause a reader to form a specific expectation about how much money they will make, cut it.

---

## 2. No Brand Names

**This is a hard rule with no exceptions.**

Waypoint content discusses industries, categories, and business models — not specific franchise brands. Named brands must not appear in article body copy, headings, excerpts, or metadata.

### Prohibited

- Specific franchise brand names (e.g., naming a particular cleaning, fitness, or food service franchise)
- Parent company names when used in the context of recommending or evaluating a franchise
- Competitor advisory or brokerage firm names
- Any proper noun that identifies a specific franchise system by brand

### Why this rule exists

- **Legal exposure.** Any statement about a named brand — positive or negative — creates liability risk. Saying a brand performs well implies a guarantee; saying it performs poorly is a defamation risk.
- **Positioning.** Waypoint's value is independent expertise across the full market. Naming specific brands signals preference or bias and undermines that positioning.
- **Longevity.** Brands change ownership, go bankrupt, get acquired, or change their model. Content that names brands becomes inaccurate and requires ongoing maintenance.

### What to do instead

Describe by category, model type, and characteristic — not by name:

- ❌ "[Brand X] is one of the best home services franchises available."
- ✅ "The strongest home services franchises in this category share two traits: recurring service agreements and low inventory requirements."

- ❌ "Avoid [Brand Y] — the royalty structure is punishing."
- ✅ "Watch for royalty structures above 8% in this category — the margin math stops working at that level for most operators."

### Exception

The only permitted use of a brand name is in a direct, attributed quote from a third-party source, where the brand name is incidental and not the subject of evaluation. This is rare and should be avoided wherever possible.

---

## 3. Reader-First Writing (WIIFM)

Every article must be written from the reader's perspective: *"What does this mean for me and my decision?"*

### Requirements

- **Lead with the reader's problem, not the topic.** The opening paragraph names the tension, question, or decision the reader is actually facing — not a broad overview of the subject.
- **Answer before explaining.** Give the direct answer or position early. The explanation follows. Do not build toward a conclusion — state it, then support it.
- **Use "you" language.** Write to the reader directly. Avoid third-person constructions like "franchise buyers should consider..." in favor of "here's what to look for."
- **Concrete over conceptual.** Every principle must land on something specific and actionable. If a section ends without the reader knowing what to *do* or *look for*, revise it.
- **No credential-building.** Do not write to demonstrate expertise. Write to transfer usefulness. The reader does not care that this is complex — they care what to do next.

### Tone

- Direct. No hedging phrases: "it's important to note," "many experts believe," "it's worth considering."
- Confident but honest. If something depends on factors specific to the reader, say so plainly rather than softening with qualifications.
- Treats the reader as a capable adult making a real business decision, not a layperson needing reassurance.

---

## 4. SEO and AEO Optimization

All articles must be written to perform in both traditional search (SEO) and answer-engine formats (AEO — AI-generated answers, featured snippets, voice results).

### SEO requirements

- **One clear primary keyword or phrase per article.** It should appear naturally in the title, the opening paragraph, and at least one subheading. Do not stuff — one well-placed instance per section is sufficient.
- **Title format:** Plain, descriptive, no punctuation tricks. The title should match what a person would actually search for.
- **Subheadings (H2s) are questions or clear descriptors.** Subheadings like "What Actually Matters in an FDD" outperform vague ones like "Key Considerations."
- **Excerpt is search-snippet-ready.** The excerpt field (used in metadata) should be a self-contained 1–2 sentence answer. If someone sees only the excerpt, they should get value from it.
- **Internal links.** Every article links to at least one other resource page via the `relatedSlugs` system. Body copy CTAs link to `/book`. No orphaned articles.
- **No keyword cannibalization.** Before writing a new article, check the existing pool. Do not write a piece that targets the same primary keyword as an existing article — expand or differentiate instead.

### AEO requirements

Answer engines (ChatGPT, Perplexity, Google AI Overviews) favor content that directly answers specific questions in a structured, scannable format.

- **Answer the title question within the first 2 paragraphs.** AI systems extract the direct answer. Burying it loses the attribution.
- **Use plain-language definitions when introducing concepts.** "The FDD, or Franchise Disclosure Document, is..." gives AI systems a quotable definition.
- **Short, self-contained paragraphs.** Each paragraph should make one complete point. Avoid block paragraphs.
- **Concrete specifics over generalizations.** AI systems prefer quotable, specific claims over vague ones. "Restoration franchises generate demand from insurance claims, not marketing spend" extracts cleanly. "Restoration franchises can be a good choice" does not.
- **No date-dependent claims without a date qualifier.** "As of [year]" protects against content becoming inaccurate in AI training data.

---

## 5. Related Article Library

Every article published on waypointfranchise.com participates in the related-article system. This is both a reader experience requirement and an SEO internal-linking requirement.

### Requirements for every new article

1. **`relatedSlugs` frontmatter must be populated** with exactly 3 slugs before the article is published. All 3 must exist in `content/articles/`. See `content/new-article-checklist.md` for the current article pool.

2. **Related slugs must be chosen on editorial merit**, not category proximity. Ask: *"If a reader just finished this article, what are the three most valuable next reads?"* Category overlap is fine as a secondary factor, not a primary one.

3. **No closed loops between two articles.** If Article A lists Article B, Article B should not list Article A as its *only* return. It can appear — it just shouldn't be the only path back.

4. **The new article must be added to at least one existing article's `relatedSlugs`.** Review the existing pool and identify where the new article is a meaningfully better fit than one of the current three references. Replace the weakest match if so.

5. **Update `content/new-article-checklist.md`** by adding the new slug and category to the article pool table. This keeps the reference current for future agents and writers.

### Why this matters

Each article's 3 related links = 3 contextual internal links pointing to other content. Across 28 articles that's 84 links distributing authority across the content cluster. As the library grows, this compounds. Skipping the related-slug requirement on a new article breaks the graph.

---

## Pre-Publication Checklist

Before any article is considered complete, verify all of the following:

- [ ] No profitability language of any kind (Section 1)
- [ ] No brand names in body copy, headings, excerpt, or metadata (Section 2)
- [ ] Opens with the reader's problem, not a topic overview (Section 3)
- [ ] Direct answer or position stated in first 2 paragraphs (Section 3)
- [ ] Primary keyword appears in title, opening paragraph, and at least one H2 (Section 4)
- [ ] Excerpt is self-contained and search-snippet-ready (Section 4)
- [ ] `relatedSlugs` contains exactly 3 valid slugs from the current pool (Section 5)
- [ ] New article slug added to at least 1 existing article's `relatedSlugs` (Section 5)
- [ ] Article pool table in `new-article-checklist.md` updated (Section 5)
- [ ] Page renders correctly at `localhost:3000/resources/{slug}` with Keep Reading section visible
